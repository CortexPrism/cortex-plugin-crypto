# Cortex Plugin: Crypto / Web3 Agent

Wallet management, smart contract interaction, token swaps, and DeFi analytics across Ethereum, Polygon, Arbitrum, Optimism, Base, and Solana.

## Installation

```bash
cortex plugin install github:CortexPrism/cortex-plugin-crypto
```

## Tools

### crypto_get_balance
Get wallet balance for an address.
- `address` (string, required) — Wallet address
- `network` (enum, default: "ethereum") — Network: ethereum, polygon, arbitrum, optimism, base, solana
- `token` (string, optional) — ERC20 contract address or "native" for ETH

### crypto_get_transactions
Get transaction history for an address.
- `address` (string, required) — Wallet address
- `network` (string, optional) — Blockchain network
- `limit` (number, default: 20) — Max transactions to return

### crypto_estimate_gas
Estimate gas cost for a transaction type.
- `network` (string, optional) — Blockchain network
- `tx_type` (enum) — Transaction type: transfer, swap, contract_call

### crypto_read_contract
Read data from a smart contract.
- `contract_address` (string, required) — Smart contract address
- `abi` (string, required) — JSON ABI of the contract
- `method` (string, required) — Contract method to call
- `params` (string, optional) — JSON array of method parameters
- `network` (string, optional) — Blockchain network

### crypto_defi_analytics
Get DeFi protocol analytics (TVL, volume, APY, fees).
- `protocol` (enum, required) — Protocol: uniswap, aave, compound, curve, lido
- `metric` (enum, required) — Metric: tvl, volume, apy, fees
- `network` (string, optional) — Blockchain network

## Configuration

| Key | Type | Description |
|-----|------|-------------|
| `etherscanApiKey` | secret | Etherscan API key |
| `infuraProjectId` | text | Infura project ID |
| `defaultNetwork` | select | Default network: ethereum, polygon, arbitrum, optimism, base, solana |

## Development

```bash
deno task test
deno fmt
deno lint
```

## License

MIT
