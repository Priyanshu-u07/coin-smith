import { greedySelect } from '../coin-selection';
import { UTXO, Payment, ChangeTemplate } from '../types';

const makeUtxo = (value: number, type = 'p2wpkh'): UTXO => ({
    txid: 'a'.repeat(64),
    vout: 0,
    value_sats: value,
    script_pubkey_hex: '0014' + '11'.repeat(20),
    script_type: type,
    address: 'bc1qtest',
});

const makePayment = (value: number): Payment => ({
    address: 'bc1qpay',
    script_pubkey_hex: '0014' + '22'.repeat(20),
    script_type: 'p2wpkh',
    value_sats: value,
});

const change: ChangeTemplate = {
    address: 'bc1qchange',
    script_pubkey_hex: '0014' + '33'.repeat(20),
    script_type: 'p2wpkh',
};

describe('coin selection', () => {
    test('basic greedy: single UTXO covers payment + fee', () => {
        const result = greedySelect([makeUtxo(100000)], [makePayment(50000)], 5, change);
        expect(result.selectedInputs).toHaveLength(1);
        expect(result.hasChange).toBe(true);
        expect(result.feeSats).toBeGreaterThan(0);
        expect(result.changeAmount).toBeGreaterThan(545);
    });

    test('insufficient funds throws error', () => {
        expect(() =>
            greedySelect([makeUtxo(1000)], [makePayment(50000)], 5, change)
        ).toThrow('INSUFFICIENT_FUNDS');
    });

    test('max_inputs is enforced', () => {
        const utxos = [makeUtxo(30000), makeUtxo(30000), makeUtxo(30000)];
        // With max_inputs=1, only one UTXO can be selected
        expect(() =>
            greedySelect(utxos, [makePayment(50000)], 5, change, 1)
        ).toThrow('INSUFFICIENT_FUNDS');
    });

    test('dust change becomes send-all', () => {
        // UTXO barely covers payment + fee, leaving dust-level change
        const result = greedySelect([makeUtxo(10000)], [makePayment(9000)], 5, change);
        expect(result.hasChange).toBe(false);
        expect(result.changeAmount).toBe(0);
    });

    test('selects largest UTXOs first', () => {
        const utxos = [makeUtxo(10000), makeUtxo(50000), makeUtxo(30000)];
        const result = greedySelect(utxos, [makePayment(40000)], 5, change);
        expect(result.selectedInputs[0].value_sats).toBe(50000);
    });

    test('multi-input selection when single is insufficient', () => {
        const utxos = [makeUtxo(30000), makeUtxo(30000), makeUtxo(30000)];
        const result = greedySelect(utxos, [makePayment(50000)], 5, change);
        expect(result.selectedInputs.length).toBeGreaterThanOrEqual(2);
    });

    test('balance equation holds: inputs = outputs + fee', () => {
        const result = greedySelect([makeUtxo(100000)], [makePayment(50000)], 10, change);
        const inputSum = result.selectedInputs.reduce((s, u) => s + u.value_sats, 0);
        const outputSum = 50000 + result.changeAmount;
        expect(inputSum).toBe(outputSum + result.feeSats);
    });
});
