/**
 * Greedy coin selection — largest UTXOs first with two-pass fee/change logic.
 */

import { UTXO, Payment, ChangeTemplate, CoinSelectionResult } from './types';
import { estimateVbytes } from './weight';

/**
 * Greedy coin selection: largest UTXOs first.
 *
 * @throws Error with code INSUFFICIENT_FUNDS if UTXOs can't cover payments + fee
 */
export function greedySelect(
    utxos: UTXO[],
    payments: Payment[],
    feeRateSatVb: number,
    change: ChangeTemplate,
    maxInputs?: number
): CoinSelectionResult {
    const DUST_THRESHOLD = 546;

    const totalPayments = payments.reduce((acc, p) => acc + p.value_sats, 0);

    // Sort by value descending (largest first)
    const sorted = [...utxos].sort((a, b) => b.value_sats - a.value_sats);

    // Limit to max_inputs if specified
    const available = maxInputs ? sorted.slice(0, maxInputs) : sorted;

    const selected: UTXO[] = [];

    // Collect output types for payment outputs
    const paymentOutputTypes = payments.map(p => p.script_type);

    for (const utxo of available) {
        selected.push(utxo);

        const totalInput = selected.reduce((acc, u) => acc + u.value_sats, 0);
        const inputTypes = selected.map(u => u.script_type);

        // ── Pass 1: Try WITH change output ──
        const outputTypesWithChange = [...paymentOutputTypes, change.script_type];
        const vbytesWithChange = estimateVbytes(inputTypes, outputTypesWithChange);
        const feeWithChange = Math.ceil(vbytesWithChange * feeRateSatVb);
        const changeAmount = totalInput - totalPayments - feeWithChange;

        if (changeAmount >= DUST_THRESHOLD) {
            return {
                selectedInputs: selected,
                hasChange: true,
                changeAmount,
                feeSats: feeWithChange,
                vbytes: vbytesWithChange
            };
        }

        // ── Pass 2: Try WITHOUT change output (send-all) ──
        const vbytesNoChange = estimateVbytes(inputTypes, paymentOutputTypes);
        const feeNoChange = Math.ceil(vbytesNoChange * feeRateSatVb);
        const leftover = totalInput - totalPayments - feeNoChange;

        if (leftover >= 0) {
            // Leftover absorbed as extra fee (send-all scenario)
            return {
                selectedInputs: selected,
                hasChange: false,
                changeAmount: 0,
                feeSats: feeNoChange + leftover,  // all leftover becomes fee
                vbytes: vbytesNoChange
            };
        }

        // Not enough yet — keep adding UTXOs
    }

    throw new Error('INSUFFICIENT_FUNDS');
}
