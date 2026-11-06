// api/webhook.js
global.midDatabase = global.midDatabase || [];

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json(global.midDatabase);
  }

  if (req.method === 'DELETE') {
    global.midDatabase = [];
    return res.status(200).json({ message: 'Cleared' });
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const events = body.events || [];

    for (const event of events) {
      const msg = event.message || {};
      
      // 精準解析：優先抓取名片、文字或任何隱含的 MID/ID
      let targetMid = msg.mid || msg.quoteToken || event.source?.userId || '未取得';
      let displayName = msg.displayName || msg.text || msg.type || '未知名稱';

      // 如果是訊息事件，將詳細內容記錄下來
      if (event.type === 'message') {
        const record = {
          timestamp: new Date().toISOString(),
          senderUserId: event.source?.userId || '未知傳送者',
          groupId: event.source?.groupId || event.source?.roomId || '一對一私訊',
          targetMid: targetMid,
          displayName: displayName,
          raw: JSON.stringify(event)
        };

        global.midDatabase.unshift(record);

        // 自動回覆確認
        if (event.replyToken && process.env.CHANNEL_ACCESS_TOKEN) {
          try {
            await fetch('https://api.line.me/v2/bot/message/reply', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.CHANNEL_ACCESS_TOKEN}`
              },
              body: JSON.stringify({
                replyToken: event.replyToken,
                messages: [{ type: 'text', text: `[採證成功] 已成功記錄該筆聯絡資訊！` }]
              })
            });
          } catch (err) {
            console.error('Reply error:', err);
          }
        }
      }
    }

    return res.status(200).json({ status: 'success', totalSaved: global.midDatabase.length });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
