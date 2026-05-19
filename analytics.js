// Google Analytics 4 Measurement Protocol 
// TODO: GA4の管理画面から取得した以下の値を実際の値に置き換えてください
const GA_MEASUREMENT_ID = 'G-R2H7719DLS'; 
const GA_API_SECRET = 'igCX4ORcQ0i3M-MLMlPy8w';

// ユーザーごとの匿名IDを取得・生成する
async function getOrCreateClientId() {
  const result = await chrome.storage.local.get('clientId');
  let clientId = result.clientId;
  if (!clientId) {
    clientId = self.crypto.randomUUID();
    await chrome.storage.local.set({ clientId });
  }
  return clientId;
}

// GA4にイベントを送信する関数
async function sendGAEvent(eventName, params = {}) {
  // IDが初期状態のままであれば送信しない
  if (GA_MEASUREMENT_ID === 'G-XXXXXXXXXX' || GA_API_SECRET === 'XXXXXXXXXXXXXXXXXXXX') {
    console.warn('GA4 Measurement ID or API Secret is not set. Event not sent:', eventName, params);
    return;
  }

  try {
    const clientId = await getOrCreateClientId();
    const fetchUrl = `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`;
    
    const body = {
      client_id: clientId,
      events: [{
        name: eventName,
        params: params,
      }]
    };

    await fetch(fetchUrl, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  } catch (e) {
    console.error('Failed to send GA event', e);
  }
}
