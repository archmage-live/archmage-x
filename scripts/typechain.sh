#!/usr/bin/env bash

set -o errexit
set -o pipefail
set -o nounset
set -o xtrace

__dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
__file="${__dir}/$(basename "${BASH_SOURCE[0]}")"
__root="$(cd "$(dirname "${__dir}")" && pwd)"

OPENZEPPELIN_CONTRACTS=./node_modules/@openzeppelin/contracts/build/contracts

typechain --target ethers-v5 --out-dir lib/network/evm/abi $OPENZEPPELIN_CONTRACTS/{ERC20.json,ERC721.json,ERC1155.json}
