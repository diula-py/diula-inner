import re

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

# Fix HTML onclick functions
html = html.replace('onclick="window.submitLostData()"', 'onclick="window.handleSeekerSubmit(this)"')
html = html.replace('onclick="window.submitFoundData()"', 'onclick="window.commitReportToFirestore(this)"')

# Fix handleSeekerSubmit
seeker_submit = """        window.handleSeekerSubmit = async function(btnElement) {
            if (window.selectedTags.length === 0) {
                alert('請至少選擇一個標籤！');
                return;
            }
            if (!window.validateTags(window.selectedTags)) {
                alert('偵測到不合法標籤，已終止比對與寫入！');
                return;
            }

            // Update currentLostData with the possibly modified values from page-05
            if (window.currentLostData) {
                window.currentLostData.date = document.getElementById('info-date-05').value || window.currentLostData.date;
                const city = document.getElementById('info-city-05').value || '';
                const dist = document.getElementById('info-dist-05').value || '';
                window.currentLostData.location = `${city}${dist ? ' ' + dist : ''}`.trim() || window.currentLostData.location;
                window.currentLostData.notes = document.getElementById('info-notes-05').value || '';
            }

            if (btnElement) {
                btnElement.innerText = '正在尋找中...';
                btnElement.disabled = true;
                btnElement.style.opacity = '0.7';
                btnElement.style.cursor = 'not-allowed';
            }"""
html = re.sub(r'        window\.handleSeekerSubmit = async function\(btnElement\) \{.*?(?=            try \{)', seeker_submit + "\n", html, flags=re.DOTALL)

# Fix commitReportToFirestore
founder_submit = """        window.commitReportToFirestore = async function(btnElement) {
            if (window.selectedTags.length === 0) {
                alert('請至少選擇一個標籤！');
                return;
            }
            if (!window.validateTags(window.selectedTags)) {
                alert('偵測到不合法標籤，已終止寫入！');
                return;
            }

            // Update currentFoundData with the possibly modified values from page-11
            if (window.currentFoundData) {
                window.currentFoundData.date = document.getElementById('info-date-11').value || window.currentFoundData.date;
                const city = document.getElementById('info-city-11').value || '';
                const dist = document.getElementById('info-dist-11').value || '';
                window.currentFoundData.location = `${city}${dist ? ' ' + dist : ''}`.trim() || window.currentFoundData.location;
                window.currentFoundData.notes = document.getElementById('info-notes-11').value || '';
            }

            if (btnElement) {
                btnElement.innerText = '正在寫入中...';
                btnElement.disabled = true;
                btnElement.style.opacity = '0.7';
                btnElement.style.cursor = 'not-allowed';
            }"""
html = re.sub(r'        window\.commitReportToFirestore = async function\(btnElement\) \{.*?(?=            try \{)', founder_submit + "\n", html, flags=re.DOTALL)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)
