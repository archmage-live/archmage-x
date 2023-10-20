import { Box, Stack, Text, useColorModeValue } from '@chakra-ui/react'
import { TransactionDescription } from '@ethersproject/abi'
import {
  FormatTypes,
  FunctionFragment,
  ParamType
} from '@ethersproject/abi/src.ts/fragments'
import { BigNumber } from '@ethersproject/bignumber'
import { shallowCopy } from '@ethersproject/properties'
import { TransactionRequest } from '@ethersproject/providers'
import { ethers } from 'ethers'
import * as React from 'react'
import { useMemo } from 'react'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import solidity from 'react-syntax-highlighter/dist/esm/languages/prism/solidity'
import prismDarkStyle from 'react-syntax-highlighter/dist/esm/styles/prism/dracula'
import prismLightStyle from 'react-syntax-highlighter/dist/esm/styles/prism/one-light'

import { CopyArea } from '~components/CopyIcon'
import { JsonDisplay } from '~components/JsonDisplay'

SyntaxHighlighter.registerLanguage('solidity', solidity)

export const EvmTransactionData = ({
  tx,
  description,
  showHex
}: {
  tx?: TransactionRequest
  description?: TransactionDescription
  showHex?: boolean
}) => {
  const hex = tx?.data?.length ? ethers.utils.hexlify(tx.data) : undefined

  const [signature, args] = useMemo(() => {
    if (!description) {
      return []
    }

    const formatArg = (arg: any): any => {
      if (Array.isArray(arg)) {
        return arg.map(formatArg)
      }
      if (BigNumber.isBigNumber(arg)) {
        try {
          return arg.toNumber()
        } catch {
          return arg.toString()
        }
      }
      return arg
    }

    const fragment = copyFunctionFragment(description.functionFragment)
    const signature = fragment.format(FormatTypes.full)

    const args = description.functionFragment.inputs.map((input, i) => {
      return {
        [input.format(FormatTypes.full)]: formatArg(description.args[i])
      }
    })

    return [signature, args]
  }, [description])

  const prismStyle = useColorModeValue(prismLightStyle, prismDarkStyle)

  const rjvBg = useColorModeValue('gray.50', 'rgb(12, 13, 14)')

  return (
    <Stack spacing={6}>
      {signature && (
        <Stack>
          <Text>Function:</Text>
          <Box
            borderRadius="8px"
            borderWidth="1px"
            borderColor="gray.500"
            px={4}
            py={2}
            bg={rjvBg}>
            <SyntaxHighlighter
              language="solidity"
              style={prismStyle}
              wrapLongLines
              customStyle={{
                padding: 0,
                background: 'inherit',
                border: 'none',
                borderRadius: 'unset',
                boxShadow: 'none'
              }}>
              {signature}
            </SyntaxHighlighter>
          </Box>
        </Stack>
      )}

      {!showHex && args && (
        <Stack>
          <Text>Arguments:</Text>
          <JsonDisplay data={args} />
        </Stack>
      )}

      {showHex && hex && (
        <Stack>
          <Text>HEX Data:</Text>
          <CopyArea name="Data" copy={hex} props={{ noOfLines: 100 }} />
        </Stack>
      )}

      {!args && !hex && (
        <Text textAlign="center" color="gray.500">
          No data
        </Text>
      )}
    </Stack>
  )
}

function copyFunctionFragment(functionFragment: FunctionFragment) {
  const fragment = shallowCopy(functionFragment)
  delete (fragment as any)._isFragment
  ;(fragment as any).inputs = ((fragment as any).inputs as ParamType[]).map(
    (input) => copyParamType(input)
  )
  ;(fragment as any).outputs = ((fragment as any).outputs as ParamType[]).map(
    (output) => copyParamType(output)
  )
  return FunctionFragment.from(fragment)
}

function copyParamType(paramType: ParamType) {
  const pt = shallowCopy(paramType) as any
  delete pt._isParamType
  if (pt.components) {
    pt.components = (pt.components as ParamType[]).map((comp) =>
      copyParamType(comp)
    )
  }
  if (pt.arrayChildren) {
    pt.arrayChildren = copyParamType(pt.arrayChildren)
  }
  return pt
}
