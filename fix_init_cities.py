import re

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

# Fix initCitySelects
html = html.replace(
    "const citySelects = document.querySelectorAll('.city-select');", 
    "const citySelects = document.querySelectorAll('.city-select, select[id^=\"city-\"], select[id^=\"info-city-\"]');"
)

# Remove the duplicated logic I added previously at the bottom
bad_logic = r"""        // Populate all city dropdowns on load
        const allCitySelects = document.querySelectorAll\('select\[id\^="city-"\], select\[id\^="info-city-"\]'\);
        if \(twLocations\) \{
            allCitySelects.forEach\(sel => \{
                const currentVal = sel\.value;
                sel\.innerHTML = '<option value="" disabled selected>選擇縣市</option>';
                for \(let city in twLocations\) \{
                    sel\.innerHTML \+= `<option value="\$\{city\}">\$\{city\}</option>`;
                \}
                if\(currentVal\) sel\.value = currentVal;
            \}\);
        \}"""

html = re.sub(bad_logic, "", html, flags=re.MULTILINE)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)
