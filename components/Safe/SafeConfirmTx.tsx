import { Nft } from '@archmagelive/alchemy-sdk'
import { ExternalLinkIcon } from '@chakra-ui/icons'
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Center,
  Divider,
  HStack,
  Icon,
  IconButton,
  Image,
  Stack,
  Text,
  Tooltip,
  chakra
} from '@chakra-ui/react'
import { FormatTypes, TransactionDescription } from '@ethersproject/abi'
import { ParamType } from '@ethersproject/abi/src.ts/fragments'
import { BigNumber } from '@ethersproject/bignumber'
import { hexlify } from '@ethersproject/bytes'
import { BiQuestionMark } from '@react-icons/all-files/bi/BiQuestionMark'
import {
  OperationType,
  SafeTransaction
} from '@safe-global/safe-core-sdk-types'
import assert from 'assert'
import Decimal from 'decimal.js'
import { ReactNode } from 'react'
import { useAsyncRetry, useInterval } from 'react-use'
import browser from 'webextension-polyfill'

import { ImageWithFallback } from '~components/ImageWithFallback'
import { JsonDisplay } from '~components/JsonDisplay'
import { TextLink } from '~components/TextLink'
import { SafeTxParams, SafeTxType } from '~lib/safe'
import { IChainAccount, INetwork } from '~lib/schema'
import { ALCHEMY_API } from '~lib/services/datasource/alchemy'
import { CHAINLIST_API } from '~lib/services/datasource/chainlist'
import { CRYPTO_COMPARE_SERVICE } from '~lib/services/datasource/cryptocompare'
import { ETHERSCAN_API } from '~lib/services/datasource/etherscan'
import { getAccountUrl, getNetworkInfo } from '~lib/services/network'
import { TOKEN_SERVICE, getTokenBrief } from '~lib/services/token'
import { SafeInfo } from '~lib/wallet'

export const SafeConfirmTx = ({
  network,
  account,
  info,
  tx,
  params
}: {
  network: INetwork
  account: IChainAccount
  info: SafeInfo
  tx: SafeTransaction
  params: SafeTxParams
}) => {
  const data = tx.data

  const {
    value: descriptors,
    loading,
    error,
    retry
  } = useAsyncRetry(async () => {
    return buildSafeTxDescriptors(network, account, info, tx, params)
  }, [network, account, info, tx, params])

  useInterval(retry, !loading && error ? 30000 : null)

  if (!descriptors) {
    return <></>
  }

  return (
    <Stack>
      <HStack justify="space-between">
        <Text fontSize="lg" fontWeight="medium">
          {descriptors.title}
        </Text>

        <Text>
          Nonce <chakra.span fontWeight="medium">#{data.nonce}</chakra.span>
        </Text>
      </HStack>

      <Divider />

      <Stack spacing={4}>
        {descriptors.description}

        <Accordion allowToggle>
          <AccordionItem>
            <h4>
              <AccordionButton>
                <HStack flex="1">
                  <Text>Transaction details</Text>
                </HStack>
                <AccordionIcon />
              </AccordionButton>
            </h4>
            <AccordionPanel pb={4}>
              <Stack spacing={4}>
                {descriptors.detail}

                <Stack spacing={1}>
                  <HStack>
                    <Text color="gray.500">ADVANCED DETAILS</Text>

                    <Tooltip
                      label="Learn more about advanced details"
                      placement="top">
                      <IconButton
                        variant="ghost"
                        aria-label="Learn more about advanced details"
                        size="xs"
                        icon={<ExternalLinkIcon />}
                        onClick={() => {
                          browser.tabs
                            .create({
                              url: 'https://help.safe.global/en/articles/40837-advanced-transaction-parameters'
                            })
                            .finally()
                        }}
                      />
                    </Tooltip>
                  </HStack>

                  <Stack spacing={0}>
                    <HStack justify="space-between">
                      <Text color="gray.500">Operation:</Text>
                      <Text>
                        {data.operation} (
                        {data.operation === OperationType.Call
                          ? 'call'
                          : 'delegateCall'}
                        )
                      </Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text color="gray.500">safeTxGas:</Text>
                      <Text>{data.safeTxGas}</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text color="gray.500">baseGas:</Text>
                      <Text>{data.baseGas}</Text>
                    </HStack>
                    {data.gasPrice && (
                      <HStack justify="space-between">
                        <Text color="gray.500">gasPrice:</Text>
                        <Text>{data.gasPrice}</Text>
                      </HStack>
                    )}
                    {data.gasToken && (
                      <HStack justify="space-between">
                        <Text color="gray.500">gasToken:</Text>
                        <TextLink
                          text={data.gasToken}
                          name="Gas Token"
                          url={getAccountUrl(network, data.gasToken)}
                          urlLabel="View on explorer"
                        />
                      </HStack>
                    )}
                    <HStack justify="space-between">
                      <Text color="gray.500">refundReceiver:</Text>
                      <TextLink
                        text={data.refundReceiver}
                        name="Refund Receiver"
                        url={getAccountUrl(network, data.refundReceiver)}
                        urlLabel="View on explorer"
                      />
                    </HStack>
                    {Array.from(tx.signatures.values()).map((sig, index) => {
                      return (
                        <HStack key={index} justify="space-between">
                          <Text color="gray.500">Signature {index + 1}:</Text>
                          <TextLink name="Signature" text={hexlify(sig.data)} />
                        </HStack>
                      )
                    })}
                    <HStack justify="space-between">
                      <Text color="gray.500">Raw data:</Text>
                      <TextLink name="Data" text={hexlify(data.data)} />
                    </HStack>
                  </Stack>
                </Stack>
              </Stack>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </Stack>
    </Stack>
  )
}

const SafeAction = ({
  network,
  contract,
  desc
}: {
  network: INetwork
  contract: string
  desc: TransactionDescription
}) => {
  return (
    <Stack spacing={4}>
      <Stack spacing={2}>
        <Text>Interact with:</Text>
        <TextLink
          text={contract}
          name="Contract Address"
          url={getAccountUrl(network, contract)}
          urlLabel="View on explorer"
        />
      </Stack>

      <Stack spacing={2}>
        <Text color="gray.500">{desc.name}</Text>

        <Stack spacing={0}>
          {desc.functionFragment.inputs.map((input, index) => {
            const argValue = desc.args[input.name]
            return (
              <HStack key={index} justify="space-between">
                <Text color="gray.500">
                  {input.name + '<' > +input.format(FormatTypes.sighash) + '>'}:
                </Text>

                <ArrayParameters
                  network={network}
                  input={input}
                  argValue={argValue}
                />
              </HStack>
            )
          })}
        </Stack>
      </Stack>
    </Stack>
  )
}

const ArrayParameters = ({
  network,
  input,
  argValue
}: {
  network: INetwork
  input: ParamType
  argValue: any
}) => {
  return input.baseType === 'address' ? (
    <TextLink
      text={argValue}
      name="Address"
      url={getAccountUrl(network, argValue)}
      urlLabel="View on explorer"
    />
  ) : (input.baseType === 'array' || input.baseType === 'tuple') &&
    Array.isArray(argValue) ? (
    <JsonDisplay data={argValue} />
  ) : argValue?.toString ? (
    <TextLink text={argValue.toString()} name={input.name} />
  ) : (
    <Text></Text>
  )
}

async function buildSafeTxDescriptors(
  network: INetwork,
  account: IChainAccount,
  info: SafeInfo,
  tx: SafeTransaction,
  params: SafeTxParams
): Promise<{
  title: string
  description?: ReactNode
  detail?: ReactNode
}> {
  switch (params.type) {
    case SafeTxType.EnableFallbackHandler:
      return {
        title: 'Enable fallback handler'
      }
    case SafeTxType.DisableFallbackHandler:
      return {
        title: 'Disable fallback handler'
      }
    case SafeTxType.EnableGuard:
      return {
        title: 'Enable guard'
      }
    case SafeTxType.DisableGuard:
      return {
        title: 'Disable guard'
      }
    case SafeTxType.EnableModule:
      return {
        title: 'Enable module'
      }
    case SafeTxType.DisableModule:
      return {
        title: 'Disable module'
      }
    case SafeTxType.AddOwner:
      return {
        title: 'Add owner',
        description: (
          <Stack spacing={6}>
            <Stack spacing={4}>
              <Text>➕ New owner</Text>
              <TextLink
                text={params.params.ownerAddress}
                name="Owner Address"
                url={getAccountUrl(network, params.params.ownerAddress)}
                urlLabel="View on explorer"
              />
            </Stack>
            <Stack spacing={2}>
              <Text>Any transaction requires the confirmation of:</Text>
              <Text>
                <chakra.span fontWeight="medium">
                  {params.params.threshold || info.threshold}
                </chakra.span>
                &nbsp;out of&nbsp;
                <chakra.span fontWeight="medium">
                  {info.owners.length + 1} owner(s)
                </chakra.span>
              </Text>
            </Stack>
          </Stack>
        ),
        detail: (
          <Stack spacing={1}>
            <Text color="gray.500">ADD OWNER</Text>
            <Stack spacing={0}>
              <HStack justify="space-between">
                <Text color="gray.500">owner:</Text>
                <TextLink
                  text={params.params.ownerAddress}
                  name="Owner Address"
                  url={getAccountUrl(network, params.params.ownerAddress)}
                  urlLabel="View on explorer"
                />
              </HStack>
              <HStack justify="space-between">
                <Text color="gray.500">threshold:</Text>
                <Text>{params.params.threshold || info.threshold}</Text>
              </HStack>
            </Stack>
          </Stack>
        )
      }
    case SafeTxType.RemoveOwner:
      return {
        title: 'Remove owner',
        description: (
          <Stack spacing={6}>
            <Stack spacing={4}>
              <Text>➖ Selected owner</Text>
              <TextLink
                text={params.params.ownerAddress}
                name="Owner Address"
                url={getAccountUrl(network, params.params.ownerAddress)}
                urlLabel="View on explorer"
              />
            </Stack>
            <Stack spacing={2}>
              <Text>Any transaction requires the confirmation of:</Text>
              <Text>
                <chakra.span fontWeight="medium">
                  {params.params.threshold || info.threshold}
                </chakra.span>
                &nbsp;out of&nbsp;
                <chakra.span fontWeight="medium">
                  {info.owners.length - 1} owner(s)
                </chakra.span>
              </Text>
            </Stack>
          </Stack>
        ),
        detail: (
          <Stack spacing={1}>
            <Text color="gray.500">REMOVE OWNER</Text>
            <Stack spacing={0}>
              <HStack justify="space-between">
                <Text color="gray.500">owner:</Text>
                <TextLink
                  text={params.params.ownerAddress}
                  name="Owner Address"
                  url={getAccountUrl(network, params.params.ownerAddress)}
                  urlLabel="View on explorer"
                />
              </HStack>
              <HStack justify="space-between">
                <Text color="gray.500">threshold:</Text>
                <Text>{params.params.threshold || info.threshold}</Text>
              </HStack>
            </Stack>
          </Stack>
        )
      }
    case SafeTxType.SwapOwner:
      return {
        title: 'Replace owner',
        description: (
          <Stack spacing={6}>
            <Stack spacing={4}>
              <Text>➖ Old owner</Text>
              <TextLink
                text={params.params.oldOwnerAddress}
                name="Old Owner Address"
                url={getAccountUrl(network, params.params.oldOwnerAddress)}
                urlLabel="View on explorer"
              />
            </Stack>
            <Stack spacing={4}>
              <Text>➕ New owner</Text>
              <TextLink
                text={params.params.newOwnerAddress}
                name="New Owner Address"
                url={getAccountUrl(network, params.params.newOwnerAddress)}
                urlLabel="View on explorer"
              />
            </Stack>
            <Stack spacing={2}>
              <Text>Any transaction requires the confirmation of:</Text>
              <Text>
                <chakra.span fontWeight="medium">{info.threshold}</chakra.span>
                &nbsp;out of&nbsp;
                <chakra.span fontWeight="medium">
                  {info.owners.length} owner(s)
                </chakra.span>
              </Text>
            </Stack>
          </Stack>
        ),
        detail: (
          <Stack spacing={1}>
            <Text color="gray.500">SWAP OWNER</Text>
            <Stack spacing={0}>
              <HStack justify="space-between">
                <Text color="gray.500">oldOwner:</Text>
                <TextLink
                  text={params.params.oldOwnerAddress}
                  name="Old Owner Address"
                  url={getAccountUrl(network, params.params.oldOwnerAddress)}
                  urlLabel="View on explorer"
                />
              </HStack>
              <HStack justify="space-between">
                <Text color="gray.500">newOwner:</Text>
                <TextLink
                  text={params.params.newOwnerAddress}
                  name="New Owner Address"
                  url={getAccountUrl(network, params.params.newOwnerAddress)}
                  urlLabel="View on explorer"
                />
              </HStack>
            </Stack>
          </Stack>
        )
      }
    case SafeTxType.ChangeThreshold:
      return {
        title: 'Change threshold',
        description: (
          <Stack spacing={2}>
            <Text>Any transaction requires the confirmation of:</Text>
            <Text>
              <chakra.span fontWeight="medium">{params.threshold}</chakra.span>
              &nbsp;out of&nbsp;
              <chakra.span fontWeight="medium">
                {info.owners.length} owner(s)
              </chakra.span>
            </Text>
          </Stack>
        ),
        detail: (
          <Stack spacing={1}>
            <Text color="gray.500">CHANGE THRESHOLD</Text>
            <Stack spacing={0}>
              <HStack justify="space-between">
                <Text color="gray.500">threshold:</Text>
                <Text>{params.threshold}</Text>
              </HStack>
            </Stack>
          </Stack>
        )
      }
    case SafeTxType.SendToken: {
      let symbol, decimals, iconUrl
      if (!params.params.contract) {
        // native token
        const info = getNetworkInfo(network)
        symbol = info.currencySymbol
        decimals = info.decimals
        iconUrl = await CHAINLIST_API.getEvmChainLogoUrl(
          network.chainId as number
        )
        if (!iconUrl) {
          iconUrl = await CRYPTO_COMPARE_SERVICE.getChainLogoUrl(
            info.currencySymbol
          )
        }
      } else {
        // token
        const token = await TOKEN_SERVICE.searchToken(
          account,
          params.params.contract
        )
        if (token) {
          const brief = getTokenBrief(token.token)
          symbol = brief.balance.symbol
          decimals = brief.balance.decimals
          iconUrl = brief.iconUrl
        } else {
          symbol = 'UNKNOWN'
          decimals = 0
        }
      }

      const amount = new Decimal(params.params.amount)
        .div(new Decimal(10).pow(decimals))
        .toDecimalPlaces(decimals)
        .toString()

      return {
        title: 'Send tokens',
        description: (
          <Stack spacing={4}>
            <HStack justify="space-between">
              <Text color="gray.500">Send</Text>
              <HStack>
                <Image
                  borderRadius="full"
                  boxSize="20px"
                  fit="cover"
                  src={iconUrl}
                  fallback={
                    <Center
                      w="20px"
                      h="20px"
                      borderRadius="full"
                      borderWidth="1px"
                      borderColor="gray.500">
                      <Icon as={BiQuestionMark} fontSize="lg" />
                    </Center>
                  }
                  alt="Token Icon"
                />
                <Text fontWeight="medium">{symbol}</Text>
                <Text>{amount}</Text>
              </HStack>
            </HStack>

            <HStack justify="space-between">
              <Text color="gray.500">To</Text>
              <TextLink
                text={params.params.to}
                name="To Address"
                url={getAccountUrl(network, params.params.to)}
                urlLabel="View on explorer"
              />
            </HStack>
          </Stack>
        ),
        detail: (
          <Stack spacing={1}>
            <Text color="gray.500">TRANSFER</Text>
            <Stack spacing={0}>
              <HStack justify="space-between">
                <Text color="gray.500">to:</Text>
                <TextLink
                  text={params.params.to}
                  name="To Address"
                  url={getAccountUrl(network, params.params.to)}
                  urlLabel="View on explorer"
                />
              </HStack>
              <HStack justify="space-between">
                <Text color="gray.500">amount:</Text>
                <Text>{new Decimal(params.params.amount).toString()}</Text>
              </HStack>
            </Stack>
          </Stack>
        )
      }
    }
    case SafeTxType.SendNft: {
      let nfts: Nft[] | undefined
      const alchemyApi = ALCHEMY_API.api(+network.chainId)
      if (alchemyApi) {
        nfts = await alchemyApi.nft.getNftMetadataBatch(
          params.params.map(({ contract, tokenId }) => ({
            contractAddress: contract,
            tokenId
          }))
        )
        assert(nfts.length === params.params.length)
      }

      const etherscanApi = ETHERSCAN_API.getProvider(network)

      return {
        title: 'Send NFTs',
        description: (
          <Stack spacing={4}>
            <HStack justify="space-between">
              <Text color="gray.500">Send</Text>
              <Stack spacing={2}>
                {params.params.map((params, index) => {
                  const info = nfts?.[index]
                  const name =
                    info &&
                    (info.contract.openSea?.collectionName ||
                      info.contract.name ||
                      info.rawMetadata?.name ||
                      info.title)
                  const imageUrl =
                    info &&
                    (info.media.at(0)?.thumbnail ||
                      info.media.at(0)?.gateway ||
                      info.media.at(0)?.raw ||
                      info.rawMetadata?.image)

                  return (
                    <HStack key={index} spacing={4}>
                      <ImageWithFallback
                        boxSize={'40px'}
                        fit="contain"
                        src={imageUrl}
                        alt="NFT image"
                      />
                      <Stack spacing={0}>
                        {name ? (
                          <Text noOfLines={1} fontWeight="medium">
                            {name}
                          </Text>
                        ) : (
                          <TextLink
                            text={params.contract}
                            name="Contract Address"
                            url={getAccountUrl(network, params.contract)}
                            urlLabel="View on explorer"
                          />
                        )}
                        <Text>Token ID: #{Number(params.tokenId)}</Text>
                      </Stack>
                    </HStack>
                  )
                })}
              </Stack>
            </HStack>

            <HStack justify="space-between">
              <Text color="gray.500">To</Text>
              <TextLink
                text={params.to}
                name="To Address"
                url={getAccountUrl(network, params.to)}
                urlLabel="View on explorer"
              />
            </HStack>
          </Stack>
        )
      }
    }
    case SafeTxType.SingleSend:
      return {
        title: 'Transaction'
      }
    case SafeTxType.MultiSend:
      return {
        title: 'MultiSend'
      }
    case SafeTxType.Rejection:
      return {
        title: 'Reject',
        description: (
          <Stack spacing={4}>
            <Text>
              To reject the transaction, a separate rejection transaction will
              be created to replace the original one.
            </Text>

            <Text>Transaction nonce: {params.nonce}</Text>
          </Stack>
        )
      }
  }
}
