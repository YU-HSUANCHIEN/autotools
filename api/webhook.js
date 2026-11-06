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

    // 狀況 A：來自 LIFF 網頁前端主動提交的採證資料
    if (body.type === 'liff_submit') {
      const record = {
        timestamp: body.timestamp || new Date().toISOString(),
        senderUserId: body.victimMid || '未知被害人',
        displayName: body.victimName || '未知名稱',
        targetMid: body.targetMid || '未填寫嫌疑人',
        raw: JSON.stringify(body)
      };

      global.midDatabase.unshift(record);
      return res.status(200).json({ status: 'success', message: 'LIFF 資料已紀錄' });
    }

    // 狀況 B：傳統 LINE Bot Webhook 事件
    const events = body.events || [];
    for (const event of events) {
      if (event.type === 'message') {
        const record = {
          timestamp: new Date().toISOString(),
          senderUserId: event.source?.userId || '未知傳送者',
          displayName: 'LINE 聊天室訊息',
          targetMid: event.message?.text || '一般訊息',
          raw: JSON.stringify(event)
        };
        global.midDatabase.unshift(record);
      }
    }

    return res.status(200).json({ status: 'success', totalSaved: global.midDatabase.length });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
