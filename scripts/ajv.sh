#!/usr/bin/env bash

set -o errexit
set -o pipefail
set -o nounset
set -o xtrace

ajv compile --all-errors --verbose -c ajv-formats -s ./node_modules/@uniswap/token-lists/dist/tokenlist.schema.json -o ./lib/services/datasource/tokenlists/validate.js
