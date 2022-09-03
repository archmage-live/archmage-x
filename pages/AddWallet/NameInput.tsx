import { Input } from '@chakra-ui/react'

interface NameInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export const NameInput = ({
  value,
  onChange,
  placeholder = 'Name (Optional)'
}: NameInputProps) => {
  return (
    <Input
      size="lg"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value.trim())}
    />
  )
}
