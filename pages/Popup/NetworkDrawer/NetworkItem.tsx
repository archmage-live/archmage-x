import { CheckIcon } from '@chakra-ui/icons'
import { Button, HStack, Text } from '@chakra-ui/react'
import Avvvatars from 'avvvatars-react'

import { INetwork } from '~lib/schema/network'
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
        <Avvvatars
          value={info.name}
          displayValue={info.name ? info.name[0] : undefined}
        />
      }>
      <HStack w="calc(100% - 39px)" justify="space-between">
        <Text fontSize="lg" noOfLines={1} display="block">
          {info.name}
        </Text>

        {selected && <CheckIcon fontSize="lg" color="green.500" />}
      </HStack>
    </Button>
  )
}
