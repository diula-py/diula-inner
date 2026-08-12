import re

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

# Make initCitySelects robust
old_init = """        window.initCitySelects = function() {
            const citySelects = document.querySelectorAll('.city-select, select[id^="city-"], select[id^="info-city-"]');
            citySelects.forEach(select => {
                let options = '<option value="" disabled selected>選擇縣市</option>';
                for (let city in twLocations) {
                    options += `<option value="${city}">${city}</option>`;
                }
                select.innerHTML = options;
            });
        };"""

new_init = """        window.initCitySelects = function() {
            const citySelects = document.querySelectorAll('.city-select, select[id^="city-"], select[id^="info-city-"]');
            citySelects.forEach(select => {
                if (select.options.length > 1) return; // already initialized
                let options = '<option value="" disabled selected>選擇縣市</option>';
                for (let city in twLocations) {
                    options += `<option value="${city}">${city}</option>`;
                }
                select.innerHTML = options;
            });
        };"""

if old_init in html:
    html = html.replace(old_init, new_init)

# Call initCitySelects in showPage
old_show_page = """        window.showPage = function(pageId, navTab = '') {"""
new_show_page = """        window.showPage = function(pageId, navTab = '') {
            if (window.initCitySelects) window.initCitySelects();"""

if old_show_page in html:
    html = html.replace(old_show_page, new_show_page)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)
