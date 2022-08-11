import { Text } from '@chakra-ui/react'

import { useCheckUnlocked } from '~lib/password'

export default function PopupHome() {
  useCheckUnlocked()

  return <Text>Hello</Text>
}
