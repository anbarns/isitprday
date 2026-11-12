# Is it PR day?

Live wind checks for PR attempts on local climbs. Static site, no build step, no server.
Weather comes from Open-Meteo in the visitor's browser.

## Layout

```
index.html            Homepage: one card per route with a live verdict
griffith/index.html   Route page for Griffith Park Hill Climb
routes/griffith.js    Route data (line, elevation, tuning)
assets/engine.js      Shared math: geometry, weather, power model, settings
assets/route.js       Route page UI
assets/app.css        Styles
og/                   Link preview images (1200x630)
favicon.svg, apple-touch-icon.png
```

## Adding a route

1. Create `routes/<id>.js` by copying `routes/griffith.js`. Set `id`, `name`, `area`, `strava`,
   `ftpPct` (share of FTP for a climb that long: about 1.05 for 15 to 20 min, 0.95 for 40 to 60 min),
   `factor` (0.92 to 0.95 if you have no real effort to tune from), optional `groupRide`, and `pts`
   as `[lat, lon, elevation_m]` points from bottom to top. Elevation is optional; without it the
   site looks it up.
2. Copy the `griffith/` folder to `<id>/`. In its `index.html`, change the title and og tags,
   `window.ROUTE_ID`, and the `routes/<id>.js` script tag.
3. Add `<script src="routes/<id>.js"></script>` to the homepage `index.html`.
4. Optional: make `og/<id>.png` for the link preview.

## Settings storage

Weight, bike weight, FTP, units and model settings are shared across routes.
Power and PR are saved per route. Everything lives in the visitor's own browser.

## Share links

Route pages accept `?w=185&b=18&p=324&pr=15:39&prw=324&ftp=290&u=lb` (weights in lb).
