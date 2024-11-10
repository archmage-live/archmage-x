import { useAtom } from 'jotai'

import { atomWithLocalStore, storeKey } from '@/archmage/store'

export interface OnboardingState {
  finishedOnboarding: boolean
}

const ONBOARDING_KEY = storeKey('onboarding')

const onboardingAtom = atomWithLocalStore<OnboardingState>(ONBOARDING_KEY, {
  finishedOnboarding: false
})

export function useOnboarding() {
  return useAtom(onboardingAtom)
}
