import { Translation } from 'react-i18next'

import { isTestEnv } from '@/archmage/environment'
import { PluralProps } from '@/archmage/i18n/shared'

export function Plural({ value, one, other }: PluralProps): JSX.Element {
  const children = value === 1 ? one : other
  if (isTestEnv()) {
    return <>{children}</>
  }
  // ensures it re-renders when language changes
  return <Translation>{() => children}</Translation>
}
