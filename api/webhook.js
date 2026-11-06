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
      
      let targetMid = '未取得 MID';
      let displayName = '未知名稱 (聯絡資訊)';

      // 針對 LINE 聯絡資訊名片（通常是以 Flex / 樣板訊息或帶有特定內容的訊息傳送）進行解析
      if (msg.type === 'flex' || msg.type === 'text' || msg.type === 'image') {
        const rawStr = JSON.stringify(msg);
        
        // 試圖從訊息內容或備用欄位中尋找可能的 MID 線索或名稱
        if (msg.text && msg.text.includes('U')) {
          targetMid = msg.text;
        } else {
          // 如果是名片圖卡，將其完整結構備份以供識別
          targetMid = `[名片分享] ID: ${msg.id || 'N/A'}`;
        }
        
        // 若有帶入顯示名稱
        if (msg.altText) {
          displayName = msg.altText;
        }
      }

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
                messages: [{ type: 'text', text: `[採證成功] 已成功擷取該名片聯絡資訊！` }]
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
