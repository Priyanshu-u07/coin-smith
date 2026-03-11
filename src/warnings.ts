import { Warning } from './types';

export function generateWarnings(
    feeSats: number,
    feeRateSatVb: number,
    hasChange: boolean,
    changeAmount: number,
    rbfSignaling: boolean
): Warning[] {
    const warnings: Warning[] = [];

    if (feeSats > 1_000_000 || feeRateSatVb > 200) {
        warnings.push({ code: 'HIGH_FEE' });
    }

    if (!hasChange) {
        warnings.push({ code: 'SEND_ALL' });
    }

    if (hasChange && changeAmount < 546) {
        warnings.push({ code: 'DUST_CHANGE' });
    }

    if (rbfSignaling) {
        warnings.push({ code: 'RBF_SIGNALING' });
    }

    return warnings;
}
