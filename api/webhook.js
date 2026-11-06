// api/webhook.js
global.midDatabase = global.midDatabase || [];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const events = req.body.events || [];

  for (const event of events) {
    // 支援真實 LINE 聯絡資訊名片，也支援我們剛才測試的結構
    const contactData = event.message?.contact || event.message;
    
    if (event.type === 'message' && (event.message?.type === 'contact' || contactData?.mid)) {
      const record = {
        timestamp: new Date().toISOString(),
        senderUserId: event.source?.userId || 'TestUser',
        groupId: event.source?.groupId || event.source?.roomId || 'TestGroup',
        targetMid: contactData.mid || contactData.contact?.mid || 'No MID',
        displayName: contactData.displayName || contactData.contact?.displayName || '未知名稱'
      };

      // 確實推入全域陣列
      global.midDatabase.unshift(record);
    }
  }

  return res.status(200).json({ status: 'success', totalSaved: global.midDatabase.length });
}
