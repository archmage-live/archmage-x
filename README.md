# 🚀 Archmage X

<p align="center"><a href="https://archmage.live" target="_blank" rel="noopener noreferrer"><img width="200" src="https://github.com/archmage-live/archmage-x/raw/main/assets/archmage.svg" alt="Archmage logo"></a></p>

Archmage X is an open source decentralized programmable Web3 wallet, built as a browser extension.

* **Concise and professional:** Web3 and blockchain are complex, and we encapsulate the complexity to create the best user experience. But we don't shy away from complexity, and provide advanced functionality as well.
* **Heterogeneous multi-chain:** Now it is Ethereum, and the future is heterogeneous multi-chain. Archmage not only strives to build the best Ethereum DApp experience, but also will create a consistent interface for emerging blockchain platforms such as Cosmos.
* **Massive local wallets/accounts management:** Currently there's no App that can effectively and conveniently manage a large number of wallets, but we know that this is just needed in a decentralized world. Archmage's local storage framework based on [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) will provide anyone with massive wallets/accounts management capabilities.
* **Extensible and customizable:** Want even more features? Archmage will soon implement the **extensions-on-extension framework**. And anyone can install extensions to perform batch operation, view information of all wallets/accounts across all networks, and customize colors and themes. Extensions run in separate execution environment, ensuring they won't slow down Archmage or create any security risks.

## Install

You can download the latest Archmage X [here](https://github.com/archmage-live/archmage-x/releases/latest).

## Development

Run the development server:

```bash
pnpm dev
```

Open your browser and load the appropriate development build. For example, if you are developing for the chrome browser,
using manifest v3, use: `build/chrome-mv3-dev`.

## Build

Run the following:

```bash
pnpm build
```

This should create a production bundle, ready to be zipped and published to the stores.

## License

Archmage X is [Apache licensed](./LICENSE).
