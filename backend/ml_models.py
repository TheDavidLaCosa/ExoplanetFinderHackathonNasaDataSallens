from doctest import OutputChecker
import numpy as np
import os
import json
import seaborn as sns
import optuna
from optuna.samplers import TPESampler
import pandas as pd
import warnings
warnings.filterwarnings('ignore')
import xgboost as xgb
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score, ConfusionMatrixDisplay, average_precision_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
import matplotlib.pyplot as plt


class ExoplanetModelSelector:
	"""
	Simple selector: XGBoost, RandomForest, ...
	"""
	def __init__(self):
		self.available_models={
			'rf' : "Random Forest Classifier",
			"xgb": "XGBoost Classifier"
		}
		self.trained_model = {}
		self.results = {}
		self.best_params = {}
		self.study_results = {}
		self.plresults = False

	def create_random_forest(self, X_train: np.ndarray, y_train: np.ndarray) -> RandomForestClassifier:
		"""
		Creating Random Forest optimized
		"""
		X_values = np.asarray(X_train)
		y_values = np.asarray(y_train)
		def objective(trial):
			n_samples = len(y_values)
			min_leaf_max = max(1, min(500, n_samples // 50))
			min_samples_leaf = trial.suggest_int('min_samples_leaf', 1, min_leaf_max)
			min_split_max = max(2, min(2000, n_samples // 20))
			min_split_lower = max(2, 2 * min_samples_leaf)
			if min_split_max < min_split_lower:
				min_split_max = min_split_lower
			min_samples_split = trial.suggest_int('min_samples_split', min_split_lower, min_split_max)
			params = {
				'n_estimators': trial.suggest_int('n_estimators', 100, 500, step=50),
				'max_depth': trial.suggest_int('max_depth', 3, 30),
				'min_samples_leaf': min_samples_leaf,
				'min_samples_split': min_samples_split,
				'max_features': trial.suggest_categorical('max_features', ['sqrt', 'log2', 0.5, 0.8]),
				'bootstrap': trial.suggest_categorical('bootstrap', [True, False]),
				'class_weight': 'balanced',
				'random_state': 42,
				'n_jobs': -1
			}
			model = RandomForestClassifier(**params)
			min_class_count = int(np.min(np.bincount(y_values)))
			if min_class_count < 2:
				return 0.0
			n_splits_d = min(3, min_class_count)
			cv = StratifiedKFold(n_splits=n_splits_d, shuffle=True, random_state=42)
			scores = cross_val_score(model, X_values, y_values, cv=cv, scoring='roc_auc', n_jobs=-1)
			scores = scores[~np.isnan(scores)]
			return scores.mean() if len(scores) > 0 else 0.0

		study = optuna.create_study(
			direction='maximize',  # Max AUC
			sampler=TPESampler(seed=42),
			study_name='RandomForest_Optimization'
		)
		
		def progress_callback(study, trial):
			if trial.number % 10 == 0:
				try:
					best_auc = study.best_value
				except ValueError:
					best_auc = float('nan')
				print(f"  Trial {trial.number}: Best AUC = {best_auc:.4f}")
				
		study.optimize(objective, n_trials=50, callbacks=[progress_callback])
		self.best_params['rf'] = study.best_params
		self.study_results['rf'] = study
		params = study.best_params
		params['class_weight'] = 'balanced'
		params['random_state'] = 42
		params['n_jobs'] = -1
		return RandomForestClassifier(**params)

	def create_xgboost(self, X_train: np.ndarray, y_train: np.ndarray) -> dict:
		"""
		Creating XGboost optimized
		"""
		neg_count = np.sum(y_train == 0) #Optmizer scale-poss-weight
		pos_count = np.sum(y_train == 1)
		scale_weight = neg_count / pos_count if pos_count > 0 else 1.0

		def objective(trial):
			params = {
                'objective': 'binary:logistic',
                'eval_metric': 'auc',
                'max_depth': trial.suggest_int('max_depth', 3, 10),
                'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3, log=True),
                'n_estimators': trial.suggest_int('n_estimators', 100, 1000, step=50),
                'subsample': trial.suggest_float('subsample', 0.6, 1.0),
                'colsample_bytree': trial.suggest_float('colsample_bytree', 0.6, 1.0),
                'min_child_weight': trial.suggest_int('min_child_weight', 1, 10),
                'gamma': trial.suggest_float('gamma', 0, 0.5),
                'reg_alpha': trial.suggest_float('reg_alpha', 0, 1.0),
                'reg_lambda': trial.suggest_float('reg_lambda', 0, 2.0),
                'scale_pos_weight': scale_weight,
                'random_state': 42,
                'n_jobs': -1,
                'verbosity': 0
				}
			model = xgb.XGBClassifier(**params)
			cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
			scores = cross_val_score(model, X_train, y_train, cv=cv, scoring='roc_auc', n_jobs=-1)
			return scores.mean()
		study = optuna.create_study(
			direction='maximize',
			sampler=TPESampler(seed=42),
			study_name='XGBoost_Optimization'
			)
		
		def progress_callback(study, trial):
			if trial.number % 10 == 0:
				try:
					best_auc = study.best_value
				except ValueError:
					best_auc = float('nan')
				print(f"  Trial {trial.number}: Best AUC = {best_auc:.4f}")


		study.optimize(objective, n_trials=50, callbacks=[progress_callback])
		self.best_params['xgb'] = study.best_params
		self.study_results['xgb'] = study
		params = study.best_params
		params['scale_pos_weight'] = scale_weight
		params['objective'] = 'binary:logistic'
		params['eval_metric'] = 'auc'
		params['random_state'] = 42
		params['n_jobs'] = -1
		params['verbosity'] = 0
		return xgb.XGBClassifier(**params)

	def train_model(self,
					model_type: str,
					X_train: np.ndarray,
					y_train: np.ndarray,
					X_val: np.ndarray = None,
                	y_val: np.ndarray = None) -> object:
		"""
		Train model
		"""
		if model_type not in self.available_models:
			raise ValueError(f"Model: '{model_type}' dont found")
		if X_val is None or y_val is None:
			X_train_split, X_val, y_train_split, y_val = train_test_split(
			X_train, y_train, test_size=0.2, random_state=42, stratify=y_train)
		else:
			X_train_split, y_train_split = X_train, y_train
		
		if model_type == 'rf':
			model = self.create_random_forest(X_train_split, y_train_split)
			model.fit(X_train_split, y_train_split)
		elif model_type == 'xgb':
			model = self.create_xgboost(X_train_split, y_train_split)
			model.fit(
				X_train_split, y_train_split,
				eval_set=[(X_val, y_val)],
				early_stopping_rounds=20,
				verbose=False
			)
		self.trained_model[model_type] = model
		return model
	
	def evaluate_model(self,
						model_type: str,
						X_test: np.ndarray,
						y_test: np.ndarray):
		"""
		Evaluate model
		"""
		if model_type not in self.available_models:
			raise ValueError(f"Model: '{model_type}' dont found")
		model = self.trained_model[model_type]
		y_pred_prob = model.predict_proba(X_test)[:, 1]
		y_pred = model.predict(X_test)

		try:
			auc_score = roc_auc_score(y_test, y_pred_prob)
		except:
			auc_score = 0.5
		
		try:
			avg_precision = average_precision_score(y_test, y_pred_prob)
		except:
			avg_precision = 0.5
		report = classification_report(y_test, y_pred, output_dict=True)
		cm = confusion_matrix(y_test, y_pred)
		results = {
            'model_type': model_type,
            'auc_score': auc_score,
            'avg_precision': avg_precision,
            'accuracy': report['accuracy'],
            'precision': report['1']['precision'] if '1' in report else 0.0,
            'recall': report['1']['recall'] if '1' in report else 0.0,
            'f1_score': report['1']['f1-score'] if '1' in report else 0.0,
            'confusion_matrix': cm,
            'predictions': y_pred_prob,
            'classification_report': report
        }
		self.results[model_type] = results
		self.plresults = True
		return results

	def plot_results(self, model_type: str, X_test: np.ndarray, y_test: np.ndarray):
		"""
		Plots Results 
		"""
		if not self.plresults:
			raise ValueError(f"Results: not found")
		model = self.trained_model[model_type]
		y_pred = model.predict(X_test)
		cm = confusion_matrix(y_test, y_pred)
		plt.figure(figsize=(6,5))
		disp_cm = ConfusionMatrixDisplay(confusion_matrix=cm)
		disp_cm.plot(cmap="Blues", values_format="d", ax=plt.gca())
		plt.title("Confusion Matrix")

		os.makedirs("img", exist_ok=True)
		filepath = os.path.join("img", "confusion_matrix.png")
		plt.savefig(filepath, dpi=300, bbox_inches="tight")
		plt.show()
		plt.close()  


	def plot_classification_report(y_true, y_pred, figsize=(8, 6), cmap="Blues", title="Classification Report"):
		"""
		Plots a heatmap of the classification report.
		"""
		report_dict = classification_report(y_true, y_pred, output_dict=True)
		df = pd.DataFrame(report_dict).iloc[:-3, :].T
		df = df[["precision", "recall", "f1-score", "support"]]

		plt.figure(figsize=figsize)
		sns.heatmap(df.iloc[:, :-1], annot=True, fmt=".2f", cmap=cmap)
		plt.title(title)
		plt.ylabel("Classes")
		plt.xlabel("Metrics")
		plt.show()
		plt.close()  


def train_model(model_type: str, 
                      X_train: np.ndarray, 
                      y_train: np.ndarray,
                      X_test: np.ndarray, 
                      y_test: np.ndarray) -> dict:
	"""

    Parameters:
    -----------
    model_type : str
        Tipo de modelo: 'rf' o 'xgb'
    X_train : np.ndarray
        Features de entrenamiento (datos ya limpios)
    y_train : np.ndarray  
        Labels de entrenamiento
    X_test : np.ndarray
        Features de test
    y_test : np.ndarray
        Labels de test

    Returns:
    --------
    dict : Resultados completos del entrenamiento y evaluación
    """

	selector = ExoplanetModelSelector()

    # train
	model = selector.train_model(model_type, X_train, y_train)

    # Evaluate
	results = selector.evaluate_model(model_type, X_test, y_test)

	#Grafics & Results
	results_serializable = selector.results[model_type].copy()
	results_serializable['confusion_matrix'] = results['confusion_matrix'].tolist()
	results_serializable['predictions'] = results['predictions'].tolist()
	os.makedirs("results", exist_ok=True)
	filepath = os.path.join("results", f"{results['model_type']}_results.json")
	with open(filepath, "w") as f:
		json.dump(results_serializable, f, indent=4)
	selector.plot_results(model_type, X_test, y_test)
	return {
        'selector': selector,
        'model': model,
        'results': results
    }




def exoplanet_model_switch(data: pd.DataFrame, model_type: str, target: pd.DataFrame) -> dict:
	"""
    Switch the model

    Parameters:
    -----------
    data : dict
        Keys: X, y
        All arrays are cleaned
    model_type : str
        Type of model: 'rf', 'xgb', o 'exo'

    Returns:
    --------
    dict : Results of model
    """
	"""
	X_train = self
	y_train = self
	X_test =
	y_test =
	"""
	X = data
	y = target
	X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.1, random_state=42, stratify=y) #Train, test

    # SWITCH 
	if model_type in ['rf', 'xgb']:
		return train_model(model_type, X_train, y_train, X_test, y_test)
	else:
		raise ValueError(f"model_type debe ser 'rf', 'xgb': {model_type}")
