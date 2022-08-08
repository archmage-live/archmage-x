import { Select, Stack, useColorMode } from '@chakra-ui/react'

import { SaveInput } from '~components/SaveInput'
import { LOCALE_LABEL } from '~constants/locales'
import { useUserLocale } from '~hooks/useActiveLocale'
import { useLockTime } from '~hooks/useLockTime'

import { SettingItem } from './SettingItem'

export const SettingsGeneral = () => {
  const { colorMode, setColorMode } = useColorMode()
  const { userLocale, setUserLocale } = useUserLocale()
  const [lockTime, setLockTime] = useLockTime()

  return (
    <Stack spacing={12}>
      <SettingItem
        title="Theme"
        description="Choose your preferred theme."
        setting={
          <Select
            w={32}
            value={colorMode!}
            onChange={(e) => setColorMode(e.target.value)}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </Select>
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

      <SettingItem
        title="Auto Lock Time (minutes)"
        description="Set the idle time in minutes before Archmage will become locked. 0 means no auto lock."
        setting={
          <SaveInput
            isNumber
            props={{
              w: 32,
              min: 0,
              max: 10000,
              step: 1,
              keepWithinRange: true,
              precision: 0
            }}
            value={lockTime + ''}
            validate={(value) => {
              const n = +value
              if (isNaN(n)) {
                return false
              }
              return Math.min(n, 10000) + ''
            }}
            onChange={(value) => setLockTime(+value)}
          />
        }
      />
    </Stack>
  )
}
