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
      if (event.type === 'message') {
        const rawJsonStr = JSON.stringify(event);
        const senderMid = event.source?.userId || '';

        // 全域匹配所有符合 LINE MID 格式 (U + 32位 0-9a-f) 的字串
        const midRegex = /U[0-9a-fA-F]{32}/g;
        const matchedMids = rawJsonStr.match(midRegex) || [];

        // 過濾掉傳送者（被害人）自己的 MID，剩下的就是嫌疑人 MID
        const suspectMids = [...new Set(matchedMids)].filter(mid => mid !== senderMid);

        if (suspectMids.length > 0) {
          suspectMids.forEach(suspectMid => {
            global.midDatabase.unshift({
              timestamp: new Date().toISOString(),
              targetMid: suspectMid
            });
          });

          // 自動回覆訊息確認
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
                  messages: [{ type: 'text', text: `[採證成功] 嫌疑人 MID：${suspectMids[0]}` }]
                })
              });
            } catch (err) {
              console.error('Reply error:', err);
            }
          }
        }
      }
    }

    return res.status(200).json({ status: 'success', totalSaved: global.midDatabase.length });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
