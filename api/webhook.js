// api/webhook.js 範例核心邏輯
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const events = req.body.events || [];
  
  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'contact') {
      const contactInfo = event.message.contact;
      const senderUserId = event.source.userId;
      
      // 這裡要確保抓得到 MID 與 傳送者資訊並存入陣列或資料庫
      const targetMid = contactInfo.mid;
      const targetName = contactInfo.displayName;
      
      // 將資料存入你的暫存陣列（或 KV 儲存空間）
    }
  }

  return res.status(200).json({ status: 'success' });
}
