with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

# page-10 has an inner div: <div style="display: flex; flex-direction: column; align-items: center; width: 100%;">
# We need to close it before <!-- PAGE 11
html = html.replace(
    '</div>\n        <!-- PAGE 11:',
    '</div>\n        </div>\n        <!-- PAGE 11:'
)

# page-12 also has an inner div.
# We need to close it before <!-- PAGE 13
html = html.replace(
    '</div>\n        <!-- PAGE 13:',
    '</div>\n        </div>\n        <!-- PAGE 13:'
)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)
