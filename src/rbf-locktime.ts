/**
 * RBF & Locktime logic — implements the spec interaction matrix.
 */

import { Fixture, RbfLocktimeResult } from './types';

export function computeRbfLocktime(fixture: Fixture): RbfLocktimeResult {
    const rbf = fixture.rbf ?? false;
    const hasLocktime = fixture.locktime !== undefined && fixture.locktime !== null;
    const hasCurrentHeight = fixture.current_height !== undefined && fixture.current_height !== null;

    // ── nLockTime ──
    let nLockTime: number;
    if (hasLocktime) {
        nLockTime = fixture.locktime!;
    } else if (rbf && hasCurrentHeight) {
        // Anti-fee-sniping: set nLockTime to current chain tip height
        nLockTime = fixture.current_height!;
    } else {
        nLockTime = 0;
    }

    // ── nSequence ──
    let nSequence: number;
    if (rbf) {
        nSequence = 0xFFFFFFFD;
    } else if (nLockTime > 0) {
        nSequence = 0xFFFFFFFE;
    } else {
        nSequence = 0xFFFFFFFF;
    }

    // ── rbf_signaling ──
    const rbfSignaling = nSequence <= 0xFFFFFFFD;

    // ── locktime_type ──
    let locktimeType: 'none' | 'block_height' | 'unix_timestamp';
    if (nLockTime === 0) {
        locktimeType = 'none';
    } else if (nLockTime < 500_000_000) {
        locktimeType = 'block_height';
    } else {
        locktimeType = 'unix_timestamp';
    }

    return { nSequence, nLockTime, rbfSignaling, locktimeType };
}
