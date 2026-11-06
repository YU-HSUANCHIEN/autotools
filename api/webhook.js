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
      // 為了找出名片真實結構，我們把整包 event 轉成文字存下來
      const record = {
        timestamp: new Date().toISOString(),
        senderUserId: event.source?.userId || 'Unknown',
        groupId: event.source?.groupId || event.source?.roomId || 'PrivateChat',
        // 嘗試抓取各種可能的 MID 欄位位置
        targetMid: event.message?.mid || event.message?.contact?.mid || event.message?.userId || 'Check Raw Data',
        displayName: event.message?.displayName || event.message?.contact?.displayName || '查看原始資料',
        // 把整包原始事件存進 raw 欄位，方便我們在網頁上看得清清楚楚
        rawEvent: JSON.stringify(event)
      };

      global.midDatabase.unshift(record);
    }

    return res.status(200).json({ status: 'success', totalSaved: global.midDatabase.length });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
