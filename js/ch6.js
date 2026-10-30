/* Chapter 06 — losses & training */
AF.ready(() => {
  const V = AF.V;
  const HB = AF_PROTEINS.P69905;
  const c0 = V.centroid(HB.ca);
  const TRUE = HB.ca.map((p) => V.sub(p, c0));
  const n = TRUE.length;

  /* ---------- 6-2 FAPE ---------- */
  const eps = TRUE.map(() => [AF.gauss(), AF.gauss(), AF.gauss()]);
  const FP = { mode: 'noise', amt: 0.3, clamp: 10, pred: [], shown: [] };
  const DESC = {
    noise: '모든 Cα에 σ = 강도 × 3 Å의 무작위 잡음을 더합니다.',
    mirror: '정답과 그 거울상(x → −x) 사이를 보간합니다. 강도 1 = 완전한 거울상.',
    hinge: 'C말단 절반을 강도 × 90° 회전시킵니다(도메인 배치 오류).'
  };
  const axisRot = (axis, ang) => {
    const [x, y, z] = V.unit(axis), c = Math.cos(ang), s = Math.sin(ang), t = 1 - c;
    return [[t * x * x + c, t * x * y - s * z, t * x * z + s * y], [t * x * y + s * z, t * y * y + c, t * y * z - s * x], [t * x * z - s * y, t * y * z + s * x, t * z * z + c]];
  };
  const makePred = (mode, amt) => {
    if (mode === 'noise') return TRUE.map((p, i) => V.add(p, V.mul(eps[i], amt * 3)));
    if (mode === 'mirror') return TRUE.map((p) => [p[0] * (1 - 2 * amt), p[1], p[2]]);
    const h = Math.floor(n / 2), c = TRUE[h], R = axisRot([0.3, 1, 0.2], amt * Math.PI / 2);
    return TRUE.map((p, i) => (i > h ? V.add(V.mv(R, V.sub(p, c)), c) : p));
  };
  const frames = (X) => { const F = []; for (let i = 1; i < X.length - 1; i++) F.push(AF.frame(X[i - 1], X[i], X[i + 1])); return F; };
  const FT = frames(TRUE);
  const fape = (P, clamp) => {
    const FPd = frames(P); let s = 0, c = 0;
    for (let k = 0; k < FPd.length; k++) for (let i = 0; i < n; i++) {
      const a = AF.toLocal(FPd[k], P[i]), b = AF.toLocal(FT[k], TRUE[i]);
      s += Math.min(clamp, Math.sqrt(V.dist(a, b) ** 2 + 1e-4)); c++;
    }
    return s / c;
  };
  const drmsd = (P) => { let s = 0, c = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const d = V.dist(P[i], P[j]) - V.dist(TRUE[i], TRUE[j]); s += d * d; c++; } return Math.sqrt(s / c); };
  const ref = (() => { const P = makePred('noise', 1); return { r: AF.rmsd(AF.superpose(P, TRUE), TRUE), d: drmsd(P), f: fape(P, 10) }; })();
  let vals = { r: 0, d: 0, f: 0 };
  const fpUpdate = () => {
    FP.pred = makePred(FP.mode, FP.amt);
    FP.shown = AF.superpose(FP.pred, TRUE);
    vals = { r: AF.rmsd(FP.shown, TRUE), d: drmsd(FP.pred), f: fape(FP.pred, FP.clamp) };
    AF.set('fpR', vals.r.toFixed(2) + '<small>Å</small>'); AF.set('fpD', vals.d.toFixed(2) + '<small>Å</small>');
    AF.set('fpF', vals.f.toFixed(2) + '<small>Å</small>'); AF.set('fpFZ', (vals.f / 10).toFixed(3));
    AF.set('fpDesc', DESC[FP.mode]);
    fpView.redraw(); fpBar.redraw();
  };
  const fpView = AF.view3d(document.getElementById('fpCv'), {
    height: 360,
    getModel: () => {
      if (!FP.shown.length) return null;
      const grey = AF.isDark() ? '#5b667d' : '#b8c0cf';
      const pts = TRUE.concat(FP.shown);
      return { points: pts, center: [0, 0, 0], extent: 24, lineWidth: 3, breakAt: (i) => i === n - 1, color: (i) => (i < n ? grey : AF.css('--accent')) };
    }
  });
  const fpBar = AF.canvas(document.getElementById('fpBar'), 130, (ctx, w, h) => {
    const C = AF.colors(); const rows = [['RMSD', vals.r / ref.r, C.dim], ['dRMSD (거리 행렬)', vals.d / ref.d, C.warn], ['FAPE', vals.f / ref.f, C.acc]];
    const x0 = 150, x1 = w - 30, mx = 2.5;
    rows.forEach((r, i) => {
      const y = 14 + i * 36;
      ctx.fillStyle = C.text; ctx.font = `13px ${C.font}`; ctx.textAlign = 'right'; ctx.fillText(r[0], x0 - 10, y + 16);
      ctx.fillStyle = C.surf; ctx.fillRect(x0, y + 2, x1 - x0, 20);
      ctx.fillStyle = r[2]; ctx.fillRect(x0, y + 2, Math.min(1, r[1] / mx) * (x1 - x0), 20);
      ctx.fillStyle = C.text; ctx.textAlign = 'left'; ctx.font = `11px ${C.mono}`; ctx.fillText('×' + r[1].toFixed(2), x0 + 6 + Math.min(1, r[1] / mx) * (x1 - x0 - 50), y + 16);
    });
  });
  AF.seg('fpMode', (v) => { FP.mode = v; fpUpdate(); });
  AF.range('fpAmt', (v) => v.toFixed(2), (v) => { FP.amt = v; fpUpdate(); });
  AF.range('fpClamp', (v) => v.toFixed(1) + ' Å', (v) => { FP.clamp = v; fpUpdate(); });

  /* ---------- 6-3 distogram ---------- */
  const edges = Array.from({ length: 63 }, (_, k) => 2.3125 + (k * (21.6875 - 2.3125)) / 62);
  const centers = [2].concat(edges.slice(0, -1).map((e, k) => (e + edges[k + 1]) / 2), [23]);
  const binOf = (d) => { let b = 0; while (b < 63 && d > edges[b]) b++; return b; };
  const DM = TRUE.map((a) => TRUE.map((b) => V.dist(a, b)));
  const DG = { i: 20, j: 100, sig: 1.2, bias: 0, geo: null };
  { let best = 1e9; for (let a = 0; a < n; a++) for (let b = a + 16; b < n; b++) { const d = Math.abs(DM[a][b] - 7); if (d < best) { best = d; DG.i = a; DG.j = b; } } }
  const dgCv = AF.canvas(document.getElementById('dgCv'), (w) => (w > 700 ? 300 : 560), (ctx, w, h) => {
    const C = AF.colors(); const side = w > 700;
    const size = side ? Math.min(270, w * 0.38) : Math.min(w - 40, 280), ox = 20, oy = 26, cs = size / n;
    DG.geo = { ox, oy, cs };
    ctx.fillStyle = C.dim; ctx.font = `12px ${C.font}`; ctx.textAlign = 'left'; ctx.fillText('실제 Cα 거리 지도 (Å)', ox, 16);
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) { ctx.fillStyle = AF.seqColor(1 - Math.min(1, DM[a][b] / 30)); ctx.fillRect(ox + b * cs, oy + a * cs, cs + 0.5, cs + 0.5); }
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ox + (DG.j + 0.5) * cs, oy + (DG.i + 0.5) * cs, 6, 0, 7); ctx.stroke();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ox + (DG.j + 0.5) * cs, oy + (DG.i + 0.5) * cs, 7.5, 0, 7); ctx.stroke();
    // histogram
    const d = DM[DG.i][DG.j], mu = d + DG.bias;
    const logits = centers.map((c) => -((c - mu) ** 2) / (2 * DG.sig ** 2));
    const m = Math.max(...logits), e = logits.map((l) => Math.exp(l - m) + 1e-6), s = e.reduce((x, y) => x + y, 0), p = e.map((x) => x / s);
    const tb = binOf(d);
    const bx = side ? ox + size + 50 : ox + 30, by = side ? oy : oy + size + 40, bw = side ? w - bx - 20 : w - bx - 20, bh = side ? h - 70 : h - by - 40;
    const pm = Math.max(...p, 0.05);
    AF.axes(ctx, bx, by, bw, bh, { nx: 4, ny: 2, xl: (t) => (2 + t * 20).toFixed(0), yl: (t) => (t * pm).toFixed(2), xt: '거리 구간 (Å) · 64 bins' });
    p.forEach((v, b) => {
      const x = bx + (b / 64) * bw; ctx.fillStyle = b === tb ? C.ok : C.acc2; ctx.globalAlpha = b === tb ? 1 : 0.75;
      ctx.fillRect(x, by + bh * (1 - v / pm), bw / 64 - 1, (bh * v) / pm); ctx.globalAlpha = 1;
    });
    let pc = 0; p.forEach((v, b) => { if (centers[b] < 8) pc += v; });
    AF.set('dgPair', `(${DG.i + 1}, ${DG.j + 1})`); AF.set('dgTrue', d.toFixed(1) + '<small>Å</small>');
    AF.set('dgCE', (-Math.log(p[tb])).toFixed(2)); AF.set('dgPc', (pc * 100).toFixed(0) + '<small>%</small>');
  });
  document.getElementById('dgCv').addEventListener('click', (e) => {
    const [x, y] = AF.pointer(e.target, e), g = DG.geo; const j = Math.floor((x - g.ox) / g.cs), i = Math.floor((y - g.oy) / g.cs);
    if (i >= 0 && j >= 0 && i < n && j < n) { DG.i = i; DG.j = j; dgCv.redraw(); }
  });
  AF.range('dgSig', (v) => v.toFixed(1) + ' Å', (v) => { DG.sig = v; dgCv.redraw(); });
  AF.range('dgBias', (v) => (v > 0 ? '+' : '') + v.toFixed(1) + ' Å', (v) => { DG.bias = v; dgCv.redraw(); });

  /* ---------- 6-4 BERT game ---------- */
  const AAs = 'ACDEFGHIKLMNPQRSTVWY'.split('');
  const pairMap = { K: 'E', E: 'K', R: 'D', D: 'R' };
  const BG = { msa: [], mask: [], sel: null, right: 0, total: 0 };
  const newGame = () => {
    const r = Math.random;
    const pick = (s) => s[Math.floor(r() * s.length)];
    BG.msa = [];
    for (let s = 0; s < 9; s++) {
      const row = [];
      row[0] = 'M'; row[1] = pick('STSTA'); row[2] = pick('PPPA'); row[3] = pick('KERD');
      row[4] = pick('AGSTN'); row[5] = pick('LIVLI'); row[6] = pick('NQSTDE'); row[7] = 'G';
      row[8] = pick('FYWF'); row[9] = pick('AKSTQN'); row[10] = pairMap[row[3]]; row[11] = pick('LIVM');
      row[12] = 'C'; row[13] = pick('HKRNQ');
      BG.msa.push(row);
    }
    BG.mask = [];
    const cand = [[0, 3], [1, 10], [2, 7], [3, 5], [4, 12], [5, 3], [6, 10], [7, 0], [8, 11], [5, 8], [2, 10]];
    cand.sort(() => r() - 0.5).slice(0, 6).forEach(([s, c]) => BG.mask.push({ s, c, state: 'm' }));
    BG.sel = null; renderBert();
  };
  const coCol = { 3: 10, 10: 3 };
  const renderBert = () => {
    const sel = BG.sel !== null ? BG.mask[BG.sel] : null;
    let html = '<div class="row"><span class="lab">위치</span>' + BG.msa[0].map((_, c) => `<span style="color:var(--text-faint);font-size:11px">${c}</span>`).join('') + '</div>';
    BG.msa.forEach((row, s) => {
      html += `<div class="row"><span class="lab">${s ? '서열 ' + s : 'query'}</span>`;
      row.forEach((a, c) => {
        const mi = BG.mask.findIndex((m) => m.s === s && m.c === c);
        const hl = sel && (c === sel.c || c === coCol[sel.c]) ? ' hlc' : '';
        if (mi >= 0) {
          const m = BG.mask[mi];
          if (m.state === 'm') html += `<span class="m${hl}" data-mi="${mi}" style="${BG.sel === mi ? 'outline:2px solid var(--accent-2)' : ''}">?</span>`;
          else html += `<span class="${m.state}">${a}</span>`;
        } else html += `<span class="${hl.trim()}">${a}</span>`;
      });
      html += '</div>';
    });
    document.getElementById('bertMsa').innerHTML = html;
    document.querySelectorAll('#bertMsa span.m').forEach((el) => (el.onclick = () => { BG.sel = +el.dataset.mi; renderBert(); hint(); }));
    AF.set('bertScore', `${BG.right} / ${BG.total}`);
    AF.set('bertSel', sel ? `서열 ${sel.s}, 위치 ${sel.c}` : '—');
  };
  const hint = () => {
    const m = BG.mask[BG.sel]; if (!m) return;
    const h = m.c === 3 || m.c === 10 ? `위치 ${coCol[m.c]}와 공진화(전하 보완: K↔E, R↔D)` : m.c === 0 || m.c === 7 || m.c === 12 ? '완전히 보존된 열' : m.c === 5 || m.c === 11 ? '소수성 잔기(L/I/V/M)만 등장' : m.c === 8 ? '방향족 잔기만 등장' : '열의 분포를 보세요';
    AF.set('bertHint', h);
  };
  document.getElementById('bertPick').innerHTML = AAs.map((a) => `<button data-a="${a}">${a}</button>`).join('');
  document.querySelectorAll('#bertPick button').forEach((b) => (b.onclick = () => {
    if (BG.sel === null) return; const m = BG.mask[BG.sel]; if (m.state !== 'm') return;
    const ok = BG.msa[m.s][m.c] === b.dataset.a; m.state = ok ? 'ok' : 'ng'; BG.total++; if (ok) BG.right++;
    AF.set('bertHint', ok ? '정답!' : `오답 — 정답은 ${BG.msa[m.s][m.c]}`);
    BG.sel = null; renderBert();
  }));
  document.getElementById('bertNew').onclick = newGame;
  newGame();

  /* ---------- 6-6 recycling toy ---------- */
  const RC = { n: 3, k: 0.55 };
  const rcCv = AF.canvas(document.getElementById('rcCv'), 240, (ctx, w, h) => {
    const C = AF.colors(); const x0 = 60, y0 = 16, ww = w - 90, hh = h - 60, runs = 9, B = 48;
    AF.axes(ctx, x0, y0, ww, hh, { nx: runs, ny: 4, xl: (t) => Math.round(t * runs * B), yl: (t) => (t * 100).toFixed(0), yt: '정확도 (임의 단위)', xt: '누적 Evoformer 블록' });
    const curve = (nrec, dash, col) => {
      ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.setLineDash(dash); ctx.beginPath();
      let e = 1;
      for (let r = 0; r <= nrec; r++) {
        for (let b = 0; b <= B; b++) {
          const f = 1 - RC.k * (1 - Math.exp(-b / 10)) / (1 - Math.exp(-B / 10));
          const acc = 100 * (1 - e * f), x = x0 + ((r * B + b) / (runs * B)) * ww, y = y0 + hh * (1 - acc / 100);
          r === 0 && b === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        e *= 1 - RC.k;
      }
      ctx.stroke(); ctx.setLineDash([]);
      return 100 * (1 - e);
    };
    curve(0, [5, 4], C.faint);
    const fin = curve(RC.n, [], C.acc);
    ctx.fillStyle = C.text; ctx.font = `12px ${C.font}`; ctx.textAlign = 'left';
    ctx.fillText(`재활용 ${RC.n}회 → 최종 ${fin.toFixed(0)} (재활용 없음: ${(100 * RC.k).toFixed(0)})`, x0 + 10, y0 + 14);
    for (let r = 1; r <= RC.n; r++) { const x = x0 + ((r * B) / (runs * B)) * ww; ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + hh); ctx.stroke(); }
  });
  AF.range('rcN', (v) => v, (v) => { RC.n = v; rcCv.redraw(); });
  AF.range('rcK', (v) => v.toFixed(2), (v) => { RC.k = v; rcCv.redraw(); });
  fpUpdate();
});
