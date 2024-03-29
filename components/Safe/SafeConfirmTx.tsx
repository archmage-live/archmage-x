import { Nft } from '@archmagelive/alchemy-sdk'
import { ChevronLeftIcon, EditIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  AccordionProps,
  Box,
  Button,
  Center,
  Divider,
  HStack,
  Icon,
  IconButton,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Stack,
  Step,
  StepDescription,
  StepIcon,
  StepIndicator,
  StepNumber,
  StepStatus,
  StepTitle,
  Stepper,
  Text,
  Tooltip,
  chakra
} from '@chakra-ui/react'
import {
  FormatTypes,
  Interface,
  ParamType,
  TransactionDescription
} from '@ethersproject/abi'
import { hexlify } from '@ethersproject/bytes'
import { Contract } from '@ethersproject/contracts'
import { BiQuestionMark } from '@react-icons/all-files/bi/BiQuestionMark'
import { MdOutlineCode } from '@react-icons/all-files/md/MdOutlineCode'
import {
  MetaTransactionData,
  OperationType,
  SafeTransaction
} from '@safe-global/safe-core-sdk-types'
import assert from 'assert'
import Decimal from 'decimal.js'
import { atom, useAtom } from 'jotai'
import { ReactNode, useState } from 'react'
import * as React from 'react'
import { useAsyncRetry, useInterval } from 'react-use'
import browser from 'webextension-polyfill'

import { ImageWithFallback } from '~components/ImageWithFallback'
import { JsonDisplay } from '~components/JsonDisplay'
import { useModalBox } from '~components/ModalBox'
import { TextLink } from '~components/TextLink'
import { ERC721__factory, ERC1155__factory } from '~lib/network/evm/abi'
import { SafeTxParams, SafeTxType } from '~lib/safe'
import { IChainAccount, INetwork } from '~lib/schema'
import { ALCHEMY_API } from '~lib/services/datasource/alchemy'
import { CHAINLIST_API } from '~lib/services/datasource/chainlist'
import { CRYPTO_COMPARE_SERVICE } from '~lib/services/datasource/cryptocompare'
import { ETHERSCAN_API } from '~lib/services/datasource/etherscan'
import { getAccountUrl, getNetworkInfo } from '~lib/services/network'
import { TOKEN_SERVICE, getTokenBrief } from '~lib/services/token'
import { SafeInfo } from '~lib/wallet'

const isOpenAtom = atom<boolean>(false)
const paramsAtom = atom<
  | {
      network: INetwork
      account: IChainAccount
      info: SafeInfo
      tx: SafeTransaction
      params: SafeTxParams
    }
  | undefined
>(undefined)

export function useSafeConfirmTxModal() {
  const modal = useModalBox(isOpenAtom)
  const [confirmTxParams, setConfirmTxParams] = useAtom(paramsAtom)

  const {
    value: descriptors,
    loading,
    error,
    retry
  } = useAsyncRetry(async () => {
    if (!modal.isOpen || !confirmTxParams) {
      return
    }
    const { network, account, info, tx, params } = confirmTxParams
    return buildSafeTxDescriptors(network, account, info, tx, params)
  }, [modal.isOpen, confirmTxParams])

  useInterval(retry, !loading && error ? 30000 : null)

  return {
    ...modal,
    confirmTxParams,
    setConfirmTxParams,
    descriptors
  }
}

export const SafeConfirmTx = ({
  isOpen,
  onClose
}: {
  isOpen?: boolean
  onClose?: () => void
}) => {
  const { confirmTxParams, descriptors } = useSafeConfirmTxModal()

  if (!confirmTxParams || !descriptors) {
    return <></>
  }

  return (
    <Stack h="full" overflowY="auto" px={6} pt={2} pb={4} spacing={6}>
      <HStack justify="space-between" minH={16}>
        <IconButton
          icon={<ChevronLeftIcon fontSize="2xl" />}
          aria-label="Close"
          variant="ghost"
          borderRadius="full"
          size="sm"
          onClick={onClose}
        />

        <Text fontSize="3xl" fontWeight="medium">
          {descriptors.title}
        </Text>

        <Box w={10}></Box>
      </HStack>

      <SafeConfirmTxContent
        isOpen={isOpen}
        onClose={onClose}
        {...confirmTxParams}
        descriptors={descriptors}
      />
    </Stack>
  )
}

export const SafeConfirmTxModal = ({
  isOpen,
  onClose
}: {
  isOpen: boolean
  onClose: () => void
}) => {
  const { confirmTxParams, descriptors } = useSafeConfirmTxModal()

  if (!confirmTxParams || !descriptors) {
    return <></>
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      motionPreset="slideInBottom"
      scrollBehavior="inside"
      size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{descriptors.title}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <SafeConfirmTxContent
            isOpen={isOpen}
            onClose={onClose}
            {...confirmTxParams}
            descriptors={descriptors}
          />
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

const SafeConfirmTxContent = ({
  isOpen,
  onClose,
  network,
  account,
  info,
  tx,
  params,
  descriptors
}: {
  isOpen?: boolean
  onClose?: () => void
  network: INetwork
  account: IChainAccount
  info: SafeInfo
  tx: SafeTransaction
  params: SafeTxParams
  descriptors?: SafeTxDescriptors
}) => {
  const data = tx.data

  const [nonce, setNonce] = useState(data.nonce)
  const [editNonce, setEditNonce] = useState(false)

  const [expandedIndex, setExpandedIndex] = useState<number[]>([])

  if (!descriptors) {
    return <></>
  }

  return (
    <Stack spacing={8}>
      <Divider />

      <Stack spacing={8}>
        {descriptors.description}

        {descriptors.actions?.length && (
          <Stack>
            <HStack justify="space-between">
              <Text>All actions</Text>
              <HStack spacing={2}>
                <Button
                  colorScheme="gray"
                  variant="ghost"
                  onClick={() =>
                    setExpandedIndex([...descriptors.actions!.keys()])
                  }>
                  Expand all
                </Button>
                <Divider orientation="vertical" />
                <Button
                  colorScheme="gray"
                  variant="ghost"
                  onClick={() => setExpandedIndex([])}>
                  Collapse all
                </Button>
              </HStack>
            </HStack>

            <SafeActionsDisplay
              network={network}
              actions={descriptors.actions.map(({ action }) => action)}
              abis={descriptors.actions.map(({ abi }) => abi)}
              props={{
                index: expandedIndex,
                onChange: (index) =>
                  setExpandedIndex(Array.isArray(index) ? index : [index])
              }}
            />
          </Stack>
        )}

        <Accordion allowMultiple>
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

        <HStack justify="space-between">
          <Text>Nonce</Text>

          {!editNonce ? (
            <HStack>
              <Text>{nonce}</Text>
              <Button
                variant="link"
                size="sm"
                minW={0}
                onClick={() => setEditNonce(true)}>
                <EditIcon />
              </Button>
            </HStack>
          ) : (
            <NumberInput
              min={0}
              step={1}
              keepWithinRange
              allowMouseWheel
              precision={0}
              value={nonce}
              onChange={(_, val) => setNonce(val)}>
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          )}
        </HStack>
      </Stack>

      <HStack justify="space-between" spacing={4} mb={4}>
        <Button variant="outline" size="lg" onClick={onClose}>
          Cancel
        </Button>

        <HStack spacing={2}>
          <Button variant="outline" size="lg">
            ➕ Add to batch
          </Button>

          <Text color="gray.500">or</Text>

          <Button colorScheme="purple" size="lg">
            Continue
          </Button>
        </HStack>
      </HStack>
    </Stack>
  )
}

const SafeActionsDisplay = ({
  network,
  actions,
  abis,
  props
}: {
  network: INetwork
  actions: MetaTransactionData[]
  abis?: (Interface | undefined)[]
  props?: AccordionProps
}) => {
  const {
    value: _abis,
    loading,
    error,
    retry
  } = useAsyncRetry(async () => {
    const etherscanApi = ETHERSCAN_API.getProvider(network)
    return await Promise.all(
      actions.map((action, index) => {
        return abis?.at(index) || etherscanApi?.getAbi(action.to).catch()
      })
    )
  }, [network, actions, abis])

  useInterval(retry, !loading && error ? 30000 : null)

  return (
    <Accordion allowMultiple {...props}>
      {_abis?.map((abi, index) => {
        const action = actions[index]
        const txDesc = abi?.parseTransaction({ data: action.data })

        return (
          <AccordionItem key={index}>
            <h4>
              <AccordionButton>
                <HStack flex="1" spacing={4}>
                  <HStack>
                    <Icon as={MdOutlineCode} color="gray.500" />
                    <Text>{index + 1}</Text>
                  </HStack>
                  <Text noOfLines={1}>{txDesc?.name}</Text>
                </HStack>
                <AccordionIcon />
              </AccordionButton>
            </h4>
            <AccordionPanel pb={4}>
              <Stack spacing={4}>
                <Stack spacing={2}>
                  <Text>Interact with:</Text>
                  <TextLink
                    text={action.to}
                    name="Contract Address"
                    url={getAccountUrl(network, action.to)}
                    urlLabel="View on explorer"
                  />
                </Stack>

                {txDesc ? (
                  <TxDescDisplay network={network} txDesc={txDesc} />
                ) : (
                  <HStack key={index} justify="space-between">
                    <Text color="gray.500">Data (hex):</Text>
                    <TextLink text={hexlify(action.data)} name="Data" />
                  </HStack>
                )}
              </Stack>
            </AccordionPanel>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}

const TxDescDisplay = ({
  network,
  txDesc
}: {
  network: INetwork
  txDesc: TransactionDescription
}) => {
  return (
    <Stack spacing={2}>
      <Text color="gray.500" noOfLines={1}>
        {txDesc.name}
      </Text>

      <Stack spacing={0}>
        {txDesc.functionFragment.inputs.map((input, index) => {
          const argValue = txDesc.args[input.name]
          return (
            <HStack key={index} justify="space-between">
              <Text color="gray.500" noOfLines={1}>
                {input.name + '<' > +input.format(FormatTypes.sighash) + '>'}:
              </Text>

              <Box maxW="60%">
                <ArgumentDisplay
                  network={network}
                  input={input}
                  argValue={argValue}
                />
              </Box>
            </HStack>
          )
        })}
      </Stack>
    </Stack>
  )
}

const ArgumentDisplay = ({
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
    <JsonDisplay data={argValue} maxH="160px" />
  ) : argValue?.toString ? (
    <TextLink text={argValue.toString()} name={input.name} />
  ) : (
    <Text></Text>
  )
}

type SafeTxDescriptors = {
  title: string
  description?: ReactNode
  detail?: ReactNode
  actions?: {
    action: MetaTransactionData
    abi?: Interface
  }[]
}

async function buildSafeTxDescriptors(
  network: INetwork,
  account: IChainAccount,
  info: SafeInfo,
  tx: SafeTransaction,
  params: SafeTxParams
): Promise<SafeTxDescriptors> {
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

      const abis = params.params.map(({ contract, amount }) => {
        if (amount === undefined) {
          return ERC721__factory.createInterface()
        }
        {
          return ERC1155__factory.createInterface()
        }
      })

      const multiSend = new Contract(tx.data.to, [
        'function multiSend(bytes memory transactions)'
      ])
      const multiSendData = multiSend.interface.decodeFunctionData(
        'multiSend',
        tx.data.data
      )

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
        ),
        detail: (
          <Stack spacing={1}>
            <Text color="gray.500">MULTI SEND</Text>
            <Stack spacing={0}>
              <HStack justify="space-between">
                <Text color="gray.500">transactions:</Text>
                <TextLink
                  text={hexlify(multiSendData.transactions)}
                  name="transactions"
                />
              </HStack>
            </Stack>
          </Stack>
        ),
        actions: params.params.map(({ tx }, index) => ({
          action: tx,
          abi: abis.at(index)
        }))
      }
    }
    case SafeTxType.SingleSend:
      return {
        title: 'Transaction'
      }
    case SafeTxType.MultiSend: {
      const multiSend = new Contract(tx.data.to, [
        'function multiSend(bytes memory transactions)'
      ])
      const multiSendData = multiSend.interface.decodeFunctionData(
        'multiSend',
        tx.data.data
      )

      return {
        title: 'MultiSend',
        description: (
          <HStack spacing={4}>
            <Text color="gray.500">Interact with:</Text>
            <TextLink
              text={tx.data.to}
              name="Contract Address"
              url={getAccountUrl(network, tx.data.to)}
              urlLabel="View on explorer"
            />
          </HStack>
        ),
        detail: (
          <Stack spacing={1}>
            <Text color="gray.500">MULTI SEND</Text>
            <Stack spacing={0}>
              <HStack justify="space-between">
                <Text color="gray.500">transactions:</Text>
                <TextLink
                  text={hexlify(multiSendData.transactions)}
                  name="transactions"
                />
              </HStack>
            </Stack>
          </Stack>
        ),
        actions: params.params.map((action) => ({
          action
        }))
      }
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

            <Text>
              Transaction nonce:&nbsp;
              <chakra.span fontWeight="medium">{params.nonce}</chakra.span>
            </Text>
          </Stack>
        )
      }
  }
}

const SafeTxStatus = ({ network }: { network: INetwork }) => {
  const steps = [
    { title: 'Transaction created', description: undefined },
    {
      title: (
        <>
          Confirmations <chakra.span color="gray.500">(2 of 2)</chakra.span>
        </>
      ),
      description: <Stack></Stack>
    },
    {
      title: 'Executed',
      description: (
        <TextLink
          text={''}
          name="Signer"
          url={getAccountUrl(network, '')}
          urlLabel="View on explorer"
        />
      )
    }
  ]

  return (
    <Stepper index={1} orientation="vertical" gap={2}>
      {steps.map((step, index) => (
        <Step key={index}>
          <StepIndicator>
            <StepStatus
              complete={<StepIcon />}
              incomplete={<StepNumber />}
              active={<StepNumber />}
            />
          </StepIndicator>

          <Box flexShrink="0">
            <StepTitle>{step.title}</StepTitle>
            <StepDescription>{step.description}</StepDescription>
          </Box>
        </Step>
      ))}
    </Stepper>
  )
}
