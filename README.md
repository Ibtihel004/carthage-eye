# Carthage Eye

**Satellite eyes on Tunisia's water, vegetation, floods and fires.**
A bilingual (English / Arabic) web map that turns free satellite and weather data into plain-language insights for any place in Tunisia. Built for the hackathon theme *space in the service of ecology and the environment*.

> Demonstration prototype. Not an official warning service and not validated against past events. See `methods.html`.

## What it does

Click anywhere in Tunisia and get:

- **Vegetation and water** from Sentinel-2 (NDVI, NDWI), with a monthly cycle and a 2010-2025 MODIS trend
- **A water-stress index** (demo) and what-if sliders for rainfall and irrigation, with projections to 2032
- **Land-surface class**: water, urban, dense vegetation, cropland, steppe or bare soil
- **Flood susceptibility**: where water would collect, from surface-water history, elevation and slope
- **Fire history**: days with a satellite fire detection, 2021-2025
- **Live 16-day forecast** of rain and river flow, with draft written advice
- **Regional heavy-rain watch** and **fire-danger watch** for the 24 governorates, with lead time and confidence
- **Compare two places**, CSV export, and an El Niño status banner

Every layer is labelled "demo" or "validated", with its source and period.

## Why it is honest

It never claims to predict a flood or a fire. It shows susceptibility, history and weather-based watches, states its confidence by lead time, and points users to the official sources (INM and civil protection). None of the scores has been back-tested yet, and the app says so.

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
firewatch.js               regional fire-danger watch
methods.html               methods, data sources and limits
data/                      PNG grids (400 px wide, about 1 km per cell) and JSON files
scripts/                   Google Earth Engine scripts that produce the PNGs
```

## Data

| Layer | Source |
|---|---|
| NDVI, NDWI | ESA Copernicus Sentinel-2 SR, 2025 monthly median |
| Vegetation trend | NASA MODIS MOD13A2 NDVI, 2010-2025 |
| Built-up share | JRC GHSL GHS-BUILT-S, 2020 |
| Flood susceptibility | JRC Global Surface Water + SRTM elevation and slope |
| Fire history | NASA FIRMS (MODIS thermal anomalies), 2021-2025 |
| Forecasts | Open-Meteo (weather and river discharge) |
| El Niño status | NOAA CPC (`data/enso.json`, updated by hand) |
| Map and place names | OpenStreetMap |

## Regenerating the data

Run the scripts in `scripts/` in the Google Earth Engine Code Editor, click each printed link and save the image into `data/` under the name shown. `01` and `02` are reconstructions of the original scripts. They use the same encoding the app decodes.

## Limits

No ignition or flood-date prediction. Forecasts lose skill beyond about a week. Thresholds are demonstration values. Cells are about 1 km. MODIS fire detections include gas flares and crop burning. Full list in `methods.html`.

## Licence and credits

Code: MIT (see `LICENSE`). Data belongs to the providers above, please credit them. Open-Meteo's free tier is for non-commercial use.
