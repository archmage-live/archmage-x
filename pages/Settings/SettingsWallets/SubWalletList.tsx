import { useSubWallets } from '~lib/services/walletService'

interface SubWalletListProps {
  masterId: number
}

export const SubWalletList = ({ masterId }: SubWalletListProps) => {
  const subWallets = useSubWallets(masterId)

  return <></>
}
