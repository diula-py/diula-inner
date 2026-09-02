/**
 * 一次性修正腳本：修回被 migrate-user-ids.js 第一次執行時誤判的 G_53M6 這組使用者
 * =========================================================================
 * 背景：
 *   migrate-user-ids.js 第一次用 --apply 執行時，靠 Firestore 的 timestamp 欄位判斷
 *   「哪一筆資料最早」，但這組資料是開發階段手動塞的測試資料，timestamp 跟資料裡
 *   假造的日期（doc ID 裡的 260818、260826）對不上，導致誤判「9 月」才是最早，
 *   把原本正確、屬於「8 月」的 9 筆資料錯改成了 9 月。
 *
 *   這支腳本就是把這 9 筆資料、以及對應的 user_registry 紀錄，精準改回原本
 *   （也就是第一次執行前）的正確值 —— 這些值都是從執行紀錄裡覆盤回來的，
 *   不是用猜的。
 *
 * 使用方式（跟 migrate-user-ids.js 一樣，先乾跑看報告，確認沒問題再加 --apply）：
 *   node fix-g53m6.js --key=./serviceAccountKey.json
 *   node fix-g53m6.js --key=./serviceAccountKey.json --apply
 *
 * 這支腳本只會用到這一次，修完之後可以刪除。
 * =========================================================================
 */

const path = require('path');

function parseArgs() {
    const args = process.argv.slice(2);
    const out = { apply: false, key: null };
    for (const arg of args) {
        if (arg === '--apply') out.apply = true;
        else if (arg.startsWith('--key=')) out.key = arg.slice('--key='.length);
    }
    return out;
}

const { apply, key } = parseArgs();

if (!key) {
    console.error('請用 --key=你的服務帳戶金鑰路徑.json 指定 Firebase 服務帳戶金鑰。');
    process.exit(1);
}

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const serviceAccount = require(path.resolve(process.cwd(), key));

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const CORRECT_USER_ID = 'G260853M6'; // 正確答案：8 月
const WRONG_USER_ID = 'G260953M6';   // 第一次執行誤改成的：9 月

// 從第一次執行的紀錄裡覆盤出來的 9 筆資料
const DOCS_TO_FIX = [
    { collection: 'lost_items', id: 'DL-LN-260818-4OI' },
    { collection: 'lost_items', id: 'DL-LN-260818-8LS' },
    { collection: 'lost_items', id: 'DL-LN-260818-CBT' },
    { collection: 'lost_items', id: 'DL-LN-260823-10W' },
    { collection: 'lost_items', id: 'DL-LN-260823-1PM' },
    { collection: 'lost_items', id: 'DL-LN-260826-6TL' },
    { collection: 'lost_items', id: 'DL-LN-260826-L45' },
    { collection: 'lost_items', id: 'DL-LN-260826-OPO' },
    { collection: 'found_items', id: 'DL-FN-260826-MPG' }
];

async function main() {
    console.log(apply ? '=== 正式執行模式（會寫入 Firestore） ===' : '=== 乾跑模式（不會寫入任何東西，只顯示報告） ===');

    const registryRef = db.collection('user_registry').doc('G_53M6');
    const registrySnap = await registryRef.get();

    if (!registrySnap.exists) {
        console.error('找不到 user_registry/G_53M6，這支腳本假設的前提不成立，請先跟 Claude 確認現況再繼續，不要直接執行。');
        process.exit(1);
    }
    const current = registrySnap.data();
    if (current.user_id !== WRONG_USER_ID) {
        console.log(`user_registry/G_53M6 目前的 user_id 是「${current.user_id}」，不是預期中錯誤的「${WRONG_USER_ID}」。`);
        console.log('可能已經被修正過了，或情況跟預期不同，這支腳本不會做任何變動，請跟 Claude 確認。');
        return;
    }

    console.log(`[將修正] user_registry/G_53M6：${WRONG_USER_ID} -> ${CORRECT_USER_ID}`);

    const batch = db.batch();
    batch.set(registryRef, {
        user_id: CORRECT_USER_ID,
        login_provider: 'G',
        yy: '26', mm: '08',
        migrated: true,
        fixed_at: FieldValue.serverTimestamp()
    });

    let fixedCount = 0;
    for (const docInfo of DOCS_TO_FIX) {
        const ref = db.collection(docInfo.collection).doc(docInfo.id);
        const snap = await ref.get();
        if (!snap.exists) {
            console.warn(`[跳過] ${docInfo.collection}/${docInfo.id} 找不到這筆文件，可能已被刪除。`);
            continue;
        }
        const data = snap.data();
        if (data.user_id !== WRONG_USER_ID) {
            console.warn(`[跳過] ${docInfo.collection}/${docInfo.id} 目前的 user_id 是「${data.user_id}」，不是預期的「${WRONG_USER_ID}」，跳過避免誤改。`);
            continue;
        }
        const updateData = { user_id: CORRECT_USER_ID };
        if (docInfo.collection === 'found_items' && data.picker_id) {
            updateData.picker_id = CORRECT_USER_ID;
        }
        batch.update(ref, updateData);
        fixedCount++;
        console.log(`[將修正] ${docInfo.collection}/${docInfo.id}：${WRONG_USER_ID} -> ${CORRECT_USER_ID}`);
    }

    console.log(`\n預計修正 1 筆 user_registry 紀錄 + ${fixedCount} 筆資料。`);

    if (!apply) {
        console.log('\n這是乾跑模式，尚未寫入任何東西。確認上面的報告沒問題後，加上 --apply 參數重新執行即可正式寫入。');
        return;
    }

    await batch.commit();
    console.log('\n✅ 修正完成！');
}

main().catch(err => {
    console.error('修正過程發生錯誤：', err);
    process.exit(1);
});
