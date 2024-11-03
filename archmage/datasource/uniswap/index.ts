import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | undefined;
export type InputMaybe<T> = T | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /**
   * The `AWSJSON` scalar type provided by AWS AppSync, represents a JSON string that
   * complies with [RFC 8259](https://tools.ietf.org/html/rfc8259).  Maps like
   * "**{\\"upvotes\\": 10}**", lists like "**[1,2,3]**", and scalar values like
   * "**\\"AWSJSON example string\\"**", "**1**", and "**true**" are accepted as
   * valid JSON and will automatically be parsed and loaded in the resolver mapping
   * templates as Maps, Lists, or Scalar values rather than as the literal input
   * strings.  Invalid JSON strings like "**{a: 1}**", "**{'a': 1}**" and "**Unquoted
   * string**" will throw GraphQL validation errors.
   */
  AWSJSON: { input: any; output: any; }
};

/**
 *  Types, unions, and inputs (alphabetized):
 * These are colocated to highlight the relationship between some types and their inputs.
 */
export type ActivityDetails = OnRampTransactionDetails | SwapOrderDetails | TransactionDetails;

export type ActivityDetailsInput = {
  onRampTransactionDetails?: InputMaybe<OnRampTransactionDetailsInput>;
  swapOrderDetails?: InputMaybe<SwapOrderDetailsInput>;
  transactionDetails?: InputMaybe<TransactionDetailsInput>;
};

/**
 *  Enums (alphabetized):
 * deprecated and replaced with TransactionType, please do not use this
 */
export enum ActivityType {
  Approve = 'APPROVE',
  Borrow = 'BORROW',
  Burn = 'BURN',
  Cancel = 'CANCEL',
  Claim = 'CLAIM',
  Deployment = 'DEPLOYMENT',
  Lend = 'LEND',
  Mint = 'MINT',
  Nft = 'NFT',
  OnRamp = 'ON_RAMP',
  Receive = 'RECEIVE',
  Repay = 'REPAY',
  Send = 'SEND',
  Stake = 'STAKE',
  Swap = 'SWAP',
  SwapOrder = 'SWAP_ORDER',
  Staking = 'Staking',
  Unknown = 'UNKNOWN',
  Unstake = 'UNSTAKE',
  Withdraw = 'WITHDRAW',
  Market = 'market',
  Money = 'money'
}

export type Amount = IAmount & {
  __typename?: 'Amount';
  currency?: Maybe<Currency>;
  id: Scalars['ID']['output'];
  value: Scalars['Float']['output'];
};

export type AmountChange = {
  __typename?: 'AmountChange';
  absolute?: Maybe<Amount>;
  id: Scalars['ID']['output'];
  percentage?: Maybe<Amount>;
};

export type AmountInput = {
  currency?: InputMaybe<Currency>;
  value: Scalars['Float']['input'];
};

export type ApplicationContract = IContract & {
  __typename?: 'ApplicationContract';
  address: Scalars['String']['output'];
  chain: Chain;
  icon?: Maybe<Image>;
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
};

export type ApplicationContractInput = {
  address: Scalars['String']['input'];
  chain: Chain;
  icon?: InputMaybe<ImageInput>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type AssetActivity = {
  __typename?: 'AssetActivity';
  addresses?: Maybe<Array<Scalars['String']['output']>>;
  /** @deprecated use assetChanges field in details */
  assetChanges: Array<Maybe<AssetChange>>;
  chain: Chain;
  details: ActivityDetails;
  /** @deprecated not required, remove usage */
  gasUsed?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  timestamp: Scalars['Int']['output'];
  /** @deprecated use fields from details */
  transaction: Transaction;
  /** @deprecated use type field in details */
  type: ActivityType;
};

export type AssetActivityInput = {
  chain: Chain;
  details: ActivityDetailsInput;
  timestamp: Scalars['Int']['input'];
};

export enum AssetActivitySwitch {
  Alternate = 'ALTERNATE',
  Legacy = 'LEGACY'
}

export type AssetChange = NftApproval | NftApproveForAll | NftTransfer | OnRampTransfer | TokenApproval | TokenTransfer;

export type AssetChangeInput = {
  nftApproval?: InputMaybe<NftApprovalInput>;
  nftApproveForAll?: InputMaybe<NftApproveForAllInput>;
  nftTransfer?: InputMaybe<NftTransferInput>;
  onRampTransfer?: InputMaybe<OnRampTransferInput>;
  tokenApproval?: InputMaybe<TokenApprovalInput>;
  tokenTransfer?: InputMaybe<TokenTransferInput>;
};

export enum Chain {
  Arbitrum = 'ARBITRUM',
  Avalanche = 'AVALANCHE',
  Base = 'BASE',
  Blast = 'BLAST',
  Bnb = 'BNB',
  Celo = 'CELO',
  Ethereum = 'ETHEREUM',
  EthereumGoerli = 'ETHEREUM_GOERLI',
  EthereumSepolia = 'ETHEREUM_SEPOLIA',
  Optimism = 'OPTIMISM',
  Polygon = 'POLYGON',
  UnknownChain = 'UNKNOWN_CHAIN',
  Zksync = 'ZKSYNC',
  Zora = 'ZORA'
}

export enum CollectionSortableField {
  Volume = 'VOLUME'
}

export type ContractInput = {
  address?: InputMaybe<Scalars['String']['input']>;
  chain: Chain;
};

export enum Currency {
  Aud = 'AUD',
  Brl = 'BRL',
  Cad = 'CAD',
  Cny = 'CNY',
  Eth = 'ETH',
  Eur = 'EUR',
  Gbp = 'GBP',
  Hkd = 'HKD',
  Idr = 'IDR',
  Inr = 'INR',
  Jpy = 'JPY',
  Krw = 'KRW',
  Matic = 'MATIC',
  Ngn = 'NGN',
  Pkr = 'PKR',
  Rub = 'RUB',
  Sgd = 'SGD',
  Thb = 'THB',
  Try = 'TRY',
  Uah = 'UAH',
  Usd = 'USD',
  Vnd = 'VND'
}

export type CurrencyAmountInput = {
  currency: Currency;
  value: Scalars['Float']['input'];
};

export type DescriptionTranslations = {
  __typename?: 'DescriptionTranslations';
  descriptionEnUs?: Maybe<Scalars['String']['output']>;
  descriptionEs419?: Maybe<Scalars['String']['output']>;
  descriptionEsEs?: Maybe<Scalars['String']['output']>;
  descriptionEsUs?: Maybe<Scalars['String']['output']>;
  descriptionFrFr?: Maybe<Scalars['String']['output']>;
  descriptionHiIn?: Maybe<Scalars['String']['output']>;
  descriptionIdId?: Maybe<Scalars['String']['output']>;
  descriptionJaJp?: Maybe<Scalars['String']['output']>;
  descriptionMsMy?: Maybe<Scalars['String']['output']>;
  descriptionNlNl?: Maybe<Scalars['String']['output']>;
  descriptionPtPt?: Maybe<Scalars['String']['output']>;
  descriptionRuRu?: Maybe<Scalars['String']['output']>;
  descriptionThTh?: Maybe<Scalars['String']['output']>;
  descriptionTrTr?: Maybe<Scalars['String']['output']>;
  descriptionUkUa?: Maybe<Scalars['String']['output']>;
  descriptionUrPk?: Maybe<Scalars['String']['output']>;
  descriptionViVn?: Maybe<Scalars['String']['output']>;
  descriptionZhHans?: Maybe<Scalars['String']['output']>;
  descriptionZhHant?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
};

export type Dimensions = {
  __typename?: 'Dimensions';
  height?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  width?: Maybe<Scalars['Float']['output']>;
};

export type DimensionsInput = {
  height?: InputMaybe<Scalars['Float']['input']>;
  width?: InputMaybe<Scalars['Float']['input']>;
};

export type FeeData = {
  __typename?: 'FeeData';
  buyFeeBps?: Maybe<Scalars['String']['output']>;
  externalTransferFailed?: Maybe<Scalars['Boolean']['output']>;
  feeTakenOnTransfer?: Maybe<Scalars['Boolean']['output']>;
  sellFeeBps?: Maybe<Scalars['String']['output']>;
  sellReverted?: Maybe<Scalars['Boolean']['output']>;
};

export enum HighLow {
  High = 'HIGH',
  Low = 'LOW'
}

/**   FIVE_MINUTE is only supported for TokenMarket.pricePercentChange */
export enum HistoryDuration {
  Day = 'DAY',
  FiveMinute = 'FIVE_MINUTE',
  Hour = 'HOUR',
  Max = 'MAX',
  Month = 'MONTH',
  Week = 'WEEK',
  Year = 'YEAR'
}

/**   Interfaces (alphabetized): */
export type IAmount = {
  currency?: Maybe<Currency>;
  value: Scalars['Float']['output'];
};

export type IContract = {
  address?: Maybe<Scalars['String']['output']>;
  chain: Chain;
};

export type IPool = {
  address: Scalars['String']['output'];
  chain: Chain;
  createdAtTimestamp?: Maybe<Scalars['Int']['output']>;
  cumulativeVolume?: Maybe<Amount>;
  historicalVolume?: Maybe<Array<Maybe<TimestampedAmount>>>;
  id: Scalars['ID']['output'];
  priceHistory?: Maybe<Array<Maybe<TimestampedPoolPrice>>>;
  protocolVersion: ProtocolVersion;
  token0?: Maybe<Token>;
  token0Supply?: Maybe<Scalars['Float']['output']>;
  token1?: Maybe<Token>;
  token1Supply?: Maybe<Scalars['Float']['output']>;
  totalLiquidity?: Maybe<Amount>;
  totalLiquidityPercentChange24h?: Maybe<Amount>;
  transactions?: Maybe<Array<Maybe<PoolTransaction>>>;
  txCount?: Maybe<Scalars['Int']['output']>;
};


export type IPoolCumulativeVolumeArgs = {
  duration: HistoryDuration;
};


export type IPoolHistoricalVolumeArgs = {
  duration: HistoryDuration;
};


export type IPoolPriceHistoryArgs = {
  duration: HistoryDuration;
};


export type IPoolTransactionsArgs = {
  first: Scalars['Int']['input'];
  timestampCursor?: InputMaybe<Scalars['Int']['input']>;
};

export type Image = {
  __typename?: 'Image';
  dimensions?: Maybe<Dimensions>;
  id: Scalars['ID']['output'];
  url: Scalars['String']['output'];
};

export type ImageInput = {
  dimensions?: InputMaybe<DimensionsInput>;
  url: Scalars['String']['input'];
};

export enum MediaType {
  Audio = 'AUDIO',
  Image = 'IMAGE',
  Raw = 'RAW',
  Video = 'VIDEO'
}

export type Mutation = {
  __typename?: 'Mutation';
  assetActivity: AssetActivity;
  heartbeat: Status;
  unsubscribe: Status;
};


export type MutationAssetActivityArgs = {
  input: AssetActivityInput;
};


export type MutationHeartbeatArgs = {
  subscriptionId: Scalars['ID']['input'];
  type: SubscriptionType;
};


export type MutationUnsubscribeArgs = {
  subscriptionId: Scalars['ID']['input'];
  type: SubscriptionType;
};

export type NetworkFee = {
  __typename?: 'NetworkFee';
  quantity?: Maybe<Scalars['String']['output']>;
  tokenAddress?: Maybe<Scalars['String']['output']>;
  tokenChain?: Maybe<Scalars['String']['output']>;
  tokenSymbol?: Maybe<Scalars['String']['output']>;
};

export type NftActivity = {
  __typename?: 'NftActivity';
  address: Scalars['String']['output'];
  asset?: Maybe<NftAsset>;
  fromAddress: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  marketplace?: Maybe<Scalars['String']['output']>;
  orderStatus?: Maybe<OrderStatus>;
  price?: Maybe<Amount>;
  quantity?: Maybe<Scalars['Int']['output']>;
  timestamp: Scalars['Int']['output'];
  toAddress?: Maybe<Scalars['String']['output']>;
  tokenId?: Maybe<Scalars['String']['output']>;
  transactionHash?: Maybe<Scalars['String']['output']>;
  type: NftActivityType;
  url?: Maybe<Scalars['String']['output']>;
};

export type NftActivityConnection = {
  __typename?: 'NftActivityConnection';
  edges: Array<NftActivityEdge>;
  pageInfo: PageInfo;
};

export type NftActivityEdge = {
  __typename?: 'NftActivityEdge';
  cursor: Scalars['String']['output'];
  node: NftActivity;
};

export type NftActivityFilterInput = {
  activityTypes?: InputMaybe<Array<NftActivityType>>;
  address?: InputMaybe<Scalars['String']['input']>;
  tokenId?: InputMaybe<Scalars['String']['input']>;
};

export enum NftActivityType {
  CancelListing = 'CANCEL_LISTING',
  Listing = 'LISTING',
  Sale = 'SALE',
  Transfer = 'TRANSFER'
}

export type NftApproval = {
  __typename?: 'NftApproval';
  approvedAddress: Scalars['String']['output'];
  /**   can be erc721, erc1155, noncompliant */
  asset: NftAsset;
  id: Scalars['ID']['output'];
  nftStandard: NftStandard;
};

export type NftApprovalInput = {
  approvedAddress: Scalars['String']['input'];
  asset: NftAssetInput;
  nftStandard: NftStandard;
};

export type NftApproveForAll = {
  __typename?: 'NftApproveForAll';
  approved: Scalars['Boolean']['output'];
  /**   can be erc721, erc1155, noncompliant */
  asset: NftAsset;
  id: Scalars['ID']['output'];
  nftStandard: NftStandard;
  operatorAddress: Scalars['String']['output'];
};

export type NftApproveForAllInput = {
  approved: Scalars['Boolean']['input'];
  asset: NftAssetInput;
  nftStandard: NftStandard;
  operatorAddress: Scalars['String']['input'];
};

export type NftAsset = {
  __typename?: 'NftAsset';
  animationUrl?: Maybe<Scalars['String']['output']>;
  chain?: Maybe<Chain>;
  collection?: Maybe<NftCollection>;
  creator?: Maybe<NftProfile>;
  description?: Maybe<Scalars['String']['output']>;
  flaggedBy?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  image?: Maybe<Image>;
  /** @deprecated Field no longer supported */
  imageUrl?: Maybe<Scalars['String']['output']>;
  isSpam?: Maybe<Scalars['Boolean']['output']>;
  listings?: Maybe<NftOrderConnection>;
  mediaType?: Maybe<MediaType>;
  metadataUrl?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  nftContract?: Maybe<NftContract>;
  originalImage?: Maybe<Image>;
  /**   TODO: may need to be array to support erc1155 cases. not needed at the moment so will revisit. */
  ownerAddress?: Maybe<Scalars['String']['output']>;
  rarities?: Maybe<Array<NftAssetRarity>>;
  smallImage?: Maybe<Image>;
  /** @deprecated Field no longer supported */
  smallImageUrl?: Maybe<Scalars['String']['output']>;
  suspiciousFlag?: Maybe<Scalars['Boolean']['output']>;
  thumbnail?: Maybe<Image>;
  /** @deprecated Field no longer supported */
  thumbnailUrl?: Maybe<Scalars['String']['output']>;
  tokenId: Scalars['String']['output'];
  traits?: Maybe<Array<NftAssetTrait>>;
};


export type NftAssetListingsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  asc?: InputMaybe<Scalars['Boolean']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  chain?: InputMaybe<Chain>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type NftAssetConnection = {
  __typename?: 'NftAssetConnection';
  edges: Array<NftAssetEdge>;
  pageInfo: PageInfo;
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type NftAssetEdge = {
  __typename?: 'NftAssetEdge';
  cursor: Scalars['String']['output'];
  node: NftAsset;
};

export type NftAssetInput = {
  animationUrl?: InputMaybe<Scalars['String']['input']>;
  collection?: InputMaybe<NftCollectionInput>;
  description?: InputMaybe<Scalars['String']['input']>;
  image?: InputMaybe<ImageInput>;
  isSpam?: InputMaybe<Scalars['Boolean']['input']>;
  mediaType?: InputMaybe<MediaType>;
  name?: InputMaybe<Scalars['String']['input']>;
  nftContract?: InputMaybe<NftContractInput>;
  smallImage?: InputMaybe<ImageInput>;
  thumbnail?: InputMaybe<ImageInput>;
  tokenId: Scalars['String']['input'];
};

export type NftAssetRarity = {
  __typename?: 'NftAssetRarity';
  id: Scalars['ID']['output'];
  provider?: Maybe<NftRarityProvider>;
  rank?: Maybe<Scalars['Int']['output']>;
  score?: Maybe<Scalars['Float']['output']>;
};

export enum NftAssetSortableField {
  Price = 'PRICE',
  Rarity = 'RARITY'
}

export type NftAssetTrait = {
  __typename?: 'NftAssetTrait';
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  rarity?: Maybe<Scalars['Float']['output']>;
  value?: Maybe<Scalars['String']['output']>;
};

export type NftAssetTraitInput = {
  name: Scalars['String']['input'];
  values: Array<Scalars['String']['input']>;
};

export type NftAssetsFilterInput = {
  listed?: InputMaybe<Scalars['Boolean']['input']>;
  marketplaces?: InputMaybe<Array<NftMarketplace>>;
  maxPrice?: InputMaybe<Scalars['String']['input']>;
  minPrice?: InputMaybe<Scalars['String']['input']>;
  tokenIds?: InputMaybe<Array<Scalars['String']['input']>>;
  tokenSearchQuery?: InputMaybe<Scalars['String']['input']>;
  traits?: InputMaybe<Array<NftAssetTraitInput>>;
};

export type NftBalance = {
  __typename?: 'NftBalance';
  id: Scalars['ID']['output'];
  lastPrice?: Maybe<TimestampedAmount>;
  listedMarketplaces?: Maybe<Array<NftMarketplace>>;
  listingFees?: Maybe<Array<Maybe<NftFee>>>;
  ownedAsset?: Maybe<NftAsset>;
  quantity?: Maybe<Scalars['Int']['output']>;
};

export type NftBalanceAssetInput = {
  address: Scalars['String']['input'];
  tokenId: Scalars['String']['input'];
};

export type NftBalanceConnection = {
  __typename?: 'NftBalanceConnection';
  edges: Array<NftBalanceEdge>;
  pageInfo: PageInfo;
};

export type NftBalanceEdge = {
  __typename?: 'NftBalanceEdge';
  cursor: Scalars['String']['output'];
  node: NftBalance;
};

export type NftBalancesFilterInput = {
  addresses?: InputMaybe<Array<Scalars['String']['input']>>;
  assets?: InputMaybe<Array<NftBalanceAssetInput>>;
  filterSpam?: InputMaybe<Scalars['Boolean']['input']>;
};

export type NftCollection = {
  __typename?: 'NftCollection';
  bannerImage?: Maybe<Image>;
  /**
   *  TODO: support querying for collection assets here
   * assets(page: Int, pageSize: Int, orderBy: NftAssetSortableField): [NftAsset]
   * @deprecated Field no longer supported
   */
  bannerImageUrl?: Maybe<Scalars['String']['output']>;
  collectionId: Scalars['String']['output'];
  creator?: Maybe<NftProfile>;
  description?: Maybe<Scalars['String']['output']>;
  discordUrl?: Maybe<Scalars['String']['output']>;
  homepageUrl?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  image?: Maybe<Image>;
  /** @deprecated Field no longer supported */
  imageUrl?: Maybe<Scalars['String']['output']>;
  instagramName?: Maybe<Scalars['String']['output']>;
  isVerified?: Maybe<Scalars['Boolean']['output']>;
  markets?: Maybe<Array<NftCollectionMarket>>;
  name?: Maybe<Scalars['String']['output']>;
  nftContracts?: Maybe<Array<NftContract>>;
  numAssets?: Maybe<Scalars['Int']['output']>;
  /** @deprecated Field no longer supported */
  openseaUrl?: Maybe<Scalars['String']['output']>;
  traits?: Maybe<Array<NftCollectionTrait>>;
  twitterName?: Maybe<Scalars['String']['output']>;
};


export type NftCollectionMarketsArgs = {
  currencies: Array<Currency>;
};

export type NftCollectionBalance = {
  __typename?: 'NftCollectionBalance';
  address: Scalars['String']['output'];
  balance: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  logoImage?: Maybe<Image>;
  name: Scalars['String']['output'];
};

export type NftCollectionBalanceConnection = {
  __typename?: 'NftCollectionBalanceConnection';
  edges: Array<NftCollectionBalanceEdge>;
  pageInfo: PageInfo;
};

export type NftCollectionBalanceEdge = {
  __typename?: 'NftCollectionBalanceEdge';
  cursor: Scalars['String']['output'];
  node: NftCollectionBalance;
};

export type NftCollectionConnection = {
  __typename?: 'NftCollectionConnection';
  edges: Array<NftCollectionEdge>;
  pageInfo: PageInfo;
};

export type NftCollectionEdge = {
  __typename?: 'NftCollectionEdge';
  cursor: Scalars['String']['output'];
  node: NftCollection;
};

export type NftCollectionInput = {
  collectionId: Scalars['String']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  nftContracts?: InputMaybe<Array<NftContractInput>>;
};

export type NftCollectionMarket = {
  __typename?: 'NftCollectionMarket';
  floorPrice?: Maybe<TimestampedAmount>;
  floorPricePercentChange?: Maybe<TimestampedAmount>;
  id: Scalars['ID']['output'];
  listings?: Maybe<TimestampedAmount>;
  marketplaces?: Maybe<Array<NftCollectionMarketplace>>;
  nftContracts?: Maybe<Array<NftContract>>;
  owners?: Maybe<Scalars['Int']['output']>;
  percentListed?: Maybe<TimestampedAmount>;
  percentUniqueOwners?: Maybe<TimestampedAmount>;
  sales?: Maybe<TimestampedAmount>;
  totalVolume?: Maybe<TimestampedAmount>;
  volume?: Maybe<TimestampedAmount>;
  /** @deprecated Field no longer supported */
  volume24h?: Maybe<Amount>;
  volumePercentChange?: Maybe<TimestampedAmount>;
};


export type NftCollectionMarketFloorPricePercentChangeArgs = {
  duration?: InputMaybe<HistoryDuration>;
};


export type NftCollectionMarketMarketplacesArgs = {
  marketplaces?: InputMaybe<Array<NftMarketplace>>;
};


export type NftCollectionMarketSalesArgs = {
  duration?: InputMaybe<HistoryDuration>;
};


export type NftCollectionMarketVolumeArgs = {
  duration?: InputMaybe<HistoryDuration>;
};


export type NftCollectionMarketVolumePercentChangeArgs = {
  duration?: InputMaybe<HistoryDuration>;
};

export type NftCollectionMarketplace = {
  __typename?: 'NftCollectionMarketplace';
  floorPrice?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  listings?: Maybe<Scalars['Int']['output']>;
  marketplace?: Maybe<NftMarketplace>;
};

export type NftCollectionTrait = {
  __typename?: 'NftCollectionTrait';
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  stats?: Maybe<Array<NftCollectionTraitStats>>;
  values?: Maybe<Array<Scalars['String']['output']>>;
};

export type NftCollectionTraitStats = {
  __typename?: 'NftCollectionTraitStats';
  assets?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  listings?: Maybe<Scalars['Int']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  value?: Maybe<Scalars['String']['output']>;
};

export type NftCollectionsFilterInput = {
  addresses?: InputMaybe<Array<Scalars['String']['input']>>;
  nameQuery?: InputMaybe<Scalars['String']['input']>;
};

export type NftContract = IContract & {
  __typename?: 'NftContract';
  address: Scalars['String']['output'];
  chain: Chain;
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  standard?: Maybe<NftStandard>;
  symbol?: Maybe<Scalars['String']['output']>;
  totalSupply?: Maybe<Scalars['Int']['output']>;
};

export type NftContractInput = {
  address: Scalars['String']['input'];
  chain: Chain;
  name?: InputMaybe<Scalars['String']['input']>;
  standard?: InputMaybe<NftStandard>;
  symbol?: InputMaybe<Scalars['String']['input']>;
  totalSupply?: InputMaybe<Scalars['Int']['input']>;
};

export type NftFee = {
  __typename?: 'NftFee';
  basisPoints: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  payoutAddress: Scalars['String']['output'];
};

export enum NftMarketplace {
  Cryptopunks = 'CRYPTOPUNKS',
  Foundation = 'FOUNDATION',
  Looksrare = 'LOOKSRARE',
  Nft20 = 'NFT20',
  Nftx = 'NFTX',
  Opensea = 'OPENSEA',
  Sudoswap = 'SUDOSWAP',
  X2Y2 = 'X2Y2'
}

export type NftOrder = {
  __typename?: 'NftOrder';
  address: Scalars['String']['output'];
  auctionType?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['Float']['output'];
  endAt?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  maker: Scalars['String']['output'];
  marketplace: NftMarketplace;
  marketplaceUrl: Scalars['String']['output'];
  orderHash?: Maybe<Scalars['String']['output']>;
  poolPrices?: Maybe<Array<Scalars['String']['output']>>;
  price: Amount;
  protocolParameters?: Maybe<Scalars['AWSJSON']['output']>;
  quantity: Scalars['Int']['output'];
  startAt: Scalars['Float']['output'];
  status: OrderStatus;
  taker?: Maybe<Scalars['String']['output']>;
  tokenId?: Maybe<Scalars['String']['output']>;
  type: OrderType;
};

export type NftOrderConnection = {
  __typename?: 'NftOrderConnection';
  edges: Array<NftOrderEdge>;
  pageInfo: PageInfo;
};

export type NftOrderEdge = {
  __typename?: 'NftOrderEdge';
  cursor: Scalars['String']['output'];
  node: NftOrder;
};

export type NftProfile = {
  __typename?: 'NftProfile';
  address: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isVerified?: Maybe<Scalars['Boolean']['output']>;
  profileImage?: Maybe<Image>;
  username?: Maybe<Scalars['String']['output']>;
};

export enum NftRarityProvider {
  RaritySniper = 'RARITY_SNIPER'
}

export type NftRouteResponse = {
  __typename?: 'NftRouteResponse';
  calldata: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  route?: Maybe<Array<NftTrade>>;
  sendAmount: TokenAmount;
  toAddress: Scalars['String']['output'];
};

export enum NftStandard {
  Erc721 = 'ERC721',
  Erc1155 = 'ERC1155',
  Noncompliant = 'NONCOMPLIANT'
}

export type NftTrade = {
  __typename?: 'NftTrade';
  amount: Scalars['Int']['output'];
  contractAddress: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  marketplace: NftMarketplace;
  /**   price represents the current price of the NFT, which can be different from quotePrice */
  price: TokenAmount;
  /**   quotePrice represents the last quoted price of the NFT */
  quotePrice?: Maybe<TokenAmount>;
  tokenId: Scalars['String']['output'];
  tokenType?: Maybe<NftStandard>;
};

export type NftTradeInput = {
  amount: Scalars['Int']['input'];
  contractAddress: Scalars['String']['input'];
  id: Scalars['ID']['input'];
  marketplace: NftMarketplace;
  quotePrice?: InputMaybe<TokenAmountInput>;
  tokenId: Scalars['String']['input'];
  tokenType?: InputMaybe<NftStandard>;
};

export type NftTransfer = {
  __typename?: 'NftTransfer';
  asset: NftAsset;
  direction: TransactionDirection;
  id: Scalars['ID']['output'];
  nftStandard: NftStandard;
  recipient: Scalars['String']['output'];
  sender: Scalars['String']['output'];
};

export type NftTransferInput = {
  asset: NftAssetInput;
  direction: TransactionDirection;
  nftStandard: NftStandard;
  recipient: Scalars['String']['input'];
  sender: Scalars['String']['input'];
};

export type OnRampServiceProvider = {
  __typename?: 'OnRampServiceProvider';
  id: Scalars['ID']['output'];
  logoDarkUrl: Scalars['String']['output'];
  logoLightUrl: Scalars['String']['output'];
  name: Scalars['String']['output'];
  serviceProvider: Scalars['String']['output'];
  supportUrl?: Maybe<Scalars['String']['output']>;
  url: Scalars['String']['output'];
};

export type OnRampServiceProviderInput = {
  logoDarkUrl: Scalars['String']['input'];
  logoLightUrl: Scalars['String']['input'];
  name: Scalars['String']['input'];
  serviceProvider: Scalars['String']['input'];
  supportUrl?: InputMaybe<Scalars['String']['input']>;
  url: Scalars['String']['input'];
};

export type OnRampTransactionDetails = {
  __typename?: 'OnRampTransactionDetails';
  id: Scalars['ID']['output'];
  onRampTransfer: OnRampTransfer;
  receiverAddress: Scalars['String']['output'];
  status: TransactionStatus;
};

export type OnRampTransactionDetailsInput = {
  onRampTransfer: OnRampTransferInput;
  receiverAddress: Scalars['String']['input'];
  status: TransactionStatus;
};

export type OnRampTransactionsAuth = {
  queryParams: Scalars['String']['input'];
  signature: Scalars['String']['input'];
};

export type OnRampTransfer = {
  __typename?: 'OnRampTransfer';
  amount: Scalars['Float']['output'];
  externalSessionId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  networkFee?: Maybe<Scalars['Float']['output']>;
  serviceProvider: OnRampServiceProvider;
  sourceAmount: Scalars['Float']['output'];
  sourceCurrency?: Maybe<Scalars['String']['output']>;
  token: Token;
  tokenStandard: TokenStandard;
  totalFee?: Maybe<Scalars['Float']['output']>;
  transactionFee?: Maybe<Scalars['Float']['output']>;
  transactionReferenceId: Scalars['String']['output'];
};

export type OnRampTransferInput = {
  amount: Scalars['Float']['input'];
  networkFee?: InputMaybe<Scalars['Float']['input']>;
  serviceProvider: OnRampServiceProviderInput;
  sourceAmount: Scalars['Float']['input'];
  sourceCurrency?: InputMaybe<Scalars['String']['input']>;
  token: TokenAssetInput;
  tokenStandard: TokenStandard;
  totalFee?: InputMaybe<Scalars['Float']['input']>;
  transactionFee?: InputMaybe<Scalars['Float']['input']>;
  transactionReferenceId: Scalars['String']['input'];
};

export enum OrderStatus {
  Cancelled = 'CANCELLED',
  Executed = 'EXECUTED',
  Expired = 'EXPIRED',
  Valid = 'VALID'
}

export enum OrderType {
  Listing = 'LISTING',
  Offer = 'OFFER'
}

export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage?: Maybe<Scalars['Boolean']['output']>;
  hasPreviousPage?: Maybe<Scalars['Boolean']['output']>;
  startCursor?: Maybe<Scalars['String']['output']>;
};

/**   v2 pool parameters as defined by https://github.com/Uniswap/v2-sdk/blob/main/src/entities/pair.ts */
export type PairInput = {
  tokenAmountA: TokenAmountInput;
  tokenAmountB: TokenAmountInput;
};

export type PermitDetailsInput = {
  amount: Scalars['String']['input'];
  expiration: Scalars['String']['input'];
  nonce: Scalars['String']['input'];
  token: Scalars['String']['input'];
};

export type PermitInput = {
  details: PermitDetailsInput;
  sigDeadline: Scalars['String']['input'];
  signature: Scalars['String']['input'];
  spender: Scalars['String']['input'];
};

/**   v3 pool parameters as defined by https://github.com/Uniswap/v3-sdk/blob/main/src/entities/pool.ts */
export type PoolInput = {
  fee: Scalars['Int']['input'];
  liquidity: Scalars['String']['input'];
  sqrtRatioX96: Scalars['String']['input'];
  tickCurrent: Scalars['String']['input'];
  tokenA: TokenInput;
  tokenB: TokenInput;
};

export type PoolTransaction = {
  __typename?: 'PoolTransaction';
  account: Scalars['String']['output'];
  chain: Chain;
  hash: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  protocolVersion: ProtocolVersion;
  timestamp: Scalars['Int']['output'];
  token0: Token;
  token0Quantity: Scalars['String']['output'];
  token1: Token;
  token1Quantity: Scalars['String']['output'];
  type: PoolTransactionType;
  usdValue: Amount;
};

export enum PoolTransactionType {
  Add = 'ADD',
  Remove = 'REMOVE',
  Swap = 'SWAP'
}

export type Portfolio = {
  __typename?: 'Portfolio';
  assetActivities?: Maybe<Array<Maybe<AssetActivity>>>;
  id: Scalars['ID']['output'];
  /**   TODO: (michael.zhang) replace with paginated query */
  nftBalances?: Maybe<Array<Maybe<NftBalance>>>;
  ownerAddress: Scalars['String']['output'];
  tokenBalances?: Maybe<Array<Maybe<TokenBalance>>>;
  tokensTotalDenominatedValue?: Maybe<Amount>;
  tokensTotalDenominatedValueChange?: Maybe<AmountChange>;
};


export type PortfolioAssetActivitiesArgs = {
  _fs?: InputMaybe<AssetActivitySwitch>;
  chains?: InputMaybe<Array<Chain>>;
  includeOffChain?: InputMaybe<Scalars['Boolean']['input']>;
  onRampTransactionIDs?: InputMaybe<Array<Scalars['String']['input']>>;
  onRampTransactionsAuth?: InputMaybe<OnRampTransactionsAuth>;
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
};


export type PortfolioTokensTotalDenominatedValueChangeArgs = {
  duration?: InputMaybe<HistoryDuration>;
};

/**   Specify how the portfolio value should be calculated for each `ownerAddress`. */
export type PortfolioValueModifier = {
  includeSmallBalances?: InputMaybe<Scalars['Boolean']['input']>;
  includeSpamTokens?: InputMaybe<Scalars['Boolean']['input']>;
  ownerAddress: Scalars['String']['input'];
  tokenExcludeOverrides?: InputMaybe<Array<ContractInput>>;
  tokenIncludeOverrides?: InputMaybe<Array<ContractInput>>;
};

export enum PriceSource {
  SubgraphV2 = 'SUBGRAPH_V2',
  SubgraphV3 = 'SUBGRAPH_V3',
  SubgraphV4 = 'SUBGRAPH_V4'
}

export enum ProtectionAttackType {
  AirdropPattern = 'AIRDROP_PATTERN',
  DynamicAnalysis = 'DYNAMIC_ANALYSIS',
  Impersonator = 'IMPERSONATOR',
  InorganicVolume = 'INORGANIC_VOLUME',
  KnownMalicious = 'KNOWN_MALICIOUS',
  Metadata = 'METADATA',
  Rugpull = 'RUGPULL',
  StaticCodeSignature = 'STATIC_CODE_SIGNATURE',
  Unknown = 'UNKNOWN',
  UnstableTokenPrice = 'UNSTABLE_TOKEN_PRICE'
}

export type ProtectionInfo = {
  __typename?: 'ProtectionInfo';
  attackTypes?: Maybe<Array<Maybe<ProtectionAttackType>>>;
  result?: Maybe<ProtectionResult>;
};

export enum ProtectionResult {
  Benign = 'BENIGN',
  Malicious = 'MALICIOUS',
  Spam = 'SPAM',
  Unknown = 'UNKNOWN',
  Warning = 'WARNING'
}

export enum ProtocolVersion {
  V2 = 'V2',
  V3 = 'V3',
  V4 = 'V4'
}

export type PushNotification = {
  __typename?: 'PushNotification';
  contents: Scalars['AWSJSON']['output'];
  id: Scalars['ID']['output'];
  notifyAddress: Scalars['String']['output'];
  signerHeader: Scalars['AWSJSON']['output'];
  viewerHeader: Scalars['AWSJSON']['output'];
};

export type Query = {
  __typename?: 'Query';
  convert?: Maybe<Amount>;
  dailyProtocolTvl?: Maybe<Array<TimestampedAmount>>;
  historicalProtocolVolume?: Maybe<Array<TimestampedAmount>>;
  isV3SubgraphStale?: Maybe<Scalars['Boolean']['output']>;
  nftActivity?: Maybe<NftActivityConnection>;
  nftAssets?: Maybe<NftAssetConnection>;
  nftBalances?: Maybe<NftBalanceConnection>;
  nftCollectionBalances?: Maybe<NftCollectionBalanceConnection>;
  nftCollections?: Maybe<NftCollectionConnection>;
  nftRoute?: Maybe<NftRouteResponse>;
  portfolios?: Maybe<Array<Maybe<Portfolio>>>;
  searchTokens?: Maybe<Array<Maybe<Token>>>;
  /**
   *  token consumes chain and address instead of contract because the apollo client request cache can only use
   * keys from the response, and the token response does not contain a contract, but does contain an unwrapped
   * contract: chain and address.
   */
  token?: Maybe<Token>;
  tokenProjects?: Maybe<Array<Maybe<TokenProject>>>;
  tokens?: Maybe<Array<Maybe<Token>>>;
  topCollections?: Maybe<NftCollectionConnection>;
  topTokens?: Maybe<Array<Maybe<Token>>>;
  /**   returns top v2 pairs sorted by total value locked in desc order */
  topV2Pairs?: Maybe<Array<V2Pair>>;
  /**   returns top v3 pools sorted by total value locked in desc order */
  topV3Pools?: Maybe<Array<V3Pool>>;
  topV4Pools?: Maybe<Array<V4Pool>>;
  transactionNotification?: Maybe<TransactionNotification>;
  v2Pair?: Maybe<V2Pair>;
  v2Transactions?: Maybe<Array<Maybe<PoolTransaction>>>;
  v3Pool?: Maybe<V3Pool>;
  v3PoolsForTokenPair?: Maybe<Array<V3Pool>>;
  v3Transactions?: Maybe<Array<PoolTransaction>>;
  v4Pool?: Maybe<V4Pool>;
  v4PoolsForTokenPair?: Maybe<Array<V4Pool>>;
  v4Transactions?: Maybe<Array<PoolTransaction>>;
};


export type QueryConvertArgs = {
  fromAmount: CurrencyAmountInput;
  toCurrency: Currency;
};


export type QueryDailyProtocolTvlArgs = {
  chain: Chain;
  version: ProtocolVersion;
};


export type QueryHistoricalProtocolVolumeArgs = {
  chain: Chain;
  duration: HistoryDuration;
  version: ProtocolVersion;
};


export type QueryIsV3SubgraphStaleArgs = {
  chain: Chain;
};


export type QueryNftActivityArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  chain?: InputMaybe<Chain>;
  filter?: InputMaybe<NftActivityFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryNftAssetsArgs = {
  address: Scalars['String']['input'];
  after?: InputMaybe<Scalars['String']['input']>;
  asc?: InputMaybe<Scalars['Boolean']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  chain?: InputMaybe<Chain>;
  filter?: InputMaybe<NftAssetsFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<NftAssetSortableField>;
};


export type QueryNftBalancesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  chain?: InputMaybe<Chain>;
  chains?: InputMaybe<Array<Chain>>;
  filter?: InputMaybe<NftBalancesFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  ownerAddress: Scalars['String']['input'];
};


export type QueryNftCollectionBalancesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  chain?: InputMaybe<Chain>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  ownerAddress: Scalars['String']['input'];
};


export type QueryNftCollectionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  chain?: InputMaybe<Chain>;
  filter?: InputMaybe<NftCollectionsFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryNftRouteArgs = {
  chain?: InputMaybe<Chain>;
  nftTrades: Array<NftTradeInput>;
  senderAddress: Scalars['String']['input'];
  tokenTrades?: InputMaybe<Array<TokenTradeInput>>;
};


export type QueryPortfoliosArgs = {
  chains?: InputMaybe<Array<Chain>>;
  fungibleIds?: InputMaybe<Array<Scalars['String']['input']>>;
  lookupTokens?: InputMaybe<Array<ContractInput>>;
  ownerAddresses: Array<Scalars['String']['input']>;
  valueModifiers?: InputMaybe<Array<PortfolioValueModifier>>;
};


export type QuerySearchTokensArgs = {
  chains?: InputMaybe<Array<Chain>>;
  searchQuery: Scalars['String']['input'];
};


export type QueryTokenArgs = {
  address?: InputMaybe<Scalars['String']['input']>;
  chain: Chain;
};


export type QueryTokenProjectsArgs = {
  contracts: Array<ContractInput>;
};


export type QueryTokensArgs = {
  contracts: Array<ContractInput>;
};


export type QueryTopCollectionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  chains?: InputMaybe<Array<Chain>>;
  cursor?: InputMaybe<Scalars['String']['input']>;
  duration?: InputMaybe<HistoryDuration>;
  first?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<CollectionSortableField>;
};


export type QueryTopTokensArgs = {
  chain?: InputMaybe<Chain>;
  orderBy?: InputMaybe<TokenSortableField>;
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryTopV2PairsArgs = {
  chain: Chain;
  first: Scalars['Int']['input'];
  tokenFilter?: InputMaybe<Scalars['String']['input']>;
  tvlCursor?: InputMaybe<Scalars['Float']['input']>;
};


export type QueryTopV3PoolsArgs = {
  chain: Chain;
  first: Scalars['Int']['input'];
  tokenFilter?: InputMaybe<Scalars['String']['input']>;
  tvlCursor?: InputMaybe<Scalars['Float']['input']>;
};


export type QueryTopV4PoolsArgs = {
  chain: Chain;
  first: Scalars['Int']['input'];
  tokenFilter?: InputMaybe<Scalars['String']['input']>;
  tvlCursor?: InputMaybe<Scalars['Float']['input']>;
};


export type QueryTransactionNotificationArgs = {
  address: Scalars['String']['input'];
  chain: Chain;
  transactionHash: Scalars['String']['input'];
};


export type QueryV2PairArgs = {
  address: Scalars['String']['input'];
  chain: Chain;
};


export type QueryV2TransactionsArgs = {
  chain: Chain;
  first: Scalars['Int']['input'];
  timestampCursor?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryV3PoolArgs = {
  address: Scalars['String']['input'];
  chain: Chain;
};


export type QueryV3PoolsForTokenPairArgs = {
  chain: Chain;
  token0: Scalars['String']['input'];
  token1: Scalars['String']['input'];
};


export type QueryV3TransactionsArgs = {
  chain: Chain;
  first: Scalars['Int']['input'];
  timestampCursor?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryV4PoolArgs = {
  chain: Chain;
  poolId: Scalars['String']['input'];
};


export type QueryV4PoolsForTokenPairArgs = {
  chain: Chain;
  token0: Scalars['String']['input'];
  token1: Scalars['String']['input'];
};


export type QueryV4TransactionsArgs = {
  chain: Chain;
  first: Scalars['Int']['input'];
  timestampCursor?: InputMaybe<Scalars['Int']['input']>;
};

export enum SafetyLevel {
  Blocked = 'BLOCKED',
  MediumWarning = 'MEDIUM_WARNING',
  StrongWarning = 'STRONG_WARNING',
  Verified = 'VERIFIED'
}

export type Status = {
  __typename?: 'Status';
  success: Scalars['Boolean']['output'];
};

export type Subscription = {
  __typename?: 'Subscription';
  onAssetActivity?: Maybe<AssetActivity>;
};


export type SubscriptionOnAssetActivityArgs = {
  addresses: Array<Scalars['String']['input']>;
  subscriptionId: Scalars['ID']['input'];
};

export enum SubscriptionType {
  AssetActivity = 'ASSET_ACTIVITY'
}

export type SwapOrderDetails = {
  __typename?: 'SwapOrderDetails';
  encodedOrder: Scalars['String']['output'];
  expiry: Scalars['Int']['output'];
  hash: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  inputToken: Token;
  inputTokenQuantity: Scalars['String']['output'];
  offerer: Scalars['String']['output'];
  outputToken: Token;
  outputTokenQuantity: Scalars['String']['output'];
  /** @deprecated use swapOrderStatus to disambiguate from transactionStatus */
  status: SwapOrderStatus;
  swapOrderStatus: SwapOrderStatus;
  swapOrderType: SwapOrderType;
};

export type SwapOrderDetailsInput = {
  encodedOrder: Scalars['String']['input'];
  expiry: Scalars['Int']['input'];
  hash: Scalars['String']['input'];
  inputAmount: Scalars['String']['input'];
  inputToken: TokenAssetInput;
  offerer: Scalars['String']['input'];
  outputAmount: Scalars['String']['input'];
  outputToken: TokenAssetInput;
  status?: InputMaybe<SwapOrderStatus>;
  swapOrderStatus: SwapOrderStatus;
  swapOrderType: SwapOrderType;
};

export enum SwapOrderStatus {
  Cancelled = 'CANCELLED',
  Error = 'ERROR',
  Expired = 'EXPIRED',
  Filled = 'FILLED',
  InsufficientFunds = 'INSUFFICIENT_FUNDS',
  Open = 'OPEN'
}

export enum SwapOrderType {
  Dutch = 'DUTCH',
  DutchV2 = 'DUTCH_V2',
  Limit = 'LIMIT'
}

export type TimestampedAmount = IAmount & {
  __typename?: 'TimestampedAmount';
  currency?: Maybe<Currency>;
  id: Scalars['ID']['output'];
  timestamp: Scalars['Int']['output'];
  value: Scalars['Float']['output'];
};

export type TimestampedOhlc = {
  __typename?: 'TimestampedOhlc';
  close: Amount;
  high: Amount;
  id: Scalars['ID']['output'];
  low: Amount;
  open: Amount;
  timestamp: Scalars['Int']['output'];
};

export type TimestampedPoolPrice = {
  __typename?: 'TimestampedPoolPrice';
  id: Scalars['ID']['output'];
  timestamp: Scalars['Int']['output'];
  token0Price: Scalars['Float']['output'];
  token1Price: Scalars['Float']['output'];
};

export type Token = IContract & {
  __typename?: 'Token';
  address?: Maybe<Scalars['String']['output']>;
  chain: Chain;
  decimals?: Maybe<Scalars['Int']['output']>;
  feeData?: Maybe<FeeData>;
  id: Scalars['ID']['output'];
  market?: Maybe<TokenMarket>;
  name?: Maybe<Scalars['String']['output']>;
  project?: Maybe<TokenProject>;
  protectionInfo?: Maybe<ProtectionInfo>;
  standard?: Maybe<TokenStandard>;
  symbol?: Maybe<Scalars['String']['output']>;
  v2Transactions?: Maybe<Array<Maybe<PoolTransaction>>>;
  v3Transactions?: Maybe<Array<Maybe<PoolTransaction>>>;
  v4Transactions?: Maybe<Array<Maybe<PoolTransaction>>>;
};


export type TokenMarketArgs = {
  currency?: InputMaybe<Currency>;
};


export type TokenV2TransactionsArgs = {
  first: Scalars['Int']['input'];
  timestampCursor?: InputMaybe<Scalars['Int']['input']>;
};


export type TokenV3TransactionsArgs = {
  first: Scalars['Int']['input'];
  timestampCursor?: InputMaybe<Scalars['Int']['input']>;
};


export type TokenV4TransactionsArgs = {
  first: Scalars['Int']['input'];
  timestampCursor?: InputMaybe<Scalars['Int']['input']>;
};

export type TokenAmount = {
  __typename?: 'TokenAmount';
  currency: Currency;
  id: Scalars['ID']['output'];
  value: Scalars['String']['output'];
};

export type TokenAmountInput = {
  amount: Scalars['String']['input'];
  token: TokenInput;
};

export type TokenApproval = {
  __typename?: 'TokenApproval';
  approvedAddress: Scalars['String']['output'];
  /**   can be erc20 or native */
  asset: Token;
  id: Scalars['ID']['output'];
  quantity: Scalars['String']['output'];
  tokenStandard: TokenStandard;
};

export type TokenApprovalInput = {
  approvedAddress: Scalars['String']['input'];
  asset: TokenAssetInput;
  quantity: Scalars['String']['input'];
  tokenStandard: TokenStandard;
};

export type TokenAssetInput = {
  address?: InputMaybe<Scalars['String']['input']>;
  chain: Chain;
  decimals?: InputMaybe<Scalars['Int']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  standard: TokenStandard;
  symbol?: InputMaybe<Scalars['String']['input']>;
};

export type TokenBalance = {
  __typename?: 'TokenBalance';
  blockNumber?: Maybe<Scalars['Int']['output']>;
  blockTimestamp?: Maybe<Scalars['Int']['output']>;
  denominatedValue?: Maybe<Amount>;
  id: Scalars['ID']['output'];
  isHidden?: Maybe<Scalars['Boolean']['output']>;
  ownerAddress: Scalars['String']['output'];
  quantity?: Maybe<Scalars['Float']['output']>;
  token?: Maybe<Token>;
  tokenProjectMarket?: Maybe<TokenProjectMarket>;
};

export type TokenInput = {
  address: Scalars['String']['input'];
  chainId: Scalars['Int']['input'];
  decimals: Scalars['Int']['input'];
  isNative: Scalars['Boolean']['input'];
};

export type TokenMarket = {
  __typename?: 'TokenMarket';
  fullyDilutedValuation?: Maybe<Amount>;
  historicalTvl?: Maybe<Array<Maybe<TimestampedAmount>>>;
  historicalVolume?: Maybe<Array<Maybe<TimestampedAmount>>>;
  id: Scalars['ID']['output'];
  ohlc?: Maybe<Array<Maybe<TimestampedOhlc>>>;
  price?: Maybe<Amount>;
  priceHighLow?: Maybe<Amount>;
  priceHistory?: Maybe<Array<Maybe<TimestampedAmount>>>;
  pricePercentChange?: Maybe<Amount>;
  priceSource: PriceSource;
  token: Token;
  totalValueLocked?: Maybe<Amount>;
  /**   this volume is cumulative volume over the specified duration */
  volume?: Maybe<Amount>;
};


export type TokenMarketHistoricalTvlArgs = {
  duration: HistoryDuration;
};


export type TokenMarketHistoricalVolumeArgs = {
  duration: HistoryDuration;
};


export type TokenMarketOhlcArgs = {
  duration: HistoryDuration;
};


export type TokenMarketPriceHighLowArgs = {
  duration: HistoryDuration;
  highLow: HighLow;
};


export type TokenMarketPriceHistoryArgs = {
  duration: HistoryDuration;
};


export type TokenMarketPricePercentChangeArgs = {
  duration: HistoryDuration;
};


export type TokenMarketVolumeArgs = {
  duration: HistoryDuration;
};

export type TokenProject = {
  __typename?: 'TokenProject';
  description?: Maybe<Scalars['String']['output']>;
  descriptionTranslations?: Maybe<DescriptionTranslations>;
  homepageUrl?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isSpam?: Maybe<Scalars['Boolean']['output']>;
  logo?: Maybe<Image>;
  /** @deprecated use logo */
  logoUrl?: Maybe<Scalars['String']['output']>;
  markets?: Maybe<Array<Maybe<TokenProjectMarket>>>;
  name?: Maybe<Scalars['String']['output']>;
  safetyLevel?: Maybe<SafetyLevel>;
  /** @deprecated use logo */
  smallLogo?: Maybe<Image>;
  spamCode?: Maybe<Scalars['Int']['output']>;
  tokens: Array<Token>;
  twitterName?: Maybe<Scalars['String']['output']>;
};


export type TokenProjectMarketsArgs = {
  currencies: Array<Currency>;
};

export type TokenProjectMarket = {
  __typename?: 'TokenProjectMarket';
  currency: Currency;
  fullyDilutedValuation?: Maybe<Amount>;
  id: Scalars['ID']['output'];
  marketCap?: Maybe<Amount>;
  price?: Maybe<Amount>;
  priceHigh52w?: Maybe<Amount>;
  priceHighLow?: Maybe<Amount>;
  priceHistory?: Maybe<Array<Maybe<TimestampedAmount>>>;
  priceLow52w?: Maybe<Amount>;
  pricePercentChange?: Maybe<Amount>;
  pricePercentChange24h?: Maybe<Amount>;
  tokenProject: TokenProject;
};


export type TokenProjectMarketPriceHighLowArgs = {
  duration: HistoryDuration;
  highLow: HighLow;
};


export type TokenProjectMarketPriceHistoryArgs = {
  duration: HistoryDuration;
};


export type TokenProjectMarketPricePercentChangeArgs = {
  duration: HistoryDuration;
};

export enum TokenSortableField {
  MarketCap = 'MARKET_CAP',
  Popularity = 'POPULARITY',
  TotalValueLocked = 'TOTAL_VALUE_LOCKED',
  Volume = 'VOLUME'
}

export enum TokenStandard {
  Erc20 = 'ERC20',
  Native = 'NATIVE'
}

export type TokenTradeInput = {
  permit?: InputMaybe<PermitInput>;
  routes?: InputMaybe<TokenTradeRoutesInput>;
  slippageToleranceBasisPoints?: InputMaybe<Scalars['Int']['input']>;
  tokenAmount: TokenAmountInput;
};

export type TokenTradeRouteInput = {
  inputAmount: TokenAmountInput;
  outputAmount: TokenAmountInput;
  pools: Array<TradePoolInput>;
};

export type TokenTradeRoutesInput = {
  mixedRoutes?: InputMaybe<Array<TokenTradeRouteInput>>;
  tradeType: TokenTradeType;
  v2Routes?: InputMaybe<Array<TokenTradeRouteInput>>;
  v3Routes?: InputMaybe<Array<TokenTradeRouteInput>>;
};

export enum TokenTradeType {
  ExactInput = 'EXACT_INPUT',
  ExactOutput = 'EXACT_OUTPUT'
}

export type TokenTransfer = {
  __typename?: 'TokenTransfer';
  asset: Token;
  direction: TransactionDirection;
  id: Scalars['ID']['output'];
  quantity: Scalars['String']['output'];
  recipient: Scalars['String']['output'];
  sender: Scalars['String']['output'];
  tokenStandard: TokenStandard;
  transactedValue?: Maybe<Amount>;
};

export type TokenTransferInput = {
  asset: TokenAssetInput;
  direction: TransactionDirection;
  quantity: Scalars['String']['input'];
  recipient: Scalars['String']['input'];
  sender: Scalars['String']['input'];
  tokenStandard: TokenStandard;
  transactedValue?: InputMaybe<AmountInput>;
};

export type TradePoolInput = {
  pair?: InputMaybe<PairInput>;
  pool?: InputMaybe<PoolInput>;
};

export type Transaction = {
  __typename?: 'Transaction';
  blockNumber: Scalars['Int']['output'];
  from: Scalars['String']['output'];
  gasLimit?: Maybe<Scalars['Float']['output']>;
  hash: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  maxFeePerGas?: Maybe<Scalars['Float']['output']>;
  nonce: Scalars['Int']['output'];
  status: TransactionStatus;
  to: Scalars['String']['output'];
};

export type TransactionDetails = {
  __typename?: 'TransactionDetails';
  application?: Maybe<ApplicationContract>;
  assetChanges: Array<Maybe<AssetChange>>;
  from: Scalars['String']['output'];
  hash: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  networkFee?: Maybe<NetworkFee>;
  nonce: Scalars['Int']['output'];
  /** @deprecated use transactionStatus to disambiguate from swapOrderStatus */
  status: TransactionStatus;
  to: Scalars['String']['output'];
  transactionStatus: TransactionStatus;
  type: TransactionType;
};

export type TransactionDetailsInput = {
  application?: InputMaybe<ApplicationContractInput>;
  assetChanges: Array<InputMaybe<AssetChangeInput>>;
  from: Scalars['String']['input'];
  hash: Scalars['String']['input'];
  nonce: Scalars['Int']['input'];
  status?: InputMaybe<TransactionStatus>;
  to: Scalars['String']['input'];
  transactionStatus: TransactionStatus;
  type: TransactionType;
};

export enum TransactionDirection {
  In = 'IN',
  Out = 'OUT',
  Self = 'SELF'
}

export type TransactionNotification = {
  __typename?: 'TransactionNotification';
  hash: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  push: Array<PushNotification>;
};

export enum TransactionStatus {
  Confirmed = 'CONFIRMED',
  Failed = 'FAILED',
  Pending = 'PENDING'
}

export enum TransactionType {
  Approve = 'APPROVE',
  Borrow = 'BORROW',
  Cancel = 'CANCEL',
  Claim = 'CLAIM',
  Deployment = 'DEPLOYMENT',
  Lend = 'LEND',
  Mint = 'MINT',
  OnRamp = 'ON_RAMP',
  Receive = 'RECEIVE',
  Repay = 'REPAY',
  Send = 'SEND',
  Stake = 'STAKE',
  Swap = 'SWAP',
  SwapOrder = 'SWAP_ORDER',
  Unknown = 'UNKNOWN',
  Unstake = 'UNSTAKE',
  Withdraw = 'WITHDRAW'
}

export type V2Pair = IPool & {
  __typename?: 'V2Pair';
  address: Scalars['String']['output'];
  chain: Chain;
  createdAtTimestamp?: Maybe<Scalars['Int']['output']>;
  cumulativeVolume?: Maybe<Amount>;
  historicalVolume?: Maybe<Array<Maybe<TimestampedAmount>>>;
  id: Scalars['ID']['output'];
  priceHistory?: Maybe<Array<Maybe<TimestampedPoolPrice>>>;
  protocolVersion: ProtocolVersion;
  token0?: Maybe<Token>;
  token0Supply?: Maybe<Scalars['Float']['output']>;
  token1?: Maybe<Token>;
  token1Supply?: Maybe<Scalars['Float']['output']>;
  totalLiquidity?: Maybe<Amount>;
  totalLiquidityPercentChange24h?: Maybe<Amount>;
  transactions?: Maybe<Array<Maybe<PoolTransaction>>>;
  txCount?: Maybe<Scalars['Int']['output']>;
};


export type V2PairCumulativeVolumeArgs = {
  duration: HistoryDuration;
};


export type V2PairHistoricalVolumeArgs = {
  duration: HistoryDuration;
};


export type V2PairPriceHistoryArgs = {
  duration: HistoryDuration;
};


export type V2PairTransactionsArgs = {
  first: Scalars['Int']['input'];
  timestampCursor?: InputMaybe<Scalars['Int']['input']>;
};

export type V3Pool = IPool & {
  __typename?: 'V3Pool';
  address: Scalars['String']['output'];
  chain: Chain;
  createdAtTimestamp?: Maybe<Scalars['Int']['output']>;
  cumulativeVolume?: Maybe<Amount>;
  feeTier?: Maybe<Scalars['Float']['output']>;
  historicalVolume?: Maybe<Array<Maybe<TimestampedAmount>>>;
  id: Scalars['ID']['output'];
  priceHistory?: Maybe<Array<Maybe<TimestampedPoolPrice>>>;
  protocolVersion: ProtocolVersion;
  ticks?: Maybe<Array<Maybe<V3PoolTick>>>;
  token0?: Maybe<Token>;
  token0Supply?: Maybe<Scalars['Float']['output']>;
  token1?: Maybe<Token>;
  token1Supply?: Maybe<Scalars['Float']['output']>;
  totalLiquidity?: Maybe<Amount>;
  totalLiquidityPercentChange24h?: Maybe<Amount>;
  transactions?: Maybe<Array<Maybe<PoolTransaction>>>;
  txCount?: Maybe<Scalars['Int']['output']>;
};


export type V3PoolCumulativeVolumeArgs = {
  duration: HistoryDuration;
};


export type V3PoolHistoricalVolumeArgs = {
  duration: HistoryDuration;
};


export type V3PoolPriceHistoryArgs = {
  duration: HistoryDuration;
};


export type V3PoolTicksArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type V3PoolTransactionsArgs = {
  first: Scalars['Int']['input'];
  timestampCursor?: InputMaybe<Scalars['Int']['input']>;
};

export type V3PoolTick = {
  __typename?: 'V3PoolTick';
  id: Scalars['ID']['output'];
  liquidityGross?: Maybe<Scalars['String']['output']>;
  liquidityNet?: Maybe<Scalars['String']['output']>;
  price0?: Maybe<Scalars['String']['output']>;
  price1?: Maybe<Scalars['String']['output']>;
  tickIdx?: Maybe<Scalars['Int']['output']>;
};

export type V4Pool = {
  __typename?: 'V4Pool';
  chain: Chain;
  createdAtTimestamp?: Maybe<Scalars['Int']['output']>;
  cumulativeVolume?: Maybe<Amount>;
  feeTier?: Maybe<Scalars['Float']['output']>;
  historicalVolume?: Maybe<Array<Maybe<TimestampedAmount>>>;
  hook?: Maybe<V4PoolHook>;
  id: Scalars['ID']['output'];
  poolId: Scalars['String']['output'];
  priceHistory?: Maybe<Array<Maybe<TimestampedPoolPrice>>>;
  protocolVersion: ProtocolVersion;
  ticks?: Maybe<Array<Maybe<V4PoolTick>>>;
  token0?: Maybe<Token>;
  token0Supply?: Maybe<Scalars['Float']['output']>;
  token1?: Maybe<Token>;
  token1Supply?: Maybe<Scalars['Float']['output']>;
  totalLiquidity?: Maybe<Amount>;
  totalLiquidityPercentChange24h?: Maybe<Amount>;
  transactions?: Maybe<Array<Maybe<PoolTransaction>>>;
  txCount?: Maybe<Scalars['Int']['output']>;
};


export type V4PoolCumulativeVolumeArgs = {
  duration: HistoryDuration;
};


export type V4PoolHistoricalVolumeArgs = {
  duration: HistoryDuration;
};


export type V4PoolPriceHistoryArgs = {
  duration: HistoryDuration;
};


export type V4PoolTicksArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type V4PoolTransactionsArgs = {
  first: Scalars['Int']['input'];
  timestampCursor?: InputMaybe<Scalars['Int']['input']>;
};

export type V4PoolHook = {
  __typename?: 'V4PoolHook';
  address: Scalars['String']['output'];
  id: Scalars['ID']['output'];
};

export type V4PoolTick = {
  __typename?: 'V4PoolTick';
  id: Scalars['ID']['output'];
  liquidityGross?: Maybe<Scalars['String']['output']>;
  liquidityNet?: Maybe<Scalars['String']['output']>;
  price0?: Maybe<Scalars['String']['output']>;
  price1?: Maybe<Scalars['String']['output']>;
  tickIdx?: Maybe<Scalars['Int']['output']>;
};

export type ConvertQueryVariables = Exact<{
  fromCurrency: Currency;
  toCurrency: Currency;
}>;


export type ConvertQuery = { __typename?: 'Query', convert?: { __typename?: 'Amount', value: number, currency?: Currency | undefined } | undefined };


export const ConvertDocument = gql`
    query Convert($fromCurrency: Currency!, $toCurrency: Currency!) {
  convert(
    fromAmount: {currency: $fromCurrency, value: 1.0}
    toCurrency: $toCurrency
  ) {
    value
    currency
  }
}
    `;

/**
 * __useConvertQuery__
 *
 * To run a query within a React component, call `useConvertQuery` and pass it any options that fit your needs.
 * When your component renders, `useConvertQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useConvertQuery({
 *   variables: {
 *      fromCurrency: // value for 'fromCurrency'
 *      toCurrency: // value for 'toCurrency'
 *   },
 * });
 */
export function useConvertQuery(baseOptions: Apollo.QueryHookOptions<ConvertQuery, ConvertQueryVariables> & ({ variables: ConvertQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ConvertQuery, ConvertQueryVariables>(ConvertDocument, options);
      }
export function useConvertLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ConvertQuery, ConvertQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ConvertQuery, ConvertQueryVariables>(ConvertDocument, options);
        }
export function useConvertSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ConvertQuery, ConvertQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ConvertQuery, ConvertQueryVariables>(ConvertDocument, options);
        }
export type ConvertQueryHookResult = ReturnType<typeof useConvertQuery>;
export type ConvertLazyQueryHookResult = ReturnType<typeof useConvertLazyQuery>;
export type ConvertSuspenseQueryHookResult = ReturnType<typeof useConvertSuspenseQuery>;
export type ConvertQueryResult = Apollo.QueryResult<ConvertQuery, ConvertQueryVariables>;


export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

/** Mapping of union types */
export type ResolversUnionTypes<_RefType extends Record<string, unknown>> = {
  ActivityDetails: ( OnRampTransactionDetails ) | ( SwapOrderDetails ) | ( Omit<TransactionDetails, 'assetChanges'> & { assetChanges: Array<Maybe<_RefType['AssetChange']>> } );
  AssetChange: ( NftApproval ) | ( NftApproveForAll ) | ( NftTransfer ) | ( OnRampTransfer ) | ( TokenApproval ) | ( TokenTransfer );
};

/** Mapping of interface types */
export type ResolversInterfaceTypes<_RefType extends Record<string, unknown>> = {
  IAmount: ( Amount ) | ( TimestampedAmount );
  IContract: ( ApplicationContract ) | ( NftContract ) | ( Token );
  IPool: ( V2Pair ) | ( V3Pool );
};

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  AWSJSON: ResolverTypeWrapper<Scalars['AWSJSON']['output']>;
  ActivityDetails: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['ActivityDetails']>;
  ActivityDetailsInput: ActivityDetailsInput;
  ActivityType: ActivityType;
  Amount: ResolverTypeWrapper<Amount>;
  AmountChange: ResolverTypeWrapper<AmountChange>;
  AmountInput: AmountInput;
  ApplicationContract: ResolverTypeWrapper<ApplicationContract>;
  ApplicationContractInput: ApplicationContractInput;
  AssetActivity: ResolverTypeWrapper<Omit<AssetActivity, 'assetChanges' | 'details'> & { assetChanges: Array<Maybe<ResolversTypes['AssetChange']>>, details: ResolversTypes['ActivityDetails'] }>;
  AssetActivityInput: AssetActivityInput;
  AssetActivitySwitch: AssetActivitySwitch;
  AssetChange: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['AssetChange']>;
  AssetChangeInput: AssetChangeInput;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Chain: Chain;
  CollectionSortableField: CollectionSortableField;
  ContractInput: ContractInput;
  Currency: Currency;
  CurrencyAmountInput: CurrencyAmountInput;
  DescriptionTranslations: ResolverTypeWrapper<DescriptionTranslations>;
  Dimensions: ResolverTypeWrapper<Dimensions>;
  DimensionsInput: DimensionsInput;
  FeeData: ResolverTypeWrapper<FeeData>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  HighLow: HighLow;
  HistoryDuration: HistoryDuration;
  IAmount: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['IAmount']>;
  IContract: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['IContract']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  IPool: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['IPool']>;
  Image: ResolverTypeWrapper<Image>;
  ImageInput: ImageInput;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  MediaType: MediaType;
  Mutation: ResolverTypeWrapper<{}>;
  NetworkFee: ResolverTypeWrapper<NetworkFee>;
  NftActivity: ResolverTypeWrapper<NftActivity>;
  NftActivityConnection: ResolverTypeWrapper<NftActivityConnection>;
  NftActivityEdge: ResolverTypeWrapper<NftActivityEdge>;
  NftActivityFilterInput: NftActivityFilterInput;
  NftActivityType: NftActivityType;
  NftApproval: ResolverTypeWrapper<NftApproval>;
  NftApprovalInput: NftApprovalInput;
  NftApproveForAll: ResolverTypeWrapper<NftApproveForAll>;
  NftApproveForAllInput: NftApproveForAllInput;
  NftAsset: ResolverTypeWrapper<NftAsset>;
  NftAssetConnection: ResolverTypeWrapper<NftAssetConnection>;
  NftAssetEdge: ResolverTypeWrapper<NftAssetEdge>;
  NftAssetInput: NftAssetInput;
  NftAssetRarity: ResolverTypeWrapper<NftAssetRarity>;
  NftAssetSortableField: NftAssetSortableField;
  NftAssetTrait: ResolverTypeWrapper<NftAssetTrait>;
  NftAssetTraitInput: NftAssetTraitInput;
  NftAssetsFilterInput: NftAssetsFilterInput;
  NftBalance: ResolverTypeWrapper<NftBalance>;
  NftBalanceAssetInput: NftBalanceAssetInput;
  NftBalanceConnection: ResolverTypeWrapper<NftBalanceConnection>;
  NftBalanceEdge: ResolverTypeWrapper<NftBalanceEdge>;
  NftBalancesFilterInput: NftBalancesFilterInput;
  NftCollection: ResolverTypeWrapper<NftCollection>;
  NftCollectionBalance: ResolverTypeWrapper<NftCollectionBalance>;
  NftCollectionBalanceConnection: ResolverTypeWrapper<NftCollectionBalanceConnection>;
  NftCollectionBalanceEdge: ResolverTypeWrapper<NftCollectionBalanceEdge>;
  NftCollectionConnection: ResolverTypeWrapper<NftCollectionConnection>;
  NftCollectionEdge: ResolverTypeWrapper<NftCollectionEdge>;
  NftCollectionInput: NftCollectionInput;
  NftCollectionMarket: ResolverTypeWrapper<NftCollectionMarket>;
  NftCollectionMarketplace: ResolverTypeWrapper<NftCollectionMarketplace>;
  NftCollectionTrait: ResolverTypeWrapper<NftCollectionTrait>;
  NftCollectionTraitStats: ResolverTypeWrapper<NftCollectionTraitStats>;
  NftCollectionsFilterInput: NftCollectionsFilterInput;
  NftContract: ResolverTypeWrapper<NftContract>;
  NftContractInput: NftContractInput;
  NftFee: ResolverTypeWrapper<NftFee>;
  NftMarketplace: NftMarketplace;
  NftOrder: ResolverTypeWrapper<NftOrder>;
  NftOrderConnection: ResolverTypeWrapper<NftOrderConnection>;
  NftOrderEdge: ResolverTypeWrapper<NftOrderEdge>;
  NftProfile: ResolverTypeWrapper<NftProfile>;
  NftRarityProvider: NftRarityProvider;
  NftRouteResponse: ResolverTypeWrapper<NftRouteResponse>;
  NftStandard: NftStandard;
  NftTrade: ResolverTypeWrapper<NftTrade>;
  NftTradeInput: NftTradeInput;
  NftTransfer: ResolverTypeWrapper<NftTransfer>;
  NftTransferInput: NftTransferInput;
  OnRampServiceProvider: ResolverTypeWrapper<OnRampServiceProvider>;
  OnRampServiceProviderInput: OnRampServiceProviderInput;
  OnRampTransactionDetails: ResolverTypeWrapper<OnRampTransactionDetails>;
  OnRampTransactionDetailsInput: OnRampTransactionDetailsInput;
  OnRampTransactionsAuth: OnRampTransactionsAuth;
  OnRampTransfer: ResolverTypeWrapper<OnRampTransfer>;
  OnRampTransferInput: OnRampTransferInput;
  OrderStatus: OrderStatus;
  OrderType: OrderType;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  PairInput: PairInput;
  PermitDetailsInput: PermitDetailsInput;
  PermitInput: PermitInput;
  PoolInput: PoolInput;
  PoolTransaction: ResolverTypeWrapper<PoolTransaction>;
  PoolTransactionType: PoolTransactionType;
  Portfolio: ResolverTypeWrapper<Omit<Portfolio, 'assetActivities'> & { assetActivities?: Maybe<Array<Maybe<ResolversTypes['AssetActivity']>>> }>;
  PortfolioValueModifier: PortfolioValueModifier;
  PriceSource: PriceSource;
  ProtectionAttackType: ProtectionAttackType;
  ProtectionInfo: ResolverTypeWrapper<ProtectionInfo>;
  ProtectionResult: ProtectionResult;
  ProtocolVersion: ProtocolVersion;
  PushNotification: ResolverTypeWrapper<PushNotification>;
  Query: ResolverTypeWrapper<{}>;
  SafetyLevel: SafetyLevel;
  Status: ResolverTypeWrapper<Status>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Subscription: ResolverTypeWrapper<{}>;
  SubscriptionType: SubscriptionType;
  SwapOrderDetails: ResolverTypeWrapper<SwapOrderDetails>;
  SwapOrderDetailsInput: SwapOrderDetailsInput;
  SwapOrderStatus: SwapOrderStatus;
  SwapOrderType: SwapOrderType;
  TimestampedAmount: ResolverTypeWrapper<TimestampedAmount>;
  TimestampedOhlc: ResolverTypeWrapper<TimestampedOhlc>;
  TimestampedPoolPrice: ResolverTypeWrapper<TimestampedPoolPrice>;
  Token: ResolverTypeWrapper<Token>;
  TokenAmount: ResolverTypeWrapper<TokenAmount>;
  TokenAmountInput: TokenAmountInput;
  TokenApproval: ResolverTypeWrapper<TokenApproval>;
  TokenApprovalInput: TokenApprovalInput;
  TokenAssetInput: TokenAssetInput;
  TokenBalance: ResolverTypeWrapper<TokenBalance>;
  TokenInput: TokenInput;
  TokenMarket: ResolverTypeWrapper<TokenMarket>;
  TokenProject: ResolverTypeWrapper<TokenProject>;
  TokenProjectMarket: ResolverTypeWrapper<TokenProjectMarket>;
  TokenSortableField: TokenSortableField;
  TokenStandard: TokenStandard;
  TokenTradeInput: TokenTradeInput;
  TokenTradeRouteInput: TokenTradeRouteInput;
  TokenTradeRoutesInput: TokenTradeRoutesInput;
  TokenTradeType: TokenTradeType;
  TokenTransfer: ResolverTypeWrapper<TokenTransfer>;
  TokenTransferInput: TokenTransferInput;
  TradePoolInput: TradePoolInput;
  Transaction: ResolverTypeWrapper<Transaction>;
  TransactionDetails: ResolverTypeWrapper<Omit<TransactionDetails, 'assetChanges'> & { assetChanges: Array<Maybe<ResolversTypes['AssetChange']>> }>;
  TransactionDetailsInput: TransactionDetailsInput;
  TransactionDirection: TransactionDirection;
  TransactionNotification: ResolverTypeWrapper<TransactionNotification>;
  TransactionStatus: TransactionStatus;
  TransactionType: TransactionType;
  V2Pair: ResolverTypeWrapper<V2Pair>;
  V3Pool: ResolverTypeWrapper<V3Pool>;
  V3PoolTick: ResolverTypeWrapper<V3PoolTick>;
  V4Pool: ResolverTypeWrapper<V4Pool>;
  V4PoolHook: ResolverTypeWrapper<V4PoolHook>;
  V4PoolTick: ResolverTypeWrapper<V4PoolTick>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  AWSJSON: Scalars['AWSJSON']['output'];
  ActivityDetails: ResolversUnionTypes<ResolversParentTypes>['ActivityDetails'];
  ActivityDetailsInput: ActivityDetailsInput;
  Amount: Amount;
  AmountChange: AmountChange;
  AmountInput: AmountInput;
  ApplicationContract: ApplicationContract;
  ApplicationContractInput: ApplicationContractInput;
  AssetActivity: Omit<AssetActivity, 'assetChanges' | 'details'> & { assetChanges: Array<Maybe<ResolversParentTypes['AssetChange']>>, details: ResolversParentTypes['ActivityDetails'] };
  AssetActivityInput: AssetActivityInput;
  AssetChange: ResolversUnionTypes<ResolversParentTypes>['AssetChange'];
  AssetChangeInput: AssetChangeInput;
  Boolean: Scalars['Boolean']['output'];
  ContractInput: ContractInput;
  CurrencyAmountInput: CurrencyAmountInput;
  DescriptionTranslations: DescriptionTranslations;
  Dimensions: Dimensions;
  DimensionsInput: DimensionsInput;
  FeeData: FeeData;
  Float: Scalars['Float']['output'];
  IAmount: ResolversInterfaceTypes<ResolversParentTypes>['IAmount'];
  IContract: ResolversInterfaceTypes<ResolversParentTypes>['IContract'];
  ID: Scalars['ID']['output'];
  IPool: ResolversInterfaceTypes<ResolversParentTypes>['IPool'];
  Image: Image;
  ImageInput: ImageInput;
  Int: Scalars['Int']['output'];
  Mutation: {};
  NetworkFee: NetworkFee;
  NftActivity: NftActivity;
  NftActivityConnection: NftActivityConnection;
  NftActivityEdge: NftActivityEdge;
  NftActivityFilterInput: NftActivityFilterInput;
  NftApproval: NftApproval;
  NftApprovalInput: NftApprovalInput;
  NftApproveForAll: NftApproveForAll;
  NftApproveForAllInput: NftApproveForAllInput;
  NftAsset: NftAsset;
  NftAssetConnection: NftAssetConnection;
  NftAssetEdge: NftAssetEdge;
  NftAssetInput: NftAssetInput;
  NftAssetRarity: NftAssetRarity;
  NftAssetTrait: NftAssetTrait;
  NftAssetTraitInput: NftAssetTraitInput;
  NftAssetsFilterInput: NftAssetsFilterInput;
  NftBalance: NftBalance;
  NftBalanceAssetInput: NftBalanceAssetInput;
  NftBalanceConnection: NftBalanceConnection;
  NftBalanceEdge: NftBalanceEdge;
  NftBalancesFilterInput: NftBalancesFilterInput;
  NftCollection: NftCollection;
  NftCollectionBalance: NftCollectionBalance;
  NftCollectionBalanceConnection: NftCollectionBalanceConnection;
  NftCollectionBalanceEdge: NftCollectionBalanceEdge;
  NftCollectionConnection: NftCollectionConnection;
  NftCollectionEdge: NftCollectionEdge;
  NftCollectionInput: NftCollectionInput;
  NftCollectionMarket: NftCollectionMarket;
  NftCollectionMarketplace: NftCollectionMarketplace;
  NftCollectionTrait: NftCollectionTrait;
  NftCollectionTraitStats: NftCollectionTraitStats;
  NftCollectionsFilterInput: NftCollectionsFilterInput;
  NftContract: NftContract;
  NftContractInput: NftContractInput;
  NftFee: NftFee;
  NftOrder: NftOrder;
  NftOrderConnection: NftOrderConnection;
  NftOrderEdge: NftOrderEdge;
  NftProfile: NftProfile;
  NftRouteResponse: NftRouteResponse;
  NftTrade: NftTrade;
  NftTradeInput: NftTradeInput;
  NftTransfer: NftTransfer;
  NftTransferInput: NftTransferInput;
  OnRampServiceProvider: OnRampServiceProvider;
  OnRampServiceProviderInput: OnRampServiceProviderInput;
  OnRampTransactionDetails: OnRampTransactionDetails;
  OnRampTransactionDetailsInput: OnRampTransactionDetailsInput;
  OnRampTransactionsAuth: OnRampTransactionsAuth;
  OnRampTransfer: OnRampTransfer;
  OnRampTransferInput: OnRampTransferInput;
  PageInfo: PageInfo;
  PairInput: PairInput;
  PermitDetailsInput: PermitDetailsInput;
  PermitInput: PermitInput;
  PoolInput: PoolInput;
  PoolTransaction: PoolTransaction;
  Portfolio: Omit<Portfolio, 'assetActivities'> & { assetActivities?: Maybe<Array<Maybe<ResolversParentTypes['AssetActivity']>>> };
  PortfolioValueModifier: PortfolioValueModifier;
  ProtectionInfo: ProtectionInfo;
  PushNotification: PushNotification;
  Query: {};
  Status: Status;
  String: Scalars['String']['output'];
  Subscription: {};
  SwapOrderDetails: SwapOrderDetails;
  SwapOrderDetailsInput: SwapOrderDetailsInput;
  TimestampedAmount: TimestampedAmount;
  TimestampedOhlc: TimestampedOhlc;
  TimestampedPoolPrice: TimestampedPoolPrice;
  Token: Token;
  TokenAmount: TokenAmount;
  TokenAmountInput: TokenAmountInput;
  TokenApproval: TokenApproval;
  TokenApprovalInput: TokenApprovalInput;
  TokenAssetInput: TokenAssetInput;
  TokenBalance: TokenBalance;
  TokenInput: TokenInput;
  TokenMarket: TokenMarket;
  TokenProject: TokenProject;
  TokenProjectMarket: TokenProjectMarket;
  TokenTradeInput: TokenTradeInput;
  TokenTradeRouteInput: TokenTradeRouteInput;
  TokenTradeRoutesInput: TokenTradeRoutesInput;
  TokenTransfer: TokenTransfer;
  TokenTransferInput: TokenTransferInput;
  TradePoolInput: TradePoolInput;
  Transaction: Transaction;
  TransactionDetails: Omit<TransactionDetails, 'assetChanges'> & { assetChanges: Array<Maybe<ResolversParentTypes['AssetChange']>> };
  TransactionDetailsInput: TransactionDetailsInput;
  TransactionNotification: TransactionNotification;
  V2Pair: V2Pair;
  V3Pool: V3Pool;
  V3PoolTick: V3PoolTick;
  V4Pool: V4Pool;
  V4PoolHook: V4PoolHook;
  V4PoolTick: V4PoolTick;
};

export type Aws_Api_KeyDirectiveArgs = { };

export type Aws_Api_KeyDirectiveResolver<Result, Parent, ContextType = any, Args = Aws_Api_KeyDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type Aws_AuthDirectiveArgs = {
  cognito_groups?: Maybe<Array<Maybe<Scalars['String']['input']>>>;
};

export type Aws_AuthDirectiveResolver<Result, Parent, ContextType = any, Args = Aws_AuthDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type Aws_Cognito_User_PoolsDirectiveArgs = {
  cognito_groups?: Maybe<Array<Maybe<Scalars['String']['input']>>>;
};

export type Aws_Cognito_User_PoolsDirectiveResolver<Result, Parent, ContextType = any, Args = Aws_Cognito_User_PoolsDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type Aws_IamDirectiveArgs = { };

export type Aws_IamDirectiveResolver<Result, Parent, ContextType = any, Args = Aws_IamDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type Aws_LambdaDirectiveArgs = { };

export type Aws_LambdaDirectiveResolver<Result, Parent, ContextType = any, Args = Aws_LambdaDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type Aws_OidcDirectiveArgs = { };

export type Aws_OidcDirectiveResolver<Result, Parent, ContextType = any, Args = Aws_OidcDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type Aws_PublishDirectiveArgs = {
  subscriptions?: Maybe<Array<Maybe<Scalars['String']['input']>>>;
};

export type Aws_PublishDirectiveResolver<Result, Parent, ContextType = any, Args = Aws_PublishDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type Aws_SubscribeDirectiveArgs = {
  mutations?: Maybe<Array<Maybe<Scalars['String']['input']>>>;
};

export type Aws_SubscribeDirectiveResolver<Result, Parent, ContextType = any, Args = Aws_SubscribeDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type DeferDirectiveArgs = { };

export type DeferDirectiveResolver<Result, Parent, ContextType = any, Args = DeferDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export interface AwsjsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['AWSJSON'], any> {
  name: 'AWSJSON';
}

export type ActivityDetailsResolvers<ContextType = any, ParentType extends ResolversParentTypes['ActivityDetails'] = ResolversParentTypes['ActivityDetails']> = {
  __resolveType: TypeResolveFn<'OnRampTransactionDetails' | 'SwapOrderDetails' | 'TransactionDetails', ParentType, ContextType>;
};

export type AmountResolvers<ContextType = any, ParentType extends ResolversParentTypes['Amount'] = ResolversParentTypes['Amount']> = {
  currency?: Resolver<Maybe<ResolversTypes['Currency']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AmountChangeResolvers<ContextType = any, ParentType extends ResolversParentTypes['AmountChange'] = ResolversParentTypes['AmountChange']> = {
  absolute?: Resolver<Maybe<ResolversTypes['Amount']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  percentage?: Resolver<Maybe<ResolversTypes['Amount']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApplicationContractResolvers<ContextType = any, ParentType extends ResolversParentTypes['ApplicationContract'] = ResolversParentTypes['ApplicationContract']> = {
  address?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  chain?: Resolver<ResolversTypes['Chain'], ParentType, ContextType>;
  icon?: Resolver<Maybe<ResolversTypes['Image']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AssetActivityResolvers<ContextType = any, ParentType extends ResolversParentTypes['AssetActivity'] = ResolversParentTypes['AssetActivity']> = {
  addresses?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  assetChanges?: Resolver<Array<Maybe<ResolversTypes['AssetChange']>>, ParentType, ContextType>;
  chain?: Resolver<ResolversTypes['Chain'], ParentType, ContextType>;
  details?: Resolver<ResolversTypes['ActivityDetails'], ParentType, ContextType>;
  gasUsed?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  timestamp?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  transaction?: Resolver<ResolversTypes['Transaction'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ActivityType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AssetChangeResolvers<ContextType = any, ParentType extends ResolversParentTypes['AssetChange'] = ResolversParentTypes['AssetChange']> = {
  __resolveType: TypeResolveFn<'NftApproval' | 'NftApproveForAll' | 'NftTransfer' | 'OnRampTransfer' | 'TokenApproval' | 'TokenTransfer', ParentType, ContextType>;
};

export type DescriptionTranslationsResolvers<ContextType = any, ParentType extends ResolversParentTypes['DescriptionTranslations'] = ResolversParentTypes['DescriptionTranslations']> = {
  descriptionEnUs?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  descriptionEs419?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  descriptionEsEs?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  descriptionEsUs?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  descriptionFrFr?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  descriptionHiIn?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  descriptionIdId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  descriptionJaJp?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  descriptionMsMy?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  descriptionNlNl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  descriptionPtPt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  descriptionRuRu?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  descriptionThTh?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  descriptionTrTr?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  descriptionUkUa?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  descriptionUrPk?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  descriptionViVn?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  descriptionZhHans?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  descriptionZhHant?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type DimensionsResolvers<ContextType = any, ParentType extends ResolversParentTypes['Dimensions'] = ResolversParentTypes['Dimensions']> = {
  height?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  width?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type FeeDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['FeeData'] = ResolversParentTypes['FeeData']> = {
  buyFeeBps?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  externalTransferFailed?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  feeTakenOnTransfer?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  sellFeeBps?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  sellReverted?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IAmountResolvers<ContextType = any, ParentType extends ResolversParentTypes['IAmount'] = ResolversParentTypes['IAmount']> = {
  __resolveType: TypeResolveFn<'Amount' | 'TimestampedAmount', ParentType, ContextType>;
  currency?: Resolver<Maybe<ResolversTypes['Currency']>, ParentType, ContextType>;
  value?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
};

export type IContractResolvers<ContextType = any, ParentType extends ResolversParentTypes['IContract'] = ResolversParentTypes['IContract']> = {
  __resolveType: TypeResolveFn<'ApplicationContract' | 'NftContract' | 'Token', ParentType, ContextType>;
  address?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  chain?: Resolver<ResolversTypes['Chain'], ParentType, ContextType>;
};

export type IPoolResolvers<ContextType = any, ParentType extends ResolversParentTypes['IPool'] = ResolversParentTypes['IPool']> = {
  __resolveType: TypeResolveFn<'V2Pair' | 'V3Pool', ParentType, ContextType>;
  address?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  chain?: Resolver<ResolversTypes['Chain'], ParentType, ContextType>;
  createdAtTimestamp?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  cumulativeVolume?: Resolver<Maybe<ResolversTypes['Amount']>, ParentType, ContextType, RequireFields<IPoolCumulativeVolumeArgs, 'duration'>>;
  historicalVolume?: Resolver<Maybe<Array<Maybe<ResolversTypes['TimestampedAmount']>>>, ParentType, ContextType, RequireFields<IPoolHistoricalVolumeArgs, 'duration'>>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  priceHistory?: Resolver<Maybe<Array<Maybe<ResolversTypes['TimestampedPoolPrice']>>>, ParentType, ContextType, RequireFields<IPoolPriceHistoryArgs, 'duration'>>;
  protocolVersion?: Resolver<ResolversTypes['ProtocolVersion'], ParentType, ContextType>;
  token0?: Resolver<Maybe<ResolversTypes['Token']>, ParentType, ContextType>;
  token0Supply?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  token1?: Resolver<Maybe<ResolversTypes['Token']>, ParentType, ContextType>;
  token1Supply?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  totalLiquidity?: Resolver<Maybe<ResolversTypes['Amount']>, ParentType, ContextType>;
  totalLiquidityPercentChange24h?: Resolver<Maybe<ResolversTypes['Amount']>, ParentType, ContextType>;
  transactions?: Resolver<Maybe<Array<Maybe<ResolversTypes['PoolTransaction']>>>, ParentType, ContextType, RequireFields<IPoolTransactionsArgs, 'first'>>;
  txCount?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
};

export type ImageResolvers<ContextType = any, ParentType extends ResolversParentTypes['Image'] = ResolversParentTypes['Image']> = {
  dimensions?: Resolver<Maybe<ResolversTypes['Dimensions']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type MutationResolvers<ContextType = any, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  assetActivity?: Resolver<ResolversTypes['AssetActivity'], ParentType, ContextType, RequireFields<MutationAssetActivityArgs, 'input'>>;
  heartbeat?: Resolver<ResolversTypes['Status'], ParentType, ContextType, RequireFields<MutationHeartbeatArgs, 'subscriptionId' | 'type'>>;
  unsubscribe?: Resolver<ResolversTypes['Status'], ParentType, ContextType, RequireFields<MutationUnsubscribeArgs, 'subscriptionId' | 'type'>>;
};

export type NetworkFeeResolvers<ContextType = any, ParentType extends ResolversParentTypes['NetworkFee'] = ResolversParentTypes['NetworkFee']> = {
  quantity?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  tokenAddress?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  tokenChain?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  tokenSymbol?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NftActivityResolvers<ContextType = any, ParentType extends ResolversParentTypes['NftActivity'] = ResolversParentTypes['NftActivity']> = {
  address?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  asset?: Resolver<Maybe<ResolversTypes['NftAsset']>, ParentType, ContextType>;
  fromAddress?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  marketplace?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  orderStatus?: Resolver<Maybe<ResolversTypes['OrderStatus']>, ParentType, ContextType>;
  price?: Resolver<Maybe<ResolversTypes['Amount']>, ParentType, ContextType>;
  quantity?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  timestamp?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  toAddress?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  tokenId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  transactionHash?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['NftActivityType'], ParentType, ContextType>;
  url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NftActivityConnectionResolvers<ContextType = any, ParentType extends ResolversParentTypes['NftActivityConnection'] = ResolversParentTypes['NftActivityConnection']> = {
  edges?: Resolver<Array<ResolversTypes['NftActivityEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NftActivityEdgeResolvers<ContextType = any, ParentType extends ResolversParentTypes['NftActivityEdge'] = ResolversParentTypes['NftActivityEdge']> = {
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['NftActivity'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NftApprovalResolvers<ContextType = any, ParentType extends ResolversParentTypes['NftApproval'] = ResolversParentTypes['NftApproval']> = {
  approvedAddress?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  asset?: Resolver<ResolversTypes['NftAsset'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  nftStandard?: Resolver<ResolversTypes['NftStandard'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NftApproveForAllResolvers<ContextType = any, ParentType extends ResolversParentTypes['NftApproveForAll'] = ResolversParentTypes['NftApproveForAll']> = {
  approved?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  asset?: Resolver<ResolversTypes['NftAsset'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  nftStandard?: Resolver<ResolversTypes['NftStandard'], ParentType, ContextType>;
  operatorAddress?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NftAssetResolvers<ContextType = any, ParentType extends ResolversParentTypes['NftAsset'] = ResolversParentTypes['NftAsset']> = {
  animationUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  chain?: Resolver<Maybe<ResolversTypes['Chain']>, ParentType, ContextType>;
  collection?: Resolver<Maybe<ResolversTypes['NftCollection']>, ParentType, ContextType>;
  creator?: Resolver<Maybe<ResolversTypes['NftProfile']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  flaggedBy?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  image?: Resolver<Maybe<ResolversTypes['Image']>, ParentType, ContextType>;
  imageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  isSpam?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  listings?: Resolver<Maybe<ResolversTypes['NftOrderConnection']>, ParentType, ContextType, Partial<NftAssetListingsArgs>>;
  mediaType?: Resolver<Maybe<ResolversTypes['MediaType']>, ParentType, ContextType>;
  metadataUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  nftContract?: Resolver<Maybe<ResolversTypes['NftContract']>, ParentType, ContextType>;
  originalImage?: Resolver<Maybe<ResolversTypes['Image']>, ParentType, ContextType>;
  ownerAddress?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  rarities?: Resolver<Maybe<Array<ResolversTypes['NftAssetRarity']>>, ParentType, ContextType>;
  smallImage?: Resolver<Maybe<ResolversTypes['Image']>, ParentType, ContextType>;
  smallImageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  suspiciousFlag?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  thumbnail?: Resolver<Maybe<ResolversTypes['Image']>, ParentType, ContextType>;
  thumbnailUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  tokenId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  traits?: Resolver<Maybe<Array<ResolversTypes['NftAssetTrait']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NftAssetConnectionResolvers<ContextType = any, ParentType extends ResolversParentTypes['NftAssetConnection'] = ResolversParentTypes['NftAssetConnection']> = {
  edges?: Resolver<Array<ResolversTypes['NftAssetEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NftAssetEdgeResolvers<ContextType = any, ParentType extends ResolversParentTypes['NftAssetEdge'] = ResolversParentTypes['NftAssetEdge']> = {
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['NftAsset'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NftAssetRarityResolvers<ContextType = any, ParentType extends ResolversParentTypes['NftAssetRarity'] = ResolversParentTypes['NftAssetRarity']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  provider?: Resolver<Maybe<ResolversTypes['NftRarityProvider']>, ParentType, ContextType>;
  rank?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  score?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NftAssetTraitResolvers<ContextType = any, ParentType extends ResolversParentTypes['NftAssetTrait'] = ResolversParentTypes['NftAssetTrait']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  rarity?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  value?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NftBalanceResolvers<ContextType = any, ParentType extends ResolversParentTypes['NftBalance'] = ResolversParentTypes['NftBalance']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lastPrice?: Resolver<Maybe<ResolversTypes['TimestampedAmount']>, ParentType, ContextType>;
  listedMarketplaces?: Resolver<Maybe<Array<ResolversTypes['NftMarketplace']>>, ParentType, ContextType>;
  listingFees?: Resolver<Maybe<Array<Maybe<ResolversTypes['NftFee']>>>, ParentType, ContextType>;
  ownedAsset?: Resolver<Maybe<ResolversTypes['NftAsset']>, ParentType, ContextType>;
  quantity?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NftBalanceConnectionResolvers<ContextType = any, ParentType extends ResolversParentTypes['NftBalanceConnection'] = ResolversParentTypes['NftBalanceConnection']> = {
  edges?: Resolver<Array<ResolversTypes['NftBalanceEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NftBalanceEdgeResolvers<ContextType = any, ParentType extends ResolversParentTypes['NftBalanceEdge'] = ResolversParentTypes['NftBalanceEdge']> = {
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['NftBalance'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NftCollectionResolvers<ContextType = any, ParentType extends ResolversParentTypes['NftCollection'] = ResolversParentTypes['NftCollection']> = {
  bannerImage?: Resolver<Maybe<ResolversTypes['Image']>, ParentType, ContextType>;
  bannerImageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  collectionId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  creator?: Resolver<Maybe<ResolversTypes['NftProfile']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  discordUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  homepageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  image?: Resolver<Maybe<ResolversTypes['Image']>, ParentType, ContextType>;
  imageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  instagramName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  isVerified?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  markets?: Resolver<Maybe<Array<ResolversTypes['NftCollectionMarket']>>, ParentType, ContextType, RequireFields<NftCollectionMarketsArgs, 'currencies'>>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  nftContracts?: Resolver<Maybe<Array<ResolversTypes['NftContract']>>, ParentType, ContextType>;
  numAssets?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  openseaUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  traits?: Resolver<Maybe<Array<ResolversTypes['NftCollectionTrait']>>, ParentType, ContextType>;
  twitterName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NftCollectionBalanceResolvers<ContextType = any, ParentType extends ResolversParentTypes['NftCollectionBalance'] = ResolversParentTypes['NftCollectionBalance']> = {
  address?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  balance?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  logoImage?: Resolver<Maybe<ResolversTypes['Image']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NftCollectionBalanceConnectionResolvers<ContextType = any, ParentType extends ResolversParentTypes['NftCollectionBalanceConnection'] = ResolversParentTypes['NftCollectionBalanceConnection']> = {
  edges?: Resolver<Array<ResolversTypes['NftCollectionBalanceEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NftCollectionBalanceEdgeResolvers<ContextType = any, ParentType extends ResolversParentTypes['NftCollectionBalanceEdge'] = ResolversParentTypes['NftCollectionBalanceEdge']> = {
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['NftCollectionBalance'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NftCollectionConnectionResolvers<ContextType = any, ParentType extends ResolversParentTypes['NftCollectionConnection'] = ResolversParentTypes['NftCollectionConnection']> = {
  edges?: Resolver<Array<ResolversTypes['NftCollectionEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NftCollectionEdgeResolvers<ContextType = any, ParentType extends ResolversParentTypes['NftCollectionEdge'] = ResolversParentTypes['NftCollectionEdge']> = {
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['NftCollection'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NftCollectionMarketResolvers<ContextType = any, ParentType extends ResolversParentTypes['NftCollectionMarket'] = ResolversParentTypes['NftCollectionMarket']> = {
  floorPrice?: Resolver<Maybe<ResolversTypes['TimestampedAmount']>, ParentType, ContextType>;
  floorPricePercentChange?: Resolver<Maybe<ResolversTypes['TimestampedAmount']>, ParentType, ContextType, Partial<NftCollectionMarketFloorPricePercentChangeArgs>>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  listings?: Resolver<Maybe<ResolversTypes['TimestampedAmount']>, ParentType, ContextType>;
  marketplaces?: Resolver<Maybe<Array<ResolversTypes['NftCollectionMarketplace']>>, ParentType, ContextType, Partial<NftCollectionMarketMarketplacesArgs>>;
  nftContracts?: Resolver<Maybe<Array<ResolversTypes['NftContract']>>, ParentType, ContextType>;
  owners?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  percentListed?: Resolver<Maybe<ResolversTypes['TimestampedAmount']>, ParentType, ContextType>;
  percentUniqueOwners?: Resolver<Maybe<ResolversTypes['TimestampedAmount']>, ParentType, ContextType>;
  sales?: Resolver<Maybe<ResolversTypes['TimestampedAmount']>, ParentType, ContextType, Partial<NftCollectionMarketSalesArgs>>;
  totalVolume?: Resolver<Maybe<ResolversTypes['TimestampedAmount']>, ParentType, ContextType>;
  volume?: Resolver<Maybe<ResolversTypes['TimestampedAmount']>, ParentType, ContextType, Partial<NftCollectionMarketVolumeArgs>>;
  volume24h?: Resolver<Maybe<ResolversTypes['Amount']>, ParentType, ContextType>;
  volumePercentChange?: Resolver<Maybe<ResolversTypes['TimestampedAmount']>, ParentType, ContextType, Partial<NftCollectionMarketVolumePercentChangeArgs>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NftCollectionMarketplaceResolvers<ContextType = any, ParentType extends ResolversParentTypes['NftCollectionMarketplace'] = ResolversParentTypes['NftCollectionMarketplace']> = {
  floorPrice?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  listings?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  marketplace?: Resolver<Maybe<ResolversTypes['NftMarketplace']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NftCollectionTraitResolvers<ContextType = any, ParentType extends ResolversParentTypes['NftCollectionTrait'] = ResolversParentTypes['NftCollectionTrait']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  stats?: Resolver<Maybe<Array<ResolversTypes['NftCollectionTraitStats']>>, ParentType, ContextType>;
  values?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NftCollectionTraitStatsResolvers<ContextType = any, ParentType extends ResolversParentTypes['NftCollectionTraitStats'] = ResolversParentTypes['NftCollectionTraitStats']> = {
  assets?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  listings?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  value?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NftContractResolvers<ContextType = any, ParentType extends ResolversParentTypes['NftContract'] = ResolversParentTypes['NftContract']> = {
  address?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  chain?: Resolver<ResolversTypes['Chain'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  standard?: Resolver<Maybe<ResolversTypes['NftStandard']>, ParentType, ContextType>;
  symbol?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  totalSupply?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NftFeeResolvers<ContextType = any, ParentType extends ResolversParentTypes['NftFee'] = ResolversParentTypes['NftFee']> = {
  basisPoints?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  payoutAddress?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NftOrderResolvers<ContextType = any, ParentType extends ResolversParentTypes['NftOrder'] = ResolversParentTypes['NftOrder']> = {
  address?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  auctionType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  endAt?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  maker?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  marketplace?: Resolver<ResolversTypes['NftMarketplace'], ParentType, ContextType>;
  marketplaceUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  orderHash?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  poolPrices?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  price?: Resolver<ResolversTypes['Amount'], ParentType, ContextType>;
  protocolParameters?: Resolver<Maybe<ResolversTypes['AWSJSON']>, ParentType, ContextType>;
  quantity?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  startAt?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['OrderStatus'], ParentType, ContextType>;
  taker?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  tokenId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['OrderType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NftOrderConnectionResolvers<ContextType = any, ParentType extends ResolversParentTypes['NftOrderConnection'] = ResolversParentTypes['NftOrderConnection']> = {
  edges?: Resolver<Array<ResolversTypes['NftOrderEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NftOrderEdgeResolvers<ContextType = any, ParentType extends ResolversParentTypes['NftOrderEdge'] = ResolversParentTypes['NftOrderEdge']> = {
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['NftOrder'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NftProfileResolvers<ContextType = any, ParentType extends ResolversParentTypes['NftProfile'] = ResolversParentTypes['NftProfile']> = {
  address?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isVerified?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  profileImage?: Resolver<Maybe<ResolversTypes['Image']>, ParentType, ContextType>;
  username?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NftRouteResponseResolvers<ContextType = any, ParentType extends ResolversParentTypes['NftRouteResponse'] = ResolversParentTypes['NftRouteResponse']> = {
  calldata?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  route?: Resolver<Maybe<Array<ResolversTypes['NftTrade']>>, ParentType, ContextType>;
  sendAmount?: Resolver<ResolversTypes['TokenAmount'], ParentType, ContextType>;
  toAddress?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NftTradeResolvers<ContextType = any, ParentType extends ResolversParentTypes['NftTrade'] = ResolversParentTypes['NftTrade']> = {
  amount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  contractAddress?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  marketplace?: Resolver<ResolversTypes['NftMarketplace'], ParentType, ContextType>;
  price?: Resolver<ResolversTypes['TokenAmount'], ParentType, ContextType>;
  quotePrice?: Resolver<Maybe<ResolversTypes['TokenAmount']>, ParentType, ContextType>;
  tokenId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tokenType?: Resolver<Maybe<ResolversTypes['NftStandard']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NftTransferResolvers<ContextType = any, ParentType extends ResolversParentTypes['NftTransfer'] = ResolversParentTypes['NftTransfer']> = {
  asset?: Resolver<ResolversTypes['NftAsset'], ParentType, ContextType>;
  direction?: Resolver<ResolversTypes['TransactionDirection'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  nftStandard?: Resolver<ResolversTypes['NftStandard'], ParentType, ContextType>;
  recipient?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sender?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type OnRampServiceProviderResolvers<ContextType = any, ParentType extends ResolversParentTypes['OnRampServiceProvider'] = ResolversParentTypes['OnRampServiceProvider']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  logoDarkUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  logoLightUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  serviceProvider?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  supportUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type OnRampTransactionDetailsResolvers<ContextType = any, ParentType extends ResolversParentTypes['OnRampTransactionDetails'] = ResolversParentTypes['OnRampTransactionDetails']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  onRampTransfer?: Resolver<ResolversTypes['OnRampTransfer'], ParentType, ContextType>;
  receiverAddress?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['TransactionStatus'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type OnRampTransferResolvers<ContextType = any, ParentType extends ResolversParentTypes['OnRampTransfer'] = ResolversParentTypes['OnRampTransfer']> = {
  amount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  externalSessionId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  networkFee?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  serviceProvider?: Resolver<ResolversTypes['OnRampServiceProvider'], ParentType, ContextType>;
  sourceAmount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  sourceCurrency?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  token?: Resolver<ResolversTypes['Token'], ParentType, ContextType>;
  tokenStandard?: Resolver<ResolversTypes['TokenStandard'], ParentType, ContextType>;
  totalFee?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  transactionFee?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  transactionReferenceId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PageInfoResolvers<ContextType = any, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = {
  endCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hasNextPage?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  hasPreviousPage?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  startCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PoolTransactionResolvers<ContextType = any, ParentType extends ResolversParentTypes['PoolTransaction'] = ResolversParentTypes['PoolTransaction']> = {
  account?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  chain?: Resolver<ResolversTypes['Chain'], ParentType, ContextType>;
  hash?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  protocolVersion?: Resolver<ResolversTypes['ProtocolVersion'], ParentType, ContextType>;
  timestamp?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  token0?: Resolver<ResolversTypes['Token'], ParentType, ContextType>;
  token0Quantity?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  token1?: Resolver<ResolversTypes['Token'], ParentType, ContextType>;
  token1Quantity?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['PoolTransactionType'], ParentType, ContextType>;
  usdValue?: Resolver<ResolversTypes['Amount'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PortfolioResolvers<ContextType = any, ParentType extends ResolversParentTypes['Portfolio'] = ResolversParentTypes['Portfolio']> = {
  assetActivities?: Resolver<Maybe<Array<Maybe<ResolversTypes['AssetActivity']>>>, ParentType, ContextType, Partial<PortfolioAssetActivitiesArgs>>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  nftBalances?: Resolver<Maybe<Array<Maybe<ResolversTypes['NftBalance']>>>, ParentType, ContextType>;
  ownerAddress?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tokenBalances?: Resolver<Maybe<Array<Maybe<ResolversTypes['TokenBalance']>>>, ParentType, ContextType>;
  tokensTotalDenominatedValue?: Resolver<Maybe<ResolversTypes['Amount']>, ParentType, ContextType>;
  tokensTotalDenominatedValueChange?: Resolver<Maybe<ResolversTypes['AmountChange']>, ParentType, ContextType, Partial<PortfolioTokensTotalDenominatedValueChangeArgs>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ProtectionInfoResolvers<ContextType = any, ParentType extends ResolversParentTypes['ProtectionInfo'] = ResolversParentTypes['ProtectionInfo']> = {
  attackTypes?: Resolver<Maybe<Array<Maybe<ResolversTypes['ProtectionAttackType']>>>, ParentType, ContextType>;
  result?: Resolver<Maybe<ResolversTypes['ProtectionResult']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PushNotificationResolvers<ContextType = any, ParentType extends ResolversParentTypes['PushNotification'] = ResolversParentTypes['PushNotification']> = {
  contents?: Resolver<ResolversTypes['AWSJSON'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  notifyAddress?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  signerHeader?: Resolver<ResolversTypes['AWSJSON'], ParentType, ContextType>;
  viewerHeader?: Resolver<ResolversTypes['AWSJSON'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type QueryResolvers<ContextType = any, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  convert?: Resolver<Maybe<ResolversTypes['Amount']>, ParentType, ContextType, RequireFields<QueryConvertArgs, 'fromAmount' | 'toCurrency'>>;
  dailyProtocolTvl?: Resolver<Maybe<Array<ResolversTypes['TimestampedAmount']>>, ParentType, ContextType, RequireFields<QueryDailyProtocolTvlArgs, 'chain' | 'version'>>;
  historicalProtocolVolume?: Resolver<Maybe<Array<ResolversTypes['TimestampedAmount']>>, ParentType, ContextType, RequireFields<QueryHistoricalProtocolVolumeArgs, 'chain' | 'duration' | 'version'>>;
  isV3SubgraphStale?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<QueryIsV3SubgraphStaleArgs, 'chain'>>;
  nftActivity?: Resolver<Maybe<ResolversTypes['NftActivityConnection']>, ParentType, ContextType, Partial<QueryNftActivityArgs>>;
  nftAssets?: Resolver<Maybe<ResolversTypes['NftAssetConnection']>, ParentType, ContextType, RequireFields<QueryNftAssetsArgs, 'address'>>;
  nftBalances?: Resolver<Maybe<ResolversTypes['NftBalanceConnection']>, ParentType, ContextType, RequireFields<QueryNftBalancesArgs, 'ownerAddress'>>;
  nftCollectionBalances?: Resolver<Maybe<ResolversTypes['NftCollectionBalanceConnection']>, ParentType, ContextType, RequireFields<QueryNftCollectionBalancesArgs, 'ownerAddress'>>;
  nftCollections?: Resolver<Maybe<ResolversTypes['NftCollectionConnection']>, ParentType, ContextType, Partial<QueryNftCollectionsArgs>>;
  nftRoute?: Resolver<Maybe<ResolversTypes['NftRouteResponse']>, ParentType, ContextType, RequireFields<QueryNftRouteArgs, 'nftTrades' | 'senderAddress'>>;
  portfolios?: Resolver<Maybe<Array<Maybe<ResolversTypes['Portfolio']>>>, ParentType, ContextType, RequireFields<QueryPortfoliosArgs, 'ownerAddresses'>>;
  searchTokens?: Resolver<Maybe<Array<Maybe<ResolversTypes['Token']>>>, ParentType, ContextType, RequireFields<QuerySearchTokensArgs, 'searchQuery'>>;
  token?: Resolver<Maybe<ResolversTypes['Token']>, ParentType, ContextType, RequireFields<QueryTokenArgs, 'chain'>>;
  tokenProjects?: Resolver<Maybe<Array<Maybe<ResolversTypes['TokenProject']>>>, ParentType, ContextType, RequireFields<QueryTokenProjectsArgs, 'contracts'>>;
  tokens?: Resolver<Maybe<Array<Maybe<ResolversTypes['Token']>>>, ParentType, ContextType, RequireFields<QueryTokensArgs, 'contracts'>>;
  topCollections?: Resolver<Maybe<ResolversTypes['NftCollectionConnection']>, ParentType, ContextType, Partial<QueryTopCollectionsArgs>>;
  topTokens?: Resolver<Maybe<Array<Maybe<ResolversTypes['Token']>>>, ParentType, ContextType, Partial<QueryTopTokensArgs>>;
  topV2Pairs?: Resolver<Maybe<Array<ResolversTypes['V2Pair']>>, ParentType, ContextType, RequireFields<QueryTopV2PairsArgs, 'chain' | 'first'>>;
  topV3Pools?: Resolver<Maybe<Array<ResolversTypes['V3Pool']>>, ParentType, ContextType, RequireFields<QueryTopV3PoolsArgs, 'chain' | 'first'>>;
  topV4Pools?: Resolver<Maybe<Array<ResolversTypes['V4Pool']>>, ParentType, ContextType, RequireFields<QueryTopV4PoolsArgs, 'chain' | 'first'>>;
  transactionNotification?: Resolver<Maybe<ResolversTypes['TransactionNotification']>, ParentType, ContextType, RequireFields<QueryTransactionNotificationArgs, 'address' | 'chain' | 'transactionHash'>>;
  v2Pair?: Resolver<Maybe<ResolversTypes['V2Pair']>, ParentType, ContextType, RequireFields<QueryV2PairArgs, 'address' | 'chain'>>;
  v2Transactions?: Resolver<Maybe<Array<Maybe<ResolversTypes['PoolTransaction']>>>, ParentType, ContextType, RequireFields<QueryV2TransactionsArgs, 'chain' | 'first'>>;
  v3Pool?: Resolver<Maybe<ResolversTypes['V3Pool']>, ParentType, ContextType, RequireFields<QueryV3PoolArgs, 'address' | 'chain'>>;
  v3PoolsForTokenPair?: Resolver<Maybe<Array<ResolversTypes['V3Pool']>>, ParentType, ContextType, RequireFields<QueryV3PoolsForTokenPairArgs, 'chain' | 'token0' | 'token1'>>;
  v3Transactions?: Resolver<Maybe<Array<ResolversTypes['PoolTransaction']>>, ParentType, ContextType, RequireFields<QueryV3TransactionsArgs, 'chain' | 'first'>>;
  v4Pool?: Resolver<Maybe<ResolversTypes['V4Pool']>, ParentType, ContextType, RequireFields<QueryV4PoolArgs, 'chain' | 'poolId'>>;
  v4PoolsForTokenPair?: Resolver<Maybe<Array<ResolversTypes['V4Pool']>>, ParentType, ContextType, RequireFields<QueryV4PoolsForTokenPairArgs, 'chain' | 'token0' | 'token1'>>;
  v4Transactions?: Resolver<Maybe<Array<ResolversTypes['PoolTransaction']>>, ParentType, ContextType, RequireFields<QueryV4TransactionsArgs, 'chain' | 'first'>>;
};

export type StatusResolvers<ContextType = any, ParentType extends ResolversParentTypes['Status'] = ResolversParentTypes['Status']> = {
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SubscriptionResolvers<ContextType = any, ParentType extends ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription']> = {
  onAssetActivity?: SubscriptionResolver<Maybe<ResolversTypes['AssetActivity']>, "onAssetActivity", ParentType, ContextType, RequireFields<SubscriptionOnAssetActivityArgs, 'addresses' | 'subscriptionId'>>;
};

export type SwapOrderDetailsResolvers<ContextType = any, ParentType extends ResolversParentTypes['SwapOrderDetails'] = ResolversParentTypes['SwapOrderDetails']> = {
  encodedOrder?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  expiry?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  hash?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  inputToken?: Resolver<ResolversTypes['Token'], ParentType, ContextType>;
  inputTokenQuantity?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  offerer?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  outputToken?: Resolver<ResolversTypes['Token'], ParentType, ContextType>;
  outputTokenQuantity?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['SwapOrderStatus'], ParentType, ContextType>;
  swapOrderStatus?: Resolver<ResolversTypes['SwapOrderStatus'], ParentType, ContextType>;
  swapOrderType?: Resolver<ResolversTypes['SwapOrderType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TimestampedAmountResolvers<ContextType = any, ParentType extends ResolversParentTypes['TimestampedAmount'] = ResolversParentTypes['TimestampedAmount']> = {
  currency?: Resolver<Maybe<ResolversTypes['Currency']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  timestamp?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TimestampedOhlcResolvers<ContextType = any, ParentType extends ResolversParentTypes['TimestampedOhlc'] = ResolversParentTypes['TimestampedOhlc']> = {
  close?: Resolver<ResolversTypes['Amount'], ParentType, ContextType>;
  high?: Resolver<ResolversTypes['Amount'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  low?: Resolver<ResolversTypes['Amount'], ParentType, ContextType>;
  open?: Resolver<ResolversTypes['Amount'], ParentType, ContextType>;
  timestamp?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TimestampedPoolPriceResolvers<ContextType = any, ParentType extends ResolversParentTypes['TimestampedPoolPrice'] = ResolversParentTypes['TimestampedPoolPrice']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  timestamp?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  token0Price?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  token1Price?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TokenResolvers<ContextType = any, ParentType extends ResolversParentTypes['Token'] = ResolversParentTypes['Token']> = {
  address?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  chain?: Resolver<ResolversTypes['Chain'], ParentType, ContextType>;
  decimals?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  feeData?: Resolver<Maybe<ResolversTypes['FeeData']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  market?: Resolver<Maybe<ResolversTypes['TokenMarket']>, ParentType, ContextType, Partial<TokenMarketArgs>>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['TokenProject']>, ParentType, ContextType>;
  protectionInfo?: Resolver<Maybe<ResolversTypes['ProtectionInfo']>, ParentType, ContextType>;
  standard?: Resolver<Maybe<ResolversTypes['TokenStandard']>, ParentType, ContextType>;
  symbol?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  v2Transactions?: Resolver<Maybe<Array<Maybe<ResolversTypes['PoolTransaction']>>>, ParentType, ContextType, RequireFields<TokenV2TransactionsArgs, 'first'>>;
  v3Transactions?: Resolver<Maybe<Array<Maybe<ResolversTypes['PoolTransaction']>>>, ParentType, ContextType, RequireFields<TokenV3TransactionsArgs, 'first'>>;
  v4Transactions?: Resolver<Maybe<Array<Maybe<ResolversTypes['PoolTransaction']>>>, ParentType, ContextType, RequireFields<TokenV4TransactionsArgs, 'first'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TokenAmountResolvers<ContextType = any, ParentType extends ResolversParentTypes['TokenAmount'] = ResolversParentTypes['TokenAmount']> = {
  currency?: Resolver<ResolversTypes['Currency'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TokenApprovalResolvers<ContextType = any, ParentType extends ResolversParentTypes['TokenApproval'] = ResolversParentTypes['TokenApproval']> = {
  approvedAddress?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  asset?: Resolver<ResolversTypes['Token'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  quantity?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tokenStandard?: Resolver<ResolversTypes['TokenStandard'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TokenBalanceResolvers<ContextType = any, ParentType extends ResolversParentTypes['TokenBalance'] = ResolversParentTypes['TokenBalance']> = {
  blockNumber?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  blockTimestamp?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  denominatedValue?: Resolver<Maybe<ResolversTypes['Amount']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isHidden?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  ownerAddress?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  quantity?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  token?: Resolver<Maybe<ResolversTypes['Token']>, ParentType, ContextType>;
  tokenProjectMarket?: Resolver<Maybe<ResolversTypes['TokenProjectMarket']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TokenMarketResolvers<ContextType = any, ParentType extends ResolversParentTypes['TokenMarket'] = ResolversParentTypes['TokenMarket']> = {
  fullyDilutedValuation?: Resolver<Maybe<ResolversTypes['Amount']>, ParentType, ContextType>;
  historicalTvl?: Resolver<Maybe<Array<Maybe<ResolversTypes['TimestampedAmount']>>>, ParentType, ContextType, RequireFields<TokenMarketHistoricalTvlArgs, 'duration'>>;
  historicalVolume?: Resolver<Maybe<Array<Maybe<ResolversTypes['TimestampedAmount']>>>, ParentType, ContextType, RequireFields<TokenMarketHistoricalVolumeArgs, 'duration'>>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  ohlc?: Resolver<Maybe<Array<Maybe<ResolversTypes['TimestampedOhlc']>>>, ParentType, ContextType, RequireFields<TokenMarketOhlcArgs, 'duration'>>;
  price?: Resolver<Maybe<ResolversTypes['Amount']>, ParentType, ContextType>;
  priceHighLow?: Resolver<Maybe<ResolversTypes['Amount']>, ParentType, ContextType, RequireFields<TokenMarketPriceHighLowArgs, 'duration' | 'highLow'>>;
  priceHistory?: Resolver<Maybe<Array<Maybe<ResolversTypes['TimestampedAmount']>>>, ParentType, ContextType, RequireFields<TokenMarketPriceHistoryArgs, 'duration'>>;
  pricePercentChange?: Resolver<Maybe<ResolversTypes['Amount']>, ParentType, ContextType, RequireFields<TokenMarketPricePercentChangeArgs, 'duration'>>;
  priceSource?: Resolver<ResolversTypes['PriceSource'], ParentType, ContextType>;
  token?: Resolver<ResolversTypes['Token'], ParentType, ContextType>;
  totalValueLocked?: Resolver<Maybe<ResolversTypes['Amount']>, ParentType, ContextType>;
  volume?: Resolver<Maybe<ResolversTypes['Amount']>, ParentType, ContextType, RequireFields<TokenMarketVolumeArgs, 'duration'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TokenProjectResolvers<ContextType = any, ParentType extends ResolversParentTypes['TokenProject'] = ResolversParentTypes['TokenProject']> = {
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  descriptionTranslations?: Resolver<Maybe<ResolversTypes['DescriptionTranslations']>, ParentType, ContextType>;
  homepageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isSpam?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  logo?: Resolver<Maybe<ResolversTypes['Image']>, ParentType, ContextType>;
  logoUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  markets?: Resolver<Maybe<Array<Maybe<ResolversTypes['TokenProjectMarket']>>>, ParentType, ContextType, RequireFields<TokenProjectMarketsArgs, 'currencies'>>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  safetyLevel?: Resolver<Maybe<ResolversTypes['SafetyLevel']>, ParentType, ContextType>;
  smallLogo?: Resolver<Maybe<ResolversTypes['Image']>, ParentType, ContextType>;
  spamCode?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  tokens?: Resolver<Array<ResolversTypes['Token']>, ParentType, ContextType>;
  twitterName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TokenProjectMarketResolvers<ContextType = any, ParentType extends ResolversParentTypes['TokenProjectMarket'] = ResolversParentTypes['TokenProjectMarket']> = {
  currency?: Resolver<ResolversTypes['Currency'], ParentType, ContextType>;
  fullyDilutedValuation?: Resolver<Maybe<ResolversTypes['Amount']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  marketCap?: Resolver<Maybe<ResolversTypes['Amount']>, ParentType, ContextType>;
  price?: Resolver<Maybe<ResolversTypes['Amount']>, ParentType, ContextType>;
  priceHigh52w?: Resolver<Maybe<ResolversTypes['Amount']>, ParentType, ContextType>;
  priceHighLow?: Resolver<Maybe<ResolversTypes['Amount']>, ParentType, ContextType, RequireFields<TokenProjectMarketPriceHighLowArgs, 'duration' | 'highLow'>>;
  priceHistory?: Resolver<Maybe<Array<Maybe<ResolversTypes['TimestampedAmount']>>>, ParentType, ContextType, RequireFields<TokenProjectMarketPriceHistoryArgs, 'duration'>>;
  priceLow52w?: Resolver<Maybe<ResolversTypes['Amount']>, ParentType, ContextType>;
  pricePercentChange?: Resolver<Maybe<ResolversTypes['Amount']>, ParentType, ContextType, RequireFields<TokenProjectMarketPricePercentChangeArgs, 'duration'>>;
  pricePercentChange24h?: Resolver<Maybe<ResolversTypes['Amount']>, ParentType, ContextType>;
  tokenProject?: Resolver<ResolversTypes['TokenProject'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TokenTransferResolvers<ContextType = any, ParentType extends ResolversParentTypes['TokenTransfer'] = ResolversParentTypes['TokenTransfer']> = {
  asset?: Resolver<ResolversTypes['Token'], ParentType, ContextType>;
  direction?: Resolver<ResolversTypes['TransactionDirection'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  quantity?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  recipient?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sender?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tokenStandard?: Resolver<ResolversTypes['TokenStandard'], ParentType, ContextType>;
  transactedValue?: Resolver<Maybe<ResolversTypes['Amount']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TransactionResolvers<ContextType = any, ParentType extends ResolversParentTypes['Transaction'] = ResolversParentTypes['Transaction']> = {
  blockNumber?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  from?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  gasLimit?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  hash?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  maxFeePerGas?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  nonce?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['TransactionStatus'], ParentType, ContextType>;
  to?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TransactionDetailsResolvers<ContextType = any, ParentType extends ResolversParentTypes['TransactionDetails'] = ResolversParentTypes['TransactionDetails']> = {
  application?: Resolver<Maybe<ResolversTypes['ApplicationContract']>, ParentType, ContextType>;
  assetChanges?: Resolver<Array<Maybe<ResolversTypes['AssetChange']>>, ParentType, ContextType>;
  from?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  hash?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  networkFee?: Resolver<Maybe<ResolversTypes['NetworkFee']>, ParentType, ContextType>;
  nonce?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['TransactionStatus'], ParentType, ContextType>;
  to?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  transactionStatus?: Resolver<ResolversTypes['TransactionStatus'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['TransactionType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TransactionNotificationResolvers<ContextType = any, ParentType extends ResolversParentTypes['TransactionNotification'] = ResolversParentTypes['TransactionNotification']> = {
  hash?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  push?: Resolver<Array<ResolversTypes['PushNotification']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type V2PairResolvers<ContextType = any, ParentType extends ResolversParentTypes['V2Pair'] = ResolversParentTypes['V2Pair']> = {
  address?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  chain?: Resolver<ResolversTypes['Chain'], ParentType, ContextType>;
  createdAtTimestamp?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  cumulativeVolume?: Resolver<Maybe<ResolversTypes['Amount']>, ParentType, ContextType, RequireFields<V2PairCumulativeVolumeArgs, 'duration'>>;
  historicalVolume?: Resolver<Maybe<Array<Maybe<ResolversTypes['TimestampedAmount']>>>, ParentType, ContextType, RequireFields<V2PairHistoricalVolumeArgs, 'duration'>>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  priceHistory?: Resolver<Maybe<Array<Maybe<ResolversTypes['TimestampedPoolPrice']>>>, ParentType, ContextType, RequireFields<V2PairPriceHistoryArgs, 'duration'>>;
  protocolVersion?: Resolver<ResolversTypes['ProtocolVersion'], ParentType, ContextType>;
  token0?: Resolver<Maybe<ResolversTypes['Token']>, ParentType, ContextType>;
  token0Supply?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  token1?: Resolver<Maybe<ResolversTypes['Token']>, ParentType, ContextType>;
  token1Supply?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  totalLiquidity?: Resolver<Maybe<ResolversTypes['Amount']>, ParentType, ContextType>;
  totalLiquidityPercentChange24h?: Resolver<Maybe<ResolversTypes['Amount']>, ParentType, ContextType>;
  transactions?: Resolver<Maybe<Array<Maybe<ResolversTypes['PoolTransaction']>>>, ParentType, ContextType, RequireFields<V2PairTransactionsArgs, 'first'>>;
  txCount?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type V3PoolResolvers<ContextType = any, ParentType extends ResolversParentTypes['V3Pool'] = ResolversParentTypes['V3Pool']> = {
  address?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  chain?: Resolver<ResolversTypes['Chain'], ParentType, ContextType>;
  createdAtTimestamp?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  cumulativeVolume?: Resolver<Maybe<ResolversTypes['Amount']>, ParentType, ContextType, RequireFields<V3PoolCumulativeVolumeArgs, 'duration'>>;
  feeTier?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  historicalVolume?: Resolver<Maybe<Array<Maybe<ResolversTypes['TimestampedAmount']>>>, ParentType, ContextType, RequireFields<V3PoolHistoricalVolumeArgs, 'duration'>>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  priceHistory?: Resolver<Maybe<Array<Maybe<ResolversTypes['TimestampedPoolPrice']>>>, ParentType, ContextType, RequireFields<V3PoolPriceHistoryArgs, 'duration'>>;
  protocolVersion?: Resolver<ResolversTypes['ProtocolVersion'], ParentType, ContextType>;
  ticks?: Resolver<Maybe<Array<Maybe<ResolversTypes['V3PoolTick']>>>, ParentType, ContextType, Partial<V3PoolTicksArgs>>;
  token0?: Resolver<Maybe<ResolversTypes['Token']>, ParentType, ContextType>;
  token0Supply?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  token1?: Resolver<Maybe<ResolversTypes['Token']>, ParentType, ContextType>;
  token1Supply?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  totalLiquidity?: Resolver<Maybe<ResolversTypes['Amount']>, ParentType, ContextType>;
  totalLiquidityPercentChange24h?: Resolver<Maybe<ResolversTypes['Amount']>, ParentType, ContextType>;
  transactions?: Resolver<Maybe<Array<Maybe<ResolversTypes['PoolTransaction']>>>, ParentType, ContextType, RequireFields<V3PoolTransactionsArgs, 'first'>>;
  txCount?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type V3PoolTickResolvers<ContextType = any, ParentType extends ResolversParentTypes['V3PoolTick'] = ResolversParentTypes['V3PoolTick']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  liquidityGross?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  liquidityNet?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  price0?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  price1?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  tickIdx?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type V4PoolResolvers<ContextType = any, ParentType extends ResolversParentTypes['V4Pool'] = ResolversParentTypes['V4Pool']> = {
  chain?: Resolver<ResolversTypes['Chain'], ParentType, ContextType>;
  createdAtTimestamp?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  cumulativeVolume?: Resolver<Maybe<ResolversTypes['Amount']>, ParentType, ContextType, RequireFields<V4PoolCumulativeVolumeArgs, 'duration'>>;
  feeTier?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  historicalVolume?: Resolver<Maybe<Array<Maybe<ResolversTypes['TimestampedAmount']>>>, ParentType, ContextType, RequireFields<V4PoolHistoricalVolumeArgs, 'duration'>>;
  hook?: Resolver<Maybe<ResolversTypes['V4PoolHook']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  poolId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  priceHistory?: Resolver<Maybe<Array<Maybe<ResolversTypes['TimestampedPoolPrice']>>>, ParentType, ContextType, RequireFields<V4PoolPriceHistoryArgs, 'duration'>>;
  protocolVersion?: Resolver<ResolversTypes['ProtocolVersion'], ParentType, ContextType>;
  ticks?: Resolver<Maybe<Array<Maybe<ResolversTypes['V4PoolTick']>>>, ParentType, ContextType, Partial<V4PoolTicksArgs>>;
  token0?: Resolver<Maybe<ResolversTypes['Token']>, ParentType, ContextType>;
  token0Supply?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  token1?: Resolver<Maybe<ResolversTypes['Token']>, ParentType, ContextType>;
  token1Supply?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  totalLiquidity?: Resolver<Maybe<ResolversTypes['Amount']>, ParentType, ContextType>;
  totalLiquidityPercentChange24h?: Resolver<Maybe<ResolversTypes['Amount']>, ParentType, ContextType>;
  transactions?: Resolver<Maybe<Array<Maybe<ResolversTypes['PoolTransaction']>>>, ParentType, ContextType, RequireFields<V4PoolTransactionsArgs, 'first'>>;
  txCount?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type V4PoolHookResolvers<ContextType = any, ParentType extends ResolversParentTypes['V4PoolHook'] = ResolversParentTypes['V4PoolHook']> = {
  address?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type V4PoolTickResolvers<ContextType = any, ParentType extends ResolversParentTypes['V4PoolTick'] = ResolversParentTypes['V4PoolTick']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  liquidityGross?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  liquidityNet?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  price0?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  price1?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  tickIdx?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type Resolvers<ContextType = any> = {
  AWSJSON?: GraphQLScalarType;
  ActivityDetails?: ActivityDetailsResolvers<ContextType>;
  Amount?: AmountResolvers<ContextType>;
  AmountChange?: AmountChangeResolvers<ContextType>;
  ApplicationContract?: ApplicationContractResolvers<ContextType>;
  AssetActivity?: AssetActivityResolvers<ContextType>;
  AssetChange?: AssetChangeResolvers<ContextType>;
  DescriptionTranslations?: DescriptionTranslationsResolvers<ContextType>;
  Dimensions?: DimensionsResolvers<ContextType>;
  FeeData?: FeeDataResolvers<ContextType>;
  IAmount?: IAmountResolvers<ContextType>;
  IContract?: IContractResolvers<ContextType>;
  IPool?: IPoolResolvers<ContextType>;
  Image?: ImageResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  NetworkFee?: NetworkFeeResolvers<ContextType>;
  NftActivity?: NftActivityResolvers<ContextType>;
  NftActivityConnection?: NftActivityConnectionResolvers<ContextType>;
  NftActivityEdge?: NftActivityEdgeResolvers<ContextType>;
  NftApproval?: NftApprovalResolvers<ContextType>;
  NftApproveForAll?: NftApproveForAllResolvers<ContextType>;
  NftAsset?: NftAssetResolvers<ContextType>;
  NftAssetConnection?: NftAssetConnectionResolvers<ContextType>;
  NftAssetEdge?: NftAssetEdgeResolvers<ContextType>;
  NftAssetRarity?: NftAssetRarityResolvers<ContextType>;
  NftAssetTrait?: NftAssetTraitResolvers<ContextType>;
  NftBalance?: NftBalanceResolvers<ContextType>;
  NftBalanceConnection?: NftBalanceConnectionResolvers<ContextType>;
  NftBalanceEdge?: NftBalanceEdgeResolvers<ContextType>;
  NftCollection?: NftCollectionResolvers<ContextType>;
  NftCollectionBalance?: NftCollectionBalanceResolvers<ContextType>;
  NftCollectionBalanceConnection?: NftCollectionBalanceConnectionResolvers<ContextType>;
  NftCollectionBalanceEdge?: NftCollectionBalanceEdgeResolvers<ContextType>;
  NftCollectionConnection?: NftCollectionConnectionResolvers<ContextType>;
  NftCollectionEdge?: NftCollectionEdgeResolvers<ContextType>;
  NftCollectionMarket?: NftCollectionMarketResolvers<ContextType>;
  NftCollectionMarketplace?: NftCollectionMarketplaceResolvers<ContextType>;
  NftCollectionTrait?: NftCollectionTraitResolvers<ContextType>;
  NftCollectionTraitStats?: NftCollectionTraitStatsResolvers<ContextType>;
  NftContract?: NftContractResolvers<ContextType>;
  NftFee?: NftFeeResolvers<ContextType>;
  NftOrder?: NftOrderResolvers<ContextType>;
  NftOrderConnection?: NftOrderConnectionResolvers<ContextType>;
  NftOrderEdge?: NftOrderEdgeResolvers<ContextType>;
  NftProfile?: NftProfileResolvers<ContextType>;
  NftRouteResponse?: NftRouteResponseResolvers<ContextType>;
  NftTrade?: NftTradeResolvers<ContextType>;
  NftTransfer?: NftTransferResolvers<ContextType>;
  OnRampServiceProvider?: OnRampServiceProviderResolvers<ContextType>;
  OnRampTransactionDetails?: OnRampTransactionDetailsResolvers<ContextType>;
  OnRampTransfer?: OnRampTransferResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  PoolTransaction?: PoolTransactionResolvers<ContextType>;
  Portfolio?: PortfolioResolvers<ContextType>;
  ProtectionInfo?: ProtectionInfoResolvers<ContextType>;
  PushNotification?: PushNotificationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Status?: StatusResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
  SwapOrderDetails?: SwapOrderDetailsResolvers<ContextType>;
  TimestampedAmount?: TimestampedAmountResolvers<ContextType>;
  TimestampedOhlc?: TimestampedOhlcResolvers<ContextType>;
  TimestampedPoolPrice?: TimestampedPoolPriceResolvers<ContextType>;
  Token?: TokenResolvers<ContextType>;
  TokenAmount?: TokenAmountResolvers<ContextType>;
  TokenApproval?: TokenApprovalResolvers<ContextType>;
  TokenBalance?: TokenBalanceResolvers<ContextType>;
  TokenMarket?: TokenMarketResolvers<ContextType>;
  TokenProject?: TokenProjectResolvers<ContextType>;
  TokenProjectMarket?: TokenProjectMarketResolvers<ContextType>;
  TokenTransfer?: TokenTransferResolvers<ContextType>;
  Transaction?: TransactionResolvers<ContextType>;
  TransactionDetails?: TransactionDetailsResolvers<ContextType>;
  TransactionNotification?: TransactionNotificationResolvers<ContextType>;
  V2Pair?: V2PairResolvers<ContextType>;
  V3Pool?: V3PoolResolvers<ContextType>;
  V3PoolTick?: V3PoolTickResolvers<ContextType>;
  V4Pool?: V4PoolResolvers<ContextType>;
  V4PoolHook?: V4PoolHookResolvers<ContextType>;
  V4PoolTick?: V4PoolTickResolvers<ContextType>;
};

export type DirectiveResolvers<ContextType = any> = {
  aws_api_key?: Aws_Api_KeyDirectiveResolver<any, any, ContextType>;
  aws_auth?: Aws_AuthDirectiveResolver<any, any, ContextType>;
  aws_cognito_user_pools?: Aws_Cognito_User_PoolsDirectiveResolver<any, any, ContextType>;
  aws_iam?: Aws_IamDirectiveResolver<any, any, ContextType>;
  aws_lambda?: Aws_LambdaDirectiveResolver<any, any, ContextType>;
  aws_oidc?: Aws_OidcDirectiveResolver<any, any, ContextType>;
  aws_publish?: Aws_PublishDirectiveResolver<any, any, ContextType>;
  aws_subscribe?: Aws_SubscribeDirectiveResolver<any, any, ContextType>;
  defer?: DeferDirectiveResolver<any, any, ContextType>;
};
