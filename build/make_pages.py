# Generates route pages from the template. Run from the site folder:  python3 build/make_pages.py
import os, time
# Bump on every deploy so phones never mix old and new files.
VER = time.strftime("%Y%m%d%H%M")
TPL = open(os.path.join(os.path.dirname(__file__), "route-template.html")).read()

FAQ = {
  "climb": """    <p><b>Shelter factor.</b> Forecasts are for 10 m up in open air. You're at about 1.5 m on a road cut into a hillside, which knocks the wind down a lot. 0.5 is a reasonable start; tune it after a few rides where you know how it felt.</p>
    <p><b>Why climbs care less.</b> At 12 km/h on 7%, aero is a small share of your power, so even a decent tailwind is worth seconds, not minutes. The flatter parts are where the wind pays out.</p>""",
  "sprint": """    <p><b>Shelter factor.</b> Forecasts are for 10 m up in open air. You're at about 1 m in a sprint, on an open road with little to block the wind, so less of it is lost than on a sheltered climb. 0.65 is the starting point here; tune it after a few efforts where you know how it felt.</p>
    <p><b>Why sprints care a lot.</b> At 30+ mph nearly all your power goes into pushing air, so wind changes your speed almost one for one. A few mph of tailwind is worth a second or more over 30 seconds, which is a big margin on a short segment.</p>
    <p><b>About the estimate.</b> The model rides the segment at steady power. A real sprint starts from a rolling launch and fades at the end, so treat the time as a guide and the wind gain as the useful number.</p>""",
}

ROUTES = [
  dict(id="griffith", name="Griffith Park Hill Climb", short="Griffith", kind="climb"),
  dict(id="powell", name="Powell Sprint", short="Powell", kind="sprint"),
  dict(id="lida", name="Lida Climb", short="Lida", kind="climb"),
]

for r in ROUTES:
    html = (TPL.replace("{id}", r["id"]).replace("{name}", r["name"]).replace("{short}", r["short"])
               .replace("{noun}", r["kind"]).replace("{ver}", VER).replace("{faq}", FAQ[r["kind"]]))
    os.makedirs(r["id"], exist_ok=True)
    open(os.path.join(r["id"], "index.html"), "w").write(html)
    print("wrote", r["id"] + "/index.html")

# Homepage: stamp the same version on its local scripts and stylesheet.
import re
home = open("index.html").read()
home = re.sub(r'((?:src|href)="(?:assets|routes)/[^"?]+)(?:\?v=\w+)?"', lambda m: m.group(1) + '?v=' + VER + '"', home)
open("index.html", "w").write(home)
print("stamped index.html", VER)
