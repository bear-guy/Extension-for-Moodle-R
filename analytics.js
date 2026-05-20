// analytics.js
import { config } from './config.js';

const GA_ENDPOINT = 'https://www.google-analytics.com/mp/collect';
const GA_MEASUREMENT_ID = config.GA_MEASUREMENT_ID;
const GA_API_SECRET = config.GA_API_SECRET;
const SESSION_EXPIRATION_IN_MIN = 30;

class Analytics {
  constructor() {}

  // ユーザーごとの匿名IDを取得・生成
  async getOrCreateClientId() {
    const result = await chrome.storage.local.get('clientId');
    let clientId = result.clientId;
    if (!clientId) {
      clientId = self.crypto.randomUUID();
      await chrome.storage.local.set({ clientId });
    }
    return clientId;
  }

  // GA4のセッションIDを取得・管理
  async getOrCreateSessionId() {
    // 拡張機能のバックグラウンドやポップアップで使えるようにセッション情報を管理
    let result = await chrome.storage.session.get('sessionData').catch(() => ({}));
    let sessionData = result.sessionData;
    const currentTimeInMs = Date.now();
    
    if (sessionData && sessionData.timestamp) {
      const durationInMin = (currentTimeInMs - sessionData.timestamp) / 60000;
      if (durationInMin > SESSION_EXPIRATION_IN_MIN) {
        sessionData = null; // セッションタイムアウト
      } else {
        sessionData.timestamp = currentTimeInMs; // タイムスタンプ更新
        await chrome.storage.session.set({ sessionData }).catch(() => {});
      }
    }
    
    if (!sessionData) {
      sessionData = {
        session_id: currentTimeInMs.toString(),
        timestamp: currentTimeInMs.toString()
      };
      await chrome.storage.session.set({ sessionData }).catch(() => {});
    }
    return sessionData.session_id;
  }

  // 拡張機能の現在の設定（各機能のオンオフ）を取得
  async getExtensionSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get({
        isEnabled: true,
        isDarkMode: false,
        isSkipHomeEnabled: true,
        isStaffMode: false,
        isSyllabusEnabled: true,
        isHighlightCurrentClassEnabled: true
      }, (data) => {
        resolve(data);
      });
    });
  }

  // イベント送信メイン処理
  async fireEvent(eventName, params = {}) {
    if (!GA_MEASUREMENT_ID || !GA_API_SECRET || GA_MEASUREMENT_ID === 'G-XXXXXXXXXX') {
      console.warn('GA4 Measurement ID or API Secret is not set. Event not sent:', eventName);
      return;
    }

    try {
      const clientId = await this.getOrCreateClientId();
      const sessionId = await this.getOrCreateSessionId();
      const settings = await this.getExtensionSettings();

      // GA4のユーザープロパティとして各機能のオンオフ状態を設定
      // これによりGA4上でどの機能が使われているかの内訳を分析しやすくなります
      const userProperties = {
        setting_better_layout: { value: settings.isEnabled ? 'ON' : 'OFF' },
        setting_dark_mode: { value: settings.isDarkMode ? 'ON' : 'OFF' },
        setting_skip_home: { value: settings.isSkipHomeEnabled ? 'ON' : 'OFF' },
        setting_staff_mode: { value: settings.isStaffMode ? 'ON' : 'OFF' },
        setting_syllabus: { value: settings.isSyllabusEnabled ? 'ON' : 'OFF' },
        setting_highlight_class: { value: settings.isHighlightCurrentClassEnabled ? 'ON' : 'OFF' }
      };

      // booleanなどを文字列化
      const stringifiedParams = {};
      for (const key in params) {
        stringifiedParams[key] = String(params[key]);
      }

      const mergedParams = {
        session_id: sessionId,
        engagement_time_msec: 100, // GA4にイベントを記録させるために必要
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        language: typeof navigator !== 'undefined' ? navigator.language : 'unknown',
        ...stringifiedParams
      };

      const fetchUrl = `${GA_ENDPOINT}?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`;
      const body = {
        client_id: clientId,
        user_properties: userProperties,
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
}

export const analytics = new Analytics();

// 他のファイルとの互換性のためのラップ関数
export async function sendGAEvent(eventName, params = {}) {
  await analytics.fireEvent(eventName, params);
}
