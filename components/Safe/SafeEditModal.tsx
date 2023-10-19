import { ExternalLinkIcon, InfoOutlineIcon } from '@chakra-ui/icons'
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Divider,
  HStack,
  IconButton,
  Stack,
  Text,
  Tooltip,
  chakra
} from '@chakra-ui/react'
import { hexlify } from '@ethersproject/bytes'
import { SafeTransaction } from '@safe-global/safe-core-sdk-types'
import { OperationType } from '@safe-global/safe-core-sdk-types/dist/src/types'
import * as React from 'react'
import browser from 'webextension-polyfill'

import { TextLink } from '~components/TextLink'
import { INetwork } from '~lib/schema'
import { getAccountUrl } from '~lib/services/network'

export const SafeEditModal = ({}: {}) => {}

