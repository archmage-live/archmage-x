import { ChevronLeftIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Divider,
  HStack,
  Icon,
  IconButton,
  Image,
  Skeleton,
  Stack,
  Text
} from '@chakra-ui/react'
import { HiCheckBadge } from '@react-icons/all-files/hi2/HiCheckBadge'
import { HiOutlineCheckBadge } from '@react-icons/all-files/hi2/HiOutlineCheckBadge'
import Markdown from 'react-markdown'

import { Card } from '~components/Card'
import { CopyArea } from '~components/CopyIcon'
import { INft } from '~lib/schema'
import { getNftBrief } from '~lib/services/nft'
import { EvmNftInfo } from '~lib/services/nft/evm'
import { shortenString } from '~lib/utils'
import { useSendNftId, useSendNftModal } from '~pages/Popup/Nfts/SendNft'

export const EvmNftDetail = ({
  nft,
  onClose
}: {
  nft: INft
  onClose: () => void
}) => {
  const brief = getNftBrief(nft)
  const info = nft.info as EvmNftInfo
  const openSea = info.contract.openSea

  const description =
    info.description || info.rawMetadata?.description || openSea?.description

  const { onOpen: onSendNftOpen } = useSendNftModal()
  const [, setSetNftId] = useSendNftId()

  return (
    <Stack
      w="full"
      h="full"
      overflowY="auto"
      spacing={6}
      px={4}
      pt={2}
      pb={6}
      align="center">
      <HStack w="full" justify="space-between">
        <IconButton
          icon={<ChevronLeftIcon fontSize="2xl" />}
          aria-label="Close"
          variant="ghost"
          borderRadius="full"
          size="sm"
          onClick={onClose}
        />

        <Text fontSize="xl" fontWeight="medium">
          {brief.name}
        </Text>

        <Box w={8} h={8} />
      </HStack>

      <Card boxSize="320px" p={0}>
        <Image
          boxSize="320px"
          fit="contain"
          src={brief.imageUrl}
          alt="NFT image"
          fallback={<Skeleton boxSize="320px" />}
        />
      </Card>

      <Box w="full">
        <Button
          w="full"
          size="lg"
          colorScheme="purple"
          onClick={() => {
            onSendNftOpen()
            setSetNftId(nft.id)
          }}>
          Send
        </Button>
      </Box>

      <Card w="full">
        <Stack spacing={4}>
          <Stack spacing={0}>
            <HStack>
              {openSea?.imageUrl && (
                <Image
                  boxSize="32px"
                  fit="contain"
                  src={openSea.imageUrl}
                  alt="NFT brand logo"
                />
              )}

              <Text>{brief.name}</Text>

              {openSea?.safelistRequestStatus === 'verified' ? (
                <Icon as={HiCheckBadge} fontSize="xl" />
              ) : (
                openSea?.safelistRequestStatus === 'approved' && (
                  <Icon as={HiOutlineCheckBadge} fontSize="xl" />
                )
              )}
            </HStack>

            <Text fontWeight="medium">
              {info.rawMetadata?.name || brief.name} #{brief.tokenId}
            </Text>
          </Stack>

          {description && (
            <Stack>
              <Text color="gray.500">Description</Text>
              <Markdown>{description}</Markdown>
            </Stack>
          )}
        </Stack>
      </Card>

      <Card w="full">
        <Stack>
          <Text>Info</Text>
          <Divider />

          <HStack justify="space-between">
            <Text color="gray.500">Contract</Text>
            <CopyArea
              name="Contract Address"
              copy={info.contract.address}
              area={shortenString(info.contract.address)}
              props={{
                bg: undefined,
                color: undefined,
                _hover: undefined,
                borderRadius: 0,
                p: 0
              }}
            />
          </HStack>

          {info.contract.contractDeployer && (
            <HStack justify="space-between">
              <Text color="gray.500">Deployer</Text>
              <CopyArea
                name="Deployer Address"
                copy={info.contract.contractDeployer}
                area={shortenString(info.contract.contractDeployer)}
                props={{
                  bg: undefined,
                  color: undefined,
                  _hover: undefined,
                  borderRadius: 0,
                  p: 0
                }}
              />
            </HStack>
          )}

          <HStack justify="space-between">
            <Text color="gray.500">Standard</Text>
            <Text>{info.tokenType}</Text>
          </HStack>

          <HStack justify="space-between">
            <Text color="gray.500">ID</Text>
            <Text>{brief.tokenId}</Text>
          </HStack>
        </Stack>
      </Card>

      {info.rawMetadata?.attributes?.length && (
        <Card w="full">
          <Stack>
            <Text>Properties</Text>
            <Divider />

            {info.rawMetadata.attributes
              .filter((attr) => {
                return (
                  typeof attr.trait_type === 'string' &&
                  attr.value !== undefined
                )
              })
              .map((attr) => {
                return (
                  <HStack key={attr.trait_type} justify="space-between">
                    <Text color="gray.500">
                      {attr.trait_type.toUpperCase()}
                    </Text>
                    <Text noOfLines={1}>{attr.value}</Text>
                  </HStack>
                )
              })}
          </Stack>
        </Card>
      )}
    </Stack>
  )
}
