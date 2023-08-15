import { Provider } from '@ethersproject/abstract-provider'
import { Signer } from '@ethersproject/abstract-signer'
import { EthersAdapter, SafeFactory } from '@safe-global/protocol-kit'
import { getFallbackHandlerDeployment } from '@safe-global/safe-deployments'
import assert from 'assert'
import { ethers } from 'ethers'
import semverSatisfies from 'semver/functions/satisfies'

export type SafeVersion = '1.3.0' | '1.2.0' | '1.1.1' | '1.0.0'

export const LATEST_SAFE_VERSION =
  process.env.PLASMO_PUBLIC_SAFE_VERSION || '1.3.0'

/**
 * Compute the new counterfactual Safe address before it is actually created.
 * https://github.com/safe-global/safe-wallet-web/blob/669e293837acd4a309f65eeeecce01ae83a7a386/src/components/new-safe/create/steps/ReviewStep/index.tsx#L78C12-L78C12
 */
export async function computeSafeAddress(
  provider: Provider,
  signer: Signer,
  chainId: string,
  threshold: number,
  owners: string[],
  saltNonce?: number
) {
  const readOnlyEthAdapter = new EthersAdapter({
    ethers,
    signerOrProvider: provider
  })

  const readOnlyFallbackHandlerContract =
    await readOnlyEthAdapter.getCompatibilityFallbackHandlerContract({
      singletonDeployment: getFallbackHandlerContractDeployment(chainId),
      ..._getValidatedGetContractProps(chainId, LATEST_SAFE_VERSION)
    })

  const props = {
    threshold,
    owners,
    fallbackHandler: readOnlyFallbackHandlerContract.getAddress()
  }

  saltNonce = typeof saltNonce === 'number' ? saltNonce : Date.now()

  const ethAdapter = new EthersAdapter({
    ethers,
    signerOrProvider: signer
  })

  const safeFactory = await SafeFactory.create({ ethAdapter })

  return safeFactory.predictSafeAddress(props, saltNonce.toString())
}

const getFallbackHandlerContractDeployment = (chainId: string) => {
  return (
    getFallbackHandlerDeployment({
      version: LATEST_SAFE_VERSION,
      network: chainId
    }) ||
    getFallbackHandlerDeployment({
      version: LATEST_SAFE_VERSION
    })
  )
}

const _getValidatedGetContractProps = (
  chainId: string,
  safeVersion: string
) => {
  assertValidSafeVersion(safeVersion)

  // SDK request here: https://github.com/safe-global/safe-core-sdk/issues/261
  // Remove '+L2'/'+Circles' metadata from version
  const [noMetadataVersion] = safeVersion.split('+')

  return {
    chainId: +chainId,
    safeVersion: noMetadataVersion as SafeVersion
  }
}

const isValidSafeVersion = (
  safeVersion?: string
): safeVersion is SafeVersion => {
  const SAFE_VERSIONS: SafeVersion[] = ['1.3.0', '1.2.0', '1.1.1', '1.0.0']
  return (
    !!safeVersion &&
    SAFE_VERSIONS.some((version) => semverSatisfies(safeVersion, version))
  )
}

// `assert` does not work with arrow functions
function assertValidSafeVersion(safeVersion?: string): asserts safeVersion {
  return assert(
    isValidSafeVersion(safeVersion),
    `${safeVersion} is not a valid Safe Account version`
  )
}
