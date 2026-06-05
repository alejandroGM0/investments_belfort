import pandas as pd
import numpy as np
from sklearn.cluster import DBSCAN
from belfort.data.loader import load
from scipy.signal import argrelextrema

df = load("BTCUSDT", "1D", since="1y")
prices = df["low"].to_numpy(float)
window = 15
threshold_pct = 0.015
min_touches = 1

idx = argrelextrema(prices, np.less, order=window)[0]
pivots_arr = np.sort(prices[idx])

# original
clusters_orig = []
current_cluster = [pivots_arr[0]]
for p in pivots_arr[1:]:
    centroid = np.mean(current_cluster)
    if abs(p - centroid) / centroid <= threshold_pct:
        current_cluster.append(p)
    else:
        clusters_orig.append(current_cluster)
        current_cluster = [p]
clusters_orig.append(current_cluster)

orig_means = [np.mean(c) for c in clusters_orig if len(c) >= min_touches]
print("Orig means:", orig_means)

# dbscan
log_pivots = np.log(pivots_arr).reshape(-1, 1)
db = DBSCAN(eps=threshold_pct, min_samples=min_touches)
labels = db.fit_predict(log_pivots)
clusters_db = []
for label in set(labels):
    if label == -1: continue
    clusters_db.append(pivots_arr[labels == label])

db_means = sorted([np.mean(c) for c in clusters_db])
print("DBSCAN means:", db_means)

