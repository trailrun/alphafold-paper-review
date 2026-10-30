/* Chapter 07 — confidence: pLDDT & PAE */
AF.ready(() => {
  const V = AF.V;

  /* ---------- 7-1 3D viewer + PAE ---------- */
  const MV = { prot: 'P04637', hi: null, pdb: {}, img: null };
  const molEl = document.getElementById('mol');
  let viewer = null;
  const bg = () => (AF.isDark() ? '#0f1522' : '#ffffff');
  const baseStyle = () => {
    viewer.setStyle({}, { cartoon: { colorfunc: (a) => AF.plddtColor(a.b), thickness: 0.4 } });
  };
  const highlight = (i, j) => {
    if (!viewer) return;
    const key = i + ',' + j; if (MV.hi === key) return; MV.hi = key;
    baseStyle(); viewer.removeAllShapes();
    if (i !== null) {
      const sel = j !== null && j !== i ? [i + 1, j + 1] : [i + 1];
      viewer.addStyle({ resi: sel, atom: 'CA' }, { sphere: { radius: 1.3, color: '#e11d48' } });
      if (j !== null && j !== i) {
        const P = AF_PROTEINS[MV.prot].ca, a = P[i], b = P[j];
        viewer.addCylinder({ start: { x: a[0], y: a[1], z: a[2] }, end: { x: b[0], y: b[1], z: b[2] }, radius: 0.25, color: '#e11d48', dashed: true, fromCap: 1, toCap: 1 });
      }
    }
    viewer.render();
  };
  const loadMol = async () => {
    if (!window.$3Dmol) { molEl.innerHTML = '<p style="padding:20px">3D 뷰어를 불러오지 못했습니다.</p>'; return; }
    if (!viewer) {
      viewer = $3Dmol.createViewer(molEl, { backgroundColor: bg(), antialias: true });
      AF.onTheme(() => { viewer.setBackgroundColor(bg()); viewer.render(); });
    }
    if (!MV.pdb[MV.prot]) MV.pdb[MV.prot] = await (await fetch(`../data/AF-${MV.prot}.pdb`)).text();
    viewer.clear(); viewer.addModel(MV.pdb[MV.prot], 'pdb');
    MV.hi = null; baseStyle(); viewer.zoomTo(); viewer.render();
  };
  // PAE matrix
  const buildImg = () => {
    const M = AF_PROTEINS[MV.prot].pae, N = M.length;
    const c = document.createElement('canvas'); c.width = N; c.height = N;
    const x = c.getContext('2d'), im = x.createImageData(N, N);
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const rgb = AF.paeColor(M[i][j]).match(/\d+/g).map(Number), k = (i * N + j) * 4;
      im.data[k] = rgb[0]; im.data[k + 1] = rgb[1]; im.data[k + 2] = rgb[2]; im.data[k + 3] = 255;
    }
    x.putImageData(im, 0, 0); MV.img = c;
  };
  let paeGeo = null, paeHover = null;
  const paeCv = AF.canvas(document.getElementById('paeCv'), (w) => Math.min(440, w + 40), (ctx, w, h) => {
    const C = AF.colors(); if (!MV.img) return;
    const N = AF_PROTEINS[MV.prot].pae.length;
    const size = Math.min(w - 40, h - 70), ox = 30, oy = 26;
    paeGeo = { ox, oy, size, N };
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(MV.img, ox, oy, size, size);
    ctx.strokeStyle = C.border; ctx.strokeRect(ox, oy, size, size);
    ctx.fillStyle = C.dim; ctx.font = `12px ${C.font}`; ctx.textAlign = 'left';
    ctx.fillText('PAE (Å) · 행 = 정렬 잔기 i, 열 = 잔기 j', ox, 16);
    ctx.font = `10px ${C.mono}`; ctx.fillText('1', ox - 12, oy + 8); ctx.fillText(String(N), ox - 4, oy + size + 12);
    // colorbar
    const by = oy + size + 22;
    for (let k = 0; k <= 100; k++) { ctx.fillStyle = AF.paeColor((k / 100) * 31); ctx.fillRect(ox + (k / 100) * size, by, size / 100 + 1, 10); }
    ctx.fillStyle = C.dim; ctx.fillText('0', ox, by + 22); ctx.textAlign = 'right'; ctx.fillText('30 Å', ox + size, by + 22);
    if (paeHover) {
      const [i, j] = paeHover, cs = size / N;
      ctx.strokeStyle = '#e11d48'; ctx.lineWidth = 1.5;
      ctx.strokeRect(ox + j * cs - 3, oy + i * cs - 3, cs + 6, cs + 6);
    }
  });
  const plCv = AF.canvas(document.getElementById('plCv'), 120, (ctx, w, h) => {
    const C = AF.colors(); const pl = AF_PROTEINS[MV.prot].plddt, N = pl.length;
    const x0 = 44, ww = w - 64, y0 = 14, hh = h - 40;
    AF.axes(ctx, x0, y0, ww, hh, { nx: 0, ny: 2, yl: (t) => (t * 100).toFixed(0), yt: 'pLDDT' });
    pl.forEach((v, i) => { ctx.fillStyle = AF.plddtColor(v); ctx.fillRect(x0 + (i / N) * ww, y0 + hh * (1 - v / 100), Math.max(1, ww / N), (hh * v) / 100); });
    ctx.fillStyle = C.dim; ctx.font = `11px ${C.mono}`; ctx.textAlign = 'center'; ctx.fillText('잔기 번호 →', x0 + ww / 2, h - 6);
    if (paeHover) { ctx.strokeStyle = '#e11d48'; paeHover.forEach((r) => { if (r === null) return; const x = x0 + ((r + 0.5) / N) * ww; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + hh); ctx.stroke(); }); }
  });
  const stats = () => {
    const P = AF_PROTEINS[MV.prot], pl = P.plddt;
    AF.set('mvMean', (pl.reduce((a, b) => a + b, 0) / pl.length).toFixed(1));
    AF.set('mvVH', ((100 * pl.filter((v) => v > 90).length) / pl.length).toFixed(0) + '<small>%</small>');
    AF.set('mvVL', ((100 * pl.filter((v) => v < 50).length) / pl.length).toFixed(0) + '<small>%</small>');
    AF.set('mvSel', `${P.name} · ${pl.length} 잔기`);
  };
  const setHover = (h) => {
    paeHover = h; paeCv.redraw(); plCv.redraw();
    const P = AF_PROTEINS[MV.prot];
    if (!h) { stats(); highlight(null, null); return; }
    const [i, j] = h;
    if (j === null) AF.set('mvSel', `${P.seq[i]}${i + 1} · pLDDT ${P.plddt[i]}`);
    else AF.set('mvSel', `${P.seq[i]}${i + 1} → ${P.seq[j]}${j + 1} · PAE ${P.pae[i][j]} Å`);
    highlight(i, j);
  };
  let raf = 0;
  document.getElementById('paeCv').addEventListener('mousemove', (e) => {
    const [x, y] = AF.pointer(e.target, e), g = paeGeo; if (!g) return;
    const j = Math.floor(((x - g.ox) / g.size) * g.N), i = Math.floor(((y - g.oy) / g.size) * g.N);
    if (i < 0 || j < 0 || i >= g.N || j >= g.N) return;
    cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setHover([i, j]));
  });
  document.getElementById('plCv').addEventListener('mousemove', (e) => {
    const [x] = AF.pointer(e.target, e), N = AF_PROTEINS[MV.prot].plddt.length, w = e.target.clientWidth;
    const i = Math.floor(((x - 44) / (w - 64)) * N); if (i < 0 || i >= N) return;
    cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setHover([i, null]));
  });
  ['paeCv', 'plCv'].forEach((id) => document.getElementById(id).addEventListener('mouseleave', () => setHover(null)));
  const switchProt = (p) => { MV.prot = p; paeHover = null; buildImg(); paeCv.redraw(); plCv.redraw(); stats(); loadMol(); };
  AF.seg('mvProt', switchProt);
  switchProt('P04637');

  /* ---------- 7-2 lDDT calculator ---------- */
  const LD = { R0: 15, sel: 4, tru: [], pred: [], drag: -1, geo: null };
  const ldInit = () => {
    LD.tru = [[-12, -2], [-8, 3], [-4, 6], [0, 4], [3, 0], [1, -5], [-4, -7], [6, -9], [10, -4], [12, 2]];
    LD.pred = LD.tru.map((p) => [p[0] + (Math.random() - 0.5) * 1.6, p[1] + (Math.random() - 0.5) * 1.6]);
    ldCv.redraw();
  };
  const d2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const ldScore = () => {
    const n = LD.tru.length, per = [], pairs = [];
    for (let i = 0; i < n; i++) {
      let s = 0, c = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue; const dt = d2(LD.tru[i], LD.tru[j]); if (dt > LD.R0) continue;
        const dd = Math.abs(d2(LD.pred[i], LD.pred[j]) - dt), k = (dd < 0.5) + (dd < 1) + (dd < 2) + (dd < 4);
        s += k; c += 4; if (i === LD.sel) pairs.push([j, k]);
      }
      per.push(c ? (100 * s) / c : 100);
    }
    return { per, pairs, all: per.reduce((a, b) => a + b, 0) / n };
  };
  const ldCv = AF.canvas(document.getElementById('ldCv'), 320, (ctx, w, h) => {
    const C = AF.colors(); if (!LD.tru.length) return;
    const sc = Math.min(w / 32, h / 24), cx = w / 2, cy = h / 2; LD.geo = { sc, cx, cy };
    const P = (p) => [cx + p[0] * sc, cy - p[1] * sc];
    ctx.strokeStyle = C.grid; for (let x = -16; x <= 16; x++) { ctx.beginPath(); ctx.moveTo(cx + x * sc, 0); ctx.lineTo(cx + x * sc, h); ctx.stroke(); }
    for (let y = -12; y <= 12; y++) { ctx.beginPath(); ctx.moveTo(0, cy + y * sc); ctx.lineTo(w, cy + y * sc); ctx.stroke(); }
    const S = ldScore();
    // R0 circle around selected (true)
    const st = P(LD.tru[LD.sel]); ctx.strokeStyle = C.acc; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(st[0], st[1], LD.R0 * sc, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    // chain lines
    const line = (A, col, lw) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); A.forEach((p, i) => { const q = P(p); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.stroke(); };
    line(LD.tru, AF.isDark() ? '#3a4560' : '#d5dbe6', 6); line(LD.pred, C.dim, 1.5);
    // pairs from selected predicted atom
    S.pairs.forEach(([j, k]) => {
      const a = P(LD.pred[LD.sel]), b = P(LD.pred[j]);
      ctx.strokeStyle = k >= 3 ? C.ok : k >= 1 ? C.warn : C.bad; ctx.lineWidth = 1 + k * 1.2; ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.globalAlpha = 1;
    });
    LD.tru.forEach((p) => { const q = P(p); ctx.fillStyle = AF.isDark() ? '#5b667d' : '#b8c0cf'; ctx.beginPath(); ctx.arc(q[0], q[1], 7, 0, 7); ctx.fill(); });
    LD.pred.forEach((p, i) => {
      const q = P(p); ctx.fillStyle = AF.plddtColor(S.per[i]); ctx.beginPath(); ctx.arc(q[0], q[1], i === LD.sel ? 11 : 9, 0, 7); ctx.fill();
      ctx.strokeStyle = i === LD.sel ? C.text : C.bg; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = C.text; ctx.font = `bold 11px ${C.mono}`; ctx.textAlign = 'center'; ctx.fillText(i, q[0], q[1] - 14);
    });
    AF.set('ldAll', S.all.toFixed(1)); AF.set('ldOne', S.per[LD.sel].toFixed(1)); AF.set('ldPairs', S.pairs.length);
  });
  const ldEl = document.getElementById('ldCv');
  const ldW = (e) => { const [x, y] = AF.pointer(ldEl, e), g = LD.geo; return [(x - g.cx) / g.sc, -(y - g.cy) / g.sc]; };
  const ldDown = (e) => { const p = ldW(e); LD.drag = LD.pred.findIndex((q) => d2(p, q) < 1.2); if (LD.drag >= 0) { LD.sel = LD.drag; const s = document.getElementById('ldSel'); s.value = LD.sel; AF.fill(s); s.closest('.ctrl').querySelector('output').textContent = LD.sel; } };
  const ldMove = (e) => { if (LD.drag < 0) return; LD.pred[LD.drag] = ldW(e); ldCv.redraw(); e.preventDefault(); };
  ldEl.addEventListener('mousedown', ldDown); ldEl.addEventListener('touchstart', ldDown, { passive: true });
  addEventListener('mousemove', ldMove); ldEl.addEventListener('touchmove', ldMove, { passive: false });
  addEventListener('mouseup', () => (LD.drag = -1)); addEventListener('touchend', () => (LD.drag = -1));
  AF.range('ldR', (v) => v.toFixed(1) + ' Å', (v) => { LD.R0 = v; ldCv.redraw(); });
  AF.range('ldSel', (v) => v, (v) => { LD.sel = v; ldCv.redraw(); });
  document.getElementById('ldReset').onclick = ldInit;
  document.getElementById('ldShake').onclick = () => { LD.pred = LD.pred.map((p) => [p[0] + (Math.random() - 0.5) * 2, p[1] + (Math.random() - 0.5) * 2]); ldCv.redraw(); };
  ldInit();

  /* ---------- 7-3 calibration ---------- */
  const CAL = { mode: 'pl', x: 80, r: 0.76, pts: [], realR: 0 };
  const fit = (x) => (CAL.mode === 'pl' ? 0.997 * x - 1.17 : 0.98 * x + 0.07);
  const genCal = () => {
    const rng = AF.rng(42); const g = () => { let u = 0, v = 0; while (!u) u = rng(); while (!v) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    const tm = CAL.mode === 'tm', N = 400;
    const xs = Array.from({ length: N }, () => (tm ? Math.min(1, Math.max(0.15, 0.75 + g() * 0.17)) : Math.min(99, Math.max(25, 82 + g() * 13))));
    const mx = xs.reduce((a, b) => a + b, 0) / N, sx = Math.sqrt(xs.reduce((a, b) => a + (b - mx) ** 2, 0) / N);
    const a = tm ? 0.98 : 0.997, r = Math.max(0.01, CAL.r);
    const sn = a * sx * Math.sqrt(1 / (r * r) - 1);
    CAL.pts = xs.map((x) => [x, Math.min(tm ? 1 : 100, Math.max(0, fit(x) + g() * sn))]);
    const my = CAL.pts.reduce((s, p) => s + p[1], 0) / N;
    let sxy = 0, syy = 0; CAL.pts.forEach(([x, y]) => { sxy += (x - mx) * (y - my); syy += (y - my) ** 2; });
    CAL.realR = sxy / Math.sqrt(sx * sx * N * syy);
  };
  const calCv = AF.canvas(document.getElementById('calCv'), 300, (ctx, w, h) => {
    const C = AF.colors(); const tm = CAL.mode === 'tm', S = tm ? 1 : 100;
    const x0 = 60, y0 = 14, ww = w - 90, hh = h - 60;
    AF.axes(ctx, x0, y0, ww, hh, { nx: 5, ny: 5, xl: (t) => (t * S).toFixed(tm ? 1 : 0), yl: (t) => (t * S).toFixed(tm ? 1 : 0), xt: tm ? 'pTM' : 'pLDDT', yt: tm ? 'TM-score' : 'lDDT-Cα' });
    const X = (v) => x0 + (v / S) * ww, Y = (v) => y0 + hh * (1 - v / S);
    ctx.fillStyle = C.acc2; ctx.globalAlpha = 0.35; CAL.pts.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(X(x), Y(y), 2.6, 0, 7); ctx.fill(); }); ctx.globalAlpha = 1;
    ctx.setLineDash([4, 4]); ctx.strokeStyle = C.faint; ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(S), Y(S)); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = C.acc; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(X(0), Y(Math.max(0, fit(0)))); ctx.lineTo(X(S), Y(Math.min(S, fit(S)))); ctx.stroke();
    const xv = (CAL.x / 100) * S, yv = fit(xv);
    ctx.strokeStyle = C.bad; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(xv), Y(0)); ctx.lineTo(X(xv), Y(yv)); ctx.lineTo(X(0), Y(yv)); ctx.stroke();
    ctx.fillStyle = C.bad; ctx.beginPath(); ctx.arc(X(xv), Y(yv), 5, 0, 7); ctx.fill();
    ctx.fillStyle = C.text; ctx.font = `12px ${C.mono}`; ctx.textAlign = 'left';
    ctx.fillText(tm ? 'TM = 0.98·pTM + 0.07' : 'lDDT = 0.997·pLDDT − 1.17', x0 + 10, y0 + 16);
    AF.set('calY', yv.toFixed(tm ? 3 : 1)); AF.set('calRr', CAL.realR.toFixed(2));
  });
  AF.range('calX', (v) => (CAL.mode === 'tm' ? (v / 100).toFixed(2) : v), (v) => { CAL.x = v; calCv.redraw(); });
  AF.range('calR', (v) => v.toFixed(2), (v) => { CAL.r = v; genCal(); calCv.redraw(); });
  AF.seg('calMode', (v) => {
    CAL.mode = v; const r = document.getElementById('calR'); r.value = v === 'tm' ? 0.85 : 0.76; r.dispatchEvent(new Event('input'));
    document.getElementById('calX').dispatchEvent(new Event('input'));
  });
});
