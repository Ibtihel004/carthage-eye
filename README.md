# Carthage Eye

**Satellite eyes on Tunisia's water, vegetation, floods and fires.**
A bilingual (English / Arabic) web map that turns free satellite and weather data into plain-language insights for any place in Tunisia. Built for the hackathon theme *space in the service of ecology and the environment*.

**Live demo:** https://ibtihel004.github.io/carthage-eye/

> Demonstration prototype. Not an official warning service and only partly tested against past events (see below and `methods.html`).

## What it does

Click anywhere in Tunisia and get:

- **Vegetation and water** from Sentinel-2 (NDVI, NDWI), with a monthly cycle and a 2010-2025 MODIS trend
- **A water-stress index** (demo) and what-if sliders for rainfall and irrigation, with projections to 2032
- **Land-surface class**: water, urban, dense vegetation, cropland, steppe or bare soil
- **Reference spectral signature** of that surface type (typical Sentinel-2 values, not measured at the clicked pixel)
- **Machine-learning zones**: k-means clustering groups the country into climate-vegetation zones from each pixel's yearly NDVI and NDWI curve, and tells you which zone you clicked
- **Flood susceptibility**: where water would collect, from surface-water history, elevation and slope
- **Fire history**: days with a satellite fire detection, 2021-2025
- **Live 16-day forecast** of rain and river flow, with draft written advice
- **Regional heavy-rain watch** and **fire-danger watch** for the 24 governorates, with lead time and confidence
- **Compare two places**, CSV export, and an El Niño status banner

Every layer is labelled "demo" or "validated", with its source and period.

## Hackathon track

Hyperspectral data track. The prototype runs on multispectral Sentinel-2 (13 bands, of which the app uses the green, red and near-infrared bands for NDVI and NDWI). The data pipeline is band-agnostic: the same per-pixel features and the same clustering can take the 200+ bands of hyperspectral sources such as EnMAP, PRISMA or EMIT. Those sensors are not used yet.

## Why it is honest

It never claims to predict a flood or a fire. It shows susceptibility, history and weather-based watches, states its confidence by lead time, and points users to the official sources (INM and civil protection). Two things have been checked against reference data: the machine-learning zones (against ESA WorldCover) and the weather part of the fire-danger rule (against satellite fire detections, with a weak result). The heavy-rain watch, the flood susceptibility map and the water-stress score have not been tested against past events, and the app says so.

## Machine learning: climate-vegetation zones

**Method.** Every pixel on the 1 km grid gets a 24-number fingerprint: its NDVI for each of the 12 months of 2025, then its NDWI for each month. K-means clustering (k-means++ initialisation, fixed random seed so results repeat, k = 4 to 8, default 6) groups pixels with similar curves. It trains on a sample of every 4th pixel in each direction, then assigns all valid pixels to their nearest zone. Pixels with fewer than 9 clear months are skipped, and gaps in the remaining pixels are filled with that pixel's own mean.

**Unsupervised.** No labels are used. The algorithm finds the groups. The zone names (for example "Dense vegetation or forest", "Steppe and rangeland", "Desert and bare soil") are given afterwards by reading each zone's average NDVI and NDWI curve, using simple thresholds. They are an interpretation, not output of the model.

**Runs in the browser** (`kmeans.js`) on the same PNG grids the rest of the app already reads. There is nothing to install.

**Check against ESA WorldCover.** After clustering, the app compares the zones with ESA WorldCover (2021), a satellite land-cover map, on the 1 km grid (about 168,000 pixels, 6 zones). A baseline cuts pixels into the same number of equal-sized groups by mean yearly NDVI only.

| Measure | K-means zones | NDVI-only baseline |
|---|---|---|
| Purity | 75% | 73% |
| Normalised mutual information | 0.37 | 0.35 |
| Adjusted Rand index | 0.42 | 0.20 |

How to read it:
- The zones add only a modest amount beyond a vegetation-level split. On purity and mutual information they are about two points better.
- The Rand index gap overstates the benefit: about two thirds of Tunisia is desert, and equal-sized baseline groups split the desert artificially.
- Zone names agree with WorldCover for 87% of pixels, but the list of accepted WorldCover classes is fixed in the code and is generous. One zone, "Steppe and rangeland", is 47% cropland in WorldCover, so that name fits poorly.
- WorldCover is itself a satellite-derived map, not field data. Neighbouring pixels are not independent, so the figures are descriptive.

**Limits.**
- It is not a validated land-cover map. It shows agreement with another map, not accuracy on the ground.
- It uses one year (2025) of monthly composites, so it describes that year, not a long-term climate.
- Small features such as sebkhas or oases can be absorbed into larger zones at 1 km. The "Zones" selector changes the number of groups.
- Zones with similar curves can share a name, shown with "(2)".

## Back-test of the fire-danger rule

**What was tested.** The weather part of the fire-danger watch (maximum temperature 35°C or more, humidity 25% or less, rain under 5 mm) on every day from 1 June to 30 September, 2021 to 2025, in the 11 northern governorates (6,710 governorate-days). A fire counts when NASA FIRMS records at least one detection (confidence 50 or higher) in the same governorate on the same day. Weather is ERA5-Land daily reanalysis. The northern governorates were chosen to avoid the gas flares of the south.

| Year | Flagged days | Fire detected on flagged days | Fire detected on other days | Ratio |
|---|---|---|---|---|
| 2021 | 216 | 34 of 216 (15.7%) | 59 of 1,126 (5.2%) | 3.00 |
| 2022 | 212 | 23 of 212 (10.8%) | 91 of 1,130 (8.1%) | 1.35 |
| 2023 | 182 | 12 of 182 (6.6%) | 37 of 1,160 (3.2%) | 2.07 |
| 2024 | 150 | 5 of 150 (3.3%) | 52 of 1,192 (4.4%) | 0.76 |
| 2025 | 80 | 5 of 80 (6.3%) | 76 of 1,262 (6.0%) | 1.04 |
| **All years** | **840** | **79 of 840 (9.4%)** | **315 of 5,870 (5.4%)** | **1.75** |

The ratio is how often a fire was detected on flagged days divided by how often on other days (1 means no better than chance). The counts are in `results/fire_backtest_2021_2025.csv`.

How to read it:
- Flagged days had a detection about 1.75 times as often as other days. The simple 95% interval (1.4 to 2.2) ignores the correlation between neighbouring days and governorates, so it is too narrow.
- The rule is better than chance overall but weak. It caught 20% of the days with a detection, 91% of flagged days had none, and the ratio swings from 3.00 (2021) to 0.76 (2024).

What was not tested:
- The wind factor (ERA5-Land has no daily maximum wind), the adjustments for nearby fire history and low vegetation, and forecast skill, because reanalysis weather was used instead of the Open-Meteo forecast. The app's full rule is therefore not what was tested.
- Humidity is estimated from daily-mean dewpoint and daily-maximum temperature, an approximation. A governorate counts as having a fire if any detection falls inside it, so larger governorates have a higher chance by size alone.
- FIRMS detections include crop and stubble burning, which can happen on cooler days.
- Same-day comparison only. No lead time was tested.

The script is `scripts/07_fire_backtest.js`.

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
kmeans.js                  machine-learning zones and their check against WorldCover
flood.js                   flood susceptibility layer, river-flow minimum
outlook.js                 regional heavy-rain watch
fire.js                    fire history layer
firewatch.js               regional fire-danger watch
methods.html               methods, data sources, validation and limits
data/                      PNG grids (400 px wide, about 1 km per cell) and JSON files
scripts/                   01_ to 07_ Earth Engine scripts (PNG grids, WorldCover check, fire back-test)
results/                   fire_backtest_2021_2025.csv (back-test counts)
```

## Data

| Layer | Source |
|---|---|
| NDVI, NDWI | ESA Copernicus Sentinel-2 SR, 2025 monthly median |
| Climate-vegetation zones | Computed in the browser from the NDVI and NDWI grids above (k-means) |
| Zone check | ESA WorldCover v200 (2021), `data/worldcover.png`, used only to check the zones |
| Vegetation trend | NASA MODIS MOD13A2 NDVI, 2010-2025 |
| Built-up share | JRC GHSL GHS-BUILT-S, 2020 |
| Flood susceptibility | JRC Global Surface Water + SRTM elevation and slope |
| Fire history | NASA FIRMS (MODIS thermal anomalies), 2021-2025 |
| Fire back-test weather | ECMWF ERA5-Land daily reanalysis, used only for the back-test |
| Forecasts | Open-Meteo (weather and river discharge) |
| El Niño status | NOAA CPC (`data/enso.json`, updated by hand) |
| Map and place names | OpenStreetMap |

## Regenerating the data

Run the numbered scripts in `scripts/` (`01_` to `07_`) in the Google Earth Engine Code Editor. For the PNG grids, click each printed link and save the image into `data/` under the name shown. `01` and `02` are reconstructions of the original scripts. They use the same encoding the app decodes. The k-means zones need no extra data: they are computed from the NDVI and NDWI images. The fire back-test (`07_fire_backtest.js`) runs as five export tasks that write small CSV files to Google Drive.

`data/worldcover.png` comes from this short script (`06_worldcover.js`). The WorldCover class codes are stored directly as grey levels, so keep `min: 0` and `max: 255`.

```javascript
var rect = ee.Geometry.Rectangle([7.5, 30.2, 11.7, 37.4], null, false);
var tunisia = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017')
  .filter(ee.Filter.eq('country_na', 'Tunisia'));
var wc = ee.ImageCollection('ESA/WorldCover/v200').first().select('Map')
  .clip(tunisia.geometry());
print('worldcover', wc.getThumbURL({min: 0, max: 255, palette: ['000000', 'ffffff'],
  region: rect, crs: 'EPSG:3857', dimensions: '400x826', format: 'png'}));
```

## Limits

No ignition or flood-date prediction. Forecasts lose skill beyond about a week. Thresholds are demonstration values. Cells are about 1 km. MODIS fire detections include gas flares and crop burning. The El Niño banner is context only: its effect on Tunisian rainfall is weak and uncertain. The k-means zones agree only modestly with WorldCover (see above). The fire-danger rule showed weak and inconsistent skill in its back-test (see above). The heavy-rain watch, the flood susceptibility map and the water-stress score are untested against past events. Full list in `methods.html`.

## About

Built by Ibtihel Aguibi (Tunisia) and Farah Ben Abid.

- **Ibtihel Aguibi:** co-author of a wetland-classification paper using Random Forest on satellite imagery, accepted at SPACESTAR and IEEE conferences. Participant in international mathematical olympiads (EGMO, PAMO).
- **Farah Ben Abid:** co-founder of an ecological start-up.

## Licence and credits

Code: MIT (see `LICENSE`). Data belongs to the providers above, please credit them. Open-Meteo's free tier is for non-commercial use.
