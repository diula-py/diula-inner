import re
import os

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

# CSS Animations
if "@keyframes progress-bar" not in html:
    css = """
        @keyframes progress-bar {
            0% { width: 0%; }
            50% { width: 70%; }
            100% { width: 100%; }
        }
        .loading-progress {
            width: 0%;
            animation: progress-bar 4s ease-in-out forwards;
        }
        /* Style for modals */
        .modal-overlay {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(255, 255, 255, 0.5); /* 0.5 opacity white as requested for the mask */
            display: none;
            z-index: 100;
        }
        .modal-content {
            position: absolute;
            top: 196px;
            left: 47px;
            width: 300px;
            height: 400px;
            background: #F3F0E1;
            box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
            border-radius: 10px;
            z-index: 101;
        }
"""
    html = html.replace("    </style>", css + "    </style>")

page_loading_html = """        <!-- PAGE LOADING: AI 辨識進度條 -->
        <div id="page-loading" class="page" style="width: 100%; max-width: 393px; min-height: 100dvh; margin: 0 auto; background: #CDDCF0; position: relative;">
            <div style="position: absolute; left: 112px; top: 207px; width: 170px; height: 170px; background: #F3F0E1; border-radius: 50%; display: flex; justify-content: center; align-items: center;">
                <div style="width: 80px; height: 80px; background: url('wand-magic-sparkles-solid.png') no-repeat center center / contain;"></div>
            </div>
            <div style="position: absolute; left: 51px; top: 456px; width: 290px; height: 15px; background: #FFFFFF; border-radius: 10px; overflow: hidden;">
                <div id="loading-bar-inner" class="loading-progress" style="height: 100%; background: #482B12; opacity: 0.7; border-radius: 10px;"></div>
            </div>
            <div style="position: absolute; left: 47px; top: 561px; width: 299px; text-align: center; font-family: 'Inter', sans-serif; font-size: 15px; color: #000000; opacity: 0.4; line-height: 18px;">
                提示：AI 會自動標記類別， 您可以在下一步進行修正。
            </div>
        </div>"""

# Ensure page-loading is added before page-05
if "PAGE LOADING: AI" not in html:
    html = html.replace("<!-- PAGE 05: AI Tags Confirm (Finder) -->", page_loading_html + "\n        <!-- PAGE 05: AI Tags Confirm (Finder) -->")

def generate_confirm_page(page_id, prev_page_img, prev_page_txt, confirm_action):
    return f"""        <!-- PAGE {page_id} -->
        <div id="page-{page_id}" class="page" style="width: 100%; max-width: 393px; min-height: 100dvh; margin: 0 auto; background: #FFFFFF; box-sizing: border-box; overflow-y: auto; overflow-x: hidden; padding-bottom: calc(80px + env(safe-area-inset-bottom)); padding-top: 0; padding-left: 0; padding-right: 0;">
            <div id="page-{page_id}-content" style="display: flex; flex-direction: column; align-items: center; width: 100%; position: relative;">
                
                <!-- Group 17 (Header) -->
                <div style="position: relative; width: 100%; max-width: 395px; height: 80px; flex-shrink: 0; background: #F3F0E1; border-radius: 0px 0px 20px 20px; display: flex; justify-content: center; align-items: center; z-index: 10;">
                    <div style="font-family: 'GenSenRounded2 TW', sans-serif; font-weight: 700; font-size: 20px; color: #482B12;">確認標籤</div>
                    <div onclick="window.backFromConfirm('{page_id}', '{prev_page_img}', '{prev_page_txt}')" style="position: absolute; width: 30px; height: 30px; left: 22px; background: url('chevron-left-solid.png') no-repeat center center / contain; cursor: pointer;"></div>
                </div>

                <!-- Image View Section -->
                <div id="confirm-image-view-{page_id}" style="width: 100%; display: flex; flex-direction: column; align-items: center; display: none;">
                    <div style="width: 100%; max-width: 340px; height: 200px; margin-top: 20px; border-radius: 10px; overflow: hidden; flex-shrink: 0;">
                        <img id="confirm-img-{page_id}" src="" style="width: 100%; height: 100%; object-fit: contain; background: #F5F5F5;">
                    </div>
                </div>

                <!-- Text View Section -->
                <div id="confirm-text-view-{page_id}" style="width: 100%; display: flex; flex-direction: column; align-items: center; display: none;">
                    <div style="width: 100%; max-width: 340px; background: #F3F0E1; border-radius: 10px; padding: 15px; box-sizing: border-box; display: flex; flex-direction: row; gap: 15px; margin-top: 20px; flex-shrink: 0;">
                        <div style="width: 40px; height: 40px; background: url('square-pen-solid.png') no-repeat center center / contain; flex-shrink: 0;"></div>
                        <div id="lost-text-desc-{page_id}" style="flex: 1; font-family: 'Comfortaa', sans-serif; font-weight: 400; font-size: 14px; color: #482B12; word-break: break-word;"></div>
                    </div>
                </div>

                <!-- Form Data (Date, Location, Notes) -->
                <div style="width: 100%; max-width: 340px; background: #F3F0E1; border-radius: 10px; padding: 15px; box-sizing: border-box; display: flex; flex-direction: column; gap: 10px; margin-top: 20px; flex-shrink: 0;">
                    <!-- Date -->
                    <div style="display: flex; flex-direction: row; align-items: center; gap: 10px;">
                        <div style="width: 35px; height: 35px; background: url('calendar-days-solid.png') no-repeat center center / contain; flex-shrink: 0; margin-left: 10px;"></div>
                        <div style="box-sizing: border-box; display: flex; flex-direction: row; align-items: center; padding: 0 15px; flex-grow: 1; height: 40px; background: #FFFFFF; border: 1px solid #000000; border-radius: 50px;">
                            <input type="date" id="info-date-{page_id}" style="width: 100%; height: 20px; font-family: 'Comfortaa', sans-serif; font-weight: 400; font-size: 12px; color: #482B12; border: none; background: transparent; outline: none;">
                        </div>
                    </div>

                    <!-- 遺失地點 (Dropdowns) -->
                    <div style="display: flex; flex-direction: row; align-items: center; gap: 10px;">
                        <div style="width: 35px; height: 35px; background: url('location-dot-solid.png') no-repeat center center / contain; flex-shrink: 0; margin-left: 10px;"></div>
                        <div style="box-sizing: border-box; display: flex; flex-direction: row; align-items: center; padding: 0 15px; flex-grow: 1; height: 40px; background: #FFFFFF; border: 1px solid #000000; border-radius: 50px; gap: 10px;">
                            <select id="info-city-{page_id}" onchange="window.updateDistricts('info-city-{page_id}', 'info-dist-{page_id}')" style="width: 50%; height: 20px; font-family: 'GenSenRounded2 TW', sans-serif; font-weight: 400; font-size: 12px; color: #482B12; border: none; background: transparent; outline: none;">
                                <option value="" disabled selected>遺失縣市</option>
                            </select>
                            <select id="info-dist-{page_id}" style="width: 50%; height: 20px; font-family: 'GenSenRounded2 TW', sans-serif; font-weight: 400; font-size: 12px; color: #482B12; border: none; background: transparent; outline: none;">
                                <option value="" disabled selected>遺失地區</option>
                            </select>
                        </div>
                    </div>

                    <!-- 備註 -->
                    <div style="display: flex; flex-direction: row; align-items: center; gap: 10px;">
                        <div style="width: 35px; text-align: center; font-family: 'GenSenRounded2 TW', sans-serif; font-weight: 400; font-size: 16px; color: #482B12; flex-shrink: 0; margin-left: 10px;">備註</div>
                        <div style="box-sizing: border-box; display: flex; flex-direction: row; align-items: center; padding: 0 15px; flex-grow: 1; height: 40px; background: #FFFFFF; border: 1px solid #000000; border-radius: 50px;">
                            <input type="text" id="info-notes-{page_id}" placeholder="供Threads發文時提供詳細資訊" style="width: 100%; height: 20px; font-family: 'GenSenRounded2 TW', sans-serif; font-weight: 400; font-size: 12px; color: #482B12; border: none; background: transparent; outline: none;">
                        </div>
                    </div>
                </div>

                <!-- AI Labels -->
                <div style="width: 100%; max-width: 340px; min-height: 98px; background: #F3F0E1; border-radius: 10px; margin-top: 20px; flex-shrink: 0; padding: 20px; box-sizing: border-box; position: relative;">
                    <div style="font-family: 'Comfortaa', sans-serif; font-weight: 600; font-size: 16px; color: #482B12; margin-bottom: 10px;">AI 標籤</div>
                    <div id="tags-container-{page_id}" style="display: flex; flex-wrap: wrap; gap: 10px;">
                        <!-- AI Tags will be populated here -->
                    </div>
                    <!-- Add Tag Button -->
                    <div onclick="window.showAddTagModal('{page_id}')" style="display: inline-flex; flex-direction: row; justify-content: center; align-items: center; padding: 8px 16px; gap: 8px; background: #FFFFFF; border: 1px solid #000000; border-radius: 50px; cursor: pointer; margin-top: 10px;">
                        <div style="width: 15px; height: 15px; background: url('plus-solid.png') no-repeat center center / contain;"></div>
                        <div style="font-family: 'GenSenRounded2 TW', sans-serif; font-weight: 400; font-size: 12px; color: #482B12;">新增</div>
                    </div>
                </div>

                <div style="flex-grow: 1;"></div>

                <!-- Frame 28 (Submit Button) -->
                <div onclick="window.{confirm_action}()" style="box-sizing: border-box; display: flex; flex-direction: row; justify-content: center; align-items: center; padding: 20px 30px; gap: 15px; width: 100%; max-width: 350px; height: 60px; background: #F3F0E1; border: 1px solid #000000; border-radius: 50px; cursor: pointer; flex-shrink: 0; margin-top: 35px; margin-bottom: 20px;">
                    <div style="width: 40px; height: 40px; background: url('circle-check-regular.png') no-repeat center center / contain; flex: none;"></div>
                    <div style="font-family: 'GenSenRounded2 TW', sans-serif; font-weight: 500; font-size: 16px; text-align: center; color: #482B12; flex: none;">確認！開始比對尋找</div>
                </div>

                <!-- Add Tag Modal -->
                <div id="add-tag-modal-{page_id}" class="modal-overlay">
                    <div class="modal-content">
                        <!-- Top part: Selected Tags -->
                        <div style="width: 100%; height: 130px; background: #F3F0E1; border-radius: 10px 10px 0px 0px; position: relative;">
                            <div onclick="window.closeAddTagModal('{page_id}')" style="position: absolute; width: 35px; height: 35px; left: 11px; top: 10px; cursor: pointer; display: flex; justify-content: center; align-items: center;">
                                <div style="width: 25px; height: 25px; border: 3px solid #1E1E1E; display: flex; justify-content: center; align-items: center; position: relative;"><div style="width: 15px; height: 3px; background: #1E1E1E; transform: rotate(45deg); position: absolute;"></div><div style="width: 15px; height: 3px; background: #1E1E1E; transform: rotate(-45deg); position: absolute;"></div></div>
                            </div>
                            <div onclick="window.confirmAddTags('{page_id}')" style="position: absolute; width: 35px; height: 35px; right: -5px; top: 10px; background: url('check-solid.png') no-repeat center center / contain; cursor: pointer;"></div>
                            <div style="position: absolute; left: 17px; top: 57px; font-family: 'GenSenRounded2 TW', sans-serif; font-weight: 500; font-size: 16px; color: #482B12;">已選標籤</div>
                            <div id="modal-selected-tags-{page_id}" style="position: absolute; left: 17px; top: 85px; width: 260px; display: flex; flex-wrap: wrap; gap: 8px;">
                                <!-- Selected tags here -->
                            </div>
                        </div>
                        
                        <!-- Scroll bar separator -->
                        <div style="position: absolute; width: 4px; height: 260px; right: 15px; top: 135px; background: #FFFFFF; border-radius: 10px;">
                            <div style="width: 4px; height: 25px; background: #C4C4C4; border-radius: 10px;"></div>
                        </div>

                        <!-- Available Tags -->
                        <div style="padding: 15px; height: 270px; overflow-y: auto; box-sizing: border-box;">
                            <div style="display: flex; flex-direction: column; gap: 10px;">
                                <!-- Example tags, to be dynamically populated -->
                                <div style="font-family: 'GenSenRounded2 TW', sans-serif; font-weight: 500; font-size: 16px; color: #000000; cursor: pointer;" onclick="window.toggleTagSelection('{page_id}', '雨具')">雨具</div>
                                <div style="font-family: 'GenSenRounded2 TW', sans-serif; font-weight: 500; font-size: 16px; color: #482B12; cursor: pointer;" onclick="window.toggleTagSelection('{page_id}', '鑰匙')">鑰匙</div>
                                <div style="font-family: 'GenSenRounded2 TW', sans-serif; font-weight: 500; font-size: 16px; color: #482B12; cursor: pointer;" onclick="window.toggleTagSelection('{page_id}', '電子產品')">電子產品</div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>"""

pattern_05 = r'<!-- PAGE 05: AI Tags Confirm \(Finder\) -->.*?</div>\s*<!-- PAGE 06'
html = re.sub(pattern_05, generate_confirm_page('05', 'page-03', 'page-04', 'submitLostData') + "\n        <!-- PAGE 06", html, flags=re.DOTALL)

pattern_11 = r'<!-- PAGE 11: AI Tags Confirm \(Founder\) -->.*?</div>\s*<!-- PAGE 12'
html = re.sub(pattern_11, generate_confirm_page('11', 'page-10', 'page-10', 'submitFoundData') + "\n        <!-- PAGE 12", html, flags=re.DOTALL)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)
