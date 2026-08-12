import re

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

# I will replace the inline styles for inputs and selects and inject a cleaner CSS class for them.
# The current inline style looks like:
# style="width: 100%; height: 100%; margin: 0; padding: 0; box-sizing: border-box; font-family: 'Comfortaa', 'Chiron GoRound TC', sans-serif; font-weight: 400; font-size: 12px; color: #482B12; border: none; background: transparent; outline: none;"

def replace_input_styles(match):
    style = match.group(0)
    # Just remove the explicit inline height/margin/padding/box-sizing that I added earlier, 
    # and add a class "centered-input" that we can style globally
    style = re.sub(r'height: 100%; margin: 0; padding: 0; box-sizing: border-box;', '', style)
    # Ensure there is no stray empty spaces
    style = style.replace("  ", " ")
    return style

# Find all input/select styles that match what we added previously
html = re.sub(r'style="width: (100%|50%); height: 100%; margin: 0; padding: 0; box-sizing: border-box;.*?"', replace_input_styles, html)

# We also need to add class="capsule-input" to these inputs/selects so we can style them.
# Actually, since we want to fix ALL inputs and selects that don't have a border (which are exactly these capsule ones), 
# let's just add a global CSS rule for input and select inside those capsules.
# The parent capsule has background: #FFFFFF or #F5F5F5 and border-radius: 50px.
# But it's easier to just add a CSS rule for all inputs and selects globally since they are basically all using this style.

css_fix = """
        /* Fix vertical alignment for inputs and selects */
        input[type="text"], input[type="date"], select {
            /* Remove default styling that might cause misalignment */
            -webkit-appearance: none;
            appearance: none;
            /* Center vertically */
            height: 100%;
            line-height: normal;
            padding: 4px 0 0 0; /* Push text down slightly as user requested */
            margin: 0;
            box-sizing: border-box;
            background: transparent;
            vertical-align: middle;
        }
        
        /* Specific fix for date inputs to ensure internal text is aligned */
        input[type="date"]::-webkit-datetime-edit {
            padding: 0;
            display: flex;
            align-items: center;
        }

        /* Specific fix for select to add the arrow back since we removed appearance */
        select {
            background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E");
            background-repeat: no-repeat;
            background-position: right 5px center;
            background-size: 16px;
            padding-right: 25px; /* Make room for the arrow */
        }
        
        /* The labels "備註" were also high */
        .label-text-align {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 40px;
            padding-top: 2px; /* Push down slightly */
        }
"""

if "/* Fix vertical alignment for inputs and selects */" not in html:
    html = html.replace("    </style>", css_fix + "\n    </style>")

# Replace the "備註" label inline styles to use the class
html = html.replace('width: 35px; display: flex; align-items: center; justify-content: center; height: 40px; text-align: center;', 'width: 35px; display: flex; align-items: center; justify-content: center; height: 40px; text-align: center; padding-top: 2px;')

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)
