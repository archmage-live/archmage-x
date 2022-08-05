import {
  Button,
  HStack,
  Input,
  InputProps,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputProps,
  NumberInputStepper
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'

interface SaveInputProps<Value = string | number> {
  isNumber?: boolean
  props?: InputProps | NumberInputProps

  value: Value

  validate(value: Value): boolean | Value

  onChange(value: Value): void
}

export const SaveInput = ({
  isNumber,
  props = {},
  value,
  onChange,
  validate
}: SaveInputProps) => {
  const [input, setInput] = useState<typeof value>('')
  useEffect(() => {
    setInput(value)
  }, [value])

  const onInput = (value: string) => {
    const v = validate(value)
    if (v === false) {
      return
    }
    setInput(v !== true ? v : value)
  }

  const onSave = () => {
    if (input !== value) {
      onChange(input)
    }
  }

  return (
    <HStack spacing={8}>
      {!isNumber ? (
        <Input
          value={input}
          onChange={(e) => {
            onInput(e.target.value)
          }}
          {...(props as InputProps)}
        />
      ) : (
        <NumberInput
          value={input}
          onChange={onInput}
          {...(props as NumberInputProps)}>
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      )}

      <Button
        colorScheme={input === value ? 'gray' : 'purple'}
        onClick={onSave}>
        Save
      </Button>
    </HStack>
  )
}
