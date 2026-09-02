/**
 * DiuLa! user_id 遷移腳本
 * =========================================================================
 * 背景：
 *   舊版 generateUserId() 是用「當下」的年份/月份組成 user_id（例如 L2508xxxx），
 *   而不是使用者「第一次使用丟拉」的年份/月份。這導致同一個人在跨月之後重新整理
 *   頁面，App 用「今天」的年月重算出來的 user_id 會跟過去寫入 lost_items /
 *   found_items 的舊 user_id 對不起來，害「我的遺失物 / 我的拾獲物」查不到資料。
 *
 *   index.html 已經修正為：每個人的 user_id 只在第一次使用時決定一次，並存進
 *   Firestore 的 user_registry collection，之後永遠讀回同一組 ID
 *   （見 index.html 的 window.getOrCreateUserId）。
 *
 *   但是「修好程式」不會自動修好「已經寫進資料庫的舊資料」，所以需要這支腳本，
 *   針對 lost_items / found_items 裡的舊資料做一次性的修復。
 *
 * 修復原理：
 *   user_id 的格式是 `${provider}${yy}${mm}${hash4}`：
 *     - provider：'L' (LINE) 或 'G' (Google / 訪客)
 *     - yy/mm：寫入當下的年月（就是這兩碼會亂跑，需要修正的部分）
 *     - hash4：由「原始 UID」算出來的 4 碼雜湊值，同一個人不管什麼時候算都一樣
 *   因此可以用「provider + hash4」把同一個人在不同月份寫入的舊資料串起來，
 *   取這個人「最早」的一筆資料的時間，重新組出他「應該」要有的永久 user_id，
 *   再把這個人名下所有的舊資料都改成這組永久 ID，同時把這組 ID 寫進
 *   user_registry，之後 App 讀到的就會是同一組 ID 了。
 *
 * 使用方式：
 *   1) npm install firebase-admin
 *   2) 到 Firebase 主控台 > 專案設定 > 服務帳戶，產生一組私密金鑰（JSON 檔）
 *      下載下來，例如存成 ./serviceAccountKey.json（這個檔案不要上傳到 GitHub！）
 *   3) 先「乾跑」看看會改到哪些資料，不會真的寫入任何東西：
 *        node migrate-user-ids.js --key=./serviceAccountKey.json
 *   4) 確認輸出的報告沒問題之後，加上 --apply 才會真的寫入 Firestore：
 *        node migrate-user-ids.js --key=./serviceAccountKey.json --apply
 *
 *   這支腳本可以重複執行多次，不會重複修壞資料（idempotent）。
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
    console.error('範例：node migrate-user-ids.js --key=./serviceAccountKey.json');
    process.exit(1);
}

const admin = require('firebase-admin');
const serviceAccount = require(path.resolve(process.cwd(), key));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// user_id 格式：1 碼 provider + 2 碼 yy + 2 碼 mm + 4 碼 hash（英數字）
const USER_ID_PATTERN = /^([A-Z])(\d{2})(\d{2})([A-Z0-9]{4})$/;

function parseUserId(userId) {
    if (!userId || typeof userId !== 'string') return null;
    const m = userId.match(USER_ID_PATTERN);
    if (!m) return null;
    return { provider: m[1], yy: m[2], mm: m[3], hash4: m[4] };
}

async function main() {
    console.log(apply ? '=== 正式執行模式（會寫入 Firestore） ===' : '=== 乾跑模式（不會寫入任何東西，只顯示報告） ===');

    // 1) 讀出 lost_items 和 found_items 所有文件
    const [lostSnap, foundSnap] = await Promise.all([
        db.collection('lost_items').get(),
        db.collection('found_items').get()
    ]);

    // 2) 依照「provider + hash4」把同一個人的資料分組
    //    group: { provider, hash4, earliestMs, earliestYY, earliestMM, docs: [{ ref, collection, oldUserId, hasPickerId }] }
    const groups = new Map();
    let skipped = 0;

    function addDoc(snapDoc, collectionName) {
        const data = snapDoc.data();
        const parsed = parseUserId(data.user_id);
        if (!parsed) {
            skipped++;
            console.warn(`[略過] ${collectionName}/${snapDoc.id} 的 user_id 格式不符，未變動：${data.user_id}`);
            return;
        }
        const key = `${parsed.provider}_${parsed.hash4}`;
        if (!groups.has(key)) {
            groups.set(key, {
                provider: parsed.provider,
                hash4: parsed.hash4,
                earliestMs: Infinity,
                earliestYY: parsed.yy,
                earliestMM: parsed.mm,
                docs: []
            });
        }
        const group = groups.get(key);

        // timestamp 可能是 Firestore Timestamp，也可能因為 serverTimestamp() 尚未落地而是 null
        const ts = data.timestamp && typeof data.timestamp.toMillis === 'function'
            ? data.timestamp.toMillis()
            : null;
        if (ts !== null && ts < group.earliestMs) {
            group.earliestMs = ts;
            group.earliestYY = parsed.yy;
            group.earliestMM = parsed.mm;
        }

        group.docs.push({
            ref: snapDoc.ref,
            collection: collectionName,
            oldUserId: data.user_id,
            hasPickerId: collectionName === 'found_items' && !!data.picker_id
        });
    }

    lostSnap.forEach(d => addDoc(d, 'lost_items'));
    foundSnap.forEach(d => addDoc(d, 'found_items'));

    console.log(`共找到 ${groups.size} 位不同的使用者，${skipped} 筆資料因格式不符被略過。\n`);

    // 3) 對每一組決定「永久 user_id」：優先採用 user_registry 裡已經有的紀錄，
    //    沒有的話才用這個人最早一筆資料的年月現算一組
    let registryWrites = 0;
    let docUpdates = 0;
    let unchanged = 0;

    const registryColl = db.collection('user_registry');
    const batchOps = []; // { type: 'set'|'update', ref, data }

    for (const [key, group] of groups.entries()) {
        const registryId = key; // 跟 index.html 的 getOrCreateUserId 用同一種命名規則
        const registryRef = registryColl.doc(registryId);
        const registrySnap = await registryRef.get();

        let canonicalUserId;
        if (registrySnap.exists && registrySnap.data().user_id) {
            canonicalUserId = registrySnap.data().user_id;
        } else {
            const yy = group.earliestYY;
            const mm = group.earliestMM;
            canonicalUserId = `${group.provider}${yy}${mm}${group.hash4}`;
            batchOps.push({
                type: 'set',
                ref: registryRef,
                data: {
                    user_id: canonicalUserId,
                    login_provider: group.provider,
                    yy, mm,
                    migrated: true,
                    migrated_at: admin.firestore.FieldValue.serverTimestamp()
                }
            });
            registryWrites++;
            console.log(`[新增註冊表] ${registryId} -> ${canonicalUserId}（依最早資料時間推算）`);
        }

        for (const docInfo of group.docs) {
            if (docInfo.oldUserId === canonicalUserId) {
                unchanged++;
                continue;
            }
            const updateData = { user_id: canonicalUserId };
            if (docInfo.hasPickerId) updateData.picker_id = canonicalUserId;
            batchOps.push({ type: 'update', ref: docInfo.ref, data: updateData });
            docUpdates++;
            console.log(`[更新] ${docInfo.collection}/${docInfo.ref.id}：${docInfo.oldUserId} -> ${canonicalUserId}`);
        }
    }

    console.log(`\n預計新增 ${registryWrites} 筆 user_registry 紀錄，更新 ${docUpdates} 筆舊資料，${unchanged} 筆資料本來就是正確的不需變動。`);

    if (!apply) {
        console.log('\n這是乾跑模式，尚未寫入任何東西。確認上面的報告沒問題後，加上 --apply 參數重新執行即可正式寫入。');
        return;
    }

    // 4) 正式寫入：Firestore 一個 batch 最多 500 個操作，超過就分批送出
    const CHUNK_SIZE = 450;
    for (let i = 0; i < batchOps.length; i += CHUNK_SIZE) {
        const chunk = batchOps.slice(i, i + CHUNK_SIZE);
        const batch = db.batch();
        for (const op of chunk) {
            if (op.type === 'set') batch.set(op.ref, op.data);
            else batch.update(op.ref, op.data);
        }
        await batch.commit();
        console.log(`已送出第 ${Math.floor(i / CHUNK_SIZE) + 1} 批，共 ${chunk.length} 個操作。`);
    }

    console.log('\n✅ 遷移完成！');
}

main().catch(err => {
    console.error('遷移過程發生錯誤：', err);
    process.exit(1);
});
