import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  InfoOutlineIcon,
  QuestionOutlineIcon,
  SettingsIcon
} from '@chakra-ui/icons'
import {
  Box,
  Button,
  ButtonGroup,
  ButtonProps,
  Center,
  Divider,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerOverlay,
  Flex,
  HStack,
  Icon,
  IconButton,
  Stack,
  Text,
  useDisclosure
} from '@chakra-ui/react'
import { FaPlug } from '@react-icons/all-files/fa/FaPlug'
import { IoMdWallet } from '@react-icons/all-files/io/IoMdWallet'
import { MdReadMore } from '@react-icons/all-files/md/MdReadMore'
import React, { ReactNode, useState } from 'react'
import browser from 'webextension-polyfill'

import { createTab } from '~lib/tab'
import { SettingsGeneral } from '~pages/Settings/SettingsGeneral'

import { Contacts } from './Contacts'

export default function Settings() {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [settings, setSettings] = useState<Settings>('general')

  return (
    <Stack px={8} pt={2} pb={6} spacing={6}>
      <Text textAlign="center" fontSize="3xl" fontWeight="medium">
        Settings
      </Text>

      <Divider />

      <ButtonGroup
        size="lg"
        orientation="vertical"
        isAttached
        variant="solid-secondary">
        <MenuButton
          icon={<SettingsIcon />}
          title="General"
          onClick={() => {
            setSettings('general')
            onOpen()
          }}
        />
        <MenuButton
          icon={<Icon as={IoMdWallet} />}
          title="Manage Wallets"
          url="#/tab/settings/wallets"
        />
        <MenuButton
          icon={<Icon as={FaPlug} />}
          title="Manage Networks"
          url="#/tab/settings/networks"
        />
      </ButtonGroup>

      <ButtonGroup
        size="lg"
        orientation="vertical"
        isAttached
        variant="solid-secondary">
        <MenuButton
          icon={<CalendarIcon />}
          title="Contacts"
          onClick={() => {
            setSettings('contacts')
            onOpen()
          }}
        />
      </ButtonGroup>

      <ButtonGroup
        size="lg"
        orientation="vertical"
        isAttached
        variant="solid-secondary">
        <MenuButton
          icon={<QuestionOutlineIcon />}
          title="Help & Support"
          url="https://archmage.live"
        />
        <MenuButton
          icon={<InfoOutlineIcon />}
          title="About Archmage"
          onClick={() => {
            setSettings('about')
            onOpen()
          }}
        />
      </ButtonGroup>

      <Center>
        <Button
          w={56}
          size="md"
          leftIcon={<Icon color="gray.500" as={MdReadMore} />}
          variant="ghost"
          onClick={() => {
            createTab('#/tab/settings/general').finally()
          }}>
          <Text color="gray.500">More Settings</Text>
        </Button>
      </Center>

      <SettingsDrawer isOpen={isOpen} onClose={onClose} settings={settings} />
    </Stack>
  )
}

const MenuButton = ({
  icon,
  title,
  url,
  onClick,
  ...props
}: {
  icon: ReactNode
  title: string
  url?: string
  onClick?: () => void
} & ButtonProps) => {
  return (
    <Button
      h={16}
      {...props}
      onClick={() => {
        if (onClick) {
          onClick()
        } else if (url) {
          if (url.startsWith('#/')) {
            createTab(url).finally()
          } else {
            browser.tabs.create({ url }).finally()
          }
        }
      }}>
      <HStack justify="space-between" w="full">
        <HStack spacing={4}>
          {icon}
          <Text>{title}</Text>
        </HStack>
        {!url ? <ChevronRightIcon /> : <ExternalLinkIcon />}
      </HStack>
    </Button>
  )
}

type Settings = 'general' | 'contacts' | 'about'

const SettingsDrawer = ({
  isOpen,
  onClose,
  settings
}: {
  isOpen: boolean
  onClose: () => void
  settings: Settings
}) => {
  return (
    <Drawer
      isOpen={isOpen}
      size="full"
      placement="right"
      onClose={onClose}
      isFullHeight
      preserveScrollBarGap>
      <DrawerOverlay />
      <DrawerContent>
        <DrawerBody>
          <Flex ms={-3} pb={4} h="full" direction="column" gap={2}>
            <HStack justify="space-between">
              <IconButton
                icon={<ChevronLeftIcon fontSize="2xl" />}
                aria-label="Close"
                variant="ghost"
                size="md"
                minW={8}
                minH={8}
                onClick={onClose}
              />

              <Text fontSize="xl" fontWeight="medium">
                {settings === 'general'
                  ? 'General'
                  : settings === 'contacts'
                  ? 'Address Book'
                  : settings === 'about'
                  ? 'About'
                  : ''}
              </Text>

              <Box w={8} h={8} />
            </HStack>

            <Divider />

            <Stack flex={1} overflowY="auto" m={4}>
              {settings === 'general' ? (
                <SettingsGeneral forPopup />
              ) : settings === 'contacts' ? (
                <Contacts />
              ) : settings === 'about' ? (
                <></>
              ) : (
                <></>
              )}
            </Stack>
          </Flex>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  )
}
