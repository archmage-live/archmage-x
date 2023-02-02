import { ChainId, INetwork } from "~lib/schema";
import { StargateClient as CosmClient } from "@cosmjs/stargate";
import { CosmAppChainInfo } from "~lib/network/cosm";

export { StargateClient as CosmClient } from "@cosmjs/stargate";

const COSM_CLIENTS = new Map<ChainId, CosmClient>;

export async function getCosmClient(network: INetwork) {
  let client = COSM_CLIENTS.get(network.id);
  if (!client) {
    const info = network.info as CosmAppChainInfo;
    client = await CosmClient.connect(info.rest);
    COSM_CLIENTS.set(network.id, client);
  }
  return client;
}
