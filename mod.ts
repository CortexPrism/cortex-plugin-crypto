/**
 * CortexPrism Crypto / Web3 Plugin
 *
 * Provides blockchain data tools: balance checks, transaction history,
 * gas estimation, smart contract reads, and DeFi analytics.
 *
 * API providers used (configurable):
 *   - Etherscan-compatible explorers (etherscan, polygonscan, arbiscan, etc.)
 *   - CoinGecko (free, no API key required for basic usage)
 *   - Solana RPC (public endpoints)
 */

import type { PluginContext, Tool, ToolCallResult, ToolContext } from './types.ts';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

interface CryptoConfig {
  etherscanApiKey: string;
  defaultNetwork: string;
  coingeckoBaseUrl: string;
  rpcTimeoutMs: number;
}

let config: CryptoConfig = {
  etherscanApiKey: '',
  defaultNetwork: 'ethereum',
  coingeckoBaseUrl: 'https://api.coingecko.com/api/v3',
  rpcTimeoutMs: 15000,
};

// ---------------------------------------------------------------------------
// Network → explorer API mapping (all Etherscan-compatible)
// ---------------------------------------------------------------------------

const EXPLORER_APIS: Record<string, string> = {
  ethereum: 'https://api.etherscan.io/api',
  polygon: 'https://api.polygonscan.com/api',
  arbitrum: 'https://api.arbiscan.io/api',
  optimism: 'https://api-optimistic.etherscan.io/api',
  base: 'https://api.basescan.org/api',
};

const NATIVE_SYMBOLS: Record<string, string> = {
  ethereum: 'ETH',
  polygon: 'MATIC',
  arbitrum: 'ETH',
  optimism: 'ETH',
  base: 'ETH',
  solana: 'SOL',
};

function getExplorerUrl(network: string): string | null {
  return EXPLORER_APIS[network] || null;
}

function fetchWithTimeout(url: string, opts: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(timer));
}

// ---------------------------------------------------------------------------
// Tool: crypto_get_balance
// ---------------------------------------------------------------------------

const crypto_get_balance: Tool = {
  definition: {
    name: 'crypto_get_balance',
    description: 'Get wallet balance for an address on a blockchain network',
    params: [
      { name: 'address', type: 'string', description: 'Wallet address', required: true },
      {
        name: 'network',
        type: 'string',
        description: 'Blockchain network',
        default: 'ethereum',
        enum: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'solana'],
      },
      {
        name: 'token',
        type: 'string',
        description: "Contract address for ERC20, or 'native' for native coin",
        required: false,
      },
    ],
    capabilities: ['network:fetch'],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const address = args.address;
      if (!address || typeof address !== 'string') {
        return {
          toolName: 'crypto_get_balance',
          success: false,
          output: '',
          error: 'address must be a non-empty string',
          durationMs: Date.now() - start,
        };
      }

      const network = (typeof args.network === 'string' && args.network) || config.defaultNetwork ||
        'ethereum';
      const token = typeof args.token === 'string' ? args.token : 'native';

      // Solana uses a different API
      if (network === 'solana') {
        const rpcUrl = config.etherscanApiKey
          ? `https://mainnet.helius-rpc.com/?api-key=${config.etherscanApiKey}`
          : 'https://api.mainnet-beta.solana.com';
        const body = JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [address],
        });
        const res = await fetchWithTimeout(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        }, config.rpcTimeoutMs);

        if (!res.ok) {
          return {
            toolName: 'crypto_get_balance',
            success: false,
            output: '',
            error: `Solana RPC error: HTTP ${res.status}`,
            durationMs: Date.now() - start,
          };
        }
        const json = await res.json() as {
          result?: { value?: number };
          error?: { message: string };
        };
        if (json.error) {
          return {
            toolName: 'crypto_get_balance',
            success: false,
            output: '',
            error: `Solana error: ${json.error.message}`,
            durationMs: Date.now() - start,
          };
        }
        const lamports = json.result?.value ?? 0;
        const sol = lamports / 1_000_000_000;
        return {
          toolName: 'crypto_get_balance',
          success: true,
          output: JSON.stringify(
            { address, network, balance: sol, symbol: 'SOL', unit: 'SOL' },
            null,
            2,
          ),
          durationMs: Date.now() - start,
        };
      }

      // EVM chains: use Etherscan-compatible API
      const explorerUrl = getExplorerUrl(network);
      if (!explorerUrl) {
        return {
          toolName: 'crypto_get_balance',
          success: false,
          output: '',
          error: `Unsupported network: ${network}`,
          durationMs: Date.now() - start,
        };
      }

      if (token === 'native') {
        const params = new URLSearchParams({
          module: 'account',
          action: 'balance',
          address,
          tag: 'latest',
          apikey: config.etherscanApiKey || 'YourApiKeyToken',
        });
        const res = await fetchWithTimeout(`${explorerUrl}?${params}`, {}, config.rpcTimeoutMs);

        if (!res.ok) {
          return {
            toolName: 'crypto_get_balance',
            success: false,
            output: '',
            error: `Explorer API error: HTTP ${res.status}`,
            durationMs: Date.now() - start,
          };
        }
        const data = await res.json() as { status: string; message: string; result: string };
        if (data.status !== '1') {
          return {
            toolName: 'crypto_get_balance',
            success: false,
            output: '',
            error: data.message || data.result || 'API returned error status',
            durationMs: Date.now() - start,
          };
        }
        const wei = BigInt(data.result || '0');
        const eth = Number(wei) / 1e18;
        const symbol = NATIVE_SYMBOLS[network] || 'ETH';
        return {
          toolName: 'crypto_get_balance',
          success: true,
          output: JSON.stringify({ address, network, balance: eth, symbol, unit: symbol }, null, 2),
          durationMs: Date.now() - start,
        };
      }

      // ERC20 token balance
      const params = new URLSearchParams({
        module: 'account',
        action: 'tokenbalance',
        contractaddress: token,
        address,
        tag: 'latest',
        apikey: config.etherscanApiKey || 'YourApiKeyToken',
      });
      const res = await fetchWithTimeout(`${explorerUrl}?${params}`, {}, config.rpcTimeoutMs);

      if (!res.ok) {
        return {
          toolName: 'crypto_get_balance',
          success: false,
          output: '',
          error: `Explorer API error: HTTP ${res.status}`,
          durationMs: Date.now() - start,
        };
      }
      const data = await res.json() as { status: string; message: string; result: string };
      if (data.status !== '1') {
        return {
          toolName: 'crypto_get_balance',
          success: false,
          output: '',
          error: data.message || data.result || 'API returned error status',
          durationMs: Date.now() - start,
        };
      }
      // Token balances come back as raw integers with unknown decimals
      return {
        toolName: 'crypto_get_balance',
        success: true,
        output: JSON.stringify(
          {
            address,
            network,
            tokenContract: token,
            rawBalance: data.result,
            note: 'Raw token balance (decimals not resolved)',
          },
          null,
          2,
        ),
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolName: 'crypto_get_balance',
        success: false,
        output: '',
        error: `Failed to get balance: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

// ---------------------------------------------------------------------------
// Tool: crypto_get_transactions
// ---------------------------------------------------------------------------

const crypto_get_transactions: Tool = {
  definition: {
    name: 'crypto_get_transactions',
    description: 'Get transaction history for an address',
    params: [
      { name: 'address', type: 'string', description: 'Wallet address', required: true },
      { name: 'network', type: 'string', description: 'Blockchain network', default: 'ethereum' },
      {
        name: 'limit',
        type: 'number',
        description: 'Number of transactions to return',
        default: 20,
      },
    ],
    capabilities: ['network:fetch'],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const address = args.address;
      if (!address || typeof address !== 'string') {
        return {
          toolName: 'crypto_get_transactions',
          success: false,
          output: '',
          error: 'address is required',
          durationMs: Date.now() - start,
        };
      }

      const network = (typeof args.network === 'string' && args.network) || config.defaultNetwork ||
        'ethereum';
      const limit = Math.min(typeof args.limit === 'number' ? args.limit : 20, 100);

      // Solana
      if (network === 'solana') {
        const rpcUrl = 'https://api.mainnet-beta.solana.com';
        const body = JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getSignaturesForAddress',
          params: [address, { limit }],
        });
        const res = await fetchWithTimeout(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        }, config.rpcTimeoutMs);
        if (!res.ok) {
          return {
            toolName: 'crypto_get_transactions',
            success: false,
            output: '',
            error: `Solana RPC error: HTTP ${res.status}`,
            durationMs: Date.now() - start,
          };
        }
        const json = await res.json() as { result?: unknown[]; error?: { message: string } };
        if (json.error) {
          return {
            toolName: 'crypto_get_transactions',
            success: false,
            output: '',
            error: `Solana error: ${json.error.message}`,
            durationMs: Date.now() - start,
          };
        }
        return {
          toolName: 'crypto_get_transactions',
          success: true,
          output: JSON.stringify(
            { address, network, count: (json.result || []).length, transactions: json.result },
            null,
            2,
          ),
          durationMs: Date.now() - start,
        };
      }

      // EVM chains
      const explorerUrl = getExplorerUrl(network);
      if (!explorerUrl) {
        return {
          toolName: 'crypto_get_transactions',
          success: false,
          output: '',
          error: `Unsupported network: ${network}`,
          durationMs: Date.now() - start,
        };
      }

      const params = new URLSearchParams({
        module: 'account',
        action: 'txlist',
        address,
        startblock: '0',
        endblock: '99999999',
        page: '1',
        offset: String(limit),
        sort: 'desc',
        apikey: config.etherscanApiKey || 'YourApiKeyToken',
      });
      const res = await fetchWithTimeout(`${explorerUrl}?${params}`, {}, config.rpcTimeoutMs);

      if (!res.ok) {
        return {
          toolName: 'crypto_get_transactions',
          success: false,
          output: '',
          error: `Explorer API error: HTTP ${res.status}`,
          durationMs: Date.now() - start,
        };
      }
      const data = await res.json() as { status: string; message: string; result: unknown[] };
      if (data.status !== '1') {
        return {
          toolName: 'crypto_get_transactions',
          success: false,
          output: '',
          error: data.message || 'No transactions found or API error',
          durationMs: Date.now() - start,
        };
      }

      // Summarize: extract key fields for readability
      const txs = (data.result || []).map((tx: unknown) => {
        const t = tx as Record<string, unknown>;
        return {
          hash: t.hash,
          from: t.from,
          to: t.to,
          value: `${(Number(BigInt(String(t.value || '0'))) / 1e18).toFixed(6)} ${
            NATIVE_SYMBOLS[network] || 'ETH'
          }`,
          timestamp: t.timeStamp ? new Date(Number(t.timeStamp) * 1000).toISOString() : null,
          confirmations: t.confirmations,
        };
      });

      return {
        toolName: 'crypto_get_transactions',
        success: true,
        output: JSON.stringify({ address, network, count: txs.length, transactions: txs }, null, 2),
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolName: 'crypto_get_transactions',
        success: false,
        output: '',
        error: `Failed: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

// ---------------------------------------------------------------------------
// Tool: crypto_estimate_gas
// ---------------------------------------------------------------------------

const crypto_estimate_gas: Tool = {
  definition: {
    name: 'crypto_estimate_gas',
    description: 'Get current gas prices / fee estimates for a blockchain network',
    params: [
      { name: 'network', type: 'string', description: 'Blockchain network', default: 'ethereum' },
    ],
    capabilities: ['network:fetch'],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const network = (typeof args.network === 'string' && args.network) || config.defaultNetwork ||
        'ethereum';

      // EVM chains use Etherscan gas oracle
      const explorerUrl = getExplorerUrl(network);
      if (!explorerUrl) {
        return {
          toolName: 'crypto_estimate_gas',
          success: false,
          output: '',
          error: `Unsupported network: ${network}`,
          durationMs: Date.now() - start,
        };
      }

      const params = new URLSearchParams({
        module: 'gastracker',
        action: 'gasoracle',
        apikey: config.etherscanApiKey || 'YourApiKeyToken',
      });
      const res = await fetchWithTimeout(`${explorerUrl}?${params}`, {}, config.rpcTimeoutMs);

      if (!res.ok) {
        return {
          toolName: 'crypto_estimate_gas',
          success: false,
          output: '',
          error: `Gas oracle error: HTTP ${res.status}`,
          durationMs: Date.now() - start,
        };
      }
      const data = await res.json() as {
        status: string;
        message: string;
        result: {
          SafeGasPrice: string;
          ProposeGasPrice: string;
          FastGasPrice: string;
          suggestBaseFee?: string;
          LastBlock?: string;
          gasUsedRatio?: string;
        };
      };
      if (data.status !== '1' || !data.result) {
        return {
          toolName: 'crypto_estimate_gas',
          success: false,
          output: '',
          error: data.message || 'Gas data unavailable',
          durationMs: Date.now() - start,
        };
      }

      const r = data.result;
      const output = {
        network,
        safe: { gwei: Number(r.SafeGasPrice), label: 'Safe (slow, cheap)' },
        proposed: { gwei: Number(r.ProposeGasPrice), label: 'Proposed (standard)' },
        fast: { gwei: Number(r.FastGasPrice), label: 'Fast (priority)' },
        baseFee: r.suggestBaseFee ? `${r.suggestBaseFee} Gwei` : 'N/A',
        lastBlock: r.LastBlock || 'N/A',
        updatedAt: new Date().toISOString(),
      };

      return {
        toolName: 'crypto_estimate_gas',
        success: true,
        output: JSON.stringify(output, null, 2),
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolName: 'crypto_estimate_gas',
        success: false,
        output: '',
        error: `Failed: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

// ---------------------------------------------------------------------------
// Tool: crypto_read_contract
// ---------------------------------------------------------------------------

const crypto_read_contract: Tool = {
  definition: {
    name: 'crypto_read_contract',
    description: 'Read data from a smart contract (ABI-encoded call via Etherscan API)',
    params: [
      {
        name: 'contract_address',
        type: 'string',
        description: 'Smart contract address',
        required: true,
      },
      {
        name: 'abi',
        type: 'string',
        description: 'JSON ABI of the contract (used for parameter encoding)',
        required: true,
      },
      { name: 'method', type: 'string', description: 'Contract method to call', required: true },
      {
        name: 'params',
        type: 'string',
        description: 'JSON array of method parameters',
        required: false,
      },
      { name: 'network', type: 'string', description: 'Blockchain network', default: 'ethereum' },
    ],
    capabilities: ['network:fetch'],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const contract_address = args.contract_address;
      const method = args.method;
      const abiRaw = args.abi;

      if (!contract_address || typeof contract_address !== 'string') {
        return {
          toolName: 'crypto_read_contract',
          success: false,
          output: '',
          error: 'contract_address is required',
          durationMs: Date.now() - start,
        };
      }
      if (!abiRaw || typeof abiRaw !== 'string') {
        return {
          toolName: 'crypto_read_contract',
          success: false,
          output: '',
          error: 'abi is required (JSON ABI string)',
          durationMs: Date.now() - start,
        };
      }
      if (!method || typeof method !== 'string') {
        return {
          toolName: 'crypto_read_contract',
          success: false,
          output: '',
          error: 'method is required',
          durationMs: Date.now() - start,
        };
      }

      const network = (typeof args.network === 'string' && args.network) || config.defaultNetwork ||
        'ethereum';
      const explorerUrl = getExplorerUrl(network);
      if (!explorerUrl) {
        return {
          toolName: 'crypto_read_contract',
          success: false,
          output: '',
          error: `Unsupported network: ${network}`,
          durationMs: Date.now() - start,
        };
      }

      // Parse ABI to find the function signature and encode parameters
      let abi: unknown[];
      try {
        abi = JSON.parse(abiRaw);
      } catch {
        return {
          toolName: 'crypto_read_contract',
          success: false,
          output: '',
          error: 'abi must be valid JSON',
          durationMs: Date.now() - start,
        };
      }

      // Find the function in the ABI
      const funcDef = (Array.isArray(abi) ? abi : []).find(
        (entry: unknown) =>
          (entry as Record<string, unknown>)?.type === 'function' &&
          (entry as Record<string, unknown>)?.name === method,
      ) as Record<string, unknown> | undefined;

      if (!funcDef) {
        return {
          toolName: 'crypto_read_contract',
          success: false,
          output: '',
          error: `Function "${method}" not found in provided ABI`,
          durationMs: Date.now() - start,
        };
      }

      // Parse user-provided params
      let userParams: unknown[] = [];
      if (args.params && typeof args.params === 'string' && args.params.trim()) {
        try {
          userParams = JSON.parse(args.params);
        } catch {
          return {
            toolName: 'crypto_read_contract',
            success: false,
            output: '',
            error: 'params must be a valid JSON array',
            durationMs: Date.now() - start,
          };
        }
      }

      // Build Etherscan-compatible query for contract read
      // The API auto-detects function parameters if not provided, but providing them improves accuracy
      const queryParams = new URLSearchParams({
        module: 'contract',
        action: 'callcontract',
        address: contract_address,
        function: method,
        apikey: config.etherscanApiKey || 'YourApiKeyToken',
      });

      if (userParams.length > 0) {
        queryParams.set('functionArgs', userParams.map((p) => String(p)).join(','));
      }

      const res = await fetchWithTimeout(`${explorerUrl}?${queryParams}`, {}, config.rpcTimeoutMs);
      if (!res.ok) {
        return {
          toolName: 'crypto_read_contract',
          success: false,
          output: '',
          error: `Contract call error: HTTP ${res.status}`,
          durationMs: Date.now() - start,
        };
      }
      const data = await res.json() as { status: string; message: string; result: string };
      if (data.status !== '1') {
        return {
          toolName: 'crypto_read_contract',
          success: false,
          output: '',
          error: data.message || data.result || 'Contract call failed',
          durationMs: Date.now() - start,
        };
      }

      const functionSignature = `${funcDef.name}(${
        ((funcDef.inputs as unknown[]) || []).map((i: unknown) =>
          (i as Record<string, unknown>)?.type || 'unknown'
        ).join(',')
      })`;
      const outputs = (funcDef.outputs as Array<{ type: string; name?: string }>) || [];

      return {
        toolName: 'crypto_read_contract',
        success: true,
        output: JSON.stringify(
          {
            contract: contract_address,
            network,
            function: functionSignature,
            rawResult: data.result,
            outputTypes: outputs.map((o) => ({ name: o.name || '(unnamed)', type: o.type })),
            note: 'Raw hex-encoded result. Decode according to output types above.',
          },
          null,
          2,
        ),
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolName: 'crypto_read_contract',
        success: false,
        output: '',
        error: `Failed: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

// ---------------------------------------------------------------------------
// Tool: crypto_defi_analytics
// ---------------------------------------------------------------------------

const crypto_defi_analytics: Tool = {
  definition: {
    name: 'crypto_defi_analytics',
    description: 'Get DeFi protocol analytics including TVL, volume, APY, and fees',
    params: [
      {
        name: 'protocol',
        type: 'string',
        description: 'DeFi protocol name',
        required: true,
        enum: ['uniswap', 'aave', 'compound', 'curve', 'lido', 'maker', 'pancakeswap', 'balancer'],
      },
      {
        name: 'metric',
        type: 'string',
        description: 'Analytics metric to retrieve',
        required: true,
        enum: ['tvl', 'volume', 'apy', 'fees', 'overview'],
      },
      {
        name: 'network',
        type: 'string',
        description: 'Blockchain network (for protocol-specific data)',
        required: false,
      },
    ],
    capabilities: ['network:fetch'],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const protocol = args.protocol;
      const metric = args.metric;
      if (!protocol || typeof protocol !== 'string') {
        return {
          toolName: 'crypto_defi_analytics',
          success: false,
          output: '',
          error: 'protocol is required',
          durationMs: Date.now() - start,
        };
      }
      if (!metric || typeof metric !== 'string') {
        return {
          toolName: 'crypto_defi_analytics',
          success: false,
          output: '',
          error: 'metric is required',
          durationMs: Date.now() - start,
        };
      }

      const network = typeof args.network === 'string' ? args.network : undefined;

      // Protocol → CoinGecko ID mapping
      const PROTOCOL_IDS: Record<string, string> = {
        uniswap: 'uniswap',
        aave: 'aave',
        compound: 'compound-governance-token',
        curve: 'curve-dao-token',
        lido: 'lido-dao',
        maker: 'maker',
        pancakeswap: 'pancakeswap-token',
        balancer: 'balancer',
      };

      const coinId = PROTOCOL_IDS[protocol.toLowerCase()];
      if (!coinId) {
        return {
          toolName: 'crypto_defi_analytics',
          success: false,
          output: '',
          error: `Unknown protocol: ${protocol}`,
          durationMs: Date.now() - start,
        };
      }

      // Use CoinGecko API (free tier, no API key required for basic usage)
      const cgUrl =
        `${config.coingeckoBaseUrl}/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`;
      const res = await fetchWithTimeout(cgUrl, {
        headers: { 'User-Agent': 'CortexPrism-CryptoPlugin/1.0.1' },
      }, config.rpcTimeoutMs);

      if (!res.ok) {
        if (res.status === 429) {
          return {
            toolName: 'crypto_defi_analytics',
            success: false,
            output: '',
            error: 'CoinGecko rate limit exceeded. Try again in 60 seconds.',
            durationMs: Date.now() - start,
          };
        }
        return {
          toolName: 'crypto_defi_analytics',
          success: false,
          output: '',
          error: `CoinGecko API error: HTTP ${res.status}`,
          durationMs: Date.now() - start,
        };
      }

      const data = await res.json() as {
        name: string;
        symbol: string;
        market_data?: {
          current_price?: Record<string, number>;
          total_volume?: Record<string, number>;
          market_cap?: Record<string, number>;
          total_value_locked?: number | null;
          fully_diluted_valuation?: Record<string, number>;
          price_change_percentage_24h?: number;
          price_change_percentage_7d?: number;
          circulating_supply?: number;
          total_supply?: number;
        };
      };

      const md = data.market_data || {};

      // Build output based on requested metric
      const output: Record<string, unknown> = {
        protocol: data.name,
        symbol: data.symbol?.toUpperCase(),
        network: network || 'all',
        updatedAt: new Date().toISOString(),
      };

      if (metric === 'tvl' || metric === 'overview') {
        output.tvl = { usd: md.total_value_locked ?? 'N/A' };
      }
      if (metric === 'volume' || metric === 'overview') {
        output.volume24h = { usd: md.total_volume?.usd ?? 'N/A' };
      }
      if (metric === 'apy' || metric === 'overview') {
        // CoinGecko doesn't provide APY directly; use price change as proxy signal
        output.priceChange = {
          '24h': md.price_change_percentage_24h != null
            ? `${md.price_change_percentage_24h.toFixed(2)}%`
            : 'N/A',
          '7d': md.price_change_percentage_7d != null
            ? `${md.price_change_percentage_7d.toFixed(2)}%`
            : 'N/A',
        };
        output.note =
          'APY data not directly available via CoinGecko. Check protocol-specific analytics for yield data.';
      }
      if (metric === 'fees' || metric === 'overview') {
        output.fees = {
          note:
            'Fee data not directly available via CoinGecko. Use protocol-specific APIs for fee analytics.',
        };
      }
      if (metric === 'overview') {
        output.marketCap = { usd: md.market_cap?.usd ?? 'N/A' };
        output.currentPrice = { usd: md.current_price?.usd ?? 'N/A' };
        output.supply = {
          circulating: md.circulating_supply ?? 'N/A',
          total: md.total_supply ?? 'N/A',
        };
      }

      return {
        toolName: 'crypto_defi_analytics',
        success: true,
        output: JSON.stringify(output, null, 2),
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolName: 'crypto_defi_analytics',
        success: false,
        output: '',
        error: `Failed: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

// ---------------------------------------------------------------------------
// Lifecycle hooks
// ---------------------------------------------------------------------------

export async function onLoad(ctx: PluginContext): Promise<void> {
  const cfg = await ctx.config.get();
  config = {
    etherscanApiKey: (cfg.etherscanApiKey as string) || '',
    defaultNetwork: (cfg.defaultNetwork as string) || 'ethereum',
    coingeckoBaseUrl: (cfg.coingeckoBaseUrl as string) || 'https://api.coingecko.com/api/v3',
    rpcTimeoutMs: typeof cfg.rpcTimeoutMs === 'number' ? cfg.rpcTimeoutMs : 15000,
  };
  ctx.logger.info(`[cortex-plugin-crypto] Loaded, default network: ${config.defaultNetwork}`);
}

export async function onUnload(ctx: PluginContext): Promise<void> {
  ctx.logger.info('[cortex-plugin-crypto] Unloading...');
}

export const tools: Tool[] = [
  crypto_get_balance,
  crypto_get_transactions,
  crypto_estimate_gas,
  crypto_read_contract,
  crypto_defi_analytics,
];
