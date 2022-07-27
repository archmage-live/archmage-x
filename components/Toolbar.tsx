import {
  Box,
  Button,
  Drawer,
  DrawerCloseButton,
  DrawerContent,
  DrawerOverlay,
  Flex,
  Image,
  useColorModeValue,
  useDisclosure
} from '@chakra-ui/react'
import icon from 'data-base64:~assets/icon512.png'

import { Sidebar } from '~components/Sidebar'
import { ToggleButton } from '~components/ToggleButton'

export const Toolbar = () => {
  const { isOpen, onToggle, onClose } = useDisclosure()

  return (
    <Box width="full" p="4" boxShadow={useColorModeValue('sm', 'sm')}>
      <Flex justify="space-between" align="center">
        <Image boxSize="24px" src={icon} alt="Logo" />
        <Button variant="outline">Select Network</Button>
        <ToggleButton isOpen={isOpen} onClick={onToggle} />

        <Drawer
          isOpen={isOpen}
          size="xs"
          placement="right"
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
