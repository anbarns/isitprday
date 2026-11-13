// Route data. One file per route. See README.md for how to add one.
window.PR_ROUTES = window.PR_ROUTES || {};
window.PR_ROUTES["powell"] = {
  id: "powell",
  name: "Powell Sprint",
  area: "Whidbey Island",
  // Homepage groups routes under this heading.
  state: "Washington",
  strava: "https://www.strava.com/segments/21574757",
  kind: "sprint",
  // Share of FTP for an all-out ~30 second effort.
  ftpPct: 2.5,
  // Model correction tuned from a real effort: 31 s at 751 W, 203 lb rider + bike.
  factor: 0.75,
  // Open, flat road: more of the forecast wind reaches the rider than on a canyon climb.
  shelter: 0.65,
  // Seconds of wind help needed for a "Yes". A second is a big margin over 30 s.
  thresh: 1,
  pts: [[48.372938,-122.658809,13.6],[48.372961,-122.658961,13.2],[48.372959,-122.659118,12.8],[48.372965,-122.65929,12],[48.372971,-122.65947,11.4],[48.372975,-122.659665,11],[48.372966,-122.659866,10.4],[48.372965,-122.660069,10],[48.372967,-122.660286,9.4],[48.372956,-122.660507,9],[48.372952,-122.660725,8.4],[48.372957,-122.660948,8],[48.372961,-122.661165,7.4],[48.372959,-122.661383,7],[48.372957,-122.661608,6.4],[48.372962,-122.661835,6.2],[48.372972,-122.662055,5.8],[48.372975,-122.662282,5.6],[48.37297,-122.662512,5.4],[48.372965,-122.662739,5],[48.372968,-122.662969,4.8],[48.372973,-122.663194,4.6],[48.372969,-122.663416,4.4],[48.372966,-122.663632,4.4],[48.372961,-122.663842,4.2],[48.372954,-122.664038,4.4],[48.372945,-122.664234,4.4],[48.372941,-122.664418,4.6],[48.372941,-122.664584,4.8],[48.372945,-122.664728,5],[48.37295,-122.66484,5.4],[48.372954,-122.664924,5.8],[48.372961,-122.664984,6]]
};
