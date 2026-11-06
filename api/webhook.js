// api/webhook.js
global.midDatabase = global.midDatabase || [];

export default async function handler(req, res) {
  // 1. 當用瀏覽器直接造訪此網址（GET 請求）時，顯示目前收集到的所有 MID 採證紀錄
  if (req.method === 'GET') {
    return res.status(200).json(global.midDatabase);
  }

  // 2. 當發送 DELETE 請求時，清空所有採證紀錄
  if (req.method === 'DELETE') {
    global.midDatabase = [];
    return res.status(200).json({ message: 'Cleared' });
  }

  // 3. 當 LINE 官方伺服器或 PowerShell 測試（POST 請求）傳入資料時
  if (req.method === 'POST') {
    const events = req.body.events || [];

    for (const event of events) {
      const contactData = event.message?.contact || event.message;
      
      // 判斷是否為訊息事件且包含聯絡資訊/MID
      if (event.type === 'message' && (event.message?.type === 'contact' || contactData?.mid)) {
        const record = {
          timestamp: new Date().toISOString(),
          senderUserId: event.source?.userId || 'TestUser',
          groupId: event.source?.groupId || event.source?.roomId || 'TestGroup',
          targetMid: contactData.mid || contactData.contact?.mid || 'No MID',
          displayName: contactData.displayName || contactData.contact?.displayName || '未知名稱'
        };

        // 將抓取到的資料推入全域陣列最前方
        global.midDatabase.unshift(record);
      }
    }

    return res.status(200).json({ status: 'success', totalSaved: global.midDatabase.length });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
