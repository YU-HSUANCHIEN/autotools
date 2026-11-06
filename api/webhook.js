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
      const contact = msg.contact || {};
      
      const targetMid = contact.mid || msg.mid || contact.userId || '';
      const displayName = contact.displayName || msg.displayName || '未知名稱';

      if (event.type === 'message' && (msg.type === 'contact' || targetMid)) {
        const record = {
          timestamp: new Date().toISOString(),
          senderUserId: event.source?.userId || '未知傳送者',
          groupId: event.source?.groupId || event.source?.roomId || '一對一私訊',
          targetMid: targetMid || '未取得MID',
          displayName: displayName
        };

        global.midDatabase.unshift(record);

        // 使用你設定的 CHANNEL_ACCESS_TOKEN 自動回覆確認訊息
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
                messages: [{ type: 'text', text: `[辦案採證成功] 已成功擷取目標 MID：${targetMid}` }]
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
