import { atom, useAtom } from 'jotai'

import { NetworkKind } from '~lib/network'
import { INft } from '~lib/schema'
import { EvmNftDetail } from '~pages/Popup/Nfts/NftDetail/evm'
import { useModalBox } from "~components/ModalBox";

const isOpenAtom = atom<boolean>(false)
const nftAtom = atom<INft | undefined>(undefined)

export function useNftDetailModal() {
  const modal = useModalBox(isOpenAtom)
  const [nft, setNft] = useAtom(nftAtom)
  return {
    ...modal,
    nft,
    setNft
  }
}

export const NftDetail = ({ onClose }: { onClose: () => void }) => {
  const { nft } = useNftDetailModal()

  if (!nft) {
    return <></>
  }

  switch (nft.networkKind) {
    case NetworkKind.EVM:
      return <EvmNftDetail nft={nft} onClose={onClose} />
  }

  return <></>
}
