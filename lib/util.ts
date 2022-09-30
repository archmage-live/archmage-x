import { useEffect, useState } from 'react'
import { useAsync } from 'react-use'
import browser from 'webextension-polyfill'

import { Context } from '~lib/rpc'

export function stall(duration: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, duration)
  })
}

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

export function isUrlSupported(url?: string) {
  return (
    url &&
    !(
      url.startsWith('chrome://') ||
      url.startsWith('chrome-extension://') ||
      url.startsWith('https://chrome.google.com/webstore')
    )
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

let window: browser.Windows.Window | undefined

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

  const width = 360 + 16 + 20
  const height = 600 + 39 + 60
  let left, top
  if (ctx.window) {
    left = Math.max(ctx.window.x + ctx.window.width - width, 0)
    top = ctx.window.y
  }

  try {
    if (window) {
      window = await browser.windows.get(window.id!)
    }
  } catch (err) {
    console.error(err)
  }

  if (window) {
    if (
      !window.focused ||
      (window.state !== 'normal' &&
        window.state !== 'maximized' &&
        window.state !== 'fullscreen')
    ) {
      window = await browser.windows.update(window.id!, {
        focused: true,
        state: 'normal'
      })
    }
  } else {
    window = await browser.windows.create({
      url: `${origin}/${popupUrl}${to}?popup=window`,
      type: 'popup',
      width,
      height,
      left,
      top
    })
    const listener = async (windowId: number) => {
      if (windowId !== window?.id) {
        return
      }
      window = undefined
      browser.windows.onRemoved.removeListener(listener)
    }
    browser.windows.onRemoved.addListener(listener)
  }

  return window
}

export async function getTab({
  origin,
  active,
  currentWindow
}: {
  origin?: string
  active?: boolean
  currentWindow?: boolean
}): Promise<browser.Tabs.Tab | undefined> {
  if (origin) {
    const tabs = await browser.tabs.query({})
    return tabs.find(
      (tab) => tab.url && new URL(tab.url).origin === new URL(origin).origin
    )
  }
  const tabs = await browser.tabs.query({ active, currentWindow })
  return tabs[0]
}

export async function getCurrentTab() {
  return getTab({ active: true, currentWindow: true })
}

export function useCurrentTab() {
  const [tab, setTab] = useState<browser.Tabs.Tab | undefined>()
  useEffect(() => {
    getCurrentTab().then(setTab)
  }, [])
  return tab
}

export function useCurrentSiteUrl(): URL | undefined {
  const [url, setUrl] = useState<URL | undefined>()

  const tab = useCurrentTab()
  useEffect(() => {
    setUrl(isUrlSupported(tab?.url) ? new URL(tab!.url!) : undefined)
  }, [tab])

  return url
}

export function useSiteIconUrl(origin?: string) {
  const { value } = useAsync(async () => {
    if (!origin) {
      return
    }
    const tab = await getTab({ origin })
    return tab?.favIconUrl
  }, [origin])
  return value
}
