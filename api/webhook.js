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

    // 將整包收到的 payload 印到 Vercel Logs 中，方便隨時檢視
    console.log("LINE Webhook Payload:", JSON.stringify(body, null, 2));

    for (const event of events) {
      // 不篩選條件，只要有事件就強制擷取基本與原始資料
      const record = {
        timestamp: new Date().toISOString(),
        senderUserId: event.source?.userId || '未知傳送者',
        groupId: event.source?.groupId || event.source?.roomId || '一對一私訊',
        targetMid: event.message?.mid || event.message?.contact?.mid || event.message?.text || '解析中',
        displayName: event.message?.displayName || event.message?.contact?.displayName || event.type || '未知名稱',
        raw: JSON.stringify(event)
      };

      global.midDatabase.unshift(record);

      // 自動回覆確認訊息給發送者
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
              messages: [{ type: 'text', text: `[系統除錯] 已收到事件，正在記錄採證資料。` }]
            })
          });
        } catch (err) {
          console.error('Reply error:', err);
        }
      }
    }

    return res.status(200).json({ status: 'success', totalSaved: global.midDatabase.length });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
