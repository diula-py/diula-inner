import re

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

# Remove padding-top: 2px; from the notes label
html = html.replace("padding-top: 2px;", "")

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)
