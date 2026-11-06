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
      
      // 關鍵：精準對應 LINE 官方聯絡人名片（Contact Message）的資料結構
      // 當用戶傳送聯絡資訊時，LINE 會帶有 msg.type === 'contact'，其內包含 contact 物件
      let targetMid = '';
      let displayName = '未知名稱';

      if (msg.type === 'contact') {
        targetMid = msg.mid || msg.userId || '取得MID失敗';
        displayName = msg.displayName || '聯絡人名片';
      } else {
        // 如果是其他訊息，作為備用捕捉
        targetMid = msg.text || msg.type || '一般訊息';
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
                messages: [{ type: 'text', text: `[採證系統] 成功擷取嫌疑人 MID：${targetMid}` }]
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
