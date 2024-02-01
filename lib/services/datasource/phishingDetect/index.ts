import PhishingDetector from 'eth-phishing-detect/src/detector'
import yaml from 'yaml'

import { fetchDataWithCache, fetchJsonWithCache } from '~lib/fetch'

class PhishingDetectApi {
  detectors: PhishingDetector[] = []
  isInitialized: boolean = false

  private async initialize() {
    if (this.isInitialized) {
      return
    }
    this.isInitialized = true

    // https://github.com/MetaMask/eth-phishing-detect
    try {
      const metamaskEthPhishingDetectUrl =
        'https://raw.githubusercontent.com/MetaMask/eth-phishing-detect/main/src/config.json'
      const metamaskEthPhishingDetectConfig = await fetchJsonWithCache(
        metamaskEthPhishingDetectUrl,
        1000 * 3600
      )
      this.detectors.push(
        new PhishingDetector({
          blacklist: metamaskEthPhishingDetectConfig.blacklist
        })
      )
    } catch (err) {
      console.error(err)
    }

    // https://github.com/chainapsis/phishing-block-list
    try {
      const keplrPhishingBlockListUrl =
        'https://github.com/chainapsis/phishing-block-list/raw/main/block-list.txt'
      const keplrPhishingBlockList = await fetchDataWithCache(
        keplrPhishingBlockListUrl,
        1000 * 3600 * 24
      )
      this.detectors.push(
        new PhishingDetector({
          blacklist: new TextDecoder()
            .decode(keplrPhishingBlockList)
            .split('\n')
            .map((line) => line.trim())
        })
      )
    } catch (err) {
      console.error(err)
    }

    // https://github.com/phantom/blocklist
    try {
      const phantomBlockListUrl =
        'https://github.com/phantom/blocklist/raw/master/blocklist.yaml'
      const phantomBlockList = await fetchDataWithCache(
        phantomBlockListUrl,
        1000 * 3600 * 24
      )
      this.detectors.push(
        new PhishingDetector({
          blacklist: yaml
            .parse(new TextDecoder().decode(phantomBlockList))
            .map((item: any) => item.url)
        })
      )
    } catch (err) {
      console.error(err)
    }
  }

  async check(domain: string) {
    await this.initialize()
    return this.detectors.some((detector) => detector.check(domain).result)
  }
}

export const PHISHING_DETECT_API = new PhishingDetectApi()
