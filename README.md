# Carthage Eye

**Satellite eyes on Tunisia's water, vegetation, floods and fires.**
A bilingual (English / Arabic) web map that turns free satellite and weather data into plain-language insights for any place in Tunisia. Built for the hackathon theme *space in the service of ecology and the environment*.

**Live demo:** https://ibtihel004.github.io/carthage-eye/

> Demonstration prototype. Not an official warning service and not validated against past events. See `methods.html`.

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

It never claims to predict a flood or a fire. It shows susceptibility, history and weather-based watches, states its confidence by lead time, and points users to the official sources (INM and civil protection). Only the machine-learning zones have been checked against a reference map (see below). The flood, fire and water-stress scores have not been back-tested yet, and the app says so.

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
sources.json               data-source list shown in the panel
methods.html               methods, data sources, validation and limits
data/                      PNG grids (400 px wide, about 1 km per cell) and JSON files
scripts/                   Google Earth Engine scripts that produce the PNGs
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
| Forecasts | Open-Meteo (weather and river discharge) |
| El Niño status | NOAA CPC (`data/enso.json`, updated by hand) |
| Map and place names | OpenStreetMap |

## Regenerating the data

Run the scripts in `scripts/` in the Google Earth Engine Code Editor, click each printed link and save the image into `data/` under the name shown. `01` and `02` are reconstructions of the original scripts. They use the same encoding the app decodes. The k-means zones need no extra data: they are computed from the NDVI and NDWI images.

`data/worldcover.png` comes from this short script. The WorldCover class codes are stored directly as grey levels, so keep `min: 0` and `max: 255`.

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

No ignition or flood-date prediction. Forecasts lose skill beyond about a week. Thresholds are demonstration values. Cells are about 1 km. MODIS fire detections include gas flares and crop burning. The El Niño banner is context only: its effect on Tunisian rainfall is weak and uncertain. The k-means zones agree only modestly with WorldCover (see above). The flood, fire and water-stress scores are untested against past events. Full list in `methods.html`.

## About
Built by Ibtihel (Tunisia) and Farah Ben Abid (Tunisia).

- **Ibtihel Aguibi:** co-author of a wetland-classification paper using Random Forest on satellite imagery, accepted at SPACESTAR and IEEE conferences. Participant in international mathematical olympiads (EGMO, PAMO).
- **Farah Ben Abid:** co-founder of an ecological start-up.

## Licence and credits

Code: MIT (see `LICENSE`). Data belongs to the providers above, please credit them. Open-Meteo's free tier is for non-commercial use.
