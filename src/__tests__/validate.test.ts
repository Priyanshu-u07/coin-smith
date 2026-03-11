import { validateFixture } from '../validate';

describe('fixture validation', () => {
    const validFixture = {
        network: 'mainnet',
        utxos: [{
            txid: 'a'.repeat(64),
            vout: 0,
            value_sats: 100000,
            script_pubkey_hex: '0014' + '11'.repeat(20),
            script_type: 'p2wpkh',
            address: 'bc1qtest',
        }],
        payments: [{
            address: 'bc1qpay',
            script_pubkey_hex: '0014' + '22'.repeat(20),
            script_type: 'p2wpkh',
            value_sats: 50000,
        }],
        change: {
            address: 'bc1qchange',
            script_pubkey_hex: '0014' + '33'.repeat(20),
            script_type: 'p2wpkh',
        },
        fee_rate_sat_vb: 5,
    };

    test('valid fixture passes', () => {
        expect(() => validateFixture(validFixture)).not.toThrow();
    });

    test('missing utxos throws', () => {
        expect(() => validateFixture({ ...validFixture, utxos: [] })).toThrow('INVALID_FIXTURE');
    });

    test('missing payments throws', () => {
        expect(() => validateFixture({ ...validFixture, payments: [] })).toThrow('INVALID_FIXTURE');
    });

    test('invalid txid throws', () => {
        const bad = { ...validFixture, utxos: [{ ...validFixture.utxos[0], txid: 'short' }] };
        expect(() => validateFixture(bad)).toThrow('INVALID_FIXTURE');
    });

    test('duplicate UTXOs throws', () => {
        const dup = { ...validFixture, utxos: [validFixture.utxos[0], validFixture.utxos[0]] };
        expect(() => validateFixture(dup)).toThrow('Duplicate UTXO');
    });

    test('negative fee rate throws', () => {
        expect(() => validateFixture({ ...validFixture, fee_rate_sat_vb: -1 })).toThrow('INVALID_FIXTURE');
    });
});
