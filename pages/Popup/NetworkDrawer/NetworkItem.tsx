import { CheckIcon } from '@chakra-ui/icons'
import { Button, HStack, Image, Text } from '@chakra-ui/react'
import Avvvatars from 'avvvatars-react'

import { INetwork } from '~lib/schema/network'
import { useEvmChainLogoUrl } from '~lib/services/datasource/chainlist'
import { NetworkInfo } from '~lib/services/network'

interface NetworkItemProps {
  network: INetwork
  info: NetworkInfo
  selected?: boolean
  onSelected?: () => void
}

export const NetworkItem = ({
  network,
  info,
  selected,
  onSelected
}: NetworkItemProps) => {
  const networkLogoUrl = useEvmChainLogoUrl(network.chainId)

  return (
    <Button
      key={network.id}
      variant="ghost"
      size="lg"
      w="full"
      h={16}
      px={4}
      justifyContent="start"
      onClick={onSelected}
      leftIcon={
        networkLogoUrl ? (
          <Image
            borderRadius="full"
            boxSize="32px"
            fit="cover"
            src={networkLogoUrl}
            fallback={<></>}
            alt="Currency Logo"
          />
        ) : (
          <Avvvatars
            value={info.name}
            displayValue={info.name ? info.name[0] : undefined}
          />
        )
      }>
      <HStack w="calc(100% - 39px)" justify="space-between">
        {/* here zIndex solves the weird incomplete display issue of the last rendered item*/}
        <Text fontSize="lg" noOfLines={1} display="block" zIndex={15000}>
          {info.name}
        </Text>

        {selected && <CheckIcon fontSize="lg" color="green.500" />}
      </HStack>
    </Button>
  )
}
