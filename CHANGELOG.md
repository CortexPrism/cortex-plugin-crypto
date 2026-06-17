# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
