# DiuLa! 產品設計規範與技術交接文件 (Design System & Handoff)

## 1. 專案概述 (Project Overview)
本文件定義 DiuLa! 遺失物協尋平台之 UI/UX 規範。
- **設計風格**：Flat Design 2.0 、無陰影 (Zero Drop Shadows)。
- **目標平台**：LINE LIFF (Mobile) 及 Desktop Web (PC)。

---

## 2. 品牌色彩系統 (Color Tokens)
全域**禁用任何 Drop Shadow 陰影效果**。卡片分離請依賴底色差異與 1px 邊框。

| 變數名稱 (CSS Variable) | 應用情境 (Usage) | 色碼 (HEX) |
| :--- | :--- | :--- |
| `--color-primary-brown` | 品牌主色、主標題、按鈕文字、Icon (`#492C13`) | `#492C13` |
| `--color-bg-base` | App 全域背景色、未選中狀態 (`#FFFFFF`) | `#FFFFFF` |
| `--color-bg-card` | 大卡片底色、輔助區塊底色 (`#F3F0E1`) | `#F3F0E1` |
| `--color-bg-input` | 輸入框底色、次要按鈕底色 (`#F5F5F5`) | `#F5F5F5` |
| `--color-primary-light` | 主要按鈕底色、選中狀態、導覽列底色 (`#DFEAF5`) | `#DFEAF5` |
| `--color-border-dark` | 卡片與按鈕外框線 (`#000000`) | `#000000` |
| `--color-status-error` | 刪除按鈕、警告文字 (`#C72F02`) | `#C72F02` |

*(註：為營造俐落街頭感，邊框與部分分隔線直接採用純黑 `#000000` 或主褐色 `#492C13`。)*

---

## 3. 字體排版 (Typography)
- **主要字體庫 (Font Family)**：中文字體使用 `GenSenRounded2 TW` (源泉圓體)，英數字使用 `Comfortaa`。

| 層級 (Level) | 尺寸 (Size) | 字重 (Weight) | 行距 (Line Height) | 用途範例 |
| :--- | :--- | :--- | :--- | :--- |
| **H1** | `24px` | Bold / 700 | `24px` (100%) | 頂部導覽列大標題、頁面主標 (如：我的遺失物) |
| **H2** | `20px` | Bold / 700 | `20px` (100%) | 卡片主標題、次要頁面標題 |
| **Body 1** | `16px` | Medium / 500 | `16px` (100%) | 主要內文、主要按鈕文字、表單輸入標籤 |
| **Body 2** | `12px` | Regular / 400 | `12px` (100%) 或 `150%` | 次要說明、日期、狀態標籤 (如：已排定發文) |

*(註：工程師請注意，部分 Body 2 (12px) 文字的行距在設計稿中設為 150%，請依據實際卡片高度彈性調整。)*

---

## 4. 介面佈局與元件樣式 (Layout & Components)

### 4.1 容器與卡片 (Cards & Containers)
- **卡片邊界 (Border)**：所有標籤、按鈕、輸入框，統一加上 `1px solid #000000` 邊框，若為被選中的標籤或按鈕，變成`1.5px solid #000000`邊框。
- **卡片圓角 (Border-Radius)**：
  - **一般卡片/輸入框**：`10px`
  - **大型圓角按鈕/導覽列/特殊區塊**：`50px` (Pill Shape 膠囊型)，底部Bar被選中的白色部分、比對尋找被選中的模式接為`42px`的圓角。
  - **頂部 Header 底圖**：`0px 0px 20px 20px` (僅底部有圓角)

### 4.2 間距系統 (Spacing)
建議收斂至 8pt / 4pt 網格系統，以利開發維護：
- **全域左右邊距 (Margin)**：`22px` - `27px` (依據內容對齊)
- **卡片內距 (Padding)**：
  - 大型區塊：`30px 40px` 或 `25px 30px`
  - 輸入框/次要卡片：`10px 15px` 或 `10px 20px`
- **元件間距 (Gap)**：通常為 `10px` 或 `20px`。

### 4.3 核心元件庫 (Core Components)

**按鈕 (Buttons)**
- **Primary CTA (主要按鈕)**：底色 `--color-primary-light` (`#DFEAF5`)，邊框 `1px solid #000000`，圓角 `50px`，文字 `--color-primary-brown` (16px, 500)。
- **Secondary / Input (次要/輸入框)**：底色 `--color-bg-input` (`#F5F5F5`) 或純白 `#FFFFFF`，邊框 `1px solid #000000`，圓角 `10px` 或 `50px`。

**底部導覽列 (Bottom TabBar)**
- **高度**：`65px`
- **底色**：`#DFEAF5`
- **圓角**：`50px`
- **佈局**：置於畫面底部，包含三個圖標 (首頁、發布、會員)，選中狀態背景為 `#FFFFFF`，圓角 `42px`。

---

## 5. 跨平台開發建議 (Cross-Platform Notes)
1. **LINE LIFF (Mobile)**：
   - 設計稿基準寬度為 `393px` (iPhone 14/15 尺寸)。
   - 頂部需避開 LINE LIFF 原生 Header (安全區 `env(safe-area-inset-top)`)。
   - 底部 TabBar 需避開 iOS 底部橫條 (`env(safe-area-inset-bottom)`)。
2. **Desktop Web (PC)**：
   - 建議最大寬度限制在 `1200px` 內並水平置中。
   - 卡片列表 (如遺失物清單) 在電腦版可由單欄轉換為 3 欄並排 (CSS Grid)。
