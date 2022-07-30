import { Input } from '@chakra-ui/react'

interface NameInputProps {
  value: string

  onChange(value: string): void
}

export const NameInput = ({ value, onChange }: NameInputProps) => {
  return (
    <Input
      size="lg"
      placeholder="Name (Optional)"
      value={value}
      onChange={(e) => onChange(e.target.value.trim())}
    />
  )
}
