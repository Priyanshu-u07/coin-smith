import express from 'express';
import path from 'path';
import { validateFixture } from './validate';
import { greedySelect } from './coin-selection';
import { computeRbfLocktime } from './rbf-locktime';
import { buildPsbt } from './psbt-builder';
import { generateWarnings } from './warnings';
import { OutputEntry } from './types';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
});

app.post('/api/build', (req, res) => {
    try {
        const fixture = validateFixture(req.body);

        const selection = greedySelect(
            fixture.utxos,
            fixture.payments,
            fixture.fee_rate_sat_vb,
            fixture.change,
            fixture.policy?.max_inputs
        );

        const rbfLocktime = computeRbfLocktime(fixture);

        const outputs: OutputEntry[] = [];
        for (let i = 0; i < fixture.payments.length; i++) {
            const p = fixture.payments[i];
            outputs.push({
                n: i,
                value_sats: p.value_sats,
                script_pubkey_hex: p.script_pubkey_hex,
                script_type: p.script_type,
                address: p.address,
                is_change: false,
            });
        }

        let changeIndex: number | null = null;
        if (selection.hasChange) {
            changeIndex = outputs.length;
            outputs.push({
                n: changeIndex,
                value_sats: selection.changeAmount,
                script_pubkey_hex: fixture.change.script_pubkey_hex,
                script_type: fixture.change.script_type,
                address: fixture.change.address,
                is_change: true,
            });
        }

        const psbtBase64 = buildPsbt(
            selection.selectedInputs,
            outputs,
            rbfLocktime.nSequence,
            rbfLocktime.nLockTime,
            fixture.network
        );

        const feeRateSatVb = Math.round((selection.feeSats / selection.vbytes) * 100) / 100;

        const warnings = generateWarnings(
            selection.feeSats,
            feeRateSatVb,
            selection.hasChange,
            selection.changeAmount,
            rbfLocktime.rbfSignaling
        );

        res.json({
            ok: true,
            network: fixture.network,
            strategy: 'greedy',
            selected_inputs: selection.selectedInputs,
            outputs,
            change_index: changeIndex,
            fee_sats: selection.feeSats,
            fee_rate_sat_vb: feeRateSatVb,
            vbytes: selection.vbytes,
            rbf_signaling: rbfLocktime.rbfSignaling,
            locktime: rbfLocktime.nLockTime,
            locktime_type: rbfLocktime.locktimeType,
            psbt_base64: psbtBase64,
            warnings,
        });
    } catch (e: any) {
        const msg = e.message || String(e);
        let code = 'INTERNAL_ERROR';
        if (msg.startsWith('INVALID_FIXTURE:')) code = 'INVALID_FIXTURE';
        else if (msg === 'INSUFFICIENT_FUNDS') code = 'INSUFFICIENT_FUNDS';
        res.json({ ok: false, error: { code, message: msg } });
    }
});

app.listen(PORT, '127.0.0.1', () => {
    console.log(`http://127.0.0.1:${PORT}`);
});
