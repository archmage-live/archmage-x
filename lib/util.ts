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

export function createTab(to: string) {
  if (!to.startsWith('#/')) {
    if (to.startsWith('/')) {
      to = '#' + to
    } else {
      to = '#/' + to
    }
  }

  browser.tabs.create({
    url: getRootHref() + to
  })
}

export function createWindow(ctx: Context, to: string) {
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
  console.log(ctx, left, top)

  browser.windows.create({
    url: `${origin}/${popupUrl}${to}`,
    type: 'popup',
    width,
    height,
    left,
    top
  })
}
