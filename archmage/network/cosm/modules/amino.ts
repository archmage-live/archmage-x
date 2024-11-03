import {
  AminoConverters,
  AminoTypes,
  createAuthzAminoConverters,
  createBankAminoConverters,
  createDistributionAminoConverters,
  createGovAminoConverters,
  createIbcAminoConverters,
  createStakingAminoConverters
} from '@cosmjs/stargate'
import { createVestingAminoConverters } from '@cosmjs/stargate/build/modules'

export function createDefaultAminoTypes(prefix: string): AminoTypes {
  const converters: AminoConverters = {
    ...createAuthzAminoConverters(),
    ...createBankAminoConverters(),
    ...createDistributionAminoConverters(),
    ...createGovAminoConverters(),
    ...createStakingAminoConverters(prefix),
    ...createIbcAminoConverters(),
    ...createVestingAminoConverters()
  }
  return new AminoTypes(converters)
}
