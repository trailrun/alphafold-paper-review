/* Chapter 05 — Structure module, IPA, residue gas */
AF.ready(() => {
  const V = AF.V;

  /* ---------- 5-1 frame builder (2D) ---------- */
  const FR = { A: { N: [-1.2, 0.85], CA: [0, 0], C: [1.45, 0.25] }, drag: null, geo: null };
  const CB_LOCAL = [-0.529, -0.774, -1.205]; // ideal Cβ in AF2 backbone frame (Å)
  const frCv = AF.canvas(document.getElementById('frCv'), 320, (ctx, w, h) => {
    const C = AF.colors(); const sc = Math.min(70, w / 7), cx = w / 2, cy = h / 2 + 10;
    FR.geo = { sc, cx, cy };
    const P = (p) => [cx + p[0] * sc, cy - p[1] * sc];
    const { N, CA, C: Cc } = FR.A;
    const f = AF.frame([N[0], N[1], 0], [CA[0], CA[1], 0], [Cc[0], Cc[1], 0]);
    const e1 = [f.R[0][0], f.R[1][0]], e2 = [f.R[0][1], f.R[1][1]], e3z = f.R[2][2];
    // grid
    ctx.strokeStyle = C.grid; for (let x = -6; x <= 6; x++) { ctx.beginPath(); ctx.moveTo(cx + x * sc, 0); ctx.lineTo(cx + x * sc, h); ctx.stroke(); }
    for (let y = -4; y <= 4; y++) { ctx.beginPath(); ctx.moveTo(0, cy + y * sc); ctx.lineTo(w, cy + y * sc); ctx.stroke(); }
    // bonds
    ctx.strokeStyle = C.dim; ctx.lineWidth = 4; ctx.beginPath(); const a = P(N), b = P(CA), c = P(Cc); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
    // axes
    const ax = (v, col, lab) => {
      const e = P([CA[0] + v[0] * 1.6, CA[1] + v[1] * 1.6]);
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(e[0], e[1]); ctx.stroke();
      const ang = Math.atan2(e[1] - b[1], e[0] - b[0]);
      ctx.beginPath(); ctx.moveTo(e[0], e[1]); ctx.lineTo(e[0] - 12 * Math.cos(ang - 0.4), e[1] - 12 * Math.sin(ang - 0.4)); ctx.lineTo(e[0] - 12 * Math.cos(ang + 0.4), e[1] - 12 * Math.sin(ang + 0.4)); ctx.fill();
      ctx.font = `bold 14px ${C.font}`; ctx.fillText(lab, e[0] + 8, e[1] - 6);
    };
    ax(e1, '#ef4444', 'e₁'); ax(e2, '#22c55e', 'e₂');
    ctx.fillStyle = C.text; ctx.font = `16px ${C.font}`; ctx.fillText(e3z > 0 ? '⊙ e₃' : '⊗ e₃', b[0] - 52, b[1] + 30);
    // CB
    const cbW = V.add(V.mv(f.R, CB_LOCAL), f.t);
    const cb = P(cbW);
    ctx.setLineDash([4, 4]); ctx.strokeStyle = C.acc2; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(cb[0], cb[1]); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.acc2; ctx.beginPath(); ctx.arc(cb[0], cb[1], 9, 0, 7); ctx.fill();
    ctx.fillStyle = C.text; ctx.font = `12px ${C.font}`; ctx.fillText('Cβ', cb[0] + 12, cb[1] + 4);
    // atoms
    [['N', N, '#3b82f6'], ['Cα', CA, '#64748b'], ['C', Cc, '#ef4444']].forEach(([l, p, col]) => {
      const q = P(p); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(q[0], q[1], 15, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = `bold 12px ${C.font}`; ctx.textAlign = 'center'; ctx.fillText(l, q[0], q[1] + 4); ctx.textAlign = 'left';
    });
    const v1 = V.sub([N[0], N[1], 0], [CA[0], CA[1], 0]), v2 = V.sub([Cc[0], Cc[1], 0], [CA[0], CA[1], 0]);
    AF.set('frAng', ((Math.acos(V.dot(v1, v2) / (V.norm(v1) * V.norm(v2))) * 180) / Math.PI).toFixed(1) + '°');
    AF.set('frDot', Math.abs(e1[0] * e2[0] + e1[1] * e2[1]).toFixed(3));
    AF.set('frE3', e3z > 0 ? '화면 밖 ⊙' : '화면 안 ⊗');
    AF.set('frCb', '(' + CB_LOCAL.map((x) => x.toFixed(2)).join(', ') + ')');
  });
  const frEl = document.getElementById('frCv');
  const frW = (e) => { const [x, y] = AF.pointer(frEl, e); const g = FR.geo; return [(x - g.cx) / g.sc, -(y - g.cy) / g.sc]; };
  const frDown = (e) => { const p = frW(e); for (const k of ['N', 'CA', 'C']) if (Math.hypot(FR.A[k][0] - p[0], FR.A[k][1] - p[1]) < 0.3) { FR.drag = k; FR.off = [p[0] - FR.A[k][0], p[1] - FR.A[k][1]]; } };
  const frMove = (e) => {
    if (!FR.drag) return; const p = frW(e);
    if (FR.drag === 'CA') { const d = [p[0] - FR.off[0] - FR.A.CA[0], p[1] - FR.off[1] - FR.A.CA[1]]; ['N', 'CA', 'C'].forEach((k) => (FR.A[k] = [FR.A[k][0] + d[0], FR.A[k][1] + d[1]])); }
    else FR.A[FR.drag] = [p[0] - FR.off[0], p[1] - FR.off[1]];
    frCv.redraw(); e.preventDefault();
  };
  frEl.addEventListener('mousedown', frDown); frEl.addEventListener('touchstart', frDown, { passive: true });
  addEventListener('mousemove', frMove); frEl.addEventListener('touchmove', frMove, { passive: false });
  addEventListener('mouseup', () => (FR.drag = null)); addEventListener('touchend', () => (FR.drag = null));

  /* ---------- 5-3 IPA invariance (2D) ---------- */
  const rng = AF.rng(11);
  const IP = { n: 7, res: [], rot: 0, tx: 0, gamma: 0.5, qi: 0, mode: 'ipa', drag: -1, geo: null };
  for (let a = 0; a < IP.n; a++) {
    const t = (a / (IP.n - 1)) * Math.PI * 1.3;
    IP.res.push({ p: [Math.cos(t) * 3.2 - 0.5, Math.sin(t) * 2.4 - 0.6], ang: t + Math.PI / 2 + (rng() - 0.5), q: [0.6 + rng() * 1.2, (rng() - 0.5) * 2], k: [(rng() - 0.5) * 2, 0.6 + rng() * 1.2] });
  }
  const rot2 = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
  const globalT = (r, rot, tx) => ({ p: V.add([...rot2(r.p, rot), 0], [tx, 0, 0]).slice(0, 2), ang: r.ang + rot });
  const apply = (fr, local) => { const v = rot2(local, fr.ang); return [fr.p[0] + v[0], fr.p[1] + v[1]]; };
  const attn = (rot, tx) => {
    const F = IP.res.map((r) => globalT(r, rot, tx));
    return F.map((Fi, i) => {
      const logits = F.map((Fj, j) => {
        if (IP.mode === 'ipa') { const qa = apply(Fi, IP.res[i].q), kb = apply(Fj, IP.res[j].k); return -(IP.gamma / 2) * ((qa[0] - kb[0]) ** 2 + (qa[1] - kb[1]) ** 2); }
        const q = [Fi.p[0] + 0.8 * Fi.p[1], -0.3 * Fi.p[0] + 0.2 * Fi.p[1]];
        return (q[0] * Fj.p[0] + q[1] * Fj.p[1]) / 3;
      });
      const m = Math.max(...logits), e = logits.map((l) => Math.exp(l - m)), s = e.reduce((x, y) => x + y, 0);
      return e.map((x) => x / s);
    });
  };
  let ipaMat = null;
  const ipaCv = AF.canvas(document.getElementById('ipaCv'), 340, (ctx, w, h) => {
    const C = AF.colors(); const sc = Math.min(w, h) / 16, cx = w / 2, cy = h / 2;
    IP.geo = { sc, cx, cy };
    const P = (p) => [cx + p[0] * sc, cy - p[1] * sc];
    const rad = (IP.rot * Math.PI) / 180;
    const F = IP.res.map((r) => globalT(r, rad, IP.tx));
    const A = attn(rad, IP.tx);
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    for (let x = -10; x <= 10; x++) { ctx.beginPath(); ctx.moveTo(cx + x * sc, 0); ctx.lineTo(cx + x * sc, h); ctx.stroke(); }
    for (let y = -10; y <= 10; y++) { ctx.beginPath(); ctx.moveTo(0, cy + y * sc); ctx.lineTo(w, cy + y * sc); ctx.stroke(); }
    ctx.strokeStyle = C.axis; ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
    // chain
    ctx.strokeStyle = C.border; ctx.lineWidth = 2; ctx.beginPath(); F.forEach((f, a) => { const q = P(f.p); a ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.stroke();
    // attention lines from qi
    const i = IP.qi, qa = apply(F[i], IP.res[i].q);
    F.forEach((f, j) => {
      const kb = apply(f, IP.res[j].k), s = P(qa), e = P(kb);
      ctx.strokeStyle = C.acc2; ctx.globalAlpha = Math.min(1, A[i][j] * 1.8); ctx.lineWidth = 1 + A[i][j] * 10;
      ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(e[0], e[1]); ctx.stroke(); ctx.globalAlpha = 1;
    });
    F.forEach((f, a) => {
      const tri = [[0.7, 0], [-0.45, 0.42], [-0.45, -0.42]].map((v) => P(apply(f, v)));
      ctx.fillStyle = a === i ? C.acc : C.surf; ctx.strokeStyle = a === i ? C.acc : C.dim; ctx.lineWidth = 1.5;
      ctx.beginPath(); tri.forEach((t, k) => (k ? ctx.lineTo(t[0], t[1]) : ctx.moveTo(t[0], t[1]))); ctx.closePath(); ctx.fill(); ctx.stroke();
      const q = P(apply(f, IP.res[a].q)), k = P(apply(f, IP.res[a].k));
      if (IP.mode === 'ipa') {
        ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.arc(q[0], q[1], a === i ? 6 : 3.5, 0, 7); ctx.fill();
        ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(k[0], k[1], 4, 0, 7); ctx.fill();
      }
      const c = P(f.p); ctx.fillStyle = C.text; ctx.font = `bold 11px ${C.mono}`; ctx.textAlign = 'center'; ctx.fillText(a, c[0], c[1] - 12);
    });
    // stats
    const A0 = attn(0, 0); let d = 0; A.forEach((r, a) => r.forEach((v, b) => (d = Math.max(d, Math.abs(v - A0[a][b])))));
    AF.set('ipaDelta', d < 1e-9 ? '0.000' : d.toFixed(3));
    const top = A[i].indexOf(Math.max(...A[i])); AF.set('ipaTop', `${top} (${(A[i][top] * 100).toFixed(0)}%)`);
    IP.A = A; ipaMat && ipaMat.redraw();
  });
  ipaMat = AF.canvas(document.getElementById('ipaMat'), 170, (ctx, w, h) => {
    const C = AF.colors(); const A = IP.A; if (!A) return;
    const cs = Math.min(18, (h - 30) / IP.n), ox = 40, oy = 22;
    ctx.fillStyle = C.dim; ctx.font = `12px ${C.font}`; ctx.fillText('어텐션 행렬 a_ij (행 i = 쿼리)', ox, 14);
    A.forEach((r, a) => r.forEach((v, b) => { ctx.fillStyle = AF.seqColor(v); ctx.fillRect(ox + b * cs, oy + a * cs, cs - 1, cs - 1); }));
    ctx.strokeStyle = C.acc; ctx.lineWidth = 2; ctx.strokeRect(ox - 1, oy + IP.qi * cs - 1, IP.n * cs + 1, cs + 1);
    // bar chart of row qi
    const bx = ox + IP.n * cs + 40, bw = w - bx - 20, bh = h - 50;
    ctx.fillStyle = C.dim; ctx.fillText(`a_${IP.qi}j 분포`, bx, 14);
    A[IP.qi].forEach((v, j) => { const x = bx + (j * bw) / IP.n; ctx.fillStyle = C.acc2; ctx.fillRect(x + 4, oy + bh * (1 - v), bw / IP.n - 8, bh * v); ctx.fillStyle = C.dim; ctx.font = `11px ${C.mono}`; ctx.textAlign = 'center'; ctx.fillText(j, x + bw / IP.n / 2, oy + bh + 14); ctx.textAlign = 'left'; });
  });
  ipaCv.redraw();
  AF.range('ipaRot', (v) => v + '°', (v) => { IP.rot = v; ipaCv.redraw(); });
  AF.range('ipaTx', (v) => v.toFixed(1), (v) => { IP.tx = v; ipaCv.redraw(); });
  AF.range('ipaG', (v) => v.toFixed(2), (v) => { IP.gamma = v; ipaCv.redraw(); });
  AF.range('ipaI', (v) => v, (v) => { IP.qi = v; ipaCv.redraw(); });
  AF.seg('ipaMode', (v) => { IP.mode = v; ipaCv.redraw(); });
  const ipEl = document.getElementById('ipaCv');
  const ipWorld = (e) => {
    const [x, y] = AF.pointer(ipEl, e), g = IP.geo, rad = (IP.rot * Math.PI) / 180;
    const p = [(x - g.cx) / g.sc - IP.tx, -(y - g.cy) / g.sc];
    return rot2(p, -rad);
  };
  ipEl.addEventListener('mousedown', (e) => { const p = ipWorld(e); IP.drag = IP.res.findIndex((r) => Math.hypot(r.p[0] - p[0], r.p[1] - p[1]) < 0.8); });
  addEventListener('mousemove', (e) => { if (IP.drag < 0) return; IP.res[IP.drag].p = ipWorld(e); ipaCv.redraw(); });
  addEventListener('mouseup', () => (IP.drag = -1));

  /* ---------- 5-4 residue gas animation ---------- */
  const G = { prot: 'P00698', t: 0, X: [], noise: [], field: [], playing: false, frames: true, relax: false, cur: [] };
  const loadG = () => {
    const P = AF_PROTEINS[G.prot], c = V.centroid(P.ca);
    G.X = P.ca.map((p) => V.sub(p, c)); G.pl = P.plddt;
    const r = AF.rng(5);
    const g = () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    G.noise = G.X.map(() => [g(), g(), g()]);
    const modes = Array.from({ length: 4 }, () => ({ f: 0.02 + r() * 0.06, ph: r() * 6.28, d: V.unit([g(), g(), g()]) }));
    G.field = G.X.map((_, i) => modes.reduce((acc, m) => V.add(acc, V.mul(m.d, Math.sin(i * m.f * 6.28 + m.ph))), [0, 0, 0]));
  };
  const relaxChain = (P) => {
    const Q = P.map((p) => p.slice());
    for (let it = 0; it < 60; it++) for (let i = 0; i < Q.length - 1; i++) {
      const d = V.sub(Q[i + 1], Q[i]), L = V.norm(d) || 1e-6, corr = V.mul(d, (L - 3.8) / L / 2);
      Q[i] = V.add(Q[i], corr); Q[i + 1] = V.sub(Q[i + 1], corr);
    }
    return Q;
  };
  const gasPose = (t) => {
    const grow = Math.min(1, Math.pow(t / 5, 0.8));
    const sig = 5 * Math.exp(-t / 3.2) + 0.9 * Math.exp(-t / 14) + 0.12;
    const fld = 7 * Math.exp(-t / 7);
    let P = G.X.map((x, i) => V.add(V.add(V.mul(x, grow), V.mul(G.noise[i], sig * grow)), V.mul(G.field[i], fld * grow)));
    if (G.relax && t > 31.5) P = relaxChain(P);
    return P;
  };
  const gasUpdate = () => {
    G.cur = gasPose(G.t);
    const t = G.t, rec = Math.min(3, Math.floor(t / 8)), layer = Math.min(8, Math.round(t - rec * 8));
    AF.set('gasStage', t === 0 ? '초기화 (원점)' : `재활용 ${rec + 1}/4 · 층 ${layer}/8`);
    AF.set('gasRmsd', AF.rmsd(AF.superpose(G.cur, G.X), G.X).toFixed(2) + '<small>Å</small>');
    let br = 0; for (let i = 0; i < G.cur.length - 1; i++) if (Math.abs(V.dist(G.cur[i], G.cur[i + 1]) - 3.8) > 0.3) br++;
    AF.set('gasBreak', br + '<small>/' + (G.cur.length - 1) + '</small>');
    gasView.redraw();
  };
  const gasView = AF.view3d(document.getElementById('gasCv'), {
    height: 420,
    getModel: () => {
      if (!G.cur.length) return null;
      const P = G.cur;
      return {
        points: P, center: [0, 0, 0], extent: 26, lineWidth: 3,
        color: (i) => AF.plddtColor(G.pl[i]),
        segColor: (i, j) => (Math.abs(V.dist(P[i], P[j]) - 3.8) > 0.3 ? '#ef4444' : AF.plddtColor(G.pl[i])),
        extra: (ctx, project, C) => {
          if (!G.frames) return;
          ctx.globalAlpha = 0.55;
          for (let i = 1; i < P.length - 1; i += 2) {
            const f = AF.frame(P[i - 1], P[i], P[i + 1]);
            const pts = [[1.6, 0, 0], [-0.8, 1.1, 0], [-0.8, -1.1, 0]].map((v) => project(V.add(V.mv(f.R, v), f.t)));
            ctx.fillStyle = C.acc; ctx.beginPath(); pts.forEach((p, k) => (k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
      };
    }
  });
  loadG();
  const tEl = document.getElementById('gasT');
  AF.range('gasT', (v) => v.toFixed(1), (v) => { G.t = v; gasUpdate(); });
  document.getElementById('gasProt').onchange = (e) => { G.prot = e.target.value; loadG(); gasUpdate(); };
  document.getElementById('gasFrames').onchange = (e) => { G.frames = e.target.checked; gasView.redraw(); };
  document.getElementById('gasRelax').onchange = (e) => { G.relax = e.target.checked; gasUpdate(); };
  const playBtn = document.getElementById('gasPlay');
  playBtn.onclick = () => { G.playing = !G.playing; if (G.playing && G.t >= 32) G.t = 0; playBtn.textContent = G.playing ? '⏸ 정지' : '▶ 재생'; };
  const tick = () => {
    if (G.playing) {
      G.t = Math.min(32, G.t + 0.08); tEl.value = G.t; tEl.dispatchEvent(new Event('input'));
      if (G.t >= 32) { G.playing = false; playBtn.textContent = '▶ 재생'; }
    }
    requestAnimationFrame(tick);
  };
  tick();
});
