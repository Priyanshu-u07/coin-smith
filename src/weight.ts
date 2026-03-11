/**
 * Transaction weight/vbytes estimation.
 * Uses conservative estimates matching Bitcoin Core assumptions.
 */

const INPUT_WEIGHT: Record<string, number> = {
    'p2wpkh':      41 * 4 + 107,   // 271 WU
    'p2tr':        41 * 4 + 66,    // 230 WU
    'p2pkh':       148 * 4,        // 592 WU
    'p2sh-p2wpkh': 64 * 4 + 107,   // 363 WU
    'p2wsh':       41 * 4 + 107,   // 271 WU
};

const OUTPUT_WEIGHT: Record<string, number> = {
    'p2wpkh':      31 * 4,   // 124 WU
    'p2tr':        43 * 4,   // 172 WU
    'p2pkh':       34 * 4,   // 136 WU
    'p2sh':        32 * 4,   // 128 WU
    'p2sh-p2wpkh': 32 * 4,   // 128 WU
    'p2wsh':       43 * 4,   // 172 WU
};

const DEFAULT_INPUT_WEIGHT = 271;
const DEFAULT_OUTPUT_WEIGHT = 128;

export function getInputWeight(scriptType: string): number {
    return INPUT_WEIGHT[scriptType] ?? DEFAULT_INPUT_WEIGHT;
}

export function getOutputWeight(scriptType: string): number {
    return OUTPUT_WEIGHT[scriptType] ?? DEFAULT_OUTPUT_WEIGHT;
}

export function estimateVbytes(inputTypes: string[], outputTypes: string[]): number {
    const hasSegwit = inputTypes.some(t =>
        t === 'p2wpkh' || t === 'p2tr' || t === 'p2wsh' || t === 'p2sh-p2wpkh'
    );

    const inputCountVarIntSize = inputTypes.length < 253 ? 1 : 3;
    const outputCountVarIntSize = outputTypes.length < 253 ? 1 : 3;
    const baseNonWitness = 4 + inputCountVarIntSize + outputCountVarIntSize + 4;
    const segwitOverhead = hasSegwit ? 2 : 0;

    let weight = baseNonWitness * 4 + segwitOverhead;

    for (const inputType of inputTypes) {
        weight += getInputWeight(inputType);
    }

    for (const outputType of outputTypes) {
        weight += getOutputWeight(outputType);
    }

    return Math.ceil(weight / 4);
}
