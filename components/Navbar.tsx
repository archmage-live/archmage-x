import {
  Box,
  Center,
  HStack,
  IconButton,
  useColorModeValue
} from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { ReactElement, useCallback, useState } from 'react'
import { IoMdSettings, IoMdSwap } from 'react-icons/io'
import { IoFlashSharp, IoGrid } from 'react-icons/io5'
import { RiMoneyDollarCircleFill } from 'react-icons/ri'

export type NavTarget = 'Assets' | 'NFTs' | 'Swap' | 'Activity' | 'Settings'

interface NavbarProps {
  value: NavTarget
  onChange: (value: NavTarget) => void
}

export const Navbar = ({ value, onChange }: NavbarProps) => {
  const [barX, setBarX] = useState<number>()
  const [barWidth, setBarWidth] = useState<number>()
  const ref = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      setBarX(node.getBoundingClientRect().x)
      setBarWidth(node.getBoundingClientRect().width)
    }
  }, [])

  const btnColor = useColorModeValue('gray.500', 'gray.600')
  const btnActiveColor = useColorModeValue('gray.900', 'gray.200')

  const Btn = ({ target, icon }: { target: NavTarget; icon: ReactElement }) => (
    <Center w={14} ref={value === target ? ref : undefined}>
      <IconButton
        variant="ghost"
        colorScheme="gray"
        color={btnColor}
        _active={{ color: btnActiveColor }}
        _hover={{ color: btnActiveColor }}
        icon={icon}
        aria-label={target}
        fontSize="2rem"
        isActive={value === target}
        onClick={() => onChange(target)}
      />
    </Center>
  )

  return (
    <Box
      w="full"
      position="absolute"
      bottom={0}
      bg={useColorModeValue('gray.50', 'gray.900')}
      boxShadow={useColorModeValue('lg', 'lg-dark')}>
      <Box
        as={motion.div}
        h="2px"
        bg="purple.500"
        w={barWidth && `${barWidth}px`}
        animate={{ x: barX }}></Box>

      <HStack w="full" pt="12px" pb="4" px="4" justify="space-around">
        <Btn target="Assets" icon={<RiMoneyDollarCircleFill />} />
        {/*<Btn target="NFTs" icon={<IoGrid />} />*/}
        {/*<Btn target="Swap" icon={<IoMdSwap />} />*/}
        <Btn target="Activity" icon={<IoFlashSharp />} />
        <Btn target="Settings" icon={<IoMdSettings />} />
      </HStack>
    </Box>
  )
}
