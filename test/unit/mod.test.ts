// deno-lint-ignore-file require-await, no-unused-vars
import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { tools } from '../../mod.ts';
import type { PluginContext, ToolContext } from '../../types.ts';

// Mock PluginContext
const mockContext: PluginContext & ToolContext = {
  pluginId: 'cortex-plugin-crypto',
  pluginDir: '/tmp/plugins/cortex-plugin-crypto',
  state: {
    get: async () => null,
    set: async () => {},
    delete: async () => {},
    list: async () => ({}),
  },
  config: {
    get: async () => null,
    set: async () => {},
    getAll: async () => ({}),
  },
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
  host: {
    registerTool: () => {},
    unregisterTool: () => {},
  },
  sessionId: 'test-session',
  workingDir: '/tmp',
  agentId: 'test-agent',
  workspaceDir: '/tmp',
};

function findTool(name: string) {
  const tool = tools.find((t) => t.definition.name === name);
  if (!tool) throw new Error(`Tool "${name}" not found`);
  return tool;
}

Deno.test('tools array — exports all tools', () => {
  assertEquals(tools.length, 5);
  assertEquals(tools[0].definition.name, 'crypto_get_balance');
  assertEquals(tools[1].definition.name, 'crypto_get_transactions');
  assertEquals(tools[2].definition.name, 'crypto_estimate_gas');
  assertEquals(tools[3].definition.name, 'crypto_read_contract');
  assertEquals(tools[4].definition.name, 'crypto_defi_analytics');
});

Deno.test('crypto_get_balance — rejects empty address', async () => {
  const tool = findTool('crypto_get_balance');
  const result = await tool.execute({ 'address': '' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error ?? '', 'non-empty string');
});

Deno.test('crypto_get_transactions — rejects empty address', async () => {
  const tool = findTool('crypto_get_transactions');
  const result = await tool.execute({ 'address': '' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error ?? '', 'non-empty string');
});

Deno.test('crypto_estimate_gas — tool is defined with name and description', () => {
  const tool = findTool('crypto_estimate_gas');
  assertEquals(typeof tool.definition.description, 'string');
  assertEquals(tool.definition.description.length > 0, true);
});

Deno.test('crypto_read_contract — rejects empty contract_address', async () => {
  const tool = findTool('crypto_read_contract');
  const result = await tool.execute({ 'contract_address': '' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error ?? '', 'non-empty string');
});

Deno.test('crypto_defi_analytics — tool is defined with name and description', () => {
  const tool = findTool('crypto_defi_analytics');
  assertEquals(typeof tool.definition.description, 'string');
  assertEquals(tool.definition.description.length > 0, true);
});

Deno.test('all tools return durationMs', async () => {
  for (const tool of tools) {
    const args: Record<string, unknown> = {};
    const result = await tool.execute(args, mockContext);
    assertEquals(typeof result.durationMs, 'number');
    assertEquals(result.durationMs >= 0, true);
  }
});
