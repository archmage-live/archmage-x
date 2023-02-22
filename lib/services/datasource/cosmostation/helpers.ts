import { TokenInfo } from '.'

export const DENOM_TO_SUBDIRECTORY: Record<string, string> = {
  uakt: 'akash',
  umntl: 'asset-mantle',
  uaxl: 'axelar',
  uband: 'band',
  ubcna: 'bitcanna',
  ubtsg: 'bitsong',
  acanto: 'canto',
  ucrbrus: 'cerberus',
  uhuahua: 'chihuahua',
  ucmdx: 'comdex',
  uatom: 'cosmos',
  ucre: 'crescent',
  basecro: 'crypto-org',
  acudos: 'cudos',
  udsm: 'desmos',
  ungm: 'emoney',
  aevmos: 'evmos',
  afet: 'fetchai',
  ugraviton: 'gravity-bridge',
  inj: 'injective',
  uiris: 'iris',
  uixo: 'ixo',
  ujuno: 'juno',
  ukava: 'kava',
  uxki: 'ki-chain',
  udarc: 'konstellation',
  ukuji: 'kujira',
  nanolike: 'likecoin',
  ulum: 'lum',
  umars: 'mars-protocol',
  umedas: 'medasdigital',
  umed: 'medibloc',
  umeme: 'meme',
  uwhale: 'narwhal',
  unyx: 'nyx',
  uflix: 'omniflix',
  anom: 'onomy-protocol',
  uosmo: 'osmosis',
  upasg: 'passage',
  uxprt: 'persistence',
  nhash: 'provenance',
  uqck: 'quicksilver',
  uregen: 'regen',
  uatolo: 'rizon',
  uscrt: 'secret',
  udvpn: 'sentinel',
  uctk: 'shentu',
  rowan: 'sifchain',
  usomm: 'sommelier',
  ufis: 'stafi',
  ustars: 'stargaze',
  uiov: 'starname',
  uiss: 'station',
  ustrd: 'stride',
  utori: 'teritori',
  utgd: 'tgrade',
  uumee: 'umee',
  axpla: 'xpla'
}

export function validateTokenInfo(info: TokenInfo): boolean {
  // TODO
  return true
}