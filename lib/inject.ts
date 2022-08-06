import evmProvider from 'url:~lib/provider/evm'
import clientProxy from 'url:~lib/rpc/clientInjected'
import browser from 'webextension-polyfill'

const inject = async (tabId: number) => {
  const result = await browser.scripting.executeScript({
    target: {
      tabId
    },
    world: 'MAIN' as any, // MAIN in order to access the window object
    files: [getFilename(clientProxy), getFilename(evmProvider)]
  })
}

browser.tabs.onActivated.addListener(async (info) => {
  const tab = await browser.tabs.get(info.tabId)
  if (!tab.url || filterUrl(tab.url)) {
    return
  }
  console.log('tab onActivate:', tab.url)
  await inject(info.tabId)
})

browser.tabs.onUpdated.addListener(async (tabId, info) => {
  if (filterUrl(info.url)) {
    return
  }
  const tab = await browser.tabs.get(tabId)
  if (!tab.url || filterUrl(tab.url)) {
    return
  }
  console.log('tab onUpdate:', info.url || tab.url)
  await inject(tabId)
})

function filterUrl(url?: string) {
  return (
    url &&
    (url.startsWith('chrome://') ||
      url.startsWith('chrome-extension://') ||
      url.startsWith('https://chrome.google.com/webstore'))
  )
}

function getFilename(url: string) {
  return new URL(url).pathname.slice(1)
}
