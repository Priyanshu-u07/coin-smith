import { estimateVbytes, getInputWeight, getOutputWeight } from '../weight';

describe('weight estimation', () => {
    test('single p2wpkh input + single p2wpkh output', () => {
        const vbytes = estimateVbytes(['p2wpkh'], ['p2wpkh']);
        expect(vbytes).toBeGreaterThan(0);
        expect(vbytes).toBeLessThan(200);
    });

    test('single p2tr input + single p2tr output', () => {
        const vbytes = estimateVbytes(['p2tr'], ['p2tr']);
        expect(vbytes).toBeLessThan(estimateVbytes(['p2pkh'], ['p2pkh']));
    });

    test('p2pkh is heavier than p2wpkh', () => {
        expect(getInputWeight('p2pkh')).toBeGreaterThan(getInputWeight('p2wpkh'));
    });

    test('p2sh-p2wpkh input weight between p2wpkh and p2pkh', () => {
        const w = getInputWeight('p2sh-p2wpkh');
        expect(w).toBeGreaterThan(getInputWeight('p2wpkh'));
        expect(w).toBeLessThan(getInputWeight('p2pkh'));
    });

    test('mixed inputs: p2wpkh + p2tr + p2pkh', () => {
        const vbytes = estimateVbytes(['p2wpkh', 'p2tr', 'p2pkh'], ['p2wpkh', 'p2tr']);
        expect(vbytes).toBeGreaterThan(0);
        // Should be roughly sum of individual weights
        const singleWpkh = estimateVbytes(['p2wpkh'], ['p2wpkh']);
        expect(vbytes).toBeGreaterThan(singleWpkh);
    });

    test('unknown script type uses default weight', () => {
        expect(getInputWeight('unknown')).toBe(271);
        expect(getOutputWeight('unknown')).toBe(128);
    });

    test('vbytes increases with more inputs', () => {
        const v1 = estimateVbytes(['p2wpkh'], ['p2wpkh']);
        const v2 = estimateVbytes(['p2wpkh', 'p2wpkh'], ['p2wpkh']);
        const v3 = estimateVbytes(['p2wpkh', 'p2wpkh', 'p2wpkh'], ['p2wpkh']);
        expect(v2).toBeGreaterThan(v1);
        expect(v3).toBeGreaterThan(v2);
    });
});
