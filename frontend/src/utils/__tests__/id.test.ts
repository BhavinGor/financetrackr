import { describe, it, expect } from 'vitest';
import { generateId } from '../id';

describe('generateId', () => {
  it('generates ID with prefix', () => {
    const id = generateId('tx');
    expect(id).toMatch(/^tx_/);
  });

  it('generates unique IDs', () => {
    const id1 = generateId('tx');
    const id2 = generateId('tx');
    expect(id1).not.toBe(id2);
  });

  it('handles different prefixes', () => {
    const txId = generateId('tx');
    const accId = generateId('acc');
    const vehId = generateId('veh');
    expect(txId).toMatch(/^tx_/);
    expect(accId).toMatch(/^acc_/);
    expect(vehId).toMatch(/^veh_/);
  });
});
