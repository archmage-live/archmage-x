import { Box } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useMemo, useRef, useState } from 'react'

import { ActiveWalletId } from '~lib/active'
import { IDerivedWallet } from '~lib/schema'
import { INetwork } from '~lib/schema/network'
import { IWalletInfo } from '~lib/schema/walletInfo'
import { useSubWallets, useWalletsInfo } from '~lib/services/walletService'

import { SubWalletItem } from './SubWalletItem'

interface SubWalletListProps {
  network: INetwork
  masterId: number
  wallets: IDerivedWallet[]
  infos: (IWalletInfo | undefined)[]
  selectedId?: number
  onSelectedId: (selectedId: number) => void
  activeId?: ActiveWalletId
  checked?: { masterId: number; index?: number }[]
  onChecked?: (ids: { masterId: number; index?: number }[]) => void
  measure: () => void
}

export const SubWalletList = ({
  network,
  masterId,
  wallets,
  infos,
  selectedId,
  onSelectedId,
  activeId,
  checked,
  onChecked,
  measure
}: SubWalletListProps) => {
  useEffect(measure, [measure, wallets])

  const parentRef = useRef(null)
  const walletsVirtualizer = useVirtualizer({
    count: wallets?.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    getItemKey: (index) => wallets?.[index].id!
  })

  const [checkedMap, setCheckedMap] = useState<
    Map<string, { masterId: number; index?: number }>
  >(new Map())
  useEffect(() => {
    if (checked) {
      setCheckedMap(
        new Map(checked.map((item) => [`${item.masterId}-${item.index}`, item]))
      )
    } else {
      setCheckedMap(new Map())
    }
  }, [checked])

  if (!wallets?.length) {
    return <></>
  }

  return (
    <Box py={2} px={4}>
      <Box ref={parentRef} maxH="336px" overflowY="auto" borderRadius="xl">
        <Box h={walletsVirtualizer.getTotalSize() + 'px'} position="relative">
          {walletsVirtualizer.getVirtualItems().map((item) => {
            const wallet: IDerivedWallet = wallets[item.index]
            const label = `${wallet.masterId}-${wallet.index}`
            const info = infos[item.index]
            return (
              <Box
                key={wallet.id}
                ref={item.measureElement}
                position="absolute"
                top={0}
                left={0}
                transform={`translateY(${item.start}px)`}
                w="full"
                h="56px">
                <SubWalletItem
                  wallet={wallet}
                  info={info}
                  selected={wallet.id === selectedId}
                  onSelected={() => onSelectedId(wallet.id!)}
                  active={activeId?.derivedId === wallet.id}
                  isChecked={checkedMap.has(label)}
                  onChecked={
                    onChecked !== undefined
                      ? (checked) => {
                          let map
                          if (checked && !checkedMap.has(label)) {
                            map = new Map(checkedMap).set(label, {
                              masterId: wallet.masterId,
                              index: wallet.index
                            })
                          } else if (!checked && checkedMap.has(label)) {
                            map = new Map(checkedMap)
                            map.delete(label)
                          } else {
                            return
                          }

                          setCheckedMap(map)
                          onChecked(Array.from(map.values()))
                        }
                      : undefined
                  }
                />
              </Box>
            )
          })}
        </Box>
      </Box>
    </Box>
  )
}
