import {
  Box,
  Container,
  Divider,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Stack,
  Text
} from '@chakra-ui/react'
import { FiSearch } from 'react-icons/all'
import { Navigate, Route, Routes } from 'react-router-dom'

import { Card } from '~components/Card'
import { TitleBar } from '~components/TitleBar'

import { SettingsGeneral } from './SettingsGeneral'
import { SettingsNetworks } from './SettingsNetworks'
import { SettingsWallets } from './SettingsWallets'
import { SideMenu } from './SideMenu'

export default function Settings() {
  const inputColor = 'purple.500'

  return (
    <Stack w="100vw" h="100vh">
      <TitleBar />

      <Container centerContent maxW="100%" pb="16" flex="1">
        <Card w="96rem" minH="100%" pt={8}>
          <Stack px={4}>
            <HStack justify={'space-between'} pb={4}>
              <Text fontSize="3xl">Settings</Text>

              <InputGroup w={80}>
                <InputLeftElement pointerEvents="none">
                  <Icon as={FiSearch} color={inputColor} boxSize="5" />
                </InputLeftElement>
                <Input
                  placeholder="Search"
                  color={inputColor}
                  _placeholder={{ color: inputColor }}
                />
              </InputGroup>
            </HStack>

            <Divider />

            <HStack align="start">
              <SideMenu />

              <Box flex={1} p={6} px={12}>
                <Routes>
                  <Route path="*" element={<Navigate to="general" replace />} />
                  <Route path="/general" element={<SettingsGeneral />} />
                  <Route path="/wallets" element={<SettingsWallets />} />
                  <Route path="/networks" element={<SettingsNetworks />} />
                  <Route path="/*" element={<></>} />
                </Routes>
              </Box>
            </HStack>
          </Stack>
        </Card>
      </Container>
    </Stack>
  )
}
