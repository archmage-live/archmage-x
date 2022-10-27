import { Input } from '@chakra-ui/react'

interface NameInputProps {
  value: string
  onChange: (value: string) => void
  isDisabled?: boolean
  placeholder?: string
}

export const NameInput = ({
  value,
  onChange,
  isDisabled,
  placeholder = 'Name (Optional)'
}: NameInputProps) => {
  return (
    <Input
      size="lg"
      isDisabled={isDisabled}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value.trim())}
    />
  )
}
