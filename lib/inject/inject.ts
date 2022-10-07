import inpageUrl from 'url:~lib/inject/inpage'

function injectScript(url: string) {
  try {
    const container = document.head || document.documentElement
    const scriptTag = document.createElement('script')
    scriptTag.setAttribute('async', 'false')
    scriptTag.setAttribute('src', url)
    container.insertBefore(scriptTag, container.children[0])
    container.removeChild(scriptTag)
  } catch (error) {
    console.error('Archmage injection failed:', error)
  }
}

function shouldInject() {
  return (
    doctypeCheck() &&
    suffixCheck() &&
    documentElementCheck() &&
    !blockedDomainCheck()
  )
}

function doctypeCheck() {
  const { doctype } = window.document
  if (doctype) {
    return doctype.name === 'html'
  }
  return true
}

function suffixCheck() {
  const prohibitedTypes = [/\.xml$/u, /\.pdf$/u]
  const currentUrl = window.location.pathname
  for (let i = 0; i < prohibitedTypes.length; i++) {
    if (prohibitedTypes[i].test(currentUrl)) {
      return false
    }
  }
  return true
}

function documentElementCheck() {
  const documentElement = document.documentElement.nodeName
  if (documentElement) {
    return documentElement.toLowerCase() === 'html'
  }
  return true
}

function blockedDomainCheck() {
  const blockedDomains = [
    'uscourts.gov',
    'dropbox.com',
    'webbyawards.com',
    'cdn.shopify.com/s/javascripts/tricorder/xtld-read-only-frame.html',
    'adyen.com',
    'gravityforms.com',
    'harbourair.com',
    'ani.gamer.com.tw',
    'blueskybooking.com',
    'sharefile.com'
  ]
  const currentUrl = window.location.href
  let currentRegex
  for (let i = 0; i < blockedDomains.length; i++) {
    const blockedDomain = blockedDomains[i].replace('.', '\\.')
    currentRegex = new RegExp(
      `(?:https?:\\/\\/)(?:(?!${blockedDomain}).)*$`,
      'u'
    )
    if (!currentRegex.test(currentUrl)) {
      return true
    }
  }
  return false
}

export function inject() {
  if (shouldInject()) {
    injectScript(inpageUrl)
  }
}
