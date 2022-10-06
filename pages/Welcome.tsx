import { Button, HStack, Link, Stack, Text } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'

import { CenterLayout } from '~components/CenterLayout'

export default function Welcome() {
  return (
    <CenterLayout>
      <Stack w="32rem">
        <HStack justify="center">
          <Text fontSize="4xl" fontWeight="bold">
            Welcome to Archmage
          </Text>
        </HStack>

        <Stack spacing="0" align="center">
          <Text fontSize="lg" fontWeight="bold">
            Connecting you to the Decentralized Web3 world.
          </Text>
          <Text fontSize="lg" fontWeight="bold">
            We&apos;re happy to see you.
          </Text>
        </Stack>

        <Stack pt="8" align="center">
          <Link
            as={RouterLink}
            to="../add-wallet"
            _hover={{ textDecoration: undefined }}>
            <Button
              w="12rem"
              h="14"
              size="lg"
              colorScheme="purple"
              borderRadius="8px">
              Get Started
            </Button>
          </Link>
        </Stack>
      </Stack>
    </CenterLayout>
  )
}
