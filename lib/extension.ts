import browser from 'webextension-polyfill'

class Extension {
  showNotification(title: string, message: string, url?: string) {
    this._subscribeToNotificationClicked()

    const icon = browser.runtime.getManifest().icons!['48']
    browser.notifications.create(url, {
      type: 'basic',
      title,
      iconUrl: browser.runtime.getURL(icon),
      message
    })
  }

  private _subscribeToNotificationClicked() {
    if (!browser.notifications.onClicked.hasListener(this._openUrl)) {
      browser.notifications.onClicked.addListener(this._openUrl)
    }
  }

  private _openUrl(url: string) {
    if (url.startsWith('https://')) {
      browser.tabs.create({ url })
    }
  }
}

export const EXTENSION = new Extension()
