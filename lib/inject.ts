import evmProvider from 'url:~lib/provider/evm'
import rpc from 'url:~lib/rpc/clientInjected'
import browser from 'webextension-polyfill'

const inject = async (tabId: number) => {
  await browser.scripting.executeScript({
    target: {
      tabId
    },
    world: 'MAIN' as any, // MAIN in order to access the window object
    files: [getFilename(rpc), getFilename(evmProvider)]
  })
}

browser.tabs.onUpdated.addListener(async (tabId, info) => {
  if (info.url?.startsWith('chrome://')) {
    return
  }
  const tab = await browser.tabs.get(tabId)
  if (tab.url?.startsWith('chrome://')) {
    return
  }
  await inject(tabId)
})

function getFilename(url: string) {
  return new URL(url).pathname.slice(1)
}
