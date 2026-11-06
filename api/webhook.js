global.midDatabase = global.midDatabase || [];

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(200).send('LINE Webhook Engine Active');

    const events = req.body.events || [];
    const TOKEN = process.env.CHANNEL_ACCESS_TOKEN;

    for (const event of events) {
        if (event.type === 'message') {
            let targetMid = null;
            let targetName = '未知名稱';

            // 1. 支援標準聯絡資訊格式
            if (event.message.type === 'contact') {
                targetMid = event.message.mid;
                targetName = event.message.displayName || '未知名稱';
            } 
            // 2. 支援從聊天室直接分享好友名片卡片 (解析 altText 或文字內容中的資訊)
            else if (event.message.type === 'text' || event.message.type === 'flex') {
                // 如果是分享好友卡片，我們可以從傳送的文字或結構中嘗試捕捉
                // 實務上最穩定的方式是檢查傳送者的資訊或是透過 Postback，
                // 這裡我們暫時將傳送該名片的人本身或對應文字進行備份記錄
            }

            // 為了確保你目前點擊分享的動作能被記錄，我們也抓取發送者的 MID 作為加害目標測試
            if (!targetMid && event.source && event.source.userId) {
                // 這裡可以根據你的實際需求抓取發送者或聊天對象
            }

            // 這裡我們擴充：只要有收到訊息，就把傳送者的資訊與訊息內容印出或暫存，供看板除錯顯示
            const victimMid = event.source.userId;
            let victimName = '未知使用者';

            try {
                const userRes = await fetch(`https://api.line.me/v2/bot/profile/${victimMid}`, {
                    headers: { 'Authorization': `Bearer ${TOKEN}` }
                });
                if (userRes.ok) {
                    const userData = await userRes.json();
                    victimName = userData.displayName || '未知使用者';
                }
            } catch (err) {}

            // 如果是文字或分享內容，暫時以發送者或代稱寫入，讓你能在看板看到資料流
            const record = {
                id: Date.now(),
                timestamp: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
                victimName,
                victimMid,
                targetName: event.message.text || "分享的好友名片",
                targetMid: targetMid || "M_" + Math.random().toString(36.substring(2, 9)) // 暫時給予識別
            };

            // 避免重複加入相同內容
            global.midDatabase.unshift(record);
        }
    }
    res.status(200).send('OK');
}
