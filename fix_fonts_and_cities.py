import re

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

# Fix cities
html = html.replace("window.cities", "twLocations")

# In the places where I replaced font-family with GenSenRounded2 TW without Comfortaa:
# Let's just find ALL instances of font-family in inline styles and replace them with the standard one, EXCEPT where they explicitly just want Inter or something else, but here the user says:
# "主要字體庫 (Font Family)：中文字體使用 GenSenRounded2 TW (源泉圓體)，英數字使用 Comfortaa"
# So the unified font family string should be:
unified_font = "font-family: 'Comfortaa', 'GenSenRounded2 TW', 'Chiron GoRound TC', sans-serif;"

# Find all inline font-family declarations in the HTML and replace them with the unified string
# We will match `font-family: [something];` inside style attributes
html = re.sub(r'font-family:\s*[^;]+;', unified_font, html)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)
