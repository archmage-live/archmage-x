import { ApolloLink, createHttpLink } from '@apollo/client'
import { onError } from '@apollo/client/link/error'
import { RestLink } from 'apollo-link-rest'

import { URLS } from '@/archmage/constants/urls'
import { logger } from '@/archmage/logger/logger'
import { isMobileApp } from '@/archmage/platform'

// Handles fetching data from REST APIs
// Responses will be stored in graphql cache
export const getRestLink = (): ApolloLink => {
  return new RestLink({
    uri: URLS.apiBaseUrl,
    headers: {
      'Content-Type': 'application/json',
      Origin: URLS.archmageUrl
    }
  })
}

export interface CustomEndpoint {
  url: string
  key: string
}

export const getCustomGraphqlHttpLink = (endpoint: CustomEndpoint): ApolloLink =>
  createHttpLink({
    uri: endpoint.url,
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': endpoint.key,
      Origin: URLS.archmageUrl
    }
  })

export const getGraphqlHttpLink = (): ApolloLink =>
  createHttpLink({
    uri: URLS.graphQLUrl,
    headers: {
      'Content-Type': 'application/json',
      Origin: URLS.archmageUrl
    }
  })

// Samples error reports to reduce load on backend
// Recurring errors that we must fix should have enough occurrences that we detect them still
const APOLLO_GRAPHQL_ERROR_SAMPLING_RATE = 0.1
const APOLLO_NETWORK_ERROR_SAMPLING_RATE = 0.01
const APOLLO_PERFORMANCE_SAMPLING_RATE = 0.01

export function sample(cb: () => void, rate: number): void {
  if (Math.random() < rate) {
    cb()
  }
}

export function getErrorLink(
  graphqlErrorSamplingRate = APOLLO_GRAPHQL_ERROR_SAMPLING_RATE,
  networkErrorSamplingRate = APOLLO_NETWORK_ERROR_SAMPLING_RATE
): ApolloLink {
  // Log any GraphQL errors or network error that occurred
  const errorLink = onError(({ graphQLErrors, networkError }) => {
    if (graphQLErrors) {
      graphQLErrors.forEach(({ message, locations, path }) => {
        sample(
          () =>
            logger.error(`GraphQL error: ${message}`, {
              tags: {
                file: 'data/links',
                function: 'getErrorLink'
              },
              extra: { message, locations, path }
            }),
          graphqlErrorSamplingRate
        )
      })
    }
    // We use DataDog to catch network errors on Mobile
    if (networkError && !isMobileApp) {
      sample(
        () =>
          logger.error(networkError, { tags: { file: 'data/links', function: 'getErrorLink' } }),
        networkErrorSamplingRate
      )
    }
  })

  return errorLink
}

export function getPerformanceLink(
  sendAnalyticsEvent: (args: Record<string, string>) => void,
  samplingRate = APOLLO_PERFORMANCE_SAMPLING_RATE
): ApolloLink {
  return new ApolloLink((operation, forward) => {
    const startTime = Date.now()

    return forward(operation).map((data) => {
      const duration = (Date.now() - startTime).toString()
      const dataSize = JSON.stringify(data).length.toString()

      sample(
        () =>
          sendAnalyticsEvent({
            dataSize,
            duration,
            operationName: operation.operationName
          }),
        samplingRate
      )

      return data
    })
  })
}
