import { Box, useColorModeValue } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { atom, useAtom } from 'jotai'
import { PrimitiveAtom } from 'jotai/core/atom'
import { ElementType, useCallback, useEffect } from 'react'

import Consent, { useConsentModal } from '~pages/Popup/Consent'
import { Deposit, useDepositModal } from '~pages/Popup/Portal/Deposit'
import { Send, useSendModal } from '~pages/Popup/Portal/Send'
import TokenDetail, {
  useTokenDetailModal
} from '~pages/Popup/Portal/TokenDetail'

const numModalBoxAtom = atom<number>(0)
const isOpenModalBoxAtom = atom<boolean>(false)

export function useModalBox(isOpenAtom: PrimitiveAtom<boolean>) {
  const [numModalBox, setNumModalBoxAtom] = useAtom(numModalBoxAtom)
  const [, setModalBoxOpen] = useAtom(isOpenModalBoxAtom)

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

export const ModalBox = () => {
  const [isOpen] = useAtom(isOpenModalBoxAtom)

  const { isOpen: isSendOpen, onClose: onSendClose } = useSendModal()
  const { isOpen: isDepositOpen, onClose: onDepositClose } = useDepositModal()
  const { isOpen: isTokenDetailOpen, onClose: onTokenDetailClose } =
    useTokenDetailModal()
  const { isOpen: isConsentOpen, onClose: onConsentClose } = useConsentModal()

  const animate = !isOpen ? 'hidden' : 'visible'

  return (
    <Box position="relative" zIndex={2}>
      <Box
        as={motion.div}
        variants={modalOverlayVariants}
        animate={animate}
        position="absolute"
        w="full"
        h="calc(100vh - 68px)"
        bg={useColorModeValue('blackAlpha.400', 'blackAlpha.600')}
      />

      <Box
        as={motion.div}
        variants={modalVariants}
        animate={animate}
        position="absolute"
        w="full"
        h="calc(100vh - 68px)">
        <ModalBoxRender
          isOpen={isTokenDetailOpen}
          onClose={onTokenDetailClose}
          child={TokenDetail}
        />

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

        <ModalBoxRender
          isOpen={isConsentOpen}
          onClose={onConsentClose}
          child={Consent}
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

const modalVariants = {
  hidden: {
    top: '100vh',
    opacity: 0,
    transitionEnd: {
      display: 'none'
    }
  },
  visible: {
    top: '0px',
    opacity: 1,
    display: 'block'
  }
}

const modalOverlayVariants = {
  hidden: {
    opacity: 0,
    transitionEnd: {
      display: 'none'
    }
  },
  visible: {
    opacity: 1,
    display: 'block'
  }
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
