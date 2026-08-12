import re

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

lost_flow = """        window.prepareLostFlow = async function(tabType, btnElement) {
            // 檢查必填欄位
            if (tabType === 'image') {
                const imgEl = document.getElementById('preview-p03');
                const cityEl = document.getElementById('city-03');
                const distEl = document.getElementById('dist-03');
                const dateEl = document.getElementById('lost-date-03');
                if (!imgEl || imgEl.style.display !== 'block' || !imgEl.src) {
                    alert('請上傳遺失物圖片！（必填）');
                    return;
                }
                if (!cityEl || !cityEl.value) {
                    alert('請選擇遺失的縣市！（必填）');
                    return;
                }
                if (!distEl || !distEl.value) {
                    alert('請選擇遺失的地區！（必填）');
                    return;
                }
                if (!dateEl || !dateEl.value) {
                    alert('請選擇遺失日期！（必填）');
                    return;
                }
            } else if (tabType === 'text') {
                const descEl = document.getElementById('lost-desc-04');
                const cityEl = document.getElementById('city-04');
                const distEl = document.getElementById('dist-04');
                const dateEl = document.getElementById('lost-date-04');
                if (!descEl || !descEl.value.trim()) {
                    alert('請填寫遺失物描述！（必填）');
                    return;
                }
                if (!cityEl || !cityEl.value) {
                    alert('請選擇遺失的縣市！（必填）');
                    return;
                }
                if (!distEl || !distEl.value) {
                    alert('請選擇遺失的地區！（必填）');
                    return;
                }
                if (!dateEl || !dateEl.value) {
                    alert('請選擇遺失日期！（必填）');
                    return;
                }
            }

            // Immediately switch to loading page
            window.showPage('page-loading');

            window.selectedTags = [];
            renderTags('tags-container-05');
            window.currentLostData = {};
            let imgBase64 = null;
            let textDesc = '';

            const imgEl05 = document.getElementById('confirm-img-05');
            const imgView05 = document.getElementById('confirm-image-view-05');
            const txtView05 = document.getElementById('confirm-text-view-05');
            const txtDesc05 = document.getElementById('lost-text-desc-05');
            
            const infoDate05 = document.getElementById('info-date-05');
            const infoCity05 = document.getElementById('info-city-05');
            const infoDist05 = document.getElementById('info-dist-05');
            const infoNotes05 = document.getElementById('info-notes-05');

            // Set cities for the dropdown
            if(window.cities) {
                infoCity05.innerHTML = '<option value="" disabled selected>遺失縣市</option>';
                for (let city in window.cities) {
                    infoCity05.innerHTML += `<option value="${city}">${city}</option>`;
                }
            }

            if (tabType === 'image') {
                const imgEl = document.getElementById('preview-p03');
                if (imgEl && imgEl.style.display === 'block') {
                    window.currentLostData.image_base64 = imgEl.src;
                    imgBase64 = imgEl.src;
                    imgEl05.src = imgBase64;
                    imgView05.style.display = 'flex';
                    txtView05.style.display = 'none';
                }
                const cityEl = document.getElementById('city-03');
                const distEl = document.getElementById('dist-03');
                const dateEl = document.getElementById('lost-date-03');
                const notes = document.getElementById('lost-notes-03');
                
                infoDate05.value = dateEl.value;
                infoCity05.value = cityEl.value;
                window.updateDistricts('info-city-05', 'info-dist-05');
                infoDist05.value = distEl.value;
                if(notes && notes.value) {
                    infoNotes05.value = notes.value;
                    textDesc += notes.value;
                } else {
                    infoNotes05.value = '';
                }
            } else if (tabType === 'text') {
                const desc = document.getElementById('lost-desc-04');
                const cityEl = document.getElementById('city-04');
                const distEl = document.getElementById('dist-04');
                const dateEl = document.getElementById('lost-date-04');
                const notes = document.getElementById('lost-notes-04');
                
                txtDesc05.innerText = desc.value;
                imgView05.style.display = 'none';
                txtView05.style.display = 'flex';

                infoDate05.value = dateEl.value;
                infoCity05.value = cityEl.value;
                window.updateDistricts('info-city-05', 'info-dist-05');
                infoDist05.value = distEl.value;

                if(desc && desc.value) {
                    window.currentLostData.desc = desc.value;
                    textDesc += desc.value + " ";
                }
                if(notes && notes.value) {
                    infoNotes05.value = notes.value;
                    textDesc += notes.value;
                } else {
                    infoNotes05.value = '';
                }
            }

            if (imgBase64 || textDesc.trim()) {
                await window.analyzeWithGemini(imgBase64, textDesc, 'tags-container-05');
            }

            window.showPage('page-05');
        }"""

html = re.sub(r'window\.prepareLostFlow = async function\(tabType, btnElement\) \{.*?window\.showPage\(\'page-05\'\);\n        \}', lost_flow, html, flags=re.DOTALL)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)
