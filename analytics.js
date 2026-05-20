// analytics.js
import { config } from './config.js';

// 読み込んだ設定値を変数に割り当て
const GA_MEASUREMENT_ID = config.GA_MEASUREMENT_ID;
const GA_API_SECRET = config.GA_API_SECRET;

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

function getCurrentScreenResolution() {
  if (typeof window !== 'undefined' && window.screen) {
    return `${window.screen.width}x${window.screen.height}`;
  }
  if (typeof globalThis !== 'undefined' && globalThis.screen) {
    return `${globalThis.screen.width}x${globalThis.screen.height}`;
  }
  return 'unknown';
}

function getStoredScreenResolution() {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      resolve('unknown');
      return;
    }
    chrome.storage.local.get('screenResolution', (result) => {
      resolve(result?.screenResolution || 'unknown');
    });
  });
}

function storeScreenResolution(resolution) {
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
    return;
  }
  chrome.storage.local.set({ screenResolution: resolution });
}

async function getScreenResolution() {
  const resolution = getCurrentScreenResolution();
  if (resolution !== 'unknown') {
    storeScreenResolution(resolution);
    return resolution;
  }
  return await getStoredScreenResolution();
}

// 他のファイルから呼び出せるように export する
export async function sendGAEvent(eventName, params = {}) {
  if (!GA_MEASUREMENT_ID || !GA_API_SECRET || GA_MEASUREMENT_ID === 'G-XXXXXXXXXX') {
    console.warn('GA4 Measurement ID or API Secret is not set. Event not sent:', eventName, params);
    return;
  }

  try {
    const clientId = await getOrCreateClientId();
    const fetchUrl = `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`;
    
    // 追加のデータ収集項目 (1: OS/ブラウザ, 2: 言語, 3: 画面解像度)
    const systemParams = {
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent || 'unknown' : 'unknown',
      language: typeof navigator !== 'undefined' ? navigator.language || 'unknown' : 'unknown',
      screen_resolution: await getScreenResolution()
    };

    const mergedParams = { ...systemParams, ...params };

    const body = {
      client_id: clientId,
      events: [{
        name: eventName,
        params: mergedParams,
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
