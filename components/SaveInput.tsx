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
import { useCallback, useEffect, useState } from 'react'
import { useDebounce } from 'react-use'

interface SaveInputProps {
  isNumber?: boolean
  hideSaveIfNoChange?: boolean
  stretchInput?: boolean
  saveTitle?: string
  props?: InputProps | NumberInputProps

  value: string

  validate(value: string): boolean | string

  asyncValidate?(value: string): Promise<boolean>

  onChange(value: string): void

  onInvalid?(value: boolean): void
}

export const SaveInput = ({
  isNumber,
  hideSaveIfNoChange,
  stretchInput,
  saveTitle,
  props = {},
  value,
  validate,
  asyncValidate,
  onChange,
  onInvalid
}: SaveInputProps) => {
  const [input, setInput] = useState(value)
  useEffect(() => {
    setInput(value)
  }, [value])

  useEffect(() => {
    onInvalid?.(false)
  }, [input, onInvalid])

  const [saveVisibility, setSaveVisibility] = useState<any>('hidden')
  const [saveColorScheme, setSaveColorScheme] = useState('gray')
  useDebounce(
    () => {
      setSaveVisibility(
        hideSaveIfNoChange && input === value ? 'hidden' : 'visible'
      )
      setSaveColorScheme(input === value ? 'gray' : 'purple')
    },
    200,
    [hideSaveIfNoChange, value, input]
  )

  const onValidate = useCallback(
    (val: string) => {
      let v = validate(val)
      switch (v) {
        case false:
          v = value
          break
        case true:
          v = val
          break
        default:
          break
      }
      setInput(v)
      return v
    },
    [validate, value]
  )

  const [isLoading, setIsLoading] = useState(false)

  const onSave = useCallback(async () => {
    const save = onValidate(input)
    if (save !== value) {
      let willChange = true
      if (asyncValidate) {
        setIsLoading(true)
        willChange = await asyncValidate(save)
        setIsLoading(false)
      }
      if (willChange) {
        onChange(save)
      } else {
        onInvalid?.(true)
      }
    }
  }, [asyncValidate, input, onChange, onInvalid, onValidate, value])

  return (
    <HStack spacing={8}>
      {!isNumber ? (
        <Input
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
          }}
          onBlur={(e) => {
            onValidate(e.target.value)
          }}
          flex={stretchInput ? 1 : undefined}
          {...(props as InputProps)}
        />
      ) : (
        <NumberInput
          value={input}
          onChange={setInput}
          onBlur={(e) => {
            onValidate(e.target.value)
          }}
          flex={stretchInput ? 1 : undefined}
          {...(props as NumberInputProps)}>
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      )}

      <Button
        visibility={saveVisibility}
        colorScheme={saveColorScheme}
        transition="all 0.2s"
        isLoading={isLoading}
        onClick={onSave}>
        {saveTitle || 'Save'}
      </Button>
    </HStack>
  )
}
