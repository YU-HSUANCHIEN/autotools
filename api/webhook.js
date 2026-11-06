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
      // 只要是群組或聊天室發生的事件，我們全部捕捉下來進行深度解析
      const rawJsonStr = JSON.stringify(event);
      const msg = event.message || {};
      
      // 強力尋找可能的 MID 或聯絡人資訊
      let extractedData = '未抓取';
      let displayName = msg.type || '未知事件';

      if (msg.type === 'contact') {
        extractedData = msg.mid || msg.userId || JSON.stringify(msg);
        displayName = msg.displayName || '聯絡人名片';
      } else {
        // 如果不是標準 contact，直接把整包訊息內容或 raw 擷取出來供檢視
        extractedData = msg.text || msg.id || msg.type || '其他格式';
      }

      // 同時用正規法掃描整包 raw 裡有沒有藏 U 開頭的 ID
      const midRegex = /U[0-9a-fA-F]{32}/g;
      const matchedMids = rawJsonStr.match(midRegex) || [];
      const senderMid = event.source?.userId || '';
      const otherMids = matchedMids.filter(m => m !== senderMid);

      if (otherMids.length > 0) {
        extractedData = otherMids[0]; // 優先採用抓到的目標 MID
      }

      const record = {
        timestamp: new Date().toISOString(),
        senderUserId: senderMid,
        groupId: event.source?.groupId || event.source?.roomId || '一對一',
        targetMid: extractedData,
        displayName: displayName,
        raw: rawJsonStr
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
              messages: [{ type: 'text', text: `[系統] 已收到事件類型: ${msg.type}` }]
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
