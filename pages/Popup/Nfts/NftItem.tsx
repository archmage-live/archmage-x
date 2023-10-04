import {
  Box,
  HStack,
  Image,
  Skeleton,
  Stack,
  Text,
  useColorModeValue
} from '@chakra-ui/react'

import { useTransparentize } from '~lib/hooks/useColor'
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

  const bgColor = useColorModeValue('gray.50', 'whiteAlpha.50')
  const titleBgColor = useTransparentize('gray.100', 'rgb (24, 24, 24)', 0.85)

  return (
    <Box
      position="relative"
      boxSize="160px"
      borderRadius="8px"
      cursor="pointer"
      bg={bgColor}
      onClick={onClick}>
      <Image
        boxSize="160px"
        borderRadius="8px"
        fit="contain"
        src={info.imageUrl}
        alt="NFT image"
        fallback={<Skeleton boxSize="160px" />}
      />

      <Box position="absolute" left="4px" right="4px" bottom="4px">
        <Stack
          spacing={0}
          w="full"
          px="10px"
          py="2px"
          borderRadius="6px"
          bg={titleBgColor}
          backdropFilter="auto"
          backdropBlur="15px">
          <Text fontWeight="medium">#{info.tokenId}</Text>
          <HStack w="full">
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
