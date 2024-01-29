declare module 'eth-phishing-detect/src/detector' {
  class PhishingDetector {
    constructor(opts: {
      whitelist?: string[]
      blacklist?: string[]
      fuzzylist?: string[]
      tolerance?: number
    })

    check(domain: string): any
  }

  export = PhishingDetector
}
