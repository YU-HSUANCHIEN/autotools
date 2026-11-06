global.midDatabase = global.midDatabase || [];

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(200).send('LINE Webhook Engine Active');
    }

    const events = req.body.events || [];
    const TOKEN = process.env.CHANNEL_ACCESS_TOKEN;

    for (const event of events) {
        if (event.type === 'message') {
            let targetMid = null;
            let targetName = '未知名稱';

            // 1. 如果是標準的 LINE 聯絡資訊格式
            if (event.message.type === 'contact') {
                targetMid = event.message.mid;
                targetName = event.message.displayName || '未知名稱';
            } 
            // 2. 如果是用戶透過聊天室分享名片夾帶的文字或其他格式
            else if (event.message.type === 'text') {
                targetName = event.message.text;
                // 如果文字中包含某些辨識特徵，或直接將文字作為目標名稱紀錄
            }

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

            const record = {
                id: Date.now(),
                timestamp: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
                victimName,
                victimMid,
                targetName: targetName,
                targetMid: targetMid || "M_" + Math.random().toString(36).substring(2, 9)
            };

            // 確保不重複推送到陣列頂端
            global.midDatabase.unshift(record);
        }
    }
    
    return res.status(200).send('OK');
}
