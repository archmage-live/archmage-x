import { Box, useColorModeValue } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { PrimitiveAtom, atom, useAtom } from 'jotai'
import { ElementType, useCallback, useEffect } from 'react'

const numModalBoxAtom = atom<number>(0)
const isOpenModalBoxAtom = atom<boolean>(false)

export function useIsOpenModalBox() {
  return useAtom(isOpenModalBoxAtom)
}

export function useModalBox(isOpenAtom: PrimitiveAtom<boolean>) {
  const [numModalBox, setNumModalBoxAtom] = useAtom(numModalBoxAtom)
  const [, setModalBoxOpen] = useIsOpenModalBox()

  useEffect(() => {
    setModalBoxOpen(numModalBox > 0)
  }, [numModalBox, setModalBoxOpen])

  const [isOpen, setIsOpen] = useAtom(isOpenAtom)

  const onOpen = useCallback(() => {
    setNumModalBoxAtom((num) => num + 1)
    setIsOpen(true)
  }, [setIsOpen, setNumModalBoxAtom])

  const onClose = useCallback(() => {
    setNumModalBoxAtom((num) => Math.max(num - 1, 0))
    setIsOpen(false)
  }, [setIsOpen, setNumModalBoxAtom])

  return {
    isOpen,
    onOpen,
    onClose
  }
}

export const ModalBox = ({
  isOpen,
  onClose,
  child
}: {
  isOpen: boolean
  onClose: () => void
  child: ElementType<{
    isOpen: boolean
    onClose: () => void
  }>
}) => {
  const bg = useColorModeValue('white', 'gray.800')

  const [numModalBox] = useAtom(numModalBoxAtom)

  const animate = isOpen || !numModalBox ? 'visible' : 'hidden'

  const Child = child

  return (
    <Box
      as={motion.div}
      variants={renderVariants}
      animate={animate}
      position="absolute"
      top={0}
      w="full"
      h="full"
      bg={bg}>
      {<Child isOpen={isOpen} onClose={onClose} />}
    </Box>
  )
}

const renderVariants = {
  hidden: {
    left: '100vw',
    opacity: 0
  },
  visible: {
    left: '0px',
    opacity: 1
  }
}
