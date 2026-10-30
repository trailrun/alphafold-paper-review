/* Chapter 04 — Evoformer */
AF.ready(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

  /* ---------- static figure grids ---------- */
  const mg = document.getElementById('msaGrid');
  for (let s = 0; s < 7; s++) for (let r = 0; r < 12; r++) mg.appendChild(mk('rect', { x: r * 25 + 1, y: s * 25 + 1 + (s ? 6 : 0), width: 23, height: 23, rx: 3, class: s ? 'f-surface' : 'f-acc-soft' }));
  const pg = document.getElementById('pairGrid');
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
    const near = Math.abs(i - j) <= 1 || i + j === 7;
    pg.appendChild(mk('rect', { x: j * 25 + 1, y: i * 25 + 1, width: 23, height: 23, rx: 3, class: near ? 'f-acc2-soft' : 'f-surface' }));
  }

  /* ---------- op descriptions ---------- */
  const OPS = {
    row: ['행 방향 게이트 어텐션 + 쌍 편향', '각 서열(행) 안에서 잔기들끼리 어텐션합니다. 로짓에 쌍 표현의 선형 투영 b<sub>ij</sub>를 더해, “구조적으로 관련 있는 잔기를 보라”는 신호를 줍니다. 쌍 → MSA 방향의 유일한 통로입니다.'],
    col: ['열 방향 게이트 어텐션', '같은 잔기 위치(열)에서 서열들끼리 어텐션합니다. 어떤 서열이 정보가 많은지, 위치별 보존 패턴을 모읍니다.'],
    trans: ['전이(Transition)', '위치별 2층 MLP(채널을 4배로 넓혔다 줄임). Transformer의 피드포워드 층에 해당합니다.'],
    opm: ['외적 평균(Outer Product Mean)', '열 i와 열 j의 특징을 서열마다 외적하고 서열 축으로 평균 → 쌍 표현에 더함. MSA → 쌍 방향 통로이며, 이전 연구와 달리 모든 블록에서 실행됩니다.'],
    tmo: ['삼각형 곱셈 업데이트 (나가는 간선)', 'z<sub>ij</sub> ← Σ<sub>k</sub> a<sub>ik</sub> ⊙ b<sub>jk</sub>: i와 j에서 같은 k로 “나가는” 두 간선을 곱해 합칩니다. 어텐션보다 저렴하고 대칭적인 대체물로 고안되었습니다.'],
    tmi: ['삼각형 곱셈 업데이트 (들어오는 간선)', 'z<sub>ij</sub> ← Σ<sub>k</sub> a<sub>ki</sub> ⊙ b<sub>kj</sub>: k에서 i와 j로 “들어오는” 두 간선을 사용합니다.'],
    tas: ['삼각형 어텐션 (시작 노드)', '간선 ij가 같은 시작 노드 i를 가진 간선 ik들에 어텐션하고, 삼각형을 닫는 간선 jk를 편향으로 씁니다. 축 어텐션에 “빠진 간선” 편향을 추가한 형태입니다.'],
    tae: ['삼각형 어텐션 (끝 노드)', '간선 ij가 같은 끝 노드 j를 가진 간선 kj들에 어텐션하고, 간선 ki를 편향으로 씁니다.']
  };
  document.querySelectorAll('.evo-op').forEach((g) => {
    g.style.cursor = 'pointer';
    g.addEventListener('click', () => {
      const o = OPS[g.dataset.k];
      document.getElementById('evoInfo').innerHTML = `<strong>${o[0]}</strong><p>${o[1]}</p>`;
      document.querySelectorAll('.evo-op rect').forEach((r) => r.setAttribute('stroke-width', 1));
      g.querySelector('rect').setAttribute('stroke-width', 3);
    });
  });
  document.getElementById('evoInfo').innerHTML = `<strong>${OPS.row[0]}</strong><p>${OPS.row[1]} <i>(그림의 상자를 눌러 다른 연산도 확인하세요)</i></p>`;

  /* ---------- 4-3 axial attention ---------- */
  const AX = { S: 8, R: 14, sel: [2, 4], mode: 'row' };
  const bias = (i, j) => (i === j ? 0.5 : Math.abs(i - j) === 1 ? 0.6 : i + j === AX.R - 1 ? 1 : Math.abs(i + j - (AX.R - 1)) === 1 ? 0.55 : 0.12);
  let axGeo = null;
  const axCv = AF.canvas(document.getElementById('axCv'), (w) => Math.min(36, (w - 80) / 14) * 8 + 76, (ctx, w, h) => {
    const C = AF.colors();
    const cell = Math.min(36, (w - 80) / AX.R), ox = (w - cell * AX.R) / 2 + 20, oy = 30;
    axGeo = { cell, ox, oy };
    ctx.font = `11px ${C.mono}`; ctx.fillStyle = C.dim; ctx.textAlign = 'center';
    for (let r = 0; r < AX.R; r++) ctx.fillText('r' + r, ox + (r + 0.5) * cell, oy - 8);
    ctx.textAlign = 'right';
    for (let s = 0; s < AX.S; s++) ctx.fillText(s ? 's' + s : 'query', ox - 6, oy + (s + 0.65) * cell);
    const [ss, si] = AX.sel;
    for (let s = 0; s < AX.S; s++) for (let r = 0; r < AX.R; r++) {
      let a = 0;
      if (AX.mode === 'row' && s === ss) a = bias(si, r);
      if (AX.mode === 'col' && r === si) a = 0.75;
      if (AX.mode === 'full') a = 0.45;
      ctx.fillStyle = C.surf; ctx.fillRect(ox + r * cell + 1, oy + s * cell + 1, cell - 2, cell - 2);
      if (a) { ctx.fillStyle = C.acc2; ctx.globalAlpha = a; ctx.fillRect(ox + r * cell + 1, oy + s * cell + 1, cell - 2, cell - 2); ctx.globalAlpha = 1; }
      if (s === ss && r === si) { ctx.fillStyle = C.acc; ctx.fillRect(ox + r * cell + 1, oy + s * cell + 1, cell - 2, cell - 2); }
    }
    ctx.fillStyle = C.dim; ctx.font = `12px ${C.font}`; ctx.textAlign = 'center';
    const msg = { row: `서열 s${ss}의 잔기 r${si}가 같은 행의 잔기들을 봄 (진하기 = 쌍 편향 b_${si}j)`, col: `잔기 위치 r${si}에서 서열들끼리 봄`, full: '모든 (서열, 잔기) 토큰을 봄 — 비용 폭발' }[AX.mode];
    ctx.fillText(msg, w / 2, oy + AX.S * cell + 24);
  });
  const axPick = (e) => {
    if (!axGeo) return; const [x, y] = AF.pointer(e.target, e);
    const r = Math.floor((x - axGeo.ox) / axGeo.cell), s = Math.floor((y - axGeo.oy) / axGeo.cell);
    if (r >= 0 && r < AX.R && s >= 0 && s < AX.S && (AX.sel[0] !== s || AX.sel[1] !== r)) { AX.sel = [s, r]; axCv.redraw(); }
  };
  document.getElementById('axCv').addEventListener('mousemove', axPick);
  document.getElementById('axCv').addEventListener('click', axPick);
  AF.seg('axMode', (v) => { AX.mode = v; axCv.redraw(); });
  const fmtBig = (x) => { const e = Math.floor(Math.log10(x)); return (x / 10 ** e).toFixed(2) + '×10<sup>' + e + '</sup>'; };
  let S = 512, R = 384;
  const axCost = () => {
    const row = S * R * R, col = R * S * S, full = (S * R) ** 2;
    AF.set('axRow', fmtBig(row)); AF.set('axCol', fmtBig(col)); AF.set('axFull', fmtBig(full));
    AF.set('axSave', Math.round(full / (row + col)).toLocaleString() + '<small>배</small>');
  };
  AF.range('axS', (v) => v, (v) => { S = v; axCost(); });
  AF.range('axR', (v) => v, (v) => { R = v; axCost(); });

  /* ---------- 4-4 outer product mean ---------- */
  const OP = { i: 2, j: 9, n: 40, msa: [], seed: 3 };
  const LET = ['H', 'P', '+', '−'], LCOL = ['#ff9f43', '#2fbf71', '#3b82f6', '#ef4444'];
  const partner = [0, 1, 3, 2];
  const genOP = () => {
    const rng = AF.rng(OP.seed);
    OP.msa = [];
    for (let n = 0; n < 200; n++) {
      const s = Array.from({ length: 12 }, () => Math.floor(rng() * 4));
      s[9] = rng() < 0.9 ? partner[s[2]] : Math.floor(rng() * 4);
      s[7] = rng() < 0.9 ? partner[s[4]] : Math.floor(rng() * 4);
      OP.msa.push(s);
    }
  };
  const opCv = AF.canvas(document.getElementById('opCv'), (w) => (w > 700 ? 280 : 560), (ctx, w, h) => {
    const C = AF.colors(); const M = OP.msa.slice(0, OP.n);
    const f1i = [0, 0, 0, 0], f1j = [0, 0, 0, 0], f2 = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    M.forEach((s) => { f1i[s[OP.i]]++; f1j[s[OP.j]]++; f2[s[OP.i]][s[OP.j]]++; });
    const N = M.length;
    const mean = f2.map((r) => r.map((v) => v / N)), ind = f1i.map((a) => f1j.map((b) => (a / N) * (b / N)));
    const diff = mean.map((r, a) => r.map((v, b) => v - ind[a][b]));
    const side = w > 700;
    // MSA strip
    const cw = Math.min(18, (side ? w * 0.36 : w - 40) / 12), rows = Math.min(10, N);
    const mx = 20, my = 34;
    ctx.fillStyle = C.dim; ctx.font = `12px ${C.font}`; ctx.textAlign = 'left'; ctx.fillText('MSA (앞 10개 서열)', mx, 18);
    for (let r = 0; r < rows; r++) for (let c = 0; c < 12; c++) {
      ctx.fillStyle = LCOL[M[r][c]]; ctx.globalAlpha = c === OP.i || c === OP.j ? 1 : 0.25;
      ctx.fillRect(mx + c * cw, my + r * cw, cw - 1, cw - 1);
      ctx.globalAlpha = 1;
      if (c === OP.i || c === OP.j) { ctx.fillStyle = '#fff'; ctx.font = `bold ${cw * 0.6}px ${C.mono}`; ctx.textAlign = 'center'; ctx.fillText(LET[M[r][c]], mx + (c + 0.5) * cw, my + (r + 0.72) * cw); }
    }
    ctx.fillStyle = C.acc; ctx.font = `12px ${C.mono}`; ctx.textAlign = 'center';
    ctx.fillText('i', mx + (OP.i + 0.5) * cw, my + rows * cw + 14); ctx.fillText('j', mx + (OP.j + 0.5) * cw, my + rows * cw + 14);
    // matrices
    const mats = [['평균 외적 = f_ij(a,b)', mean, 0.5, false], ['독립 기대 f_i ⊗ f_j', ind, 0.5, false], ['차이 = 공진화 신호', diff, 0.25, true]];
    const ms = side ? Math.min(140, (w * 0.6 - 60) / 3) : Math.min(120, (w - 60) / 3);
    const bx = side ? w * 0.38 + 10 : 20, by = side ? 50 : my + rows * cw + 50;
    mats.forEach(([t, m, sc, signed], k) => {
      const x0 = bx + k * (ms + 24), c = ms / 4;
      ctx.fillStyle = C.dim; ctx.font = `12px ${C.font}`; ctx.textAlign = 'center'; ctx.fillText(t, x0 + ms / 2, by - 12);
      for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) {
        const v = m[a][b];
        if (signed) { ctx.fillStyle = v >= 0 ? C.acc : C.bad; ctx.globalAlpha = Math.min(1, Math.abs(v) / sc); }
        else { ctx.fillStyle = C.acc2; ctx.globalAlpha = Math.min(1, v / sc); }
        ctx.fillRect(x0 + b * c, by + a * c, c - 1, c - 1); ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = C.border; ctx.strokeRect(x0, by, ms, ms);
      ctx.font = `10px ${C.mono}`; ctx.fillStyle = C.dim;
      for (let a = 0; a < 4; a++) { ctx.textAlign = 'right'; ctx.fillText(LET[a], x0 - 3, by + (a + 0.6) * c); ctx.textAlign = 'center'; ctx.fillText(LET[a], x0 + (a + 0.5) * c, by + ms + 12); }
    });
    let dev = 0; diff.forEach((r) => r.forEach((v) => (dev += v * v)));
    AF.set('opDev', Math.sqrt(dev).toFixed(3));
    const rel = (OP.i === 2 && OP.j === 9) || (OP.i === 9 && OP.j === 2) || (OP.i === 4 && OP.j === 7) || (OP.i === 7 && OP.j === 4) ? '공진화 쌍' : OP.i === OP.j ? '같은 열' : '독립';
    AF.set('opRel', rel);
  });
  genOP();
  AF.range('opI', (v) => v, (v) => { OP.i = v; opCv.redraw(); });
  AF.range('opJ', (v) => v, (v) => { OP.j = v; opCv.redraw(); });
  AF.range('opN', (v) => v, (v) => { OP.n = v; opCv.redraw(); });
  document.getElementById('opRe').onclick = () => { OP.seed++; genOP(); opCv.redraw(); };

  /* ---------- 4-5 triangle updates ---------- */
  const T = { n: 8, i: 0, j: 3, k: 5, mode: 'out', pick: null, anim: true, t: 0 };
  let triPos = [];
  const arrow = (ctx, a, b, col, lw, dash, r = 16) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
    const s = [a[0] + ux * r, a[1] + uy * r], e = [b[0] - ux * (r + 2), b[1] - uy * (r + 2)];
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw; ctx.setLineDash(dash || []);
    ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(e[0], e[1]); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(e[0], e[1]); ctx.lineTo(e[0] - ux * 11 - uy * 6, e[1] - uy * 11 + ux * 6); ctx.lineTo(e[0] - ux * 11 + uy * 6, e[1] - uy * 11 - ux * 6); ctx.fill();
  };
  const triCv = AF.canvas(document.getElementById('triCv'), 340, (ctx, w, h) => {
    const C = AF.colors(); const R = Math.min(w, h) / 2 - 40, cx = w / 2, cy = h / 2;
    triPos = Array.from({ length: T.n }, (_, a) => [cx + R * Math.cos((a / T.n) * 2 * Math.PI - Math.PI / 2), cy + R * Math.sin((a / T.n) * 2 * Math.PI - Math.PI / 2)]);
    const P = triPos, { i, j, k } = T;
    // faint other k edges
    for (let q = 0; q < T.n; q++) { if (q === i || q === j) continue; ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(P[i][0], P[i][1]); ctx.lineTo(P[q][0], P[q][1]); ctx.moveTo(P[j][0], P[j][1]); ctx.lineTo(P[q][0], P[q][1]); ctx.stroke(); }
    const okc = C.ok, bc = C.warn;
    if (k !== i && k !== j) {
      if (T.mode === 'out') { arrow(ctx, P[i], P[k], okc, 3); arrow(ctx, P[j], P[k], okc, 3); }
      if (T.mode === 'in') { arrow(ctx, P[k], P[i], okc, 3); arrow(ctx, P[k], P[j], okc, 3); }
      if (T.mode === 'start') { arrow(ctx, P[i], P[k], okc, 3); arrow(ctx, P[j], P[k], bc, 2.5, [6, 5]); }
      if (T.mode === 'end') { arrow(ctx, P[k], P[j], okc, 3); arrow(ctx, P[k], P[i], bc, 2.5, [6, 5]); }
    }
    arrow(ctx, P[i], P[j], C.acc, 5);
    P.forEach((p, a) => {
      ctx.fillStyle = a === i || a === j ? C.acc : a === k ? C.ok : C.surf;
      ctx.strokeStyle = C.border; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(p[0], p[1], 15, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = a === i || a === j || a === k ? '#fff' : C.text; ctx.font = `bold 13px ${C.mono}`; ctx.textAlign = 'center';
      ctx.fillText(a === i ? 'i' : a === j ? 'j' : a === k ? 'k' : a, p[0], p[1] + 4.5);
    });
    if (T.pick !== null) { ctx.strokeStyle = C.acc2; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(P[T.pick][0], P[T.pick][1], 20, 0, 7); ctx.stroke(); }
  });
  const TXT = {
    out: '<b>곱셈·나가는 간선</b><br>z<sub>ij</sub> += Σ<sub>k</sub> a<sub>ik</sub> ⊙ b<sub>jk</sub><br>i→k와 j→k 두 간선의 특징을 원소별 곱한 뒤 모든 k에 대해 더합니다.',
    in: '<b>곱셈·들어오는 간선</b><br>z<sub>ij</sub> += Σ<sub>k</sub> a<sub>ki</sub> ⊙ b<sub>kj</sub><br>k→i와 k→j 두 간선을 사용합니다.',
    start: '<b>어텐션·시작 노드</b><br>a<sub>ijk</sub> = softmax<sub>k</sub>(q<sub>ij</sub>·k<sub>ik</sub> + <span style="color:var(--warn)">b<sub>jk</sub></span>)<br>값 v<sub>ik</sub>를 가중합. 점선 jk = 편향(빠진 간선).',
    end: '<b>어텐션·끝 노드</b><br>a<sub>ijk</sub> = softmax<sub>k</sub>(q<sub>ij</sub>·k<sub>kj</sub> + <span style="color:var(--warn)">b<sub>ki</sub></span>)<br>값 v<sub>kj</sub>를 가중합. 점선 ki = 편향.'
  };
  const kEl = document.getElementById('triK');
  const setK = AF.range('triK', (v) => v, (v) => { T.k = v; triCv.redraw(); });
  AF.seg('triMode', (v) => { T.mode = v; AF.set('triText', TXT[v]); triCv.redraw(); });
  AF.set('triText', TXT.out);
  document.getElementById('triAnim').onchange = (e) => (T.anim = e.target.checked);
  document.getElementById('triCv').addEventListener('click', (e) => {
    const [x, y] = AF.pointer(e.target, e);
    const a = triPos.findIndex((p) => Math.hypot(p[0] - x, p[1] - y) < 22); if (a < 0) return;
    if (T.pick === null) T.pick = a; else if (a !== T.pick) { T.i = T.pick; T.j = a; T.pick = null; } else T.pick = null;
    triCv.redraw();
  });
  let visTri = true; new IntersectionObserver((en) => (visTri = en[0].isIntersecting)).observe(document.getElementById('triCv'));
  setInterval(() => {
    if (!T.anim || !visTri) return;
    let k = (T.k + 1) % T.n; while (k === T.i || k === T.j) k = (k + 1) % T.n;
    kEl.value = k; kEl.dispatchEvent(new Event('input'));
  }, 900);
  setK();

  /* ---------- 4-5b triangle inequality ---------- */
  const V = AF.V;
  const TI = { n: 14, pts: [], D: [], Dt: [], noise: 0.3, out: 4, it: 0, rec: [] };
  const tiNew = () => {
    TI.pts = []; const rng = AF.rng(Math.floor(Math.random() * 1e6));
    // a curled "chain" in 2D
    let p = [0, 0], ang = 0;
    for (let a = 0; a < TI.n; a++) { TI.pts.push(p.slice()); ang += 0.45 + rng() * 0.5; p = [p[0] + Math.cos(ang) * 1, p[1] + Math.sin(ang) * 1]; }
    const c = TI.pts.reduce((s, q) => [s[0] + q[0] / TI.n, s[1] + q[1] / TI.n], [0, 0]);
    TI.pts = TI.pts.map((q) => [q[0] - c[0], q[1] - c[1]]);
    TI.Dt = TI.pts.map((a) => TI.pts.map((b) => Math.hypot(a[0] - b[0], a[1] - b[1])));
    TI.D = TI.Dt.map((r) => r.slice());
    for (let a = 0; a < TI.n; a++) for (let b = a + 1; b < TI.n; b++) { const v = Math.max(0.05, TI.Dt[a][b] * (1 + AF.gauss() * TI.noise * 0.5)); TI.D[a][b] = TI.D[b][a] = v; }
    for (let o = 0; o < TI.out; o++) { const a = Math.floor(rng() * TI.n), b = (a + 3 + Math.floor(rng() * (TI.n - 6))) % TI.n; const v = TI.Dt[a][b] * (2.2 + rng() * 1.5); TI.D[a][b] = TI.D[b][a] = v; }
    TI.it = 0; tiEval();
  };
  const viol = () => {
    const bad = new Set(); let cnt = 0;
    for (let a = 0; a < TI.n; a++) for (let b = a + 1; b < TI.n; b++) for (let k = 0; k < TI.n; k++) {
      if (k === a || k === b) continue;
      if (TI.D[a][b] > TI.D[a][k] + TI.D[k][b] + 1e-6) { cnt++; bad.add(a + ',' + b); }
    }
    return { cnt, bad };
  };
  const mds = (D) => {
    const n = D.length, D2 = D.map((r) => r.map((v) => v * v));
    const rm = D2.map((r) => r.reduce((s, v) => s + v, 0) / n), gm = rm.reduce((s, v) => s + v, 0) / n;
    const B = D2.map((r, a) => r.map((v, b) => -0.5 * (v - rm[a] - rm[b] + gm)));
    const { values, vectors } = AF.jacobi(B);
    const idx = values.map((v, i) => [v, i]).sort((x, y) => y[0] - x[0]).slice(0, 2);
    return Array.from({ length: n }, (_, a) => idx.map(([v, i]) => vectors[a][i] * Math.sqrt(Math.max(v, 0))));
  };
  const tiEval = () => {
    let X = mds(TI.D).map((p) => [p[0], p[1], 0]);
    const tru = TI.pts.map((p) => [p[0], p[1], 0]);
    const A1 = AF.superpose(X, tru), A2 = AF.superpose(X.map((p) => [-p[0], p[1], 0]), tru);
    const r1 = AF.rmsd(A1, tru), r2 = AF.rmsd(A2, tru);
    TI.rec = r1 < r2 ? A1 : A2;
    const v = viol(); TI.bad = v.bad;
    let e = 0, c = 0; for (let a = 0; a < TI.n; a++) for (let b = a + 1; b < TI.n; b++) { e += Math.abs(TI.D[a][b] - TI.Dt[a][b]); c++; }
    AF.set('tiViol', v.cnt); AF.set('tiErr', (e / c).toFixed(3)); AF.set('tiRmsd', Math.min(r1, r2).toFixed(3)); AF.set('tiIt', TI.it);
    tiCv.redraw();
  };
  const tiStep = () => {
    const N = TI.D.map((r) => r.slice());
    for (let a = 0; a < TI.n; a++) for (let b = a + 1; b < TI.n; b++) {
      const paths = [];
      for (let k = 0; k < TI.n; k++) if (k !== a && k !== b) paths.push(TI.D[a][k] + TI.D[k][b]);
      paths.sort((x, y) => x - y);
      const med = paths[Math.floor(paths.length * 0.15)];
      const v = 0.5 * TI.D[a][b] + 0.5 * Math.min(TI.D[a][b], med);
      N[a][b] = N[b][a] = v;
    }
    TI.D = N; TI.it++; tiEval();
  };
  const tiCv = AF.canvas(document.getElementById('tiCv'), (w) => (w > 700 ? 300 : 580), (ctx, w, h) => {
    const C = AF.colors(); if (!TI.D.length) return;
    const side = w > 700, size = side ? Math.min(260, w * 0.4) : Math.min(260, w - 40);
    const ox = 20, oy = 30, cs = size / TI.n;
    let mx = 0; TI.D.forEach((r) => r.forEach((v) => (mx = Math.max(mx, v))));
    ctx.fillStyle = C.dim; ctx.font = `12px ${C.font}`; ctx.textAlign = 'left'; ctx.fillText('거리 행렬 (빨간 테두리 = 삼각 부등식 위반)', ox, 18);
    for (let a = 0; a < TI.n; a++) for (let b = 0; b < TI.n; b++) {
      ctx.fillStyle = AF.seqColor(1 - TI.D[a][b] / mx); ctx.fillRect(ox + b * cs, oy + a * cs, cs - 1, cs - 1);
      if (TI.bad && TI.bad.has(Math.min(a, b) + ',' + Math.max(a, b))) { ctx.strokeStyle = C.bad; ctx.lineWidth = 2; ctx.strokeRect(ox + b * cs + 1, oy + a * cs + 1, cs - 3, cs - 3); }
    }
    // reconstruction
    const bx = side ? ox + size + 40 : ox, by = side ? oy : oy + size + 40, bw = side ? w - bx - 20 : w - 40, bh = side ? h - 50 : h - by - 10;
    ctx.fillStyle = C.dim; ctx.fillText('MDS 복원 (색) vs 정답 (회색)', bx, by - 12);
    let R = 0; TI.pts.forEach((p) => (R = Math.max(R, Math.hypot(p[0], p[1]))));
    const sc = Math.min(bw, bh) / 2 / (R + 0.8), cx = bx + bw / 2, cy = by + bh / 2;
    const draw = (P, col, lw, rad) => {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
      P.forEach((p, a) => { const x = cx + p[0] * sc, y = cy - p[1] * sc; a ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
      P.forEach((p) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx + p[0] * sc, cy - p[1] * sc, rad, 0, 7); ctx.fill(); });
    };
    draw(TI.pts, AF.isDark() ? '#5b667d' : '#c3cad6', 6, 6);
    draw(TI.rec, C.acc, 2.5, 4);
  });
  AF.range('tiNoise', (v) => Math.round(v * 100) + '%', (v) => (TI.noise = v));
  AF.range('tiOut', (v) => v, (v) => (TI.out = v));
  ['tiNoise', 'tiOut'].forEach((id) => document.getElementById(id).addEventListener('change', tiNew));
  document.getElementById('tiStep').onclick = tiStep;
  document.getElementById('tiReset').onclick = tiNew;
  tiNew();
});
