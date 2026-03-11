const ta = document.getElementById("ta");
const ln = document.getElementById("ln");
const buildBtn = document.getElementById("buildBtn");
const results = document.getElementById("results");

function updateLn() {
  const n = ta.value.split("\n").length;
  ln.innerHTML = Array.from({ length: n }, (_, i) => i + 1).join("<br>");
}
ta.addEventListener("input", updateLn);
ta.addEventListener("scroll", () => {
  ln.scrollTop = ta.scrollTop;
});
updateLn();

const samples = {
  basic: {
    network: "mainnet",
    utxos: [
      {
        txid: "1".repeat(64),
        vout: 0,
        value_sats: 100000,
        script_pubkey_hex: "00141111111111111111111111111111111111111111",
        script_type: "p2wpkh",
        address: "bc1qzyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3h8ffkz",
      },
    ],
    payments: [
      {
        address: "bc1qyysjzgfpyysjzgfpyysjzgfpyysjzgfpf7224r",
        script_pubkey_hex: "00142121212121212121212121212121212121212121",
        script_type: "p2wpkh",
        value_sats: 70000,
      },
    ],
    change: {
      address: "bc1qxycnzvf3xycnzvf3xycnzvf3xycnzvf36suk2s",
      script_pubkey_hex: "00143131313131313131313131313131313131313131",
      script_type: "p2wpkh",
    },
    fee_rate_sat_vb: 5,
    policy: { max_inputs: 5 },
  },
  rbf: {
    network: "mainnet",
    utxos: [
      {
        txid: "a1".repeat(32),
        vout: 0,
        value_sats: 100000,
        script_pubkey_hex: "0014a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1",
        script_type: "p2wpkh",
        address: "bc1q5xs6rgdp5xs6rgdp5xs6rgdp5xs6rgdp4gkthz",
      },
    ],
    payments: [
      {
        address: "bc1q52329g4z52329g4z52329g4z52329g4zyvswu5",
        script_pubkey_hex: "0014a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2",
        script_type: "p2wpkh",
        value_sats: 70000,
      },
    ],
    change: {
      address: "bc1q5w368gar5w368gar5w368gar5w368gar9u30k4",
      script_pubkey_hex: "0014a3a3a3a3a3a3a3a3a3a3a3a3a3a3a3a3a3a3a3a3",
      script_type: "p2wpkh",
    },
    fee_rate_sat_vb: 5,
    rbf: true,
    policy: { max_inputs: 5 },
  },
  sendall: {
    network: "mainnet",
    utxos: [
      {
        txid: "3".repeat(64),
        vout: 0,
        value_sats: 10000,
        script_pubkey_hex: "00143333333333333333333333333333333333333333",
        script_type: "p2wpkh",
        address: "bc1qxvenxvenxvenxvenxvenxvenxvenxven2ymjt8",
      },
    ],
    payments: [
      {
        address: "bc1qxs6rgdp5xs6rgdp5xs6rgdp5xs6rgdp525uhvm",
        script_pubkey_hex: "00143434343434343434343434343434343434343434",
        script_type: "p2wpkh",
        value_sats: 9000,
      },
    ],
    change: {
      address: "bc1qx56n2df4x56n2df4x56n2df4x56n2df4tyakx6",
      script_pubkey_hex: "00143535353535353535353535353535353535353535",
      script_type: "p2wpkh",
    },
    fee_rate_sat_vb: 5,
    policy: { max_inputs: 3 },
  },
};

document.querySelectorAll(".sample-btn").forEach((b) => {
  b.addEventListener("click", () => {
    ta.value = JSON.stringify(samples[b.dataset.s], null, 2);
    updateLn();
  });
});

document.getElementById("tabs").addEventListener("click", (e) => {
  const t = e.target.closest(".tab");
  if (!t) return;
  document
    .querySelectorAll(".tab")
    .forEach((x) => x.classList.remove("active"));
  document.querySelectorAll(".tp").forEach((x) => x.classList.remove("active"));
  t.classList.add("active");
  document.getElementById("tp-" + t.dataset.t).classList.add("active");
});

buildBtn.addEventListener("click", async () => {
  const raw = ta.value.trim();
  if (!raw) return;
  buildBtn.disabled = true;
  buildBtn.textContent = "⏳ Building...";
  try {
    const res = await fetch("/api/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: raw,
    });
    render(await res.json());
  } catch (e) {
    render({ ok: false, error: { code: "NETWORK_ERROR", message: e.message } });
  } finally {
    buildBtn.disabled = false;
    buildBtn.textContent = "⚒ Build PSBT";
  }
});

const wDesc = {
  SEND_ALL:
    "No change output was created. Any leftover amount was added to the miner fee.",
  HIGH_FEE:
    "Fee exceeds safety threshold (>1M sats or >200 sat/vB). Double-check before broadcasting.",
  RBF_SIGNALING:
    "Transaction signals Replace-By-Fee (BIP-125). It can be bumped before confirmation.",
  DUST_CHANGE:
    "Change output is below the dust threshold (546 sats) and was absorbed into the fee.",
};

function fmt(n) {
  return n.toLocaleString();
}
function bc(t) {
  return "badge-" + (t || "").replace(/[^a-z0-9-]/g, "");
}

function render(d) {
  results.style.display = "";
  const st = document.getElementById("rStatus");
  st.style.display = "none";

  if (!d.ok) {
    document.getElementById("tp-summary").innerHTML =
      '<div style="color:#ef4444;padding:1rem;font-weight:600">✕ ' +
      d.error.code +
      ": " +
      d.error.message +
      "</div>";
    return;
  }

  // Status line removed per user request

  const totalIn = d.selected_inputs.reduce((s, i) => s + i.value_sats, 0);
  const totalSent = d.outputs
    .filter((o) => !o.is_change)
    .reduce((s, o) => s + o.value_sats, 0);
  const feePct = totalIn > 0 ? ((d.fee_sats / totalIn) * 100).toFixed(1) : "0";
  const rate = (d.fee_sats / d.vbytes).toFixed(2);

  // Fee block
  document.getElementById("feeVal").textContent = fmt(d.fee_sats) + " sats";
  document.getElementById("feeSub").textContent = rate + " sat/vB";

  // vBytes block
  document.getElementById("vbPct").textContent = feePct + "%";
  document.getElementById("vbVal").childNodes[0].textContent = d.vbytes + " vB";
  document.getElementById("vbFill").style.width =
    Math.min(parseFloat(feePct) * 5, 100) + "%";
  document.getElementById("vbSub").textContent = rate + " sat/vB";

  // RBF block
  document.getElementById("rbfVal").textContent = d.rbf_signaling
    ? "✓ ON"
    : "✕ OFF";
  document.getElementById("rbfVal").style.color = d.rbf_signaling
    ? "#22c55e"
    : "#8b9cc0";

  // Warnings
  const wl = document.getElementById("warnList");
  if (d.warnings.length > 0) {
    wl.innerHTML = d.warnings
      .map(
        (w) =>
          '<div class="warn-item"><div class="warn-code">⚠ ' +
          w.code +
          '</div><div class="warn-desc">' +
          (wDesc[w.code] || "") +
          "</div></div>",
      )
      .join("");
  } else {
    wl.innerHTML = '<div class="warn-none">✓ No warnings</div>';
  }

  // Flow diagram
  const inp = d.selected_inputs[0];
  const firstPayment = d.outputs.find((o) => !o.is_change) || d.outputs[0];

  document.getElementById("flowInput").innerHTML =
    '<div class="fi-top"><span class="fi-icon">💰</span><span class="fi-val">' +
    fmt(totalIn) +
    " sats</span></div>" +
    '<div class="fi-addr">' +
    (inp ? inp.txid.slice(0, 12) + "…:" + inp.vout : "") +
    (d.selected_inputs.length > 1
      ? ' <span style="color:#4a9eff">+' +
        (d.selected_inputs.length - 1) +
        "</span>"
      : "") +
    "</div>";

  document.getElementById("flowTx").innerHTML =
    '<div class="tx-title">Transaction</div>' +
    '<div class="tx-vb">' +
    d.vbytes +
    " vB</div>" +
    '<div class="tx-fee">Miner Fee: ' +
    fmt(d.fee_sats) +
    " sats</div>" +
    (d.locktime > 0
      ? '<div class="tx-fee" style="margin-top:2px"><span class="tip">🔒 Locktime: ' +
        d.locktime +
        " (" +
        d.locktime_type +
        ')<span class="tip-icon">ⓘ</span><span class="tip-content"><span class="tip-title">🔒 Transaction Locktime</span><span class="tip-body">Prevents this transaction from being mined before a specific block height or time. Used for anti-fee-sniping and time-locked contracts.</span></span></span></div>'
      : "");

  document.getElementById("flowOutput").innerHTML =
    '<div class="fo-top"><span class="fo-icon">📤</span><span class="fo-val">' +
    fmt(totalSent) +
    " sats</span></div>" +
    '<div class="fo-addr">' +
    (firstPayment ? firstPayment.address.slice(0, 16) + "…" : "") +
    (d.outputs.length > 1
      ? ' <span style="color:#4a9eff">+' + (d.outputs.length - 1) + "</span>"
      : "") +
    "</div>";

  // Stats bar
  const changeAmt = d.outputs
    .filter((o) => o.is_change)
    .reduce((s, o) => s + o.value_sats, 0);
  document.getElementById("statsBar").innerHTML =
    sb(fmt(d.fee_sats), "sats", rate + " sat/vB") +
    sb(d.vbytes, "VBYTES", "● " + rate + " sat/vB") +
    sb(d.selected_inputs.length, "INPUTS", d.selected_inputs.length) +
    sb(d.outputs.length, "OUTPUTS", d.outputs.length) +
    sb(
      d.rbf_signaling ? "✓" : "✕",
      "RBF status",
      d.rbf_signaling ? "ON" : "OFF",
    );

  // Inputs tab
  document.getElementById("tp-inputs").innerHTML =
    '<div style="margin-bottom:.8rem"><span class="tip" style="font-size:.82rem;font-weight:600">Selected Inputs (UTXOs)<span class="tip-icon">ⓘ</span><span class="tip-content"><span class="tip-title">📥 Inputs (UTXOs)</span><span class="tip-body">A wallet tracks unspent transaction outputs (UTXOs). To send Bitcoin, it selects one or more of them as inputs to fund the transaction.</span></span></span></div>' +
    d.selected_inputs
      .map(
        (inp, i) =>
          '<div class="entry"><div class="entry-top"><span class="entry-idx">Input #' +
          i +
          '</span><span class="badge ' +
          bc(inp.script_type) +
          '">' +
          inp.script_type +
          "</span></div>" +
          er("TXID", inp.txid) +
          er("Vout", inp.vout) +
          er("Value", fmt(inp.value_sats) + " sats") +
          "</div>",
      )
      .join("");

  // Outputs tab
  document.getElementById("tp-outputs").innerHTML = d.outputs
    .map(
      (o) =>
        '<div class="entry"><div class="entry-top"><span class="entry-idx">Output #' +
        o.n +
        (o.is_change
          ? ' <span class="badge badge-change"><span class="tip">CHANGE<span class="tip-icon">ⓘ</span><span class="tip-content"><span class="tip-title">💱 Change Output</span><span class="tip-body">Any leftover Bitcoin is returned to your wallet — similar to getting coins back after paying with cash.</span></span></span></span>'
          : "") +
        '</span><span class="badge ' +
        bc(o.script_type) +
        '">' +
        o.script_type +
        "</span></div>" +
        er("Value", fmt(o.value_sats) + " sats") +
        er("Address", o.address) +
        "</div>",
    )
    .join("");

  // PSBT tab
  document.getElementById("tp-psbt").innerHTML =
    '<div class="psbt-box">' + d.psbt_base64 + "</div>";

  // Reset to summary tab
  document
    .querySelectorAll(".tab")
    .forEach((x) => x.classList.remove("active"));
  document.querySelectorAll(".tp").forEach((x) => x.classList.remove("active"));
  document.querySelector('.tab[data-t="summary"]').classList.add("active");
  document.getElementById("tp-summary").classList.add("active");
}

function sb(val, label, sub) {
  return (
    '<div class="sb-item"><div class="sb-val">' +
    val +
    '</div><div class="sb-label">' +
    label +
    '</div><div class="sb-sub">' +
    sub +
    "</div></div>"
  );
}

function er(k, v) {
  return (
    '<div class="erow"><span class="ek">' +
    k +
    '</span><span class="ev">' +
    v +
    "</span></div>"
  );
}
