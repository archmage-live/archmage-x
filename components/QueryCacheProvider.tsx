import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { ReactNode } from 'react'

import { createQueryCachePersister } from '~lib/query'

interface QueryCacheProviderProps {
  children: ReactNode
}

export const QueryCacheProvider = ({ children }: QueryCacheProviderProps) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        cacheTime: 1000 * 60 * 60 * 24 // 24 hours
      }
    }
  })

  const persister = createQueryCachePersister()

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}>
      {children}
    </PersistQueryClientProvider>
  )
}
