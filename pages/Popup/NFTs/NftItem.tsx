import {
  Box,
  HStack,
  Image,
  Skeleton,
  Stack,
  Text,
  useColorModeValue
} from '@chakra-ui/react'

import { INft } from '~lib/schema'
import { getNftBrief } from '~lib/services/nft'

export const NftItem = ({
  nft,
  onClick
}: {
  nft: INft
  onClick: () => void
}) => {
  const info = getNftBrief(nft)

  const bgColor = useColorModeValue('gray.500', 'gray.500')

  return (
    <Box
      position="relative"
      borderRadius="8px"
      cursor="pointer"
      bg={bgColor}
      onClick={onClick}>
      <Image
        boxSize="160px"
        fit="contain"
        src={info.imageUrl}
        alt="NFT image"
        fallback={<Skeleton size="160px" />}
      />

      <Box position="absolute" left="4px" right="4px" bottom="4px">
        <Stack>
          <Text fontWeight="medium">#{info.tokenId}</Text>
          <HStack>
            <Text flex={1} noOfLines={1}>
              {info.name}
            </Text>
            {info.balance > 1 && <Text color="gray.500">{info.balance}</Text>}
          </HStack>
        </Stack>
      </Box>
    </Box>
  )
}
