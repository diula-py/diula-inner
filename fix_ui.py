import re

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

# Fix font-family
html = html.replace("font-family: 'GenSenRounded2 TW', sans-serif;", "font-family: 'GenSenRounded2 TW', 'Chiron GoRound TC', sans-serif;")
html = html.replace("font-family: 'Comfortaa', sans-serif;", "font-family: 'Comfortaa', 'Chiron GoRound TC', sans-serif;")

# Fix input and select alignment inside the capsules
# The original styles for input and select had:
# width: 100%; height: 20px;
# width: 50%; height: 20px;
# We change height: 20px to height: 100% and add padding: 0; margin: 0; line-height: 40px; box-sizing: border-box;

def replace_input_styles(match):
    style = match.group(0)
    style = style.replace("height: 20px;", "height: 100%; margin: 0; padding: 0; box-sizing: border-box;")
    return style

html = re.sub(r'style="width: (100%|50%); height: 20px;.*?"', replace_input_styles, html)

# Also fix "備註" text alignment. The label "備註" has:
# <div style="width: 35px; text-align: center; ...">備註</div>
# It should be perfectly centered. It is inside a display: flex; align-items: center; which should center it automatically, but maybe line-height is off?
# Adding line-height: 40px; or just keeping display: flex align-items: center; it should be fine. Wait, if it has flex-shrink: 0 and height is not specified, it is centered by align-items: center.
# Ah, maybe the parent row has `height: 40px;`?
# Let's check the parent:
# <div style="display: flex; flex-direction: row; align-items: center; gap: 10px;">
#   <div style="width: 35px; text-align: center; font-family: ...">備註</div>
#   <div style="box-sizing: border-box; display: flex; flex-direction: row; align-items: center; padding: 0 15px; flex-grow: 1; height: 40px; background: #FFFFFF; border: 1px solid #000000; border-radius: 50px;">
# The text "備註" has no fixed height, so it aligns with the 40px div correctly, BUT since the 40px div has height: 40px, the whole row is 40px tall. align-items: center makes the text centered vertically. If it looks "偏上" (too high), maybe the font itself has weird vertical metrics, or we should explicitly set `line-height`.
# Let's add `line-height: 1;` or `display: flex; align-items: center; justify-content: center; height: 40px;` to the label.

html = html.replace('width: 35px; text-align: center;', 'width: 35px; display: flex; align-items: center; justify-content: center; height: 40px; text-align: center;')

# The user mentioned missing cities in dropdowns for page-03 and page-04.
# In JS, they were not populated on load. We can populate them in the window.onload or simply do it by finding all `city-` dropdowns.
# Let's inject a piece of JS to populate them initially.

init_cities_js = """
        // Populate all city dropdowns on load
        const allCitySelects = document.querySelectorAll('select[id^="city-"], select[id^="info-city-"]');
        if (window.cities) {
            allCitySelects.forEach(sel => {
                const currentVal = sel.value;
                sel.innerHTML = '<option value="" disabled selected>選擇縣市</option>';
                for (let city in window.cities) {
                    sel.innerHTML += `<option value="${city}">${city}</option>`;
                }
                if(currentVal) sel.value = currentVal;
            });
        }
"""

if "// Populate all city dropdowns on load" not in html:
    # Insert at the end of window.onload or script
    html = html.replace("window.showPage('page-01');", init_cities_js + "\n            window.showPage('page-01');")

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)
