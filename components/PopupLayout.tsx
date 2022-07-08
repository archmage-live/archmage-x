import { Flex } from '@chakra-ui/react'
import type { ReactNode } from 'react'

import { Toolbar } from '~components/Toolbar'

interface PopupLayoutProps {
  children?: ReactNode
}

export const PopupLayout = ({ children }: PopupLayoutProps) => {
  return (
    <Flex direction="column" width="360px" height="600px">
      <Toolbar />
    </Flex>
  )
}
