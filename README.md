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

1. Create `routes/<id>.js` by copying an existing route file. Fields:
   - `id`, `name`, `area` (town or park, no state), `state` (homepage heading, e.g. "California"), `strava`
   - `kind`: `"climb"` or `"sprint"` (changes wording and the explainer text)
   - `ftpPct`: share of FTP for an effort that long (about 1.05 for 15 to 20 min, 0.95 for 40 to 60 min, 2.5 for a 30 s sprint)
   - `factor`: model tuning from a real effort (0.92 for Griffith, 0.75 for Powell). Without one, 0.9 for climbs, 0.75 for sprints.
   - `shelter`: share of the 10 m forecast wind felt at rider height (0.5 sheltered climb, 0.65 open road)
   - `thresh`: seconds of help needed for a "Yes" (5 for a 15 min climb, 1 for a 30 s sprint)
   - optional `groupRide: { name, dow, hour }` and `tz` (defaults to America/Los_Angeles)
   - `pts`: `[lat, lon, elevation_m]` from start to finish
2. Add the route to `ROUTES` in `build/make_pages.py` and run `python3 build/make_pages.py` from the site folder.
   That writes `<id>/index.html` from `build/route-template.html`.
3. Add `<script src="routes/<id>.js"></script>` to the homepage `index.html`.
4. Optional: link preview image `og/<id>.png` (1200x630).

## Settings storage

Weight, bike weight, FTP, units, CdA and Crr are shared across routes.
Power, PR, shelter factor and threshold are saved per route. Everything lives in the visitor's own browser.

## Share links

Route pages accept `?w=185&b=18&p=324&pr=15:39&prw=324&ftp=290&u=lb` (weights in lb).
