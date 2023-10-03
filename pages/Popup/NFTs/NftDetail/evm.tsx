import {
  Box,
  Divider,
  HStack,
  Icon,
  Image,
  Skeleton,
  Stack,
  Text,
  useColorModeValue
} from '@chakra-ui/react'
import { HiCheckBadge } from '@react-icons/all-files/hi2/HiCheckBadge'
import { HiOutlineCheckBadge } from '@react-icons/all-files/hi2/HiOutlineCheckBadge'
import Markdown from 'react-markdown'

import { Card } from '~components/Card'
import { INetwork, INft } from '~lib/schema'
import { getNftBrief } from '~lib/services/nft'
import { EvmNftInfo } from '~lib/services/nft/evm'

export const EvmNftDetail = ({
  network,
  nft
}: {
  network: INetwork
  nft: INft
}) => {
  const brief = getNftBrief(nft)
  const info = nft.info as EvmNftInfo
  const openSea = info.contract.openSea

  const description =
    info.description || info.rawMetadata?.description || openSea?.description

  const bgColor = useColorModeValue('gray.500', 'gray.500')

  return (
    <Stack w="full" spacing={8} pt={8}>
      <Box position="relative" borderRadius="8px" bg={bgColor}>
        <Image
          boxSize="320px"
          fit="contain"
          src={brief.imageUrl}
          alt="NFT image"
          fallback={<Skeleton size="320px" />}
        />
      </Box>

      <Card>
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
            <Icon as={HiCheckBadge} />
          ) : (
            openSea?.safelistRequestStatus === 'approved' && (
              <Icon as={HiOutlineCheckBadge} />
            )
          )}
        </HStack>

        <HStack fontWeight="medium">
          <Text>{info.rawMetadata?.name || brief.name}</Text>
          <Text>#{brief.tokenId}</Text>
        </HStack>

        {description && (
          <Stack>
            <Text color="gray.500">Description</Text>
            <Markdown>{description}</Markdown>
          </Stack>
        )}
      </Card>

      <Card>
        <Stack>
          <Text>Info</Text>
          <Divider />

          {info.contract.contractDeployer && (
            <HStack>
              <Text>Contract</Text>
              <Text>{info.contract.contractDeployer}</Text>
            </HStack>
          )}

          <HStack>
            <Text>Standard</Text>
            <Text>{info.tokenType}</Text>
          </HStack>

          <HStack>
            <Text>ID</Text>
            <Text>{brief.tokenId}</Text>
          </HStack>
        </Stack>
      </Card>

      {info.rawMetadata?.attributes?.length && (
        <Card>
          <Stack>
            <Text>Properties</Text>
            <Divider />

            {info.rawMetadata.attributes.map((attr) => {
              return (
                <HStack key={attr.trait_type}>
                  <Text>{attr.trait_type}</Text>
                  <Text>{attr.value}</Text>
                </HStack>
              )
            })}
          </Stack>
        </Card>
      )}
    </Stack>
  )
}
