import re

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

found_flow_end = """            
            // Immediately switch to loading page
            window.showPage('page-loading');

            const imgEl11 = document.getElementById('confirm-img-11');
            const imgView11 = document.getElementById('confirm-image-view-11');
            const txtView11 = document.getElementById('confirm-text-view-11');
            const txtDesc11 = document.getElementById('lost-text-desc-11');
            
            const infoDate11 = document.getElementById('info-date-11');
            const infoCity11 = document.getElementById('info-city-11');
            const infoDist11 = document.getElementById('info-dist-11');
            const infoNotes11 = document.getElementById('info-notes-11');

            // Set cities for the dropdown
            if(window.cities) {
                infoCity11.innerHTML = '<option value="" disabled selected>遺失縣市</option>';
                for (let city in window.cities) {
                    infoCity11.innerHTML += `<option value="${city}">${city}</option>`;
                }
            }

            if (flowType === 'id') {
                const imgEl = document.getElementById('preview-p12');
                if (imgEl && imgEl.style.display === 'block') {
                    imgEl11.src = imgEl.src;
                    imgView11.style.display = 'flex';
                    txtView11.style.display = 'none';
                }
                const dateEl = document.getElementById('found-date-12');
                const cityEl = document.getElementById('city-12');
                const distEl = document.getElementById('dist-12');
                const notes = document.getElementById('found-notes-12');
                
                infoDate11.value = dateEl.value;
                infoCity11.value = cityEl.value;
                window.updateDistricts('info-city-11', 'info-dist-11');
                infoDist11.value = distEl.value;
                if(notes && notes.value) {
                    infoNotes11.value = notes.value;
                } else {
                    infoNotes11.value = '';
                }
            } else {
                const imgEl = document.getElementById('preview-p10');
                if (imgEl && imgEl.style.display === 'block') {
                    imgEl11.src = imgEl.src;
                    imgView11.style.display = 'flex';
                    txtView11.style.display = 'none';
                }
                const dateEl = document.getElementById('found-date-10');
                const cityEl = document.getElementById('city-10');
                const distEl = document.getElementById('dist-10');
                const notes = document.getElementById('found-notes-10');
                
                infoDate11.value = dateEl.value;
                infoCity11.value = cityEl.value;
                window.updateDistricts('info-city-11', 'info-dist-11');
                infoDist11.value = distEl.value;
                if(notes && notes.value) {
                    infoNotes11.value = notes.value;
                } else {
                    infoNotes11.value = '';
                }
            }

            if (imgBase64 || textDesc.trim()) {
                await window.analyzeWithGemini(imgBase64, textDesc, 'tags-container-11');
            }

            window.showPage('page-11');
        }"""

html = re.sub(r'            // Populate info card UI.*?window\.showPage\(\'page-11\'\);\n        \}', found_flow_end, html, flags=re.DOTALL)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)
