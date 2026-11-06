import crypto from 'crypto';

// 建立一個記憶體暫存陣列（注意：若 Vercel Serverless Function 重新冷啟動會清空，若需永久保存建議改用 Vercel KV 或資料庫）
global.midDatabase = global.midDatabase || [];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const signature = req.headers['x-line-signature'];
  const channelSecret = process.env.CHANNEL_SECRET;

  // 1. 驗證 LINE 簽章（若有設定 CHANNEL_SECRET 則進行嚴格驗證）
  if (channelSecret && signature) {
    const bodyString = JSON.stringify(req.body);
    const hash = crypto
      .createHmac('SHA256', channelSecret)
      .update(bodyString)
      .digest('base64');

    if (hash !== signature) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  const events = req.body.events || [];

  for (const event of events) {
    // 檢查是否為訊息事件且型態為聯絡資訊（名片）
    if (event.type === 'message' && event.message && event.message.type === 'contact') {
      const contactData = event.message.contact;
      
      const record = {
        timestamp: new Date().toISOString(),
        senderUserId: event.source?.userId || 'Unknown',
        groupId: event.source?.groupId || event.source?.roomId || '1on1',
        targetMid: contactData.mid || 'No MID',
        displayName: contactData.displayName || '未知名稱'
      };

      // 將抓取到的資料存入記憶體陣列最前方
      global.midDatabase.unshift(record);
    }
  }

  return res.status(200).json({ status: 'success' });
}
