import { IconButton, Select, Stack, useColorMode } from '@chakra-ui/react'
import { FaMoon, FaSun } from 'react-icons/fa'

import { LOCALE_LABEL } from '~constants/locales'
import { useUserLocale } from '~hooks/useActiveLocale'

import { SettingItem } from './SettingItem'

export const SettingsGeneral = () => {
  const { colorMode, toggleColorMode } = useColorMode()
  const { userLocale, setUserLocale } = useUserLocale()

  return (
    <Stack spacing={12}>
      <SettingItem
        title="Theme"
        description="Choose your preferred theme."
        setting={
          colorMode === 'light' ? (
            <IconButton
              colorScheme="purple"
              icon={<FaMoon fontSize="1.25rem" />}
              aria-label="Dark mode"
              onClick={toggleColorMode}
            />
          ) : (
            <IconButton
              colorScheme="purple"
              icon={<FaSun fontSize="1.25rem" />}
              aria-label="Light mode"
              onClick={toggleColorMode}
            />
          )
        }
      />

      <SettingItem
        title="Language"
        description="Choose the language used to display the Archmage UI"
        setting={
          <Select
            w={32}
            value={userLocale!}
            onChange={(e) => setUserLocale(e.target.value)}>
            {Object.entries(LOCALE_LABEL)
              .filter(([code]) => code !== 'pseudo')
              .map(([code, text]) => {
                return (
                  <option key={code} value={code}>
                    {text}
                  </option>
                )
              })}
          </Select>
        }
      />
    </Stack>
  )
}
