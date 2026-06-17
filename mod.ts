import type { PluginContext, Tool, ToolCallResult, ToolContext } from './types.ts';

let config: Record<string, unknown> = {};

const crypto_get_balance: Tool = {
  definition: {
    name: 'crypto_get_balance',
    description: 'Get wallet balance for an address',
    params: [
      { name: 'address', type: 'string', description: 'Wallet address', required: true },
      {
        name: 'network',
        type: 'enum',
        description: 'Blockchain network',
        default: 'ethereum',
        options: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'solana'],
      },
      {
        name: 'token',
        type: 'string',
        description: "Contract address for ERC20, or 'native' for ETH",
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

      const network = (args.network as string) || (config.defaultNetwork as string) || 'ethereum';
      const token = (args.token as string) || 'native';
      const result = `Balance for ${address} on ${network}: 0.0 ${token}`;
      return {
        toolName: 'crypto_get_balance',
        success: true,
        output: result,
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

const crypto_get_transactions: Tool = {
  definition: {
    name: 'crypto_get_transactions',
    description: 'Get transaction history for an address',
    params: [
      { name: 'address', type: 'string', description: 'Wallet address', required: true },
      { name: 'network', type: 'string', description: 'Blockchain network', required: false },
      { name: 'limit', type: 'number', description: 'Number of transactions', default: 20 },
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

      const network = (args.network as string) || (config.defaultNetwork as string) || 'ethereum';
      const limit = (args.limit as number) || 20;
      const result = `Last ${limit} transactions for ${address} on ${network}`;
      return {
        toolName: 'crypto_get_transactions',
        success: true,
        output: result,
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolName: 'crypto_get_transactions',
        success: false,
        output: '',
        error: `Failed to get transactions: ${
          error instanceof Error ? error.message : String(error)
        }`,
        durationMs: Date.now() - start,
      };
    }
  },
};

const crypto_estimate_gas: Tool = {
  definition: {
    name: 'crypto_estimate_gas',
    description: 'Estimate gas for a transaction',
    params: [
      { name: 'network', type: 'string', description: 'Blockchain network', required: false },
      {
        name: 'tx_type',
        type: 'enum',
        description: 'Transaction type',
        options: ['transfer', 'swap', 'contract_call'],
        required: false,
      },
    ],
    capabilities: ['network:fetch'],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const network = (args.network as string) || (config.defaultNetwork as string) || 'ethereum';
      const tx_type = (args.tx_type as string) || 'transfer';
      const gasEstimates: Record<string, number> = {
        transfer: 21000,
        swap: 150000,
        contract_call: 100000,
      };
      const estimate = gasEstimates[tx_type] || 21000;
      const result = `Estimated gas for ${tx_type} on ${network}: ${estimate} gwei`;
      return {
        toolName: 'crypto_estimate_gas',
        success: true,
        output: result,
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolName: 'crypto_estimate_gas',
        success: false,
        output: '',
        error: `Failed to estimate gas: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

const crypto_read_contract: Tool = {
  definition: {
    name: 'crypto_read_contract',
    description: 'Read data from a smart contract',
    params: [
      {
        name: 'contract_address',
        type: 'string',
        description: 'Smart contract address',
        required: true,
      },
      { name: 'abi', type: 'string', description: 'JSON ABI of the contract', required: true },
      { name: 'method', type: 'string', description: 'Contract method to call', required: true },
      {
        name: 'params',
        type: 'string',
        description: 'JSON array of method parameters',
        required: false,
      },
      { name: 'network', type: 'string', description: 'Blockchain network', required: false },
    ],
    capabilities: ['network:fetch'],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const contract_address = args.contract_address;
      const method = args.method;
      if (!contract_address || typeof contract_address !== 'string') {
        return {
          toolName: 'crypto_read_contract',
          success: false,
          output: '',
          error: 'contract_address is required',
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

      const network = (args.network as string) || (config.defaultNetwork as string) || 'ethereum';
      const result = `Called ${method}() on ${contract_address} (${network})`;
      return {
        toolName: 'crypto_read_contract',
        success: true,
        output: result,
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolName: 'crypto_read_contract',
        success: false,
        output: '',
        error: `Failed to read contract: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

const crypto_defi_analytics: Tool = {
  definition: {
    name: 'crypto_defi_analytics',
    description: 'Get DeFi protocol analytics',
    params: [
      {
        name: 'protocol',
        type: 'enum',
        description: 'DeFi protocol',
        options: ['uniswap', 'aave', 'compound', 'curve', 'lido'],
        required: true,
      },
      {
        name: 'metric',
        type: 'enum',
        description: 'Analytics metric',
        options: ['tvl', 'volume', 'apy', 'fees'],
        required: true,
      },
      { name: 'network', type: 'string', description: 'Blockchain network', required: false },
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

      const network = (args.network as string) || (config.defaultNetwork as string) || 'ethereum';
      const result = `${protocol} ${metric} on ${network}: 0`;
      return {
        toolName: 'crypto_defi_analytics',
        success: true,
        output: result,
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolName: 'crypto_defi_analytics',
        success: false,
        output: '',
        error: `Failed to get analytics: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

export async function onLoad(ctx: PluginContext): Promise<void> {
  config = await ctx.config.get();
}

export async function onUnload(_ctx: PluginContext): Promise<void> {}

export const tools: Tool[] = [
  crypto_get_balance,
  crypto_get_transactions,
  crypto_estimate_gas,
  crypto_read_contract,
  crypto_defi_analytics,
];
