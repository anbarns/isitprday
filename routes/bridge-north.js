// Route data. One file per route. See README.md for how to add one.
window.PR_ROUTES = window.PR_ROUTES || {};
window.PR_ROUTES["bridge-north"] = {
  id: "bridge-north",
  name: "Deception Pass Bridge - North",
  area: "Whidbey to Fidalgo Island",
  // Homepage groups routes under this heading.
  state: "Washington",
  strava: "https://www.strava.com/segments/7368164",
  kind: "sprint",
  // Share of FTP for an all-out effort of about 31 seconds.
  ftpPct: 2.3,
  // Model correction tuned from a real effort: 31 s at 656 W, 203 lb rider + bike.
  factor: 0.94,
  // High bridge over open water: almost fully exposed, and the pass funnels the wind.
  shelter: 0.85,
  // Seconds of wind help needed for a "Yes".
  thresh: 1,
  pts: [[48.404975,-122.6446,61.4],[48.405085,-122.644594,61.4],[48.4052,-122.644593,61.2],[48.405313,-122.644592,61.2],[48.405428,-122.644586,61],[48.405545,-122.644583,61.2],[48.40566,-122.644581,61.2],[48.405776,-122.644581,61.2],[48.405895,-122.64458,61.2],[48.406014,-122.644579,61.2],[48.406133,-122.644581,61.2],[48.406252,-122.644585,61],[48.406369,-122.644587,61.2],[48.406491,-122.644585,61.2],[48.406616,-122.644585,61.4],[48.406745,-122.644585,61.4],[48.406875,-122.644587,61.4],[48.407006,-122.644591,61.4],[48.407134,-122.644591,61.4],[48.407263,-122.644593,61.2],[48.407392,-122.644597,61],[48.40752,-122.644599,61],[48.40765,-122.6446,60.6],[48.40778,-122.644612,60.4],[48.407908,-122.644636,60.2],[48.408034,-122.644676,60],[48.408156,-122.644734,60],[48.40827,-122.644808,60],[48.408378,-122.644898,60],[48.408488,-122.644994,60],[48.408598,-122.645087,59.8],[48.408704,-122.645182,59.6],[48.408805,-122.645277,59.6]]
};
