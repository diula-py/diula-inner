import re

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

# Replace padding in the specific flex rows for inputs/selects
pattern = r"padding: 0 15px; flex-grow: 1; height: 40px; background: #FFFFFF; border: 1px solid #000000; border-radius: 50px;"
replacement = r"padding: 10px 15px; flex-grow: 1; height: 40px; background: #FFFFFF; border: 1px solid #000000; border-radius: 50px;"

html = html.replace(pattern, replacement)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)
