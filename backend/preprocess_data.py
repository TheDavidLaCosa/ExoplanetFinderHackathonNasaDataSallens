import pandas as pd
import numpy as np
import seaborn as sns

from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
import matplotlib.pyplot as plt

import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score
from sklearn.metrics import confusion_matrix, ConfusionMatrixDisplay


def montecarlo (dataset, col):

    if dataset[col].dtype in ["int64", "float64"]:
        if dataset[col].isna().sum() > 0:
            mean = dataset[col].mean()
            std = dataset[col].std()
            # Generem valors aleatoris
            random_values = np.random.normal(mean, std, size=dataset[col].isna().sum())
            dataset.loc[dataset[col].isna(), col] = random_values
    return dataset[col]
def control_nulls(dataset,level):
    
    for col in dataset.columns:
        nan_counts = dataset[col].isna().sum()
        nan_percent = (nan_counts / len(dataset[col])) * 100
        #print(f"{col}: {nan_counts[col]} NaN; {nan_percent[col]:.2f}%")
        level_col =nan_percent
        if level_col<level:
           dataset[col]= montecarlo(dataset, col)
        else:
            dataset.drop(columns=[col], inplace=True)
    return dataset


def pca(data, model,level):
    data= control_nulls(data,level)
    num_cols = data.select_dtypes(include=[np.number]).columns

    correlation = data[num_cols].corr()

    # Heatmap
    plt.figure(figsize=(15, 15))
    sns.heatmap(
        correlation,
        annot=True,         # mostra valors
        cmap="icefire",     # esquema de colors
        fmt=".2f",          # format dels números
        cbar=True
    )
    plt.title("Numeric_variables_correlation", fontsize=14)
    plt.xticks(rotation=45, ha="right")
    plt.yticks(rotation=0)
    plt.tight_layout()
    # Guardar como imagen JPG
    plt.savefig("./img/Correlation_numeric_values.jpg", format="jpg", dpi=800)
    #plt.show()

    #pca
    X = data[num_cols]

    # Escalem les dades (molt important en PCA)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    pca = PCA()
    X_pca = pca.fit_transform(X_scaled)

    # Loadings)
    loadings = pd.DataFrame(
        pca.components_,
        columns=num_cols,
        index=[f"PC{i+1}" for i in range(len(num_cols))]
    )
    

    cumulative_variance = np.cumsum(pca.explained_variance_ratio_)

    
    # Gràfic
    plt.figure(figsize=(8,5))
    plt.plot(range(1, len(num_cols)+1), cumulative_variance, marker='o', linestyle='--')
    plt.axhline(y=0.8, color='r', linestyle='-')  # línia de tall 80%
    plt.title("Cumulative Explained Variance")
    plt.xlabel("Principal component")
    plt.ylabel("Cumulative Variance Ratio")
    plt.grid(True)
    
    # Marcar el punt on s'arriba al 80%
    n_components_80 = np.argmax(cumulative_variance >= 0.8) + 1
    #print('n_components_80')
    #print(n_components_80)
    plt.axvline(x=n_components_80, color='g', linestyle='--')
    plt.text(n_components_80+0.2, 0.82,
            f"          {n_components_80} components → {cumulative_variance[n_components_80-1]*100:.1f}%",
            color="g")
    plt.title("Cumulative Explained Variance 80%")
    plt.savefig("./img/80_per_cent_PCA.jpg", format="jpg", dpi=300)
    #plt.show()

    X_scaled = StandardScaler().fit_transform(data[num_cols])

    # PCA amb 17 components
    pca_17 = PCA(n_components=n_components_80)
    X_pca_17 = pca_17.fit_transform(X_scaled)

    # Creem un DataFrame amb els 17 components
    dataset_pca = pd.DataFrame(
        X_pca_17,
        columns=[f"PC{i+1}" for i in range(17)]
    )
    
    num_cols_pca = dataset_pca.select_dtypes(include=[np.number]).columns

    correlation_pca = dataset_pca[num_cols_pca].corr()

    # Heatmap
    plt.figure(figsize=(15, 15))
    sns.heatmap(
        correlation_pca,
        annot=True,         # mostra valors
        cmap="icefire",     # esquema de colors
        fmt=".2f",          # format dels números
        cbar=True
    )
    
    plt.title("Numeric_variables_correlation_pca", fontsize=14)
    plt.xticks(rotation=45, ha="right")
    plt.yticks(rotation=0)
    plt.tight_layout()
    # Guardar como imagen JPG
    plt.savefig("./img/Correlation_numeric_values_pca.jpg", format="jpg", dpi=800)
    #plt.show()



    return data, dataset_pca, model

def process_data (columns , level, target):  
    dataset = pd.read_csv("./uploads/dataset.csv", sep = ",")
    target='a'#dataset[target]
    dataset.drop(columns=target)

    df_filtrado = dataset.drop(columns=[col for col in columns if col not in dataset.columns])
    print(df_filtrado.head())

    d,d_pca, m, = pca (df_filtrado,'xgboost',level)
    #d.to_csv('data.csv')
    #d_pca.to_csv('data_pca.csv')
    return d,d_pca,m,target