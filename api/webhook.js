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

        // 1. 先用正規法尋找有沒有直接出現的 U 開頭 MID
        const midRegex = /U[0-9a-fA-F]{32}/g;
        let matchedMids = rawJsonStr.match(midRegex) || [];
        let suspectMids = [...new Set(matchedMids)].filter(mid => mid !== senderMid);

        // 2. 如果直接抓不到，開始深入解析 Flex / 圖片名片裡的網址與參數
        let targetIdentifier = suspectMids.length > 0 ? suspectMids[0] : '';

        if (!targetIdentifier) {
          // 嘗試從 Flex 訊息的 uri 欄位或 altText 抓取線索
          const msg = event.message || {};
          if (msg.uri) {
            targetIdentifier = `URI: ${msg.uri}`;
          } else if (msg.altText) {
            targetIdentifier = `名片摘要: ${msg.altText}`;
          } else {
            // 抓取整包 raw 裡面所有的網址或代碼特徵
            const urlRegex = /https?:\/\/[^\s"]+/g;
            const urls = rawJsonStr.match(urlRegex) || [];
            targetIdentifier = urls.length > 0 ? `連結: ${urls[urls.length - 1]}` : `事件類型: ${msg.type || 'unknown'}`;
          }
        }

        // 寫入雲端看板
        global.midDatabase.unshift({
          timestamp: new Date().toISOString(),
          senderUserId: senderMid,
          targetMid: targetIdentifier,
          raw: rawJsonStr
        });

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
                messages: [{ type: 'text', text: `[系統] 已成功擷取名片特徵。` }]
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
