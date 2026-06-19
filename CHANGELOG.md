# Changelog

## [Unreleased]

### Changed

- Renamed manifest file from `cortex.json` to `manifest.json` for consistency with Cortex standard
- Standardized UI section structure to `ui.settings` format
- Normalized parameter naming: `defaultValue` → `default`, `options` → `enum`
- Added `homepage` field with repository URL
- Added `dependencies` field to manifest

### Added (v1.1.0)

- Real blockchain API integrations: Etherscan-compatible explorers for EVM balance/transaction
  lookups
- Solana RPC integration for balance and transaction queries
- CoinGecko API integration for DeFi protocol analytics (TVL, volume, price data)
- Proper gas price estimation via Etherscan gas oracle
- Smart contract ABI-based read calls with parameter encoding

## [1.0.1] — 2026-06-15

### Added

- Initial release

## [1.0.1] — 2026-06-17

### Added

- Initial project setup

## [1.0.0] — 2026-06-15

### Added

- Initial release of cortex-plugin-crypto
- `crypto_get_balance` — Query wallet balances across 6 blockchain networks
- `crypto_get_transactions` — Retrieve transaction history for any address
- `crypto_estimate_gas` — Estimate gas for transfers, swaps, and contract calls
- `crypto_read_contract` — Call read methods on smart contracts via ABI
- `crypto_defi_analytics` — Query TVL, volume, APY, and fees for 5 DeFi protocols
- UI settings for Etherscan API key, Infura project ID, and default network
