import { Select, Stack, useColorMode } from '@chakra-ui/react'

import { SaveInput } from '~components/SaveInput'
import { SettingItem } from '~components/SettingItem'
import { LOCALE_LABEL } from '~lib/constants/locales'
import { useUserLocale } from '~lib/hooks/useActiveLocale'
import { useLockTime } from '~lib/hooks/useLockTime'
import { QUOTE_CURRENCY_LABEL, useQuoteCurrency } from '~lib/quoteCurrency'

export const SettingsGeneral = ({ forPopup }: { forPopup?: boolean }) => {
  return (
    <Stack spacing={forPopup ? 6 : 12}>
      <SettingsGeneralTheme forPopup={forPopup} />

      <SettingsGeneralLocale forPopup={forPopup} />

      <SettingsGeneralQuoteCurrency forPopup={forPopup} />

      <SettingsGeneralLockTime forPopup={forPopup} />
    </Stack>
  )
}

export const SettingsGeneralTheme = ({ forPopup }: { forPopup?: boolean }) => {
  const { colorMode, setColorMode } = useColorMode()

  return (
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
      forPopup={forPopup}
    />
  )
}

export const SettingsGeneralLocale = ({ forPopup }: { forPopup?: boolean }) => {
  const { userLocale, setUserLocale } = useUserLocale()

  return (
    <SettingItem
      title="Language"
      description="Choose the language used to display the Archmage UI."
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
      forPopup={forPopup}
    />
  )
}

export const SettingsGeneralQuoteCurrency = ({
  forPopup
}: {
  forPopup?: boolean
}) => {
  const { quoteCurrency, setQuoteCurrency } = useQuoteCurrency()

  return (
    <SettingItem
      title="Quote Currency"
      description="Choose the quote currency used to display exchange rate."
      setting={
        <Select
          w={64}
          value={quoteCurrency}
          onChange={(e) => setQuoteCurrency(e.target.value)}>
          {Object.entries(QUOTE_CURRENCY_LABEL).map(([currency, text]) => {
            return (
              <option key={currency} value={currency}>
                {currency} - {text}
              </option>
            )
          })}
        </Select>
      }
      forPopup={forPopup}
    />
  )
}

export const SettingsGeneralLockTime = ({
  forPopup
}: {
  forPopup?: boolean
}) => {
  const [lockTime, setLockTime] = useLockTime()

  return (
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
      forPopup={forPopup}
    />
  )
}
