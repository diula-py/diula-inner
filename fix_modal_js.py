import re

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

modal_js = """        // --- Confirm Page Helpers ---
        window.backFromConfirm = function(page_id, img_page, txt_page) {
            // For page-05 (Finder)
            if (page_id === '05') {
                if (window.currentLostData && window.currentLostData.image_base64) {
                    window.showPage(img_page);
                } else {
                    window.showPage(txt_page);
                }
            } 
            // For page-11 (Founder)
            else if (page_id === '11') {
                if (window.currentFoundData && window.currentFoundData.flowType === 'id') {
                    window.showPage('page-12');
                } else {
                    window.showPage('page-10');
                }
            }
        };

        window.showAddTagModal = function(page_id) {
            document.getElementById(`add-tag-modal-${page_id}`).style.display = 'block';
            window.tempSelectedTags = [...window.selectedTags];
            window.renderModalTags(page_id);
        };

        window.closeAddTagModal = function(page_id) {
            document.getElementById(`add-tag-modal-${page_id}`).style.display = 'none';
            window.tempSelectedTags = [];
        };

        window.confirmAddTags = function(page_id) {
            window.selectedTags = [...window.tempSelectedTags];
            document.getElementById(`add-tag-modal-${page_id}`).style.display = 'none';
            renderTags(`tags-container-${page_id}`);
        };

        window.toggleTagSelection = function(page_id, tag) {
            if (!window.tempSelectedTags.includes(tag)) {
                window.tempSelectedTags.push(tag);
            } else {
                window.tempSelectedTags = window.tempSelectedTags.filter(t => t !== tag);
            }
            window.renderModalTags(page_id);
        };

        window.renderModalTags = function(page_id) {
            const container = document.getElementById(`modal-selected-tags-${page_id}`);
            if (!container) return;
            container.innerHTML = '';
            window.tempSelectedTags.forEach(tag => {
                const el = document.createElement('div');
                el.style.cssText = "box-sizing: border-box; display: flex; flex-direction: row; justify-content: center; align-items: center; padding: 10px 20px; gap: 10px; background: #DFEAF5; border: 1px solid #000000; border-radius: 50px;";
                el.innerHTML = `
                    <div style="font-family: 'GenSenRounded2 TW', sans-serif; font-weight: 500; font-size: 12px; color: #482B12;">${tag}</div>
                    <div onclick="window.toggleTagSelection('${page_id}', '${tag}')" style="width: 15px; height: 15px; border: 2px solid #1E1E1E; display: flex; justify-content: center; align-items: center; cursor: pointer; position: relative;">
                        <div style="width: 10px; height: 2px; background: #1E1E1E; transform: rotate(45deg); position: absolute;"></div>
                        <div style="width: 10px; height: 2px; background: #1E1E1E; transform: rotate(-45deg); position: absolute;"></div>
                    </div>
                `;
                container.appendChild(el);
            });
        };
        // -----------------------------
"""

# Insert right after `window.goHome = function() {`
if "// --- Confirm Page Helpers ---" not in html:
    html = html.replace("        window.goHome = function() {", modal_js + "\n        window.goHome = function() {")

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)
