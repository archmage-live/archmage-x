import { Box, useColorModeValue } from '@chakra-ui/react'
import { motion } from 'framer-motion'

import { ModalBox, useIsOpenModalBox } from '~components/ModalBox'
import Consent, { useConsentModal } from '~pages/Popup/Consent'
import { NftDetail, useNftDetailModal } from '~pages/Popup/Nfts/NftDetail'
import { SendNft, useSendNftModal } from '~pages/Popup/Nfts/SendNft'
import { Deposit, useDepositModal } from '~pages/Popup/Portal/Deposit'
import { Send, useSendModal } from '~pages/Popup/Portal/Send'
import TokenDetail, {
  useTokenDetailModal
} from '~pages/Popup/Portal/TokenDetail'

export const ModalBoxPage = () => {
  const [isOpen] = useIsOpenModalBox()

  const { isOpen: isSendOpen, onClose: onSendClose } = useSendModal()
  const { isOpen: isSendNftOpen, onClose: onSendNftClose } = useSendNftModal()
  const { isOpen: isDepositOpen, onClose: onDepositClose } = useDepositModal()
  const { isOpen: isTokenDetailOpen, onClose: onTokenDetailClose } =
    useTokenDetailModal()
  const { isOpen: isNftDetailOpen, onClose: onNftDetailClose } =
    useNftDetailModal()
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
        <ModalBox
          isOpen={isTokenDetailOpen}
          onClose={onTokenDetailClose}
          child={TokenDetail}
        />

        <ModalBox
          isOpen={isNftDetailOpen}
          onClose={onNftDetailClose}
          child={NftDetail}
        />

        <ModalBox isOpen={isSendOpen} onClose={onSendClose} child={Send} />

        <ModalBox
          isOpen={isSendNftOpen}
          onClose={onSendNftClose}
          child={SendNft}
        />

        <ModalBox
          isOpen={isDepositOpen}
          onClose={onDepositClose}
          child={Deposit}
        />

        <ModalBox
          isOpen={isConsentOpen}
          onClose={onConsentClose}
          child={Consent}
        />
      </Box>
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
