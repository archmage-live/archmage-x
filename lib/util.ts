import browser from 'webextension-polyfill'

import { Context } from '~lib/rpc'

export function getRootHref() {
  let href = globalThis.location.href
  const url = new URL(href)
  const searchIndex = url.search ? href.lastIndexOf(url.search) : -1
  const hashIndex = url.hash ? href.lastIndexOf(url.hash) : -1
  return href.slice(
    0,
    searchIndex > -1 ? searchIndex : hashIndex > -1 ? hashIndex : href.length
  )
}

export async function createTab(to: string) {
  if (!to.startsWith('#/')) {
    if (to.startsWith('/')) {
      to = '#' + to
    } else {
      to = '#/' + to
    }
  }

  return browser.tabs.create({
    url: getRootHref() + to
  })
}

export async function createWindow(ctx: Context, to: string) {
  if (!to.startsWith('#/')) {
    if (to.startsWith('/')) {
      to = '#' + to
    } else {
      to = '#/' + to
    }
  }

  const origin = new URL(globalThis.location.href).origin
  const popupUrl = browser.runtime.getManifest().action?.default_popup

  const width = 376
  const height = 639
  let left, top
  if (ctx.window) {
    left = Math.max(ctx.window.x + ctx.window.width - width, 0)
    top = ctx.window.y
  }

  return browser.windows.create({
    url: `${origin}/${popupUrl}${to}?popup=window`,
    type: 'popup',
    width,
    height,
    left,
    top
  })
}

export async function getTab(
  origin: string
): Promise<browser.Tabs.Tab | undefined> {
  const tabs = await browser.tabs.query({})
  return tabs.find(
    (tab) => tab.url && new URL(tab.url).origin === new URL(origin).origin
  )
}
