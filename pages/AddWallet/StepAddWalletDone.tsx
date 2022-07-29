import { QuestionIcon } from '@chakra-ui/icons'
import { Button, Link, Stack, Text } from '@chakra-ui/react'
import { SiTwitter } from 'react-icons/si'

export const StepAddWalletDone = () => {
  return (
    <Stack p="4" pt="16" spacing="12">
      <Stack>
        <Text fontSize="4xl" fontWeight="bold" textAlign="center">
          You&#39;re all done!
        </Text>
        <Text fontSize="lg" color="gray.500" textAlign="center">
          Follow along with product updates or reach out if you have any
          questions.
        </Text>
      </Stack>

      <Stack>
        <Link
          href="https://twitter.com/archmage-live"
          isExternal
          _hover={{ textDecoration: undefined }}>
          <Button
            h="14"
            w="full"
            size="lg"
            variant="outline"
            borderRadius="8px"
            justifyContent="start"
            leftIcon={<SiTwitter />}>
            Follow us on Twitter
          </Button>
        </Link>
        <Link
          href="https://help.archmage.live"
          isExternal
          _hover={{ textDecoration: undefined }}>
          <Button
            h="14"
            w="full"
            size="lg"
            variant="outline"
            borderRadius="8px"
            justifyContent="start"
            leftIcon={<QuestionIcon />}>
            Visit the help center
          </Button>
        </Link>
      </Stack>

      <Button
        h="14"
        size="lg"
        colorScheme="purple"
        borderRadius="8px"
        onClick={() => window.close()}>
        Done
      </Button>
    </Stack>
  )
}
