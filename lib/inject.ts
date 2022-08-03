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
  if (!tab.url || tab.url?.startsWith('chrome://')) {
    return
  }
  console.log('tab onActivate:', tab.url)
  await inject(info.tabId)
})

browser.tabs.onUpdated.addListener(async (tabId, info) => {
  if (info.url?.startsWith('chrome://')) {
    return
  }
  const tab = await browser.tabs.get(tabId)
  if (!tab.url || tab.url?.startsWith('chrome://')) {
    return
  }
  console.log('tab onUpdate:', info.url || tab.url)
  await inject(tabId)
})

function getFilename(url: string) {
  return new URL(url).pathname.slice(1)
}
