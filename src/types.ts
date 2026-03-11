/**
 * TypeScript type definitions.
 */

// ── Fixture Input Types ──

export interface UTXO {
    txid: string;
    vout: number;
    value_sats: number;
    script_pubkey_hex: string;
    script_type: string;
    address: string;
}

export interface Payment {
    address: string;
    script_pubkey_hex: string;
    script_type: string;
    value_sats: number;
}

export interface ChangeTemplate {
    address: string;
    script_pubkey_hex: string;
    script_type: string;
}

export interface Policy {
    max_inputs?: number;
}

export interface Fixture {
    network: string;
    utxos: UTXO[];
    payments: Payment[];
    change: ChangeTemplate;
    fee_rate_sat_vb: number;
    rbf?: boolean;
    locktime?: number;
    current_height?: number;
    policy?: Policy;
}

// ── Output Types ──

export interface SelectedInput {
    txid: string;
    vout: number;
    value_sats: number;
    script_pubkey_hex: string;
    script_type: string;
    address: string;
}

export interface OutputEntry {
    n: number;
    value_sats: number;
    script_pubkey_hex: string;
    script_type: string;
    address: string;
    is_change: boolean;
}

export interface Warning {
    code: string;
}

export interface Report {
    ok: true;
    network: string;
    strategy: string;
    selected_inputs: SelectedInput[];
    outputs: OutputEntry[];
    change_index: number | null;
    fee_sats: number;
    fee_rate_sat_vb: number;
    vbytes: number;
    rbf_signaling: boolean;
    locktime: number;
    locktime_type: 'none' | 'block_height' | 'unix_timestamp';
    psbt_base64: string;
    warnings: Warning[];
}

export interface ErrorReport {
    ok: false;
    error: {
        code: string;
        message: string;
    };
}

export type BuildResult = Report | ErrorReport;

// ── Coin Selection Result ──

export interface CoinSelectionResult {
    selectedInputs: UTXO[];
    hasChange: boolean;
    changeAmount: number;
    feeSats: number;
    vbytes: number;
}

// ── RBF/Locktime Result ──

export interface RbfLocktimeResult {
    nSequence: number;
    nLockTime: number;
    rbfSignaling: boolean;
    locktimeType: 'none' | 'block_height' | 'unix_timestamp';
}
