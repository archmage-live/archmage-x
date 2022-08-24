import { CheckIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Center,
  Checkbox,
  HStack,
  Text,
  useDisclosure
} from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { AccountAvatar } from '~components/AccountAvatar'
import { Badge } from '~components/Badge'
import { ActiveWalletId } from '~lib/active'
import { IChainAccount, IDerivedWallet, PSEUDO_INDEX } from '~lib/schema'
import { INetwork } from '~lib/schema/network'
import { IWallet } from '~lib/schema/wallet'
import { useBalance } from '~lib/services/provider'
import {
  WALLET_SERVICE,
  useChainAccountByIndex,
  useChainAccounts
} from '~lib/services/walletService'
import { shortenAddress } from '~lib/utils'
import { WalletType, getWalletTypeIdentifier } from '~lib/wallet'

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
  checked?: number[]
  onChecked?: (ids: number[]) => void
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

  const account = useChainAccountByIndex(
    wallet.id,
    network?.kind,
    network?.chainId,
    wallet.type !== WalletType.HD ? PSEUDO_INDEX : undefined
  )

  const balance = useBalance(network, account)

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

  const queriedAccounts = useChainAccounts(
    wallet.id,
    network?.kind,
    network?.chainId
  )
  const accounts = useMemo(() => {
    const m = new Map<string, IChainAccount>()
    queriedAccounts?.forEach((info) =>
      m.set(`${info.masterId}-${info.index}`, info)
    )
    return subWallets.map((wallet) =>
      m.get(`${wallet.masterId}-${wallet.index}`)
    )
  }, [queriedAccounts, subWallets])

  const [isChecked, setIsChecked] = useState<boolean>()
  const [isIndeterminate, setIsIndeterminate] = useState<boolean>()

  useEffect(() => {
    if (
      !onChecked ||
      !checked?.length ||
      accounts.findIndex((account) => !account) > -1
    ) {
      return
    }

    if (wallet.type !== WalletType.HD) {
      setIsChecked(checked[0] === account?.id)
      return
    }

    const set = new Set(checked)
    const array = accounts.map((a) => a!.id!)
    const all = set.size === array.length && array.every((id) => set.has(id))
    setIsChecked(all)
    setIsIndeterminate(!all)
  }, [checked, onChecked, wallet, accounts, account])

  const onCheckedChange = useCallback(
    (isChecked: boolean) => {
      if (!onChecked || accounts.findIndex((account) => !account) > -1) {
        return
      }

      setIsChecked(isChecked)
      setIsIndeterminate(false)

      if (wallet.type !== WalletType.HD) {
        if (account) {
          onChecked(isChecked ? [account.id!] : [])
        }
        return
      }

      const set = new Set(checked)
      const array = accounts.map((a) => a!.id!)
      const all = set.size === array.length && array.every((id) => set.has(id))
      const none = !checked?.length
      if (isChecked || !all) {
        onChecked(array)
      } else if (!isChecked && !none) {
        onChecked([])
      }
    },
    [checked, onChecked, wallet, accounts, account]
  )

  const typeIdentifier = getWalletTypeIdentifier(wallet.type)

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
            onCheckedChange(!isChecked)
          }
        }}>
        <Box w="full">
          <HStack w="full" justify="space-between">
            {onChecked !== undefined && (
              <Checkbox
                mb="-12px"
                isIndeterminate={isIndeterminate}
                isChecked={isChecked}
                pointerEvents={
                  wallet.type !== WalletType.HD ? 'none' : undefined
                }
                onChange={(e) => {
                  onCheckedChange(e.target.checked)
                }}
              />
            )}

            <HStack w="calc(100% - 29.75px)" justify="space-between">
              <AccountAvatar
                text={account?.address || wallet.hash}
                scale={0.8}
                m="-3px"
                mb="-16px"
              />

              <HStack w="calc(100% - 31px)" justify="space-between">
                <Text fontSize="lg" noOfLines={1} display="block">
                  {wallet.name}
                </Text>

                <Text fontFamily="monospace" fontSize="sm" color="gray.500">
                  {shortenAddress(account?.address)}
                </Text>
              </HStack>
            </HStack>

            {activeId?.masterId === wallet.id && (
              <CheckIcon fontSize="lg" color="green.500" />
            )}
          </HStack>

          <HStack
            ps={onChecked !== undefined ? '62px' : '32px'}
            pt="10px"
            h="14px">
            {balance && (
              <Text fontSize="xs" color="gray.500" textAlign="start">
                {balance.amount} {balance.symbol}
              </Text>
            )}
            {typeIdentifier && (
              <Text textAlign="start">
                <Badge>{typeIdentifier}</Badge>
              </Text>
            )}
          </HStack>
        </Box>
        {/*</HStack>*/}
      </Button>

      {isOpen && network && wallet.type === WalletType.HD && (
        <SubWalletList
          network={network}
          wallets={subWallets}
          accounts={accounts}
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
