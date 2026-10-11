# 09_fire_model_v2.py
# Fire-day probability model, version 2. Back-test only.
# Input : results/fire_training_table_2003_2025.csv (made by scripts/08_fire_training_table.js)
# Train : 2003-2020. Test: 2021-2025. Nothing is tuned on the test years.
# Run   : pip install pandas numpy scikit-learn ; python scripts/09_fire_model_v2.py
import pandas as pd, numpy as np, warnings
warnings.filterwarnings('ignore')
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import make_pipeline
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import roc_auc_score, brier_score_loss

d = pd.read_csv('results/fire_training_table_2003_2025.csv')
d['doy2'] = d.doy ** 2
d['rain_log'] = np.log1p(d.rain); d['r7l'] = np.log1p(d.rain7); d['r30l'] = np.log1p(d.rain30)
tr, te = d[d.year <= 2020], d[d.year >= 2021]
y = te.fire.values
W = ['tmax', 'rh', 'rain_log', 'wind', 'r7l', 'r30l']; D = ['doy', 'doy2']

def top10(y, p):
    k = int(round(len(p) * 0.1)); i = np.argsort(-p)[:k]; return y[i].sum() / y.sum()

def logit(num, gov):
    parts = ([('n', StandardScaler(), num)] if num else []) + ([('g', OneHotEncoder(handle_unknown='ignore'), ['gov'])] if gov else [])
    cols = num + (['gov'] if gov else [])
    m = make_pipeline(ColumnTransformer(parts), LogisticRegression(max_iter=3000)).fit(tr[cols], tr.fire)
    return m.predict_proba(te[cols])[:, 1]

P = {}
P['constant (train rate)'] = np.full(len(te), tr.fire.mean())
rule = ((te.tmax >= 35) & (te.rh <= 25) & (te.rain < 5)).values
P['old rule (v1)'] = np.where(rule, y[rule].mean(), y[~rule].mean())   # rates taken from the test years: optimistic
P['day of year only'] = logit(D, 0)
P['weather only'] = logit(W, 0)
P['weather + day of year'] = logit(W + D, 0)
P['governorate only'] = logit([], 1)
P['governorate + day of year'] = logit(D, 1)
P['governorate + weather + day of year (v2)'] = logit(W + D, 1)
g = HistGradientBoostingClassifier(learning_rate=0.06, max_depth=2, max_iter=100, min_samples_leaf=100,
                                   l2_regularization=1.0, random_state=0)   # settings chosen by year-grouped CV on 2003-2020
gc = ['tmax', 'rh', 'rain', 'wind', 'rain7', 'rain30', 'doy']
P['gradient boosting (no governorate)'] = g.fit(tr[gc], tr.fire).predict_proba(te[gc])[:, 1]

rows = []
for n, p in P.items():
    r = {'model': n, 'auc': round(roc_auc_score(y, p), 3), 'brier': round(brier_score_loss(y, p), 4),
         'share_of_fires_in_top10pct_days': round(top10(y, p), 2)}
    for yr in range(2021, 2026):
        s = te.year.values == yr; r['auc_' + str(yr)] = round(roc_auc_score(y[s], p[s]), 2)
    rows.append(r)
res = pd.DataFrame(rows); print(res.to_string(index=False))
res.to_csv('results/fire_model_v2_results.csv', index=False)

p = P['governorate + weather + day of year (v2)']
cal = pd.DataFrame({'p': p, 'y': y, 'band': pd.qcut(p, 10, duplicates='drop')}).groupby('band').agg(
    predicted=('p', 'mean'), observed=('y', 'mean'), days=('y', 'size'), fires=('y', 'sum')).round(3)
print(cal); cal.to_csv('results/fire_model_v2_calibration.csv')
