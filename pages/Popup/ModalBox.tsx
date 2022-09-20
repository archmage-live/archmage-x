import { Box, useColorModeValue } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { atom, useAtom } from 'jotai'
import { PrimitiveAtom } from 'jotai/core/atom'
import { ElementType, useCallback, useEffect, useState } from 'react'

import { Deposit, useDepositModal } from '~pages/Popup/Assets/Deposit'
import { Send, useSendModal } from '~pages/Popup/Assets/Send'

const isOpenModalBoxAtom = atom<boolean>(false)

export function useModalBox(isOpenAtom: PrimitiveAtom<boolean>) {
  const [, setModalBoxOpen] = useAtom(isOpenModalBoxAtom)

  const [isOpen, setIsOpen] = useAtom(isOpenAtom)

  const onOpen = useCallback(() => {
    setIsOpen(true)
    setModalBoxOpen(true)
  }, [setIsOpen, setModalBoxOpen])

  const onClose = useCallback(() => {
    setIsOpen(false)
    setModalBoxOpen(false)
  }, [setIsOpen, setModalBoxOpen])

  return {
    isOpen,
    onOpen,
    onClose
  }
}

export const ModalBox = () => {
  const [isOpen] = useAtom(isOpenModalBoxAtom)

  const { isOpen: isSendOpen, onClose: onSendClose } = useSendModal()
  const { isOpen: isDepositOpen, onClose: onDepositClose } = useDepositModal()

  const animate = !isOpen ? 'hidden' : 'visible'

  return (
    <Box position="relative" zIndex={2}>
      <Box
        as={motion.div}
        variants={motionVariants}
        animate={animate}
        position="absolute"
        left={0}
        w="full"
        h="calc(100vh - 68px)"
        bg={useColorModeValue('purple.50', 'gray.800')}>
        <ModalBoxRender
          isOpen={isSendOpen}
          onClose={onSendClose}
          child={Send}
        />

        <ModalBoxRender
          isOpen={isDepositOpen}
          onClose={onDepositClose}
          child={Deposit}
        />
      </Box>
    </Box>
  )
}

export const ModalBoxRender = ({
  isOpen,
  onClose,
  child
}: {
  isOpen: boolean
  onClose: () => void
  child: ElementType<{
    onClose: () => void
  }>
}) => {
  const [render, setRender] = useState(false)
  useEffect(() => {
    if (isOpen) {
      setRender(true)
    }
  }, [isOpen])

  if (!render) {
    return <></>
  }

  const Child = child

  return (
    <Box
      position="absolute"
      top={0}
      w="full"
      h="full"
      visibility={isOpen ? 'visible' : 'hidden'}>
      {<Child onClose={onClose} />}
    </Box>
  )
}

const motionVariants = {
  hidden: {
    top: '100vh',
    opacity: 0
  },
  visible: {
    top: '0px',
    opacity: 1
  }
}
