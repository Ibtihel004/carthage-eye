# Carthage Eye

**Satellite eyes on Tunisia's water, vegetation, floods and fires.**
A bilingual (English / Arabic) web map that turns free satellite and weather data into plain-language insights for any place in Tunisia. Built for the hackathon theme *space in the service of ecology and the environment*.

> Demonstration prototype. Not an official warning service and only partly validated against past events. See `methods.html`.

## What it does

Click anywhere in Tunisia and get:

- **Vegetation and water** from Sentinel-2 (NDVI, NDWI), with a monthly cycle and a 2010-2025 MODIS trend
- **A water-stress index** (demo) and what-if sliders for rainfall and irrigation, with projections to 2032
- **Land-surface class**: water, urban, dense vegetation, cropland, steppe or bare soil
- **Flood susceptibility**: where water would collect, from surface-water history, elevation and slope
- **Fire history**: days with a satellite fire detection, 2021-2025
- **Climate-vegetation zones**: k-means machine learning on 24 monthly values per pixel, checked against ESA WorldCover
- **Live 16-day forecast** of rain and river flow, with draft written advice
- **Regional heavy-rain watch** and **fire-danger watch** for the 24 governorates, with lead time and confidence
- **Compare two places**, CSV export, and an El Niño status banner

Every layer is labelled "demo" or "validated", with its source and period.

## Why it is honest

It never claims to predict a flood or a fire. It shows susceptibility, history and weather-based watches, states its confidence by lead time, and points users to the official sources (INM and civil protection). Where we could test something, we published the result, including the weak ones. The heavy-rain watch, flood susceptibility and water-stress score are not tested yet, and the app says so.

## Validation so far

| Part | Test | Result |
|---|---|---|
| Climate-vegetation zones | vs ESA WorldCover, 167,952 pixels | purity 75% (NDVI-only baseline 73%), NMI 0.37 (0.35), ARI 0.42 (0.20) |
| Fire-danger watch (version 1, in the app) | weather rule vs NASA FIRMS, 11 northern governorates, Jun-Sep 2021-2025, 6,710 governorate-days | fire on 9.4% of flagged days vs 5.4% of others (ratio 1.75). Catches 20% of fire days, 91% of flags had none. Weak |
| Fire-day probability model (version 2, back-test only, **not in the app**) | trained 2003-2020, tested 2021-2025 | AUC 0.80 vs 0.54 for version 1. 46% of fires fall on the 10% highest-rated days. Most skill comes from governorate and time of summer, weather adds a smaller part. Weather adds little beyond location and season |
| Fire model version 2 with real forecasts (1 to 7 days ahead, Open-Meteo archive, summers 2024-2025) | scored on archived forecasts | no measurable gain over a governorate + day-of-year model at 1 to 6 days, worse at 7 days. **Not used in the app** |
| Heavy-rain watch, flood susceptibility, water-stress score | none | untested, demo only |

Details, tables and limits: `methods.html`, section 5. Raw results: `results/`.

## Run it locally

The page reads image pixels, so it must be served over http (opening `index.html` directly will not work).

```bash
# option 1: VS Code, install "Live Server", right-click index.html, "Open with Live Server"
# option 2: any static server
python -m http.server 5500
# then open http://127.0.0.1:5500/index.html
```

## Project structure

```
index.html, style.css      page and styling
app.js                     map, layers, charts, model, panel (Leaflet + Chart.js)
flood.js                   flood susceptibility layer, river-flow minimum
outlook.js                 regional heavy-rain watch
fire.js                    fire history layer
firewatch.js               regional fire-danger watch (version 1 rule)
kmeans.js                  climate-vegetation zones and the WorldCover check
methods.html               methods, data sources, validation and limits
data/                      PNG grids (400 px wide, about 1 km per cell) and JSON files
scripts/                   Earth Engine scripts 01-08, Python model scripts 09 and 11, forecast download tool 10
results/                   back-test outputs and the fire training table
```

## Data

| Layer | Source |
|---|---|
| NDVI, NDWI | ESA Copernicus Sentinel-2 SR, 2025 monthly median |
| Vegetation trend | NASA MODIS MOD13A2 NDVI, 2010-2025 |
| Built-up share | JRC GHSL GHS-BUILT-S, 2020 |
| Flood susceptibility | JRC Global Surface Water + SRTM elevation and slope |
| Fire history | NASA FIRMS (MODIS thermal anomalies), 2021-2025 |
| Land-cover check | ESA WorldCover v200, 2021 |
| Fire back-tests | ECMWF ERA5-Land reanalysis + NASA FIRMS, June-September 2003-2025 |
| Forecasts | Open-Meteo (weather and river discharge) |
| El Niño status | NOAA CPC (`data/enso.json`, updated by hand) |
| Map and place names | OpenStreetMap |

## Regenerating the data and results

Run the scripts `01` to `08` in `scripts/` in the Google Earth Engine Code Editor, click each printed link and save the image or table into `data/` or `results/` under the name shown. `01` and `02` are reconstructions of the original scripts. They use the same encoding the app decodes. Then run `python scripts/09_fire_model_v2.py` (needs pandas, numpy, scikit-learn) to rebuild the version 2 results. For the forecast test, open `scripts/10_forecast_test_tool.html` with a local server, download the CSV, save it as `results/forecast_leadtime_2024_2025.csv`, then run `python scripts/11_fire_model_v2_leadtime.py`.

## Limits

No ignition or flood-date prediction. Forecasts lose skill beyond about a week. Thresholds are demonstration values. Cells are about 1 km. Fire detections include gas flares and crop burning. The fire models cover the northern governorates only. Full list in `methods.html`.

## Licence and credits

Code: MIT (see `LICENSE`). Data belongs to the providers above, please credit them. Open-Meteo's free tier is for non-commercial use.
