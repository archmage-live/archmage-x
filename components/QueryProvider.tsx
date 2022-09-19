import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { ReactNode } from 'react'

import { createQueryCachePersister } from '~lib/query'

const cachedQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      cacheTime: 1000 * 60 * 60 * 24 // 24 hours
    }
  }
})

const persister = createQueryCachePersister()

export const QueryCacheProvider = ({ children }: { children: ReactNode }) => {
  return (
    <PersistQueryClientProvider
      client={cachedQueryClient}
      persistOptions={{ persister }}>
      {children}
    </PersistQueryClientProvider>
  )
}

const queryClient = new QueryClient()

export const QueryProvider = ({ children }: { children: ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
