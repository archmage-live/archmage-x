import { fetchJson } from "~lib/fetch";
import { Long } from "cosmjs-types/helpers";
import { Any } from "cosmjs-types/google/protobuf/any";
import { Event } from "cosmjs-types/tendermint/abci/types";
import { ABCIMessageLog } from "cosmjs-types/cosmos/base/abci/v1beta1/abci";
import { Tx } from "cosmjs-types/cosmos/tx/v1beta1/tx";

interface TxsResponse {
  data: {
    height: string
    txhash: string;
    codespace: string;
    code: number;
    data: string;
    raw_log: string;
    logs: ABCIMessageLog[];
    info: string;
    gas_wanted: string
    gas_used: string
    tx?: Tx;
    timestamp: string;
    events: Event[];
  }
  header: {
    block_id: number
    chain_id: string
    id: number
    timestamp: string
  }
}

class MintscanApi {
  async getTxs(account: string, limit = 50, from = 0) {
    const url = `https://api.mintscan.io/v1/cosmos/account/${account}/txs?limit=${limit}&from=${from}`
    const data = await fetchJson(url)
  }
}

export const MINTSCAN_API = new MintscanApi()
