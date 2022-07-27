import { ChevronLeftIcon } from '@chakra-ui/icons'
import { Button } from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'

export const BackButton = () => {
  const navigate = useNavigate()

  return (
    <Button
      variant="link"
      w="4rem"
      justifyContent="start"
      leftIcon={<ChevronLeftIcon />}
      _hover={{ textDecoration: undefined }}
      colorScheme="purple"
      onClick={() => navigate(-1)}>
      Back
    </Button>
  )
}
