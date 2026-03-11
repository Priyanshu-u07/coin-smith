import { computeRbfLocktime } from '../rbf-locktime';
import { Fixture } from '../types';

const baseFixture: Fixture = {
    network: 'mainnet',
    utxos: [],
    payments: [],
    change: { address: '', script_pubkey_hex: '', script_type: 'p2wpkh' },
    fee_rate_sat_vb: 5,
};

describe('RBF & Locktime', () => {
    test('no rbf, no locktime → nSeq=0xFFFFFFFF, nLockTime=0', () => {
        const r = computeRbfLocktime({ ...baseFixture });
        expect(r.nSequence).toBe(0xFFFFFFFF);
        expect(r.nLockTime).toBe(0);
        expect(r.rbfSignaling).toBe(false);
        expect(r.locktimeType).toBe('none');
    });

    test('rbf:true, no locktime, no currentHeight → nSeq=0xFFFFFFFD, nLockTime=0', () => {
        const r = computeRbfLocktime({ ...baseFixture, rbf: true });
        expect(r.nSequence).toBe(0xFFFFFFFD);
        expect(r.nLockTime).toBe(0);
        expect(r.rbfSignaling).toBe(true);
    });

    test('rbf:true + currentHeight → anti-fee-sniping', () => {
        const r = computeRbfLocktime({ ...baseFixture, rbf: true, current_height: 860000 });
        expect(r.nSequence).toBe(0xFFFFFFFD);
        expect(r.nLockTime).toBe(860000);
        expect(r.locktimeType).toBe('block_height');
    });

    test('rbf:true + locktime → locktime wins over currentHeight', () => {
        const r = computeRbfLocktime({ ...baseFixture, rbf: true, locktime: 850000, current_height: 860000 });
        expect(r.nSequence).toBe(0xFFFFFFFD);
        expect(r.nLockTime).toBe(850000);
    });

    test('locktime without rbf → nSeq=0xFFFFFFFE', () => {
        const r = computeRbfLocktime({ ...baseFixture, locktime: 850000 });
        expect(r.nSequence).toBe(0xFFFFFFFE);
        expect(r.nLockTime).toBe(850000);
        expect(r.rbfSignaling).toBe(false);
    });

    test('locktime boundary: 499999999 = block_height', () => {
        const r = computeRbfLocktime({ ...baseFixture, locktime: 499999999 });
        expect(r.locktimeType).toBe('block_height');
    });

    test('locktime boundary: 500000000 = unix_timestamp', () => {
        const r = computeRbfLocktime({ ...baseFixture, locktime: 500000000 });
        expect(r.locktimeType).toBe('unix_timestamp');
    });

    test('rbf:false explicit → same as absent', () => {
        const r = computeRbfLocktime({ ...baseFixture, rbf: false });
        expect(r.nSequence).toBe(0xFFFFFFFF);
        expect(r.rbfSignaling).toBe(false);
    });
});
