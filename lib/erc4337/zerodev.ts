import { getZeroDevSigner, getPrivateKeyOwner } from '@zerodevapp/sdk'

const ZERO_DEV_PROJECTS = new Map([
  [1, process.env.PLASMO_PUBLIC_ZERODEV_ETHEREUM],
  [42161, process.env.PLASMO_PUBLIC_ZERODEV_ARBITRUM],
  [137, process.env.PLASMO_PUBLIC_ZERODEV_POLYGON],
  [43114, process.env.PLASMO_PUBLIC_ZERODEV_AVALANCHE],
  [5, process.env.PLASMO_PUBLIC_ZERODEV_ETHEREUM_GOERLI],
  [421613, process.env.PLASMO_PUBLIC_ZERODEV_ARBITRUM_GOERLI],
  [420, process.env.PLASMO_PUBLIC_ZERODEV_OPTIMISM_GOERLI],
  [80001, process.env.PLASMO_PUBLIC_ZERODEV_POLYGON_MUMBAI],
  [43113, process.env.PLASMO_PUBLIC_ZERODEV_AVALANCHE_FUJI],
  [84531, process.env.PLASMO_PUBLIC_ZERODEV_BASE_GOERLI],
])

const signer = await getZeroDevSigner({
  projectId: "<project id>",
  owner: getPrivateKeyOwner("<private key>"),
})
