/* Chapter 03 — MSA & coevolution */
AF.ready(() => {
  const V = AF.V;
  const L = 48, Q = 4, POOL = 2000;
  const ALPHA = ['H', 'P', '+', '−'];
  const ACOL = ['#ff9f43', '#2fbf71', '#3b82f6', '#ef4444'];

  // true contacts from real lysozyme C, residues 41–88
  const ca = AF_PROTEINS.P00698.ca.slice(40, 40 + L);
  const contact = [];
  for (let i = 0; i < L; i++) { contact.push([]); for (let j = 0; j < L; j++) contact[i].push(Math.abs(i - j) >= 6 && V.dist(ca[i], ca[j]) < 8 ? 1 : 0); }
  const nbrs = contact.map((r) => r.map((c, j) => (c ? j : -1)).filter((j) => j >= 0));
  let nTrue = 0; for (let i = 0; i < L; i++) for (let j = i + 6; j < L; j++) nTrue += contact[i][j];

  // compatibility of residue classes
  const C4 = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, -1, 1], [0, 0, 1, -1]];
  const st = { N: 100, J: 1.6, noise: 0.1, pool: [], rand: [], seed: 7, msa: [], score: null, pred: [] };

  const genPool = () => {
    const rng = AF.rng(st.seed);
    const g = () => { let u = 0, v = 0; while (!u) u = rng(); while (!v) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    const h = Array.from({ length: L }, () => Array.from({ length: Q }, () => g() * 0.6));
    st.pool = []; st.rand = [];
    const p = new Float64Array(Q);
    for (let n = 0; n < POOL; n++) {
      const s = Array.from({ length: L }, () => Math.floor(rng() * Q));
      for (let sweep = 0; sweep < 12; sweep++) {
        for (let i = 0; i < L; i++) {
          let tot = 0;
          for (let a = 0; a < Q; a++) {
            let e = h[i][a];
            for (const j of nbrs[i]) e += st.J * C4[a][s[j]];
            p[a] = Math.exp(e); tot += p[a];
          }
          let r = rng() * tot, a = 0; while (a < Q - 1 && (r -= p[a]) > 0) a++;
          s[i] = a;
        }
      }
      st.pool.push(s);
      st.rand.push(Array.from({ length: L }, () => Math.floor(rng() * Q)));
    }
  };
  const buildMSA = (N, offset = 0) => {
    const out = [];
    const rng = AF.rng(1234 + offset);
    for (let n = 0; n < N; n++) {
      const k = (n + offset * 97) % POOL;
      out.push(rng() < st.noise ? st.rand[k] : st.pool[k]);
    }
    return out;
  };
  const miAPC = (msa) => {
    const N = msa.length, lam = 0.5;
    const f1 = Array.from({ length: L }, () => new Float64Array(Q));
    msa.forEach((s) => s.forEach((a, i) => f1[i][a]++));
    const M = Array.from({ length: L }, () => new Float64Array(L));
    for (let i = 0; i < L; i++) for (let j = i + 1; j < L; j++) {
      const f2 = new Float64Array(Q * Q);
      for (const s of msa) f2[s[i] * Q + s[j]]++;
      let mi = 0;
      for (let a = 0; a < Q; a++) for (let b = 0; b < Q; b++) {
        const pij = (f2[a * Q + b] + lam / Q) / (N + lam * Q);
        const pi = (f1[i][a] + lam) / (N + lam * Q), pj = (f1[j][b] + lam) / (N + lam * Q);
        mi += pij * Math.log(pij / (pi * pj));
      }
      M[i][j] = M[j][i] = mi;
    }
    const rowM = M.map((r) => r.reduce((a, b) => a + b, 0) / (L - 1));
    const all = rowM.reduce((a, b) => a + b, 0) / L;
    const A = M.map((r, i) => Array.from(r, (v, j) => (i === j ? 0 : v - (rowM[i] * rowM[j]) / all)));
    return A;
  };
  const precision = (A) => {
    const cand = [];
    for (let i = 0; i < L; i++) for (let j = i + 6; j < L; j++) cand.push([A[i][j], i, j]);
    cand.sort((x, y) => y[0] - x[0]);
    const top = cand.slice(0, L / 2);
    return { prec: top.filter((c) => contact[c[1]][c[2]]).length / top.length, top };
  };
  const neff = (msa) => {
    const S = msa.length > 600 ? msa.slice(0, 600) : msa, n = S.length;
    let tot = 0;
    for (let a = 0; a < n; a++) {
      let c = 0;
      for (let b = 0; b < n; b++) { let id = 0; for (let i = 0; i < L; i++) id += S[a][i] === S[b][i]; if (id >= 0.8 * L) c++; }
      tot += 1 / c;
    }
    return (tot * msa.length) / n;
  };
  const Nof = (v) => Math.round(Math.pow(10, 0.3 + v * 0.1));

  const recompute = () => {
    st.msa = buildMSA(st.N);
    st.score = miAPC(st.msa);
    const p = precision(st.score); st.pred = p.top;
    AF.set('coNs', st.N.toLocaleString());
    AF.set('coNeff', neff(st.msa).toFixed(0));
    AF.set('coPrec', (100 * p.prec).toFixed(0) + '<small>%</small>');
    AF.set('coTrue', nTrue);
    coCv.redraw();
  };

  const coCv = AF.canvas(document.getElementById('coCv'), (w) => (w > 700 ? 340 : 640), (ctx, w, h) => {
    const C = AF.colors(); if (!st.score) return;
    const side = w > 700;
    // MSA panel
    const rows = Math.min(36, st.msa.length);
    const mw = side ? w * 0.48 : w - 40, cw = Math.min(10, (mw - 60) / L), ch = Math.min(8, 300 / 36);
    const mx = 20, my = 30;
    ctx.fillStyle = C.dim; ctx.font = `12px ${C.font}`; ctx.fillText(`MSA (앞 ${rows}개 서열 · 색 = 잔기 종류)`, mx, 18);
    for (let r = 0; r < rows; r++) for (let i = 0; i < L; i++) { ctx.fillStyle = ACOL[st.msa[r][i]]; ctx.globalAlpha = r === 0 ? 1 : 0.8; ctx.fillRect(mx + i * cw, my + r * ch, cw - 0.5, ch - 0.5); }
    ctx.globalAlpha = 1;
    ACOL.forEach((c, k) => { ctx.fillStyle = c; ctx.fillRect(mx + k * 60, my + rows * ch + 10, 10, 10); ctx.fillStyle = C.dim; ctx.fillText(ALPHA[k], mx + k * 60 + 14, my + rows * ch + 19); });
    // contact map
    const size = side ? Math.min(h - 40, w * 0.46) : Math.min(w - 40, 300);
    const ox = side ? w - size - 20 : (w - size) / 2, oy = side ? 28 : my + rows * ch + 40;
    const cs = size / L;
    ctx.fillStyle = C.dim; ctx.fillText('접촉 지도 (위: MI-APC · 아래: 실제)', ox, oy - 10);
    let mx2 = 1e-9; for (let i = 0; i < L; i++) for (let j = i + 1; j < L; j++) mx2 = Math.max(mx2, st.score[i][j]);
    ctx.fillStyle = C.surf; ctx.fillRect(ox, oy, size, size);
    for (let i = 0; i < L; i++) for (let j = 0; j < L; j++) {
      if (j > i) { const t = Math.max(0, st.score[i][j] / mx2); ctx.fillStyle = AF.seqColor(t); ctx.globalAlpha = 0.15 + 0.85 * t; ctx.fillRect(ox + j * cs, oy + i * cs, cs, cs); ctx.globalAlpha = 1; }
      else if (j < i && contact[i][j]) { ctx.fillStyle = '#9aa6bf'; ctx.fillRect(ox + j * cs, oy + i * cs, cs, cs); }
    }
    st.pred.forEach(([, i, j]) => {
      ctx.strokeStyle = contact[i][j] ? C.ok : C.bad; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(ox + (j + 0.5) * cs, oy + (i + 0.5) * cs, cs * 0.7, 0, 7); ctx.stroke();
    });
    ctx.strokeStyle = C.border; ctx.strokeRect(ox, oy, size, size);
  });

  let sweep = [];
  const sweepCv = AF.canvas(document.getElementById('sweepCv'), 220, (ctx, w, h) => {
    const C = AF.colors(); const x0 = 60, y0 = 16, ww = w - 90, hh = h - 60;
    const X = (n) => x0 + (Math.log10(n) - Math.log10(2)) / (Math.log10(2000) - Math.log10(2)) * ww;
    AF.axes(ctx, x0, y0, ww, hh, { nx: 0, ny: 4, yl: (t) => (t * 100).toFixed(0) + '%', yt: '정밀도', xt: 'N_seq (로그 스케일)' });
    [2, 10, 30, 100, 1000].forEach((n) => { ctx.fillStyle = C.dim; ctx.font = `11px ${C.mono}`; ctx.textAlign = 'center'; ctx.fillText(n, X(n), y0 + hh + 15); });
    ctx.setLineDash([4, 4]); ctx.strokeStyle = C.warn; ctx.beginPath(); ctx.moveTo(X(30), y0); ctx.lineTo(X(30), y0 + hh); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.warn; ctx.font = `11px ${C.font}`; ctx.fillText('≈30', X(30) + 14, y0 + 10);
    if (!sweep.length) { ctx.fillStyle = C.faint; ctx.font = `13px ${C.font}`; ctx.textAlign = 'center'; ctx.fillText('“깊이 스윕 실행”을 누르면 곡선이 그려집니다', x0 + ww / 2, y0 + hh / 2); return; }
    ctx.strokeStyle = C.acc; ctx.lineWidth = 2.2; ctx.beginPath();
    sweep.forEach(([n, p], i) => { const x = X(n), y = y0 + hh * (1 - p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
    sweep.forEach(([n, p]) => { ctx.fillStyle = C.acc; ctx.beginPath(); ctx.arc(X(n), y0 + hh * (1 - p), 4, 0, 7); ctx.fill(); });
  });

  AF.range('coN', (v) => Nof(v).toLocaleString(), (v) => { st.N = Nof(v); if (st.pool.length) recompute(); });
  AF.range('coJ', (v) => v.toFixed(1), (v) => { st.J = v; });
  AF.range('coNoise', (v) => Math.round(v * 100) + '%', (v) => { st.noise = v; if (st.pool.length) recompute(); });
  document.getElementById('coJ').addEventListener('change', () => { genPool(); sweep = []; sweepCv.redraw(); recompute(); });
  document.getElementById('coRe').onclick = () => { st.seed++; genPool(); recompute(); };
  document.getElementById('coSweep').onclick = () => {
    const Ns = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2000];
    sweep = []; let k = 0;
    const step = () => {
      const n = Ns[k]; let tot = 0; const reps = n > 500 ? 1 : 3;
      for (let r = 0; r < reps; r++) tot += precision(miAPC(buildMSA(n, r + 1))).prec;
      sweep.push([n, tot / reps]); sweepCv.redraw();
      if (++k < Ns.length) setTimeout(step, 10);
    };
    step();
  };
  genPool(); recompute();

  /* ---------- DB ablation ---------- */
  const dbCv = AF.canvas(document.getElementById('dbCv'), 190, (ctx, w, h) => {
    const C = AF.colors(); const rows = [['BFD 제거', -0.4], ['MGnify 제거', -0.7], ['BFD + MGnify 제거', -6.1]];
    const x0 = 160, x1 = w - 70, X = (v) => x0 + (-v / 7) * (x1 - x0);
    AF.axes(ctx, x0, 10, x1 - x0, h - 50, { nx: 7, ny: 0, xl: (t) => '−' + (t * 7).toFixed(0), xt: '평균 GDT 감소' });
    rows.forEach((r, i) => {
      const y = 22 + i * 40;
      ctx.fillStyle = i === 2 ? C.bad : C.warn; ctx.fillRect(x0, y, Math.max(2, X(r[1]) - x0), 24);
      ctx.fillStyle = C.text; ctx.font = `13px ${C.font}`; ctx.textAlign = 'right'; ctx.fillText(r[0], x0 - 10, y + 17);
      ctx.font = `12px ${C.mono}`; ctx.textAlign = 'left'; ctx.fillText(r[1].toFixed(1) + ' GDT', X(r[1]) + 8, y + 17);
    });
  });
});
