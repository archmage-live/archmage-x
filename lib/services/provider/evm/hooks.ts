import { FunctionFragment } from '@ethersproject/abi'
import { BytesLike, hexlify } from '@ethersproject/bytes'
import { useCallback, useMemo } from 'react'

import { useEvmSignatureFrom4Bytes } from '~lib/services/datasource/4byte'
import { GasOption, MaxFeePerGas } from '~lib/services/provider/evm/gasFee'
import { StoreKey, useLocalStorage } from '~lib/store'

export function useEvmFunctionSignature(
  data?: BytesLike
): FunctionFragment | undefined {
  const hex = data?.length ? hexlify(data) : undefined

  const sig = useEvmSignatureFrom4Bytes(hex?.slice(0, 10))

  return useMemo(() => {
    if (!sig) return

    try {
      return parseEvmFunctionSignature(sig)
    } catch {}
  }, [sig])
}

export function parseEvmFunctionSignature(sig: string) {
  return FunctionFragment.from(sig)
}

function gasFeeStoreKey(networkId: number): string {
  return `${StoreKey.GAS_FEE_PREFIX}_${networkId}`
}

type GasFeeSettings = {
  option: GasOption
  advanced?: MaxFeePerGas
}

export function useDefaultGasFeeSettings(networkId: number) {
  const [gasFeeSettings, setGasFeeSettings, { remove: removeGasFeeSettings }] =
    useLocalStorage<GasFeeSettings | undefined>(gasFeeStoreKey(networkId))

  const setDefaultGasFeeOption = useCallback(
    (option?: GasOption) => {
      if (
        option === GasOption.SITE_SUGGESTED ||
        option === GasOption.ADVANCED
      ) {
        return
      }
      if (!option) {
        removeGasFeeSettings()
      } else {
        setGasFeeSettings({
          option
        })
      }
    },
    [setGasFeeSettings, removeGasFeeSettings]
  )

  const setDefaultAdvancedGasFee = useCallback(
    (advanced: MaxFeePerGas) => {
      setGasFeeSettings({
        option: GasOption.ADVANCED,
        advanced
      })
    },
    [setGasFeeSettings]
  )

  return {
    defaultGasFeeOption: gasFeeSettings?.option,
    setDefaultGasFeeOption,
    defaultAdvancedGasFee: gasFeeSettings?.advanced,
    setDefaultAdvancedGasFee
  }
}
