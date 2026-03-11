/**
 * Defensive fixture validation.
 */

import { Fixture } from './types';

/**
 * Validate a fixture and throw descriptive errors for malformed input.
 */
export function validateFixture(fixture: any): Fixture {
    if (!fixture || typeof fixture !== 'object') {
        throw new Error('INVALID_FIXTURE: Fixture must be a JSON object');
    }

    // Network
    if (typeof fixture.network !== 'string' || !fixture.network) {
        throw new Error('INVALID_FIXTURE: Missing or invalid "network" field');
    }

    // UTXOs
    if (!Array.isArray(fixture.utxos) || fixture.utxos.length === 0) {
        throw new Error('INVALID_FIXTURE: "utxos" must be a non-empty array');
    }

    const seenUtxos = new Set<string>();
    for (let i = 0; i < fixture.utxos.length; i++) {
        const u = fixture.utxos[i];
        if (!u || typeof u !== 'object') {
            throw new Error(`INVALID_FIXTURE: utxos[${i}] is not an object`);
        }

        if (typeof u.txid !== 'string' || !/^[0-9a-fA-F]{64}$/.test(u.txid)) {
            throw new Error(`INVALID_FIXTURE: utxos[${i}].txid must be 64-char hex`);
        }

        if (typeof u.vout !== 'number' || u.vout < 0 || !Number.isInteger(u.vout)) {
            throw new Error(`INVALID_FIXTURE: utxos[${i}].vout must be non-negative integer`);
        }

        if (typeof u.value_sats !== 'number' || u.value_sats <= 0) {
            throw new Error(`INVALID_FIXTURE: utxos[${i}].value_sats must be positive`);
        }

        if (typeof u.script_pubkey_hex !== 'string' || !u.script_pubkey_hex) {
            throw new Error(`INVALID_FIXTURE: utxos[${i}].script_pubkey_hex is required`);
        }

        // Check duplicates
        const utxoKey = `${u.txid}:${u.vout}`;
        if (seenUtxos.has(utxoKey)) {
            throw new Error(`INVALID_FIXTURE: Duplicate UTXO ${utxoKey}`);
        }
        seenUtxos.add(utxoKey);
    }

    // Payments
    if (!Array.isArray(fixture.payments) || fixture.payments.length === 0) {
        throw new Error('INVALID_FIXTURE: "payments" must be a non-empty array');
    }

    for (let i = 0; i < fixture.payments.length; i++) {
        const p = fixture.payments[i];
        if (!p || typeof p !== 'object') {
            throw new Error(`INVALID_FIXTURE: payments[${i}] is not an object`);
        }
        if (typeof p.value_sats !== 'number' || p.value_sats <= 0) {
            throw new Error(`INVALID_FIXTURE: payments[${i}].value_sats must be positive`);
        }
        if (typeof p.script_pubkey_hex !== 'string' || !p.script_pubkey_hex) {
            throw new Error(`INVALID_FIXTURE: payments[${i}].script_pubkey_hex is required`);
        }
    }

    // Change
    if (!fixture.change || typeof fixture.change !== 'object') {
        throw new Error('INVALID_FIXTURE: "change" object is required');
    }
    if (typeof fixture.change.script_pubkey_hex !== 'string' || !fixture.change.script_pubkey_hex) {
        throw new Error('INVALID_FIXTURE: change.script_pubkey_hex is required');
    }

    // Fee rate
    if (typeof fixture.fee_rate_sat_vb !== 'number' || fixture.fee_rate_sat_vb <= 0) {
        throw new Error('INVALID_FIXTURE: fee_rate_sat_vb must be a positive number');
    }

    return fixture as Fixture;
}
