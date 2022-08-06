import browser from 'webextension-polyfill'

export function getRootHref() {
  let href = window.location.href
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
