// Detect known in-app browser (webview) user agents.
// Google blocks OAuth from embedded webviews with "Error 403: disallowed_useragent",
// so callers should hide/disable social-login buttons when this returns a match.

export type InAppBrowserName =
  | 'Facebook'
  | 'Messenger'
  | 'Instagram'
  | 'LinkedIn'
  | 'TikTok'
  | 'Twitter'
  | 'Snapchat'
  | 'WeChat'
  | 'Line'
  | 'Pinterest'
  | 'Webview'

interface DetectionResult {
  isInApp: boolean
  name: InAppBrowserName | null
}

export function detectInAppBrowser(userAgent: string | undefined | null): DetectionResult {
  if (!userAgent) return { isInApp: false, name: null }
  const ua = userAgent

  if (/FBAN|FBAV|FB_IAB|FBSV|FBDM/i.test(ua)) return { isInApp: true, name: 'Facebook' }
  if (/Messenger|MessengerForiOS/i.test(ua)) return { isInApp: true, name: 'Messenger' }
  if (/Instagram/i.test(ua)) return { isInApp: true, name: 'Instagram' }
  if (/LinkedInApp/i.test(ua)) return { isInApp: true, name: 'LinkedIn' }
  if (/BytedanceWebview|musical_ly|TTWebView|Tiktok/i.test(ua)) return { isInApp: true, name: 'TikTok' }
  if (/Twitter/i.test(ua)) return { isInApp: true, name: 'Twitter' }
  if (/Snapchat/i.test(ua)) return { isInApp: true, name: 'Snapchat' }
  if (/MicroMessenger/i.test(ua)) return { isInApp: true, name: 'WeChat' }
  if (/\bLine\//i.test(ua)) return { isInApp: true, name: 'Line' }
  if (/Pinterest/i.test(ua)) return { isInApp: true, name: 'Pinterest' }

  // Generic Android WebView ("; wv)") and iOS apps that aren't Safari/Chrome.
  if (/; wv\)/i.test(ua)) return { isInApp: true, name: 'Webview' }
  const isIOS = /iPhone|iPad|iPod/i.test(ua)
  if (isIOS && /AppleWebKit/i.test(ua) && !/Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua)) {
    return { isInApp: true, name: 'Webview' }
  }

  return { isInApp: false, name: null }
}
