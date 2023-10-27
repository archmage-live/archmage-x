import {
  Select,
  Stack,
  TextProps,
  useColorMode,
  useColorModeValue
} from '@chakra-ui/react'
import { useMemo } from 'react'

import { SaveInput } from '~components/SaveInput'
import { SettingItem } from '~components/SettingItem'
import { LOCALE_LABEL } from '~lib/constants/locales'
import { useUserLocale } from '~lib/hooks/useActiveLocale'
import { useLockTime } from '~lib/hooks/useLockTime'
import { QUOTE_CURRENCY_LABEL, useQuoteCurrency } from '~lib/quoteCurrency'

export const SettingsGeneral = ({ forPopup }: { forPopup?: boolean }) => {
  const titleColor = useColorModeValue('purple.600', 'purple.400')

  const titleProps = useMemo(
    () => ({
      fontSize: 'xl',
      fontWeight: forPopup ? 'medium' : undefined,
      color: !forPopup ? titleColor : undefined
    }),
    [forPopup, titleColor]
  )

  const descriptionProps = useMemo(
    () => ({
      fontSize: 'md',
      color: forPopup ? 'gray.500' : undefined
    }),
    [forPopup]
  )

  return (
    <Stack spacing={forPopup ? 6 : 12}>
      <SettingsGeneralTheme
        titleProps={titleProps}
        descriptionProps={descriptionProps}
      />

      <SettingsGeneralLocale
        titleProps={titleProps}
        descriptionProps={descriptionProps}
      />

      <SettingsGeneralQuoteCurrency
        titleProps={titleProps}
        descriptionProps={descriptionProps}
      />

      <SettingsGeneralLockTime
        titleProps={titleProps}
        descriptionProps={descriptionProps}
      />
    </Stack>
  )
}

export const SettingsGeneralTheme = ({
  titleProps,
  descriptionProps
}: {
  titleProps?: TextProps
  descriptionProps?: TextProps
}) => {
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
      titleProps={titleProps}
      descriptionProps={descriptionProps}
    />
  )
}

export const SettingsGeneralLocale = ({
  titleProps,
  descriptionProps
}: {
  titleProps?: TextProps
  descriptionProps?: TextProps
}) => {
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
      titleProps={titleProps}
      descriptionProps={descriptionProps}
    />
  )
}

export const SettingsGeneralQuoteCurrency = ({
  titleProps,
  descriptionProps
}: {
  titleProps?: TextProps
  descriptionProps?: TextProps
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
      titleProps={titleProps}
      descriptionProps={descriptionProps}
    />
  )
}

export const SettingsGeneralLockTime = ({
  titleProps,
  descriptionProps
}: {
  titleProps?: TextProps
  descriptionProps?: TextProps
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
      titleProps={titleProps}
      descriptionProps={descriptionProps}
    />
  )
}
