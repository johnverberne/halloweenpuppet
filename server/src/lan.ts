import os from 'node:os';

export function lanAddresses(): string[] {
  const addresses: string[] = [];
  for (const adapters of Object.values(os.networkInterfaces())) {
    for (const adapter of adapters ?? []) {
      if (adapter.family === 'IPv4' && !adapter.internal) {
        addresses.push(adapter.address);
      }
    }
  }
  return addresses;
}
