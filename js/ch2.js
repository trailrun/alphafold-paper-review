/* Chapter 02 — CASP & metrics */
AF.ready(() => {
  const V = AF.V;

  /* ---------- CASP14 headline chart ---------- */
  const D = {
    bb: { af: [0.96, 0.85, 1.16], nx: [2.8, 2.7, 4.0], lab: '백본 r.m.s.d.95 (Å)' },
    aa: { af: [1.5, 1.2, 1.6], nx: [3.5, 3.1, 4.2], lab: '전원자 r.m.s.d.95 (Å)' }
  };
  let mode = 'bb';
  const caspCv = AF.canvas(document.getElementById('caspCv'), 230, (ctx, w, h) => {
    const C = AF.colors(), d = D[mode];
    const x0 = 140, x1 = w - 40, X = (v) => x0 + (v / 5) * (x1 - x0);
    AF.axes(ctx, x0, 20, x1 - x0, h - 70, { nx: 5, ny: 0, xl: (t) => (t * 5).toFixed(0), xt: d.lab });
    const rows = [['AlphaFold2', d.af, C.acc], ['차순위 방법', d.nx, C.dim]];
    rows.forEach((r, i) => {
      const y = 40 + i * 62;
      ctx.fillStyle = r[2]; ctx.globalAlpha = 0.85; ctx.fillRect(x0, y, X(r[1][0]) - x0, 34); ctx.globalAlpha = 1;
      ctx.strokeStyle = C.text; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(X(r[1][1]), y + 17); ctx.lineTo(X(r[1][2]), y + 17);
      ctx.moveTo(X(r[1][1]), y + 9); ctx.lineTo(X(r[1][1]), y + 25); ctx.moveTo(X(r[1][2]), y + 9); ctx.lineTo(X(r[1][2]), y + 25); ctx.stroke();
      ctx.fillStyle = C.text; ctx.font = `bold 13px ${C.font}`; ctx.textAlign = 'right'; ctx.fillText(r[0], x0 - 10, y + 22);
      ctx.font = `12px ${C.mono}`; ctx.textAlign = 'left'; ctx.fillText(`${r[1][0]} Å  [${r[1][1]}–${r[1][2]}]`, X(r[1][2]) + 8, y + 22);
    });
    ctx.setLineDash([5, 4]); ctx.strokeStyle = C.faint; ctx.beginPath(); ctx.moveTo(X(1.4), 22); ctx.lineTo(X(1.4), h - 50); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.faint; ctx.font = `11px ${C.font}`; ctx.textAlign = 'center'; ctx.fillText('탄소 원자 지름 ≈ 1.4 Å', X(1.4), 14);
    AF.set('cAF', d.af[0] + '<small>Å</small>'); AF.set('cNext', d.nx[0] + '<small>Å</small>');
    AF.set('cRatio', (d.nx[0] / d.af[0]).toFixed(1) + '<small>배</small>');
  });
  AF.seg('cMode', (v) => { mode = v; caspCv.redraw(); });

  /* ---------- metrics lab ---------- */
  const S = { prot: 'P69905', rot: 30, noise: 0.5, hinge: 0, loop: 0, align: true, tru: [], pred: [], shown: [], dev: [], eps: [] };
  const resample = () => { S.eps = S.tru.map(() => [AF.gauss(), AF.gauss(), AF.gauss()]); };
  const loadProt = () => {
    const P = AF_PROTEINS[S.prot];
    const c = V.centroid(P.ca);
    S.tru = P.ca.map((p) => V.sub(p, c));
    resample();
  };
  const rotAbout = (p, c, R) => V.add(V.mv(R, V.sub(p, c)), c);
  const axisRot = (axis, ang) => {
    const [x, y, z] = V.unit(axis), c = Math.cos(ang), s = Math.sin(ang), t = 1 - c;
    return [[t * x * x + c, t * x * y - s * z, t * x * z + s * y], [t * x * y + s * z, t * y * y + c, t * y * z - s * x], [t * x * z - s * y, t * y * z + s * x, t * z * z + c]];
  };
  const compute = () => {
    const n = S.tru.length, rad = Math.PI / 180;
    let P = S.tru.map((p, i) => V.add(p, V.mul(S.eps[i], S.noise)));
    if (S.hinge) {
      const h = Math.floor(n / 2), c = S.tru[h];
      const R = axisRot(V.cross(V.sub(S.tru[h + 5], S.tru[h - 5]), [0.3, 1, 0.2]), S.hinge * rad);
      P = P.map((p, i) => (i > h ? rotAbout(p, c, R) : p));
    }
    if (S.loop) {
      const a = Math.floor(n * 0.3), L = 9, dir = V.unit([1, 0.4, -0.6]);
      P = P.map((p, i) => { if (i < a || i >= a + L) return p; const t = Math.sin((Math.PI * (i - a + 0.5)) / L); return V.add(p, V.mul(dir, S.loop * t)); });
    }
    const Rg = axisRot([1, 1, 0.3], S.rot * rad);
    P = P.map((p) => V.add(V.mv(Rg, p), [S.rot / 10, 0, 0]));
    S.pred = P;
    const al = AF.superpose(P, S.tru);
    S.shown = S.align ? al : P;
    S.dev = al.map((a, i) => V.dist(a, S.tru[i]));
    AF.set('mR0', AF.rmsd(P, S.tru).toFixed(2) + '<small>Å</small>');
    AF.set('mR1', AF.rmsd(al, S.tru).toFixed(2) + '<small>Å</small>');
    AF.set('mR95', AF.rmsd95(P, S.tru).rmsd.toFixed(2) + '<small>Å</small>');
    AF.set('mGDT', AF.gdt(P, S.tru).toFixed(1));
    AF.set('mLDDT', AF.lddt(P, S.tru).score.toFixed(1));
    AF.set('mTM', AF.tmscore(P, S.tru).toFixed(3));
    view.redraw();
  };
  const view = AF.view3d(document.getElementById('mCv'), {
    height: 400,
    getModel: () => {
      if (!S.shown.length) return null;
      const n = S.tru.length, pts = S.tru.concat(S.shown);
      const grey = AF.isDark() ? '#5b667d' : '#b8c0cf';
      const errCol = (d) => (d < 1 ? '#0053d6' : d < 2 ? '#65cbf3' : d < 4 ? '#ffdb13' : '#ff7d45');
      const col = (i) => (i < n ? grey : errCol(S.dev[i - n]));
      return { points: pts, center: [0, 0, 0], extent: 24, color: col, breakAt: (i) => i === n - 1, lineWidth: 3.2 };
    }
  });
  loadProt();
  AF.range('mRot', (v) => v + '°', (v) => { S.rot = v; compute(); });
  AF.range('mNoise', (v) => v.toFixed(1) + ' Å', (v) => { S.noise = v; compute(); });
  AF.range('mHinge', (v) => v + '°', (v) => { S.hinge = v; compute(); });
  AF.range('mLoop', (v) => v.toFixed(1) + ' Å', (v) => { S.loop = v; compute(); });
  document.getElementById('mAlign').onchange = (e) => { S.align = e.target.checked; compute(); };
  document.getElementById('mResample').onclick = () => { resample(); compute(); };
  document.getElementById('mProt').onchange = (e) => { S.prot = e.target.value; loadProt(); compute(); };
  compute();
});
