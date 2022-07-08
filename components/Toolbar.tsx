import {
  Box,
  Drawer,
  DrawerCloseButton,
  DrawerContent,
  DrawerOverlay,
  Flex,
  useColorModeValue,
  useDisclosure
} from '@chakra-ui/react'

import { Sidebar } from '~components/Sidebar'
import { ToggleButton } from '~components/ToggleButton'

export const Toolbar = () => {
  const { isOpen, onToggle, onClose } = useDisclosure()

  return (
    <Box width="full" p="4" boxShadow={useColorModeValue('sm', 'sm')}>
      <Flex justify="space-between" align="center">
        <ToggleButton isOpen={isOpen} onClick={onToggle} />

        <Drawer
          isOpen={isOpen}
          placement="left"
          onClose={onClose}
          isFullHeight
          preserveScrollBarGap>
          <DrawerOverlay />
          <DrawerContent>
            <DrawerCloseButton />
            <Sidebar isOpen={isOpen} onClose={onClose} />
          </DrawerContent>
        </Drawer>
      </Flex>
    </Box>
  )
}
