global.midDatabase = global.midDatabase || [];

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(200).send('LINE Webhook Engine Active');

    const events = req.body.events || [];
    const TOKEN = process.env.CHANNEL_ACCESS_TOKEN;

    for (const event of events) {
        // 只處理聯絡資訊 (Contact) 訊息
        if (event.type === 'message' && event.message.type === 'contact') {
            const victimMid = event.source.userId;
            const targetMid = event.message.mid;
            const targetName = event.message.displayName || '未知名稱';

            // 向 LINE API 查詢被害人暱稱
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
                targetName,
                targetMid
            };

            // 避免重複紀錄相同加害人 MID
            const exists = global.midDatabase.some(i => i.targetMid === targetMid);
            if (!exists) {
                global.midDatabase.unshift(record);
            }
        }
    }
    res.status(200).send('OK');
}