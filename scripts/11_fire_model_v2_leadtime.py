# 11_fire_model_v2_leadtime.py
# Scores the version 2 fire model on archived Open-Meteo forecasts, 1 to 7 days ahead, June-Sept 2024-2025.
# Inputs : results/fire_training_table_2003_2025.csv (script 08), results/forecast_leadtime_2024_2025.csv (made by scripts/10_forecast_test_tool.html)
# Output : results/fire_model_v2_leadtime.csv
# Run    : pip install pandas numpy scikit-learn ; python scripts/11_fire_model_v2_leadtime.py
import pandas as pd,numpy as np,glob,warnings
warnings.filterwarnings('ignore')
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler,OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import make_pipeline
from sklearn.metrics import roc_auc_score,brier_score_loss
d=pd.read_csv('results/fire_training_table_2003_2025.csv')
d['doy2']=d.doy**2;d['rain_log']=np.log1p(d.rain);d['r7l']=np.log1p(d.rain7);d['r30l']=np.log1p(d.rain30)
tr=d[d.year<=2020]
W=['tmax','rh','rain_log','wind','r7l','r30l'];D=['doy','doy2']
def fit(num,gov):
    parts=([('n',StandardScaler(),num)] if num else [])+([('g',OneHotEncoder(handle_unknown='ignore'),['gov'])] if gov else [])
    cols=num+(['gov'] if gov else [])
    return make_pipeline(ColumnTransformer(parts),LogisticRegression(max_iter=3000)).fit(tr[cols],tr.fire),cols
mv2,cv2=fit(W+D,1);mgd,cgd=fit(D,1)
f=pd.read_csv('results/forecast_leadtime_2024_2025.csv')
f['date']=pd.to_datetime(f.date)
# past rain from lead-1 forecasts, one series per gov
l1=f[f.lead==1][['gov','date','rain_lead1']].drop_duplicates().sort_values(['gov','date'])
l1['rain7']=l1.groupby('gov').rain_lead1.transform(lambda s:s.shift(1).rolling(7,min_periods=7).sum())
l1['rain30']=l1.groupby('gov').rain_lead1.transform(lambda s:s.shift(1).rolling(30,min_periods=30).sum())
f=f.merge(l1[['gov','date','rain7','rain30']],on=['gov','date'])
f['rh']=100*np.exp(17.625*f.dew/(243.04+f.dew))/np.exp(17.625*f.tmax/(243.04+f.tmax))
f['rh']=f.rh.clip(upper=100)
f['doy']=f.date.dt.dayofyear;f['doy2']=f.doy**2
f['rain_log']=np.log1p(f.rain);f['r7l']=np.log1p(f.rain7);f['r30l']=np.log1p(f.rain30)
f=f[(f.date.dt.month>=6)&(f.date.dt.month<=9)].dropna(subset=['rain7','rain30'])
f['dstr']=f.date.dt.strftime('%Y-%m-%d')
lab=d[d.year>=2024][['gov','date','fire','tmax','rh','rain','wind','doy']].rename(columns={'date':'dstr','tmax':'e_tmax','rh':'e_rh','rain':'e_rain','wind':'e_wind','doy':'e_doy'})
f=f.merge(lab,on=['gov','dstr']);print('rows per lead',f.groupby('lead').size().iloc[0],'fires',f[f.lead==1].fire.sum(),'rate',round(f[f.lead==1].fire.mean(),4))
# bias vs ERA5 same days
for c in ['tmax','rh','rain','wind']:
    g=f.groupby('lead').apply(lambda x:pd.Series({'bias':(x[c]-x['e_'+c]).mean(),'corr':np.corrcoef(x[c],x['e_'+c])[0,1]}))
    print(c,'bias lead1/4/7',g.bias.loc[[1,4,7]].round(2).tolist(),'corr',g['corr'].loc[[1,4,7]].round(2).tolist())
def top10(y,p):
    k=int(round(len(p)*0.1));i=np.argsort(-p)[:k];return y[i].sum()/y.sum()
dates=np.array(sorted(f.dstr.unique()));rng=np.random.default_rng(0)
res=[]
# ERA5 reference on same rows (lead 1 rows' era features)
e=f[f.lead==1].copy()
for c in ['tmax','rh','rain','wind']:e[c]=e['e_'+c]
e['rain_log']=np.log1p(e.rain)
e7=d[d.year>=2024][['gov','date','rain7','rain30']].rename(columns={'date':'dstr'});e=e.drop(columns=['rain7','rain30','r7l','r30l']).merge(e7,on=['gov','dstr']);e['r7l']=np.log1p(e.rain7);e['r30l']=np.log1p(e.rain30)
y=e.fire.values;pe=mv2.predict_proba(e[cv2])[:,1];pg=mgd.predict_proba(e[cgd])[:,1]
print(f"ERA5 inputs  v2 AUC {roc_auc_score(y,pe):.3f} Brier {brier_score_loss(y,pe):.4f} top10 {top10(y,pe):.2f} | gov+doy AUC {roc_auc_score(y,pg):.3f} Brier {brier_score_loss(y,pg):.4f} top10 {top10(y,pg):.2f}")
print('lead  AUC_v2  AUC_gov+doy  diff[95%]   Brier_v2  Brier_gd  top10_v2  mean_pred  obs')
for L in range(1,8):
    x=f[f.lead==L].reset_index(drop=True);y=x.fire.values
    p=mv2.predict_proba(x[cv2])[:,1];q=mgd.predict_proba(x[cgd])[:,1]
    byd={u:np.where(x.dstr.values==u)[0] for u in dates}
    ds=[]
    for _ in range(300):
        s=np.concatenate([byd[u] for u in rng.choice(dates,len(dates))]);ds.append(roc_auc_score(y[s],p[s])-roc_auc_score(y[s],q[s]))
    lo,hi=np.percentile(ds,[2.5,97.5])
    print(f"{L}   {roc_auc_score(y,p):.3f}   {roc_auc_score(y,q):.3f}   {roc_auc_score(y,p)-roc_auc_score(y,q):+.3f} [{lo:+.3f},{hi:+.3f}]  {brier_score_loss(y,p):.4f}  {brier_score_loss(y,q):.4f}  {top10(y,p):.2f}  {p.mean():.3f}  {y.mean():.3f}")
    res.append(dict(lead=L,auc_v2=round(roc_auc_score(y,p),3),auc_gov_doy=round(roc_auc_score(y,q),3),auc_diff=round(roc_auc_score(y,p)-roc_auc_score(y,q),3),diff_lo=round(lo,3),diff_hi=round(hi,3),brier_v2=round(brier_score_loss(y,p),4),brier_gov_doy=round(brier_score_loss(y,q),4),top10_share_v2=round(top10(y,p),2),mean_predicted=round(p.mean(),3),observed_rate=round(y.mean(),3)))
pd.DataFrame(res).to_csv('results/fire_model_v2_leadtime.csv',index=False)
# pooled calibration lead 1-3
x=f[f.lead<=3];p=mv2.predict_proba(x[cv2])[:,1];y=x.fire.values
t=pd.DataFrame({'p':p,'y':y,'b':pd.qcut(p,5)}).groupby('b').agg(pred=('p','mean'),obs=('y','mean'),n=('y','size')).round(3);print(t)
