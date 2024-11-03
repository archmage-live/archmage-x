import { ApolloClient, ApolloLink, NormalizedCacheObject, from } from '@apollo/client'
import { PersistentStorage } from 'apollo3-cache-persist'
import { useCallback, useEffect, useState } from 'react'
import { MMKV } from 'react-native-mmkv'
import { useAsync } from 'react-use'

import { isNonJestDev } from '@/archmage/environment/constants'
import { getDatadogApolloLink } from '@/archmage/logger/datadogLink'
import { logger } from '@/archmage/logger/logger'
import { isMobileApp } from '@/archmage/platform'

import { initAndPersistCache } from './cache'
import {
  CustomEndpoint,
  getCustomGraphqlHttpLink,
  getErrorLink,
  getGraphqlHttpLink,
  getRestLink
} from './links'

type ApolloClientRef = {
  current: ApolloClient<NormalizedCacheObject> | null
  onReady: () => Promise<ApolloClient<NormalizedCacheObject>>
}

// This object allows us to get access to the apollo client in places outside of React where we can't use hooks.
export const apolloClientRef: ApolloClientRef = ((): ApolloClientRef => {
  let apolloClient: ApolloClient<NormalizedCacheObject> | null = null

  const listeners: Array<
    (
      value: ApolloClient<NormalizedCacheObject> | PromiseLike<ApolloClient<NormalizedCacheObject>>
    ) => void
  > = []

  const ref: ApolloClientRef = {
    get current() {
      return apolloClient
    },

    set current(newApolloClient) {
      if (!newApolloClient) {
        throw new Error("Can't set `apolloClient` to `null`")
      }

      apolloClient = newApolloClient
      listeners.forEach((resolve) => resolve(newApolloClient))
    },

    onReady: async (): Promise<ApolloClient<NormalizedCacheObject>> => {
      if (apolloClient) {
        return Promise.resolve(apolloClient)
      }

      return new Promise<ApolloClient<NormalizedCacheObject>>((resolve) => listeners.push(resolve))
    }
  }

  return ref
})()

const mmkv = new MMKV()
if (isNonJestDev && isMobileApp) {
  // requires Flipper plugin `react-native-mmkv` to be installed
  require('react-native-mmkv-flipper-plugin').initializeMMKVFlipper({ default: mmkv })
}

// ONLY for use once in App.tsx! If you add this in other places you will go to JAIL!
export const usePersistedApolloClient = ({
  storageWrapper,
  maxCacheSizeInBytes,
  customEndpoint
}: {
  storageWrapper: PersistentStorage<string>
  maxCacheSizeInBytes: number
  customEndpoint?: CustomEndpoint
}): ApolloClient<NormalizedCacheObject> | undefined => {
  const [client, setClient] = useState<ApolloClient<NormalizedCacheObject>>()

  const apolloLink = customEndpoint
    ? getCustomGraphqlHttpLink(customEndpoint)
    : getGraphqlHttpLink()

  const init = useCallback(async () => {
    const cache = await initAndPersistCache({ storage: storageWrapper, maxCacheSizeInBytes })

    if (customEndpoint) {
      logger.debug(
        'usePersistedApolloClient',
        'usePersistedApolloClient',
        `Using custom endpoint ${customEndpoint.url}`
      )
    }

    const restLink = getRestLink()

    const linkList: ApolloLink[] = [
      getErrorLink(),
      restLink,
      apolloLink
    ]
    if (isMobileApp) {
      linkList.push(getDatadogApolloLink())
    }

    const newClient = new ApolloClient({
      assumeImmutableResults: true,
      link: from(linkList),
      cache,
      defaultOptions: {
        watchQuery: {
          // NOTE: when polling is enabled, if there is cached data, the first request is skipped.
          // `cache-and-network` ensures we send a request on first query, keeping queries
          // across the app in sync.
          fetchPolicy: 'cache-and-network',
          // ensures query is returning data even if some fields errored out
          errorPolicy: 'all'
        }
      }
    })

    apolloClientRef.current = newClient
    setClient(newClient)

    // Ensure this callback only is computed once even if apolloLink changes,
    // otherwise this will cause a rendering loop re-initializing the client
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useAsync(init)

  useEffect(() => {
    if (isNonJestDev) {
      // requires Flipper plugin `react-native-apollo-devtools` to be installed
      require('react-native-apollo-devtools-client').apolloDevToolsInit(client)
    }
  }, [client])

  return client
}
