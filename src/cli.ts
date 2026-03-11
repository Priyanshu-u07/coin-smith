/**
 * CLI entry point — reads fixture, builds PSBT, writes JSON report.
 */

import * as fs from 'fs';
import * as path from 'path';
import { validateFixture } from './validate';
import { greedySelect } from './coin-selection';
import { computeRbfLocktime } from './rbf-locktime';
import { buildPsbt } from './psbt-builder';
import { generateWarnings } from './warnings';
import { Report, ErrorReport, OutputEntry } from './types';

function errorReport(code: string, message: string): ErrorReport {
    return { ok: false, error: { code, message } };
}

function main(): void {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        process.stderr.write('Usage: node cli.js <fixture.json> <output.json>\n');
        process.exit(1);
    }

    const fixturePath = args[0];
    const outputPath = args[1];

    // Ensure output directory exists
    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    try {
        // 1. Read and parse fixture
        const rawJson = fs.readFileSync(fixturePath, 'utf-8');
        let parsed: any;
        try {
            parsed = JSON.parse(rawJson);
        } catch (e: any) {
            writeAndExit(outputPath, errorReport('INVALID_FIXTURE', `Invalid JSON: ${e.message}`));
            return;
        }

        // 2. Validate fixture
        const fixture = validateFixture(parsed);

        // 3. Coin selection
        let selectionResult;
        try {
            selectionResult = greedySelect(
                fixture.utxos,
                fixture.payments,
                fixture.fee_rate_sat_vb,
                fixture.change,
                fixture.policy?.max_inputs
            );
        } catch (e: any) {
            if (e.message === 'INSUFFICIENT_FUNDS') {
                writeAndExit(outputPath, errorReport('INSUFFICIENT_FUNDS', 'Not enough funds to cover payments and fees'));
                return;
            }
            throw e;
        }

        // 4. Compute RBF/locktime
        const rbfLocktime = computeRbfLocktime(fixture);

        // 5. Build outputs
        const outputs: OutputEntry[] = [];

        // Add payment outputs first
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

        // Add change output (if applicable)
        let changeIndex: number | null = null;
        if (selectionResult.hasChange) {
            changeIndex = outputs.length;
            outputs.push({
                n: changeIndex,
                value_sats: selectionResult.changeAmount,
                script_pubkey_hex: fixture.change.script_pubkey_hex,
                script_type: fixture.change.script_type,
                address: fixture.change.address,
                is_change: true,
            });
        }

        // 6. Build PSBT
        const psbtBase64 = buildPsbt(
            selectionResult.selectedInputs,
            outputs,
            rbfLocktime.nSequence,
            rbfLocktime.nLockTime,
            fixture.network
        );

        // 7. Compute fee rate with proper precision (±0.01 tolerance)
        const feeRateSatVb = Math.round((selectionResult.feeSats / selectionResult.vbytes) * 100) / 100;

        // 8. Generate warnings
        const warnings = generateWarnings(
            selectionResult.feeSats,
            feeRateSatVb,
            selectionResult.hasChange,
            selectionResult.changeAmount,
            rbfLocktime.rbfSignaling
        );

        // 9. Build report
        const report: Report = {
            ok: true,
            network: fixture.network,
            strategy: 'greedy',
            selected_inputs: selectionResult.selectedInputs.map(u => ({
                txid: u.txid,
                vout: u.vout,
                value_sats: u.value_sats,
                script_pubkey_hex: u.script_pubkey_hex,
                script_type: u.script_type,
                address: u.address,
            })),
            outputs,
            change_index: changeIndex,
            fee_sats: selectionResult.feeSats,
            fee_rate_sat_vb: feeRateSatVb,
            vbytes: selectionResult.vbytes,
            rbf_signaling: rbfLocktime.rbfSignaling,
            locktime: rbfLocktime.nLockTime,
            locktime_type: rbfLocktime.locktimeType,
            psbt_base64: psbtBase64,
            warnings,
        };

        // 10. Write to output file
        fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
        process.exit(0);

    } catch (e: any) {
        const msg = e.message || String(e);
        let code = 'INTERNAL_ERROR';
        if (msg.startsWith('INVALID_FIXTURE:')) {
            code = 'INVALID_FIXTURE';
        } else if (msg.startsWith('INSUFFICIENT_FUNDS')) {
            code = 'INSUFFICIENT_FUNDS';
        }
        writeAndExit(outputPath, errorReport(code, msg));
    }
}

function writeAndExit(outputPath: string, report: ErrorReport): void {
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    process.exit(1);
}

main();
