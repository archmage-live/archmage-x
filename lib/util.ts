import { useEffect, useState } from 'react'
import { useAsync } from 'react-use'
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

  const width = 360 + 16 + 20
  const height = 600 + 39 + 60
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
    setUrl(tab?.url ? new URL(tab.url) : undefined)
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
