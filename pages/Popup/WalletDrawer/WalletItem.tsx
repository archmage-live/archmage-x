import { CheckIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Checkbox,
  HStack,
  Text,
  useDisclosure
} from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Blockies from 'react-blockies'

import { ActiveWalletId } from '~lib/active'
import { IDerivedWallet, IWalletInfo } from '~lib/schema'
import { INetwork } from '~lib/schema/network'
import { IWallet } from '~lib/schema/wallet'
import {
  WALLET_SERVICE,
  useWalletInfo,
  useWalletsInfo
} from '~lib/services/walletService'
import { WalletType } from '~lib/wallet'

import { SubWalletList } from './SubWalletList'

interface WalletItemProps {
  network?: INetwork
  wallet: IWallet
  selected?: boolean
  onSelected?: () => void
  selectedSubId?: number
  onSelectedSubId?: (selectedSubId: number) => void
  activeId?: ActiveWalletId
  onClose?: () => void
  checked?: { masterId: number; index?: number }[]
  onChecked?: (ids: { masterId: number; index?: number }[]) => void
  measureElement?: (element?: HTMLElement | null) => any
}

export const WalletItem = ({
  network,
  wallet,
  selected,
  onSelected,
  selectedSubId,
  onSelectedSubId,
  activeId,
  onClose,
  checked,
  onChecked,
  measureElement
}: WalletItemProps) => {
  const elRef = useRef(null)
  const { isOpen, onToggle } = useDisclosure()

  const measure = useCallback(() => {
    measureElement?.(elRef.current)
  }, [measureElement])

  useEffect(() => {
    measure()
  }, [isOpen, measure])

  const info = useWalletInfo(wallet.id, network?.kind, network?.chainId)

  const [subWallets, setSubWallets] = useState<IDerivedWallet[]>([])
  useEffect(() => {
    const effect = async () => {
      if (onChecked || isOpen) {
        const subWallets = await WALLET_SERVICE.getSubWallets(wallet.id!)
        setSubWallets(subWallets)
      }
    }
    effect()
  }, [wallet, onChecked, isOpen])

  const queriedSubInfos = useWalletsInfo(
    wallet.id,
    network?.kind,
    network?.chainId
  )
  const subInfos = useMemo(() => {
    const m = new Map<string, IWalletInfo>()
    queriedSubInfos?.forEach((info) =>
      m.set(`${info.masterId}-${info.index}`, info)
    )
    return subWallets.map((wallet) =>
      m.get(`${wallet.masterId}-${wallet.index}`)
    )
  }, [queriedSubInfos, subWallets])

  const [isChecked, setIsChecked] = useState<boolean>()
  const [isIndeterminate, setIsIndeterminate] = useState<boolean>()
  useEffect(() => {
    if (!onChecked) {
      return
    }
    if (isChecked) {
      const set = new Set(
        checked?.map((item) => `${item.masterId}-${item.index}`)
      )
      const array = subWallets.map((w) => ({
        masterId: w.masterId,
        index: w.index
      }))
      if (
        set.size === array.length &&
        array.every((item) => set.has(`${item.masterId}-${item.index}`))
      ) {
        return
      }
      onChecked(array)
    } else if (isChecked === false && checked?.length) {
      onChecked([])
    }
  }, [isChecked, checked, onChecked, subWallets])

  return (
    <Box ref={elRef}>
      <Button
        key={wallet.id}
        variant="ghost"
        size="lg"
        w="full"
        h={16}
        px={4}
        justifyContent="start"
        onClick={() => {
          onSelected?.()
          if (wallet.type === WalletType.HD) {
            onToggle()
          } else {
            onClose?.()
          }
        }}>
        <HStack w="full" justify="space-between">
          {onChecked !== undefined && (
            <Checkbox
              isIndeterminate={isIndeterminate}
              isChecked={isChecked}
              onChange={(e) => {
                setIsChecked(e.target.checked)
                setIsIndeterminate(false)
              }}
            />
          )}

          <HStack w="calc(100% - 29.75px)" justify="space-between">
            <Box
              borderRadius="50%"
              overflow="hidden"
              transform="scale(0.8)"
              m="-3px">
              <Blockies seed={wallet.hash} size={10} scale={3} />
            </Box>

            <HStack w="calc(100% - 31px)" justify="space-between">
              <Text fontSize="lg" noOfLines={1} display="block">
                {wallet.name}
              </Text>
            </HStack>
          </HStack>

          {activeId?.masterId === wallet.id && (
            <CheckIcon fontSize="lg" color="green.500" />
          )}
        </HStack>
      </Button>

      {isOpen && network && wallet.type === WalletType.HD && (
        <SubWalletList
          network={network}
          masterId={wallet.id!}
          wallets={subWallets}
          infos={subInfos}
          selectedId={selectedSubId}
          onSelectedId={(id) => {
            onSelectedSubId?.(id)
            onClose?.()
          }}
          activeId={activeId}
          checked={checked}
          onChecked={
            onChecked
              ? (ids) => {
                  onChecked(ids)
                  if (ids.length === 0) {
                    setIsChecked(false)
                    setIsIndeterminate(false)
                  } else if (ids.length === subWallets.length) {
                    setIsChecked(true)
                    setIsIndeterminate(false)
                  } else {
                    setIsChecked(undefined)
                    setIsIndeterminate(true)
                  }
                }
              : undefined
          }
          measure={measure}
        />
      )}
    </Box>
  )
}
