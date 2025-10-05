# model_trainer.py
import os
import warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from sklearn.preprocessing import LabelEncoder, label_binarize
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.metrics import (
    accuracy_score, balanced_accuracy_score, f1_score, precision_score, recall_score,
    roc_auc_score, log_loss, confusion_matrix, ConfusionMatrixDisplay,
    classification_report, matthews_corrcoef, cohen_kappa_score
)

from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier

import optuna


# ---------------------------
# Utilitats gràfiques
# ---------------------------
def _ensure_img_dir():
    os.makedirs("./img", exist_ok=True)

def plot_feature_importances(model, feature_names, model_type):
    _ensure_img_dir()
    if hasattr(model, "feature_importances_"):
        importances = model.feature_importances_
        idx = np.argsort(importances)[::-1]
        plt.figure(figsize=(10, 6))
        plt.bar(range(len(importances)), importances[idx])
        plt.xticks(range(len(importances)), np.array(feature_names)[idx], rotation=60, ha="right")
        plt.ylabel("Importance")
        plt.title(f"Feature Importances - {model_type}")
        fname = f"./img/bar_plot_{'xgboost' if model_type=='xgboost' else 'randomforest'}.png"
        plt.tight_layout()
        plt.savefig(fname, dpi=300)
        plt.close()

def plot_confusion_matrix(y_true, y_pred, labels):
    _ensure_img_dir()
    cm = confusion_matrix(y_true, y_pred, labels=range(len(labels)))
    disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=labels)
    fig, ax = plt.subplots(figsize=(8, 6))
    disp.plot(cmap="Blues", ax=ax, xticks_rotation=45, values_format='d', colorbar=False)
    plt.title("Confusion Matrix")
    plt.tight_layout()
    plt.savefig("./img/confusion_matrix.png", dpi=300)
    plt.close(fig)

def plot_roc_curve(y_true_enc, y_proba, n_classes):
    """Suporta binari i multiclasse (OVR)."""
    if y_proba is None:
        return
    _ensure_img_dir()
    plt.figure(figsize=(8, 6))
    # Binaritza y
    Y = label_binarize(y_true_enc, classes=range(n_classes))
    try:
        if n_classes == 2:
            # Probabilitat de classe positiva (assumim la de major index)
            from sklearn.metrics import RocCurveDisplay
            RocCurveDisplay.from_predictions(y_true_enc, y_proba[:, 1])
        else:
            # One-vs-Rest macro
            # Evitem errors si alguna classe no té probabilitats
            aucs = []
            for i in range(n_classes):
                try:
                    auc = roc_auc_score(Y[:, i], y_proba[:, i])
                    aucs.append(auc)
                except Exception:
                    pass
            # Dibuix senzill: mitjana dels AUCs
            if aucs:
                mean_auc = float(np.mean(aucs))
                plt.plot([0, 1], [0, 1], linestyle="--")
                plt.text(0.6, 0.2, f"Mean OvR AUC: {mean_auc:.3f}")
        plt.title("ROC Curve")
        plt.tight_layout()
        plt.savefig("./img/roc_curve.png", dpi=300)
    except Exception:
        # En cas de problemes (p. ex., cap probabilitat), ignorem.
        pass
    finally:
        plt.close()


# ---------------------------
# Optuna: espais i objectius
# ---------------------------
def _rf_suggest(trial):
    return {
        "n_estimators": trial.suggest_int("n_estimators", 200, 1000, step=50),
        "max_depth": trial.suggest_int("max_depth", 3, 30),
        "min_samples_split": trial.suggest_int("min_samples_split", 2, 20),
        "min_samples_leaf": trial.suggest_int("min_samples_leaf", 1, 10),
        "max_features": trial.suggest_categorical("max_features", ["sqrt", "log2", None]),
        "bootstrap": trial.suggest_categorical("bootstrap", [True, False]),
        "n_jobs": -1,
        "random_state": 42
    }

def _xgb_suggest(trial, n_classes):
    params = {
        "n_estimators": trial.suggest_int("n_estimators", 200, 1200, step=50),
        "max_depth": trial.suggest_int("max_depth", 3, 12),
        "learning_rate": trial.suggest_float("learning_rate", 1e-3, 0.3, log=True),
        "subsample": trial.suggest_float("subsample", 0.5, 1.0),
        "colsample_bytree": trial.suggest_float("colsample_bytree", 0.5, 1.0),
        "min_child_weight": trial.suggest_float("min_child_weight", 1e-2, 10.0, log=True),
        "reg_lambda": trial.suggest_float("reg_lambda", 1e-3, 10.0, log=True),
        "reg_alpha": trial.suggest_float("reg_alpha", 1e-3, 10.0, log=True),
        "random_state": 42,
        "tree_method": "hist",
        "n_jobs": -1,
        "eval_metric": "mlogloss"
    }
    if n_classes == 2:
        params["objective"] = "binary:logistic"
    else:
        params["objective"] = "multi:softprob"
        params["num_class"] = n_classes
    return params

def _cv_score(model, X, y, scoring="f1_weighted", cv_splits=3):
    cv = StratifiedKFold(n_splits=cv_splits, shuffle=True, random_state=42)
    scores = cross_val_score(model, X, y, scoring=scoring, cv=cv, n_jobs=-1)
    return float(scores.mean())


# ---------------------------
# Funció principal
# ---------------------------
def train_and_eval(
    X: pd.DataFrame,
    y: pd.Series | pd.DataFrame,
    use_bayes: bool,
    model_type: str,
    n_trials: int = 30,
    test_size: float = 0.2,
    random_state: int = 42
):
    """
    Entrena RandomForest o XGBoost amb (o sense) Optuna i retorna mètriques + model entrenat.
    - Guarda plots a ./img: importàncies (bar_plot_*), confusion_matrix.png, roc_curve.png
    """
    assert model_type in {"xgboost", "randomforest"}, "model_type ha de ser 'xgboost' o 'randomforest'"

    # y pot venir com DataFrame amb 1 col o com Series
    if isinstance(y, pd.DataFrame):
        if y.shape[1] != 1:
            raise ValueError("El dataframe target ha de tenir exactament 1 columna")
        y = y.iloc[:, 0]

    # LabelEncoder (però also guardem mapping per retornar info útil)
    le = LabelEncoder()
    y_enc = le.fit_transform(y)  # <-- no alterem l'original
    classes_ = list(le.classes_)
    n_classes = len(classes_)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_enc, test_size=test_size, stratify=y_enc, random_state=random_state
    )

    # ---------- Model + Optimització ----------
    best_params = None
    if use_bayes:
        def objective(trial):
            if model_type == "randomforest":
                params = _rf_suggest(trial)
                model = RandomForestClassifier(**params)
            else:
                params = _xgb_suggest(trial, n_classes)
                model = XGBClassifier(**params)
            # fem servir f1_weighted per robustesa multiclasse desequilibrada
            return _cv_score(model, X_train, y_train, scoring="f1_weighted", cv_splits=3)

        study = optuna.create_study(direction="maximize")
        study.optimize(objective, n_trials=n_trials, show_progress_bar=False)
        best_params = study.best_params

        # Construïm el model final amb els millors hiperparàmetres
        if model_type == "randomforest":
            model = RandomForestClassifier(n_jobs=-1, random_state=random_state, **best_params)
        else:
            # Completem params obligats per XGB
            xgb_params = {**best_params}
            if model_type == "xgboost":
                if n_classes == 2 and "objective" not in xgb_params:
                    xgb_params["objective"] = "binary:logistic"
                elif n_classes > 2:
                    xgb_params["objective"] = "multi:softprob"
                    xgb_params["num_class"] = n_classes
                xgb_params.setdefault("tree_method", "hist")
                xgb_params.setdefault("n_jobs", -1)
                xgb_params.setdefault("random_state", random_state)
            model = XGBClassifier(**xgb_params)
    else:
        # Defaults sensats
        if model_type == "randomforest":
            model = RandomForestClassifier(
                n_estimators=500, max_depth=None, min_samples_split=2, min_samples_leaf=1,
                max_features="sqrt", bootstrap=True, n_jobs=-1, random_state=random_state
            )
        else:
            params = dict(
                n_estimators=600, max_depth=8, learning_rate=0.05, subsample=0.9,
                colsample_bytree=0.9, min_child_weight=1.0, reg_lambda=1.0, reg_alpha=0.0,
                random_state=random_state, n_jobs=-1, tree_method="hist",
                eval_metric="mlogloss"
            )
            params["objective"] = "binary:logistic" if n_classes == 2 else "multi:softprob"
            if n_classes > 2:
                params["num_class"] = n_classes
            model = XGBClassifier(**params)

    # ---------- Train ----------
    model.fit(X_train, y_train)

    # ---------- Prediccions ----------
    y_pred = model.predict(X_test)
    y_proba = None
    if hasattr(model, "predict_proba"):
        try:
            y_proba = model.predict_proba(X_test)
        except Exception:
            y_proba = None

    # ---------- Mètriques ----------
    metrics = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "balanced_accuracy": float(balanced_accuracy_score(y_test, y_pred)),
        "f1_micro": float(f1_score(y_test, y_pred, average="micro")),
        "f1_macro": float(f1_score(y_test, y_pred, average="macro")),
        "f1_weighted": float(f1_score(y_test, y_pred, average="weighted")),
        "precision_micro": float(precision_score(y_test, y_pred, average="micro", zero_division=0)),
        "precision_macro": float(precision_score(y_test, y_pred, average="macro", zero_division=0)),
        "precision_weighted": float(precision_score(y_test, y_pred, average="weighted", zero_division=0)),
        "recall_micro": float(recall_score(y_test, y_pred, average="micro")),
        "recall_macro": float(recall_score(y_test, y_pred, average="macro")),
        "recall_weighted": float(recall_score(y_test, y_pred, average="weighted")),
        "mcc": float(matthews_corrcoef(y_test, y_pred)),
        "cohen_kappa": float(cohen_kappa_score(y_test, y_pred)),
        "classification_report": classification_report(y_test, y_pred, target_names=classes_)
    }

    # ROC-AUC i LogLoss si tenim probabilitats
    if y_proba is not None:
        try:
            if n_classes == 2:
                metrics["roc_auc"] = float(roc_auc_score(y_test, y_proba[:, 1]))
            else:
                metrics["roc_auc_ovr_weighted"] = float(
                    roc_auc_score(y_test, y_proba, multi_class="ovr", average="weighted")
                )
            metrics["log_loss"] = float(log_loss(y_test, y_proba))
        except Exception:
            pass

    # ---------- Plots ----------
    plot_feature_importances(model, X.columns, model_type)
    plot_confusion_matrix(y_test, y_pred, labels=classes_)
    plot_roc_curve(y_test, y_proba, n_classes)

    # ---------- Retorn ----------
    return {
        "metrics": metrics,
        "best_params": best_params,
        "labels": classes_,
        "model_type": model_type
    }, model
