import browser from 'webextension-polyfill'

export const restartApp = (): void => browser.runtime.reload()
