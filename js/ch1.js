/* Chapter 01 — protein folding problem */
AF.ready(() => {
  const V = AF.V;

  /* ---------- 1-1 amino acids ---------- */
  const AA = [
    ['A', 'Ala', '알라닌', 'hyd', '작은 메틸 곁사슬. α-나선을 잘 만든다.'],
    ['V', 'Val', '발린', 'hyd', '가지형 소수성. β-가닥에 자주 등장.'],
    ['L', 'Leu', '류신', 'hyd', '가장 흔한 아미노산 중 하나. 나선·소수성 코어.'],
    ['I', 'Ile', '아이소류신', 'hyd', 'β-가지형 소수성, β-시트 선호.'],
    ['M', 'Met', '메티오닌', 'hyd', '황 포함. 대부분 단백질의 시작 잔기.'],
    ['F', 'Phe', '페닐알라닌', 'hyd', '방향족 고리. 코어 패킹에 중요.'],
    ['W', 'Trp', '트립토판', 'hyd', '가장 큰 곁사슬, 방향족. 형광 측정에 쓰임.'],
    ['Y', 'Tyr', '타이로신', 'pol', '방향족 + 하이드록실. 인산화 자리.'],
    ['S', 'Ser', '세린', 'pol', '작은 하이드록실. 인산화·효소 활성 부위.'],
    ['T', 'Thr', '트레오닌', 'pol', 'β-가지형 하이드록실.'],
    ['N', 'Asn', '아스파라진', 'pol', '아마이드. 당화(N-glycosylation) 자리.'],
    ['Q', 'Gln', '글루타민', 'pol', '아마이드, 긴 곁사슬.'],
    ['C', 'Cys', '시스테인', 'pol', '싸이올(-SH). 이황화 결합으로 구조 고정, 아연 결합.'],
    ['H', 'His', '히스티딘', 'pos', '생리 pH 근처에서 양성자화가 바뀜. 금속 결합·촉매.'],
    ['K', 'Lys', '라이신', 'pos', '양전하 아민. 표면에 주로 노출.'],
    ['R', 'Arg', '아르지닌', 'pos', '구아니디늄 양전하. 염다리·DNA 결합.'],
    ['D', 'Asp', '아스파르트산', 'neg', '음전하 카복실. 금속 결합·촉매.'],
    ['E', 'Glu', '글루탐산', 'neg', '음전하, α-나선 선호.'],
    ['G', 'Gly', '글라이신', 'spc', '곁사슬이 H 하나 → 키랄성 없음, φ/ψ 자유도가 매우 큼(유연한 고리).'],
    ['P', 'Pro', '프롤린', 'spc', '곁사슬이 백본 N과 고리를 이룸 → φ ≈ −65°로 고정, 나선 파괴자.']
  ];
  const cls = { hyd: '소수성', pol: '극성', pos: '양전하', neg: '음전하', spc: '특수(구조적)' };
  const grid = document.getElementById('aaGrid');
  grid.innerHTML = AA.map((a, i) => `<div class="aa ${a[3]}" data-i="${i}"><b>${a[0]}</b>${a[1]}<br>${a[2]}</div>`).join('');
  grid.querySelectorAll('.aa').forEach((el) => (el.onclick = () => {
    grid.querySelectorAll('.aa').forEach((x) => x.classList.remove('on'));
    el.classList.add('on');
    const a = AA[+el.dataset.i];
    AF.set('aaInfo', `<b>${a[2]} (${a[1]}, ${a[0]})</b> · ${cls[a[3]]} — ${a[4]}`);
  }));

  /* ---------- 1-2 Levinthal ---------- */
  const fmtE = (lg) => { const e = Math.floor(lg); const m = Math.pow(10, lg - e); return `${m.toFixed(1)}×10<sup>${e}</sup>`; };
  let lev = { N: 100, k: 3, t: -13 };
  const levCv = AF.canvas(document.getElementById('levCv'), 220, (ctx, w, h) => {
    const C = AF.colors();
    const lgConf = lev.N * Math.log10(lev.k);
    const lgTime = lgConf + lev.t;
    const bars = [
      ['실제 접힘 (빠른 단백질)', -5, C.ok], ['실제 접힘 (느린 단백질)', 1, C.ok],
      ['인간 수명', 9.4, C.dim], ['우주 나이', 17.64, C.warn], ['전수 탐색', lgTime, C.bad]
    ];
    const x0 = 170, x1 = w - 30, lo = -6, hi = Math.max(60, Math.ceil(lgTime / 20) * 20);
    const X = (v) => x0 + ((Math.min(v, hi) - lo) / (hi - lo)) * (x1 - x0);
    ctx.font = `12px ${C.font}`;
    bars.forEach((b, i) => {
      const y = 22 + i * 36;
      ctx.fillStyle = C.dim; ctx.textAlign = 'right'; ctx.fillText(b[0], x0 - 10, y + 15);
      ctx.fillStyle = b[2]; ctx.globalAlpha = 0.85;
      ctx.fillRect(x0, y + 3, Math.max(2, X(b[1]) - x0), 18); ctx.globalAlpha = 1;
      ctx.fillStyle = C.text; ctx.textAlign = 'left'; ctx.font = `11px ${C.mono}`;
      const tx = Math.min(X(b[1]) + 6, x1 - 60);
      ctx.fillText(`10^${b[1].toFixed(1)} s`, tx, y + 16); ctx.font = `12px ${C.font}`;
    });
    ctx.strokeStyle = C.axis; ctx.beginPath(); ctx.moveTo(X(0), 14); ctx.lineTo(X(0), h - 14); ctx.stroke();
    ctx.fillStyle = C.faint; ctx.font = `11px ${C.mono}`; ctx.textAlign = 'center'; ctx.fillText('1 s', X(0), h - 2);
    AF.set('levConf', fmtE(lgConf));
    AF.set('levTime', fmtE(lgTime) + '<small>s</small>');
    const r = lgTime - 17.64;
    AF.set('levUni', r > 0 ? fmtE(r) + '<small>배</small>' : '우주 나이 이내');
  });
  AF.range('levN', (v) => v, (v) => { lev.N = v; levCv.redraw(); });
  AF.range('levK', (v) => v, (v) => { lev.k = v; levCv.redraw(); });
  AF.range('levT', (v) => `10^${v} s`, (v) => { lev.t = v; levCv.redraw(); });

  /* ---------- 1-3 phi/psi backbone ---------- */
  let bb = { phi: -57, psi: -47, n: 18, atoms: [] , showAtoms: true};
  const zones = [
    { n: 'α-나선 (우선)', c: [-63, -43], r: [35, 30] },
    { n: 'β-시트', c: [-120, 130], r: [50, 40] },
    { n: 'PPII', c: [-75, 145], r: [20, 20] },
    { n: 'α-나선 (좌선)', c: [57, 47], r: [22, 25] }
  ];
  const zoneOf = (phi, psi) => {
    for (const z of zones) { if (((phi - z.c[0]) / z.r[0]) ** 2 + ((psi - z.c[1]) / z.r[1]) ** 2 <= 1) return z.n; }
    if (phi < 0 && psi > 90) return '확장 영역';
    if (phi < -30 && psi < 30 && psi > -90) return 'α 영역 부근';
    return '드묾 (충돌)';
  };
  const rebuild = () => {
    const phis = Array(bb.n).fill(bb.phi), psis = Array(bb.n).fill(bb.psi);
    bb.atoms = AF.buildBackbone(phis, psis);
    const CA = bb.atoms.filter((_, i) => i % 3 === 1);
    // helix params via axis approx: rise = mean projection on end-to-end direction
    const ax = V.unit(V.sub(V.centroid(CA.slice(-4)), V.centroid(CA.slice(0, 4))));
    let rise = 0; for (let i = 0; i < CA.length - 1; i++) rise += Math.abs(V.dot(V.sub(CA[i + 1], CA[i]), ax));
    rise /= CA.length - 1;
    // residues per turn from rotation angle about axis
    const proj = (p) => V.sub(p, V.mul(ax, V.dot(p, ax)));
    let ang = 0, cnt = 0;
    const cen = V.centroid(CA);
    for (let i = 1; i < CA.length - 2; i++) {
      const a = proj(V.sub(CA[i], cen)), b = proj(V.sub(CA[i + 1], cen));
      const na = V.norm(a), nb = V.norm(b); if (na < 0.3 || nb < 0.3) continue;
      ang += Math.acos(Math.max(-1, Math.min(1, V.dot(a, b) / (na * nb)))); cnt++;
    }
    const per = cnt ? (2 * Math.PI) / (ang / cnt) : Infinity;
    AF.set('bbRise', rise.toFixed(2) + '<small>Å</small>');
    AF.set('bbPer', per > 20 || !isFinite(per) ? '—' : per.toFixed(2));
    AF.set('bbEnd', V.dist(CA[0], CA[CA.length - 1]).toFixed(1) + '<small>Å</small>');
    AF.set('bbZone', zoneOf(bb.phi, bb.psi));
    view.redraw(); rama.redraw();
  };
  const view = AF.view3d(document.getElementById('bbCv'), {
    height: 300,
    getModel: () => {
      const A = bb.atoms; if (!A.length) return null;
      const col = (i) => (i % 3 === 0 ? '#3b82f6' : i % 3 === 1 ? '#9aa6bf' : '#ef4444');
      return {
        points: A, color: col, dots: bb.showAtoms, dotR: (i) => (i % 3 === 1 ? 4 : 3), lineWidth: 3,
        segColor: () => AF.css('--accent')
      };
    }
  });
  let ramaMap = null;
  const rama = AF.canvas(document.getElementById('ramaCv'), 260, (ctx, w, h) => {
    const C = AF.colors();
    const s = Math.min(w - 70, h - 50), x0 = (w - s) / 2 + 15, y0 = 12;
    const X = (p) => x0 + ((p + 180) / 360) * s, Y = (q) => y0 + ((180 - q) / 360) * s;
    AF.axes(ctx, x0, y0, s, s, { nx: 4, ny: 4, xl: (t) => (t * 360 - 180).toFixed(0), yl: (t) => (t * 360 - 180).toFixed(0) });
    zones.forEach((z, i) => {
      ctx.fillStyle = i === 0 ? C.acc : i === 3 ? C.acc2 : C.ok; ctx.globalAlpha = 0.18;
      ctx.beginPath(); ctx.ellipse(X(z.c[0]), Y(z.c[1]), (z.r[0] / 360) * s, (z.r[1] / 360) * s, 0, 0, 7); ctx.fill();
      ctx.globalAlpha = 0.9; ctx.fillStyle = C.dim; ctx.font = `11px ${C.font}`; ctx.textAlign = 'center';
      const below = z.n === 'PPII';
      ctx.textAlign = below ? 'left' : 'center';
      ctx.fillText(z.n, X(z.c[0]) + (below ? (z.r[0] / 360) * s + 3 : 0), below ? Y(z.c[1]) + 4 : Y(z.c[1]) - (z.r[1] / 360) * s - 4);
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.bad; ctx.beginPath(); ctx.arc(X(bb.phi), Y(bb.psi), 6, 0, 7); ctx.fill();
    ctx.strokeStyle = C.bg; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = C.dim; ctx.font = `12px ${C.font}`; ctx.textAlign = 'center';
    ctx.fillText('φ (°)', x0 + s / 2, y0 + s + 32);
    ctx.save(); ctx.translate(x0 - 38, y0 + s / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('ψ (°)', 0, 0); ctx.restore();
    ramaMap = { x0, y0, s };
  });
  const phiEl = document.getElementById('bbPhi'), psiEl = document.getElementById('bbPsi');
  AF.range('bbPhi', (v) => v + '°', (v) => { bb.phi = v; rebuild(); });
  AF.range('bbPsi', (v) => v + '°', (v) => { bb.psi = v; rebuild(); });
  AF.range('bbN', (v) => v, (v) => { bb.n = v; rebuild(); });
  const setPP = (phi, psi) => {
    phiEl.value = phi; psiEl.value = psi;
    phiEl.dispatchEvent(new Event('input')); psiEl.dispatchEvent(new Event('input'));
  };
  AF.seg('bbPreset', (v) => { const [a, b] = v.split(',').map(Number); setPP(a, b); });
  document.getElementById('bbAtoms').onchange = (e) => { bb.showAtoms = e.target.checked; view.redraw(); };
  document.getElementById('ramaCv').addEventListener('click', (e) => {
    const [px, py] = AF.pointer(e.target, e); const m = ramaMap; if (!m) return;
    const phi = Math.round(((px - m.x0) / m.s) * 360 - 180), psi = Math.round(180 - ((py - m.y0) / m.s) * 360);
    if (Math.abs(phi) <= 180 && Math.abs(psi) <= 180) setPP(phi, psi);
  });
  rebuild();

  /* ---------- 1-4 HP lattice ---------- */
  const hp = { seq: '', pos: [], E: 0, best: 0, bestPos: null, steps: 0, acc: 0, hist: [], running: false, anneal: false, T: 0.6 };
  const Tget = AF.range('hpT', (v) => v.toFixed(2), (v) => (hp.T = v));
  const key = (p) => p[0] + ',' + p[1];
  const energy = (pos) => {
    const m = new Map(); pos.forEach((p, i) => m.set(key(p), i));
    let e = 0;
    pos.forEach((p, i) => {
      if (hp.seq[i] !== 'H') return;
      [[1, 0], [0, 1]].forEach(([dx, dy]) => {
        const j = m.get((p[0] + dx) + ',' + (p[1] + dy));
        if (j !== undefined && Math.abs(i - j) > 1 && hp.seq[j] === 'H') e--;
      });
    });
    return e;
  };
  const valid = (pos) => new Set(pos.map(key)).size === pos.length;
  const resetHP = () => {
    hp.seq = document.getElementById('hpSeq').value.toUpperCase().replace(/[^HP]/g, '') || 'HPHPPHHPHPPHPHHPPHPH';
    hp.pos = hp.seq.split('').map((_, i) => [i, 0]);
    hp.E = energy(hp.pos); hp.best = hp.E; hp.bestPos = hp.pos.map((p) => p.slice());
    hp.steps = 0; hp.acc = 0; hp.hist = [hp.E];
    drawHP();
  };
  const rot90 = [[0, -1], [1, 0]], rot270 = [[0, 1], [-1, 0]], rot180 = [[-1, 0], [0, -1]];
  const tryMove = () => {
    const n = hp.pos.length, P = hp.pos.map((p) => p.slice());
    const r = Math.random();
    if (r < 0.5) { // pivot
      const k = 1 + Math.floor(Math.random() * (n - 2));
      const M = [rot90, rot270, rot180][Math.floor(Math.random() * 3)];
      const c = P[k]; const tail = Math.random() < 0.5;
      for (let i = 0; i < n; i++) {
        if (tail ? i <= k : i >= k) continue;
        const d = [P[i][0] - c[0], P[i][1] - c[1]];
        P[i] = [c[0] + M[0][0] * d[0] + M[0][1] * d[1], c[1] + M[1][0] * d[0] + M[1][1] * d[1]];
      }
    } else if (r < 0.75) { // corner flip
      const i = 1 + Math.floor(Math.random() * (n - 2));
      const a = P[i - 1], b = P[i + 1];
      if (Math.abs(a[0] - b[0]) === 1 && Math.abs(a[1] - b[1]) === 1) P[i] = [a[0] + b[0] - P[i][0], a[1] + b[1] - P[i][1]];
      else return;
    } else { // end move
      const end = Math.random() < 0.5 ? 0 : n - 1, nb = end === 0 ? P[1] : P[n - 2];
      const d = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(Math.random() * 4)];
      P[end] = [nb[0] + d[0], nb[1] + d[1]];
    }
    if (!valid(P)) return;
    const E2 = energy(P), dE = E2 - hp.E;
    hp.steps++;
    if (dE <= 0 || Math.random() < Math.exp(-dE / hp.T)) {
      hp.pos = P; hp.E = E2; hp.acc++;
      if (E2 < hp.best) { hp.best = E2; hp.bestPos = P.map((p) => p.slice()); }
    }
  };
  const hpCv = AF.canvas(document.getElementById('hpCv'), 300, (ctx, w, h) => {
    const C = AF.colors(); const P = hp.pos; if (!P.length) return;
    let mnx = Infinity, mxx = -Infinity, mny = Infinity, mxy = -Infinity;
    P.forEach((p) => { mnx = Math.min(mnx, p[0]); mxx = Math.max(mxx, p[0]); mny = Math.min(mny, p[1]); mxy = Math.max(mxy, p[1]); });
    const cell = Math.min(34, (w - 40) / (mxx - mnx + 1), (h - 40) / (mxy - mny + 1));
    const ox = w / 2 - ((mxx + mnx) / 2) * cell, oy = h / 2 + ((mxy + mny) / 2) * cell;
    const X = (p) => [ox + p[0] * cell, oy - p[1] * cell];
    // grid
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    for (let gx = mnx - 3; gx <= mxx + 3; gx++) { const x = ox + gx * cell; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let gy = mny - 3; gy <= mxy + 3; gy++) { const y = oy - gy * cell; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    // contacts
    const m = new Map(); P.forEach((p, i) => m.set(key(p), i));
    ctx.setLineDash([4, 4]); ctx.strokeStyle = C.warn; ctx.lineWidth = 2;
    P.forEach((p, i) => {
      if (hp.seq[i] !== 'H') return;
      [[1, 0], [0, 1]].forEach(([dx, dy]) => {
        const j = m.get((p[0] + dx) + ',' + (p[1] + dy));
        if (j !== undefined && Math.abs(i - j) > 1 && hp.seq[j] === 'H') { const a = X(p), b = X(P[j]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      });
    });
    ctx.setLineDash([]);
    ctx.strokeStyle = C.dim; ctx.lineWidth = 3; ctx.beginPath();
    P.forEach((p, i) => { const a = X(p); i ? ctx.lineTo(a[0], a[1]) : ctx.moveTo(a[0], a[1]); }); ctx.stroke();
    P.forEach((p, i) => {
      const a = X(p); ctx.fillStyle = hp.seq[i] === 'H' ? '#ff9f43' : '#4aa8ff';
      ctx.beginPath(); ctx.arc(a[0], a[1], cell * 0.32, 0, 7); ctx.fill();
      if (i === 0) { ctx.strokeStyle = C.text; ctx.lineWidth = 2; ctx.stroke(); }
    });
  });
  const hpE = AF.canvas(document.getElementById('hpE'), 130, (ctx, w, h) => {
    const C = AF.colors(); const H = hp.hist; if (!H.length) return;
    const x0 = 50, y0 = 10, ww = w - 70, hh = h - 40;
    const mn = Math.min(-1, ...H, hp.best);
    AF.axes(ctx, x0, y0, ww, hh, { nx: 4, ny: 2, yl: (t) => (mn * (1 - t)).toFixed(0), xt: '시간 →' });
    ctx.strokeStyle = C.acc; ctx.lineWidth = 1.6; ctx.beginPath();
    H.forEach((e, i) => { const x = x0 + (i / Math.max(1, H.length - 1)) * ww, y = y0 + (e / mn) * hh; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
    ctx.fillStyle = C.dim; ctx.font = `11px ${C.font}`; ctx.fillText('E', 18, y0 + hh / 2);
  });
  const drawHP = () => {
    hpCv.redraw(); hpE.redraw();
    AF.set('hpCur', hp.E); AF.set('hpBest', hp.best); AF.set('hpSteps', hp.steps.toLocaleString());
    AF.set('hpAcc', hp.steps ? ((100 * hp.acc) / hp.steps).toFixed(0) + '<small>%</small>' : '—');
  };
  const tEl = document.getElementById('hpT');
  const loop = () => {
    if (hp.running) {
      for (let i = 0; i < 400; i++) tryMove();
      if (hp.anneal) {
        hp.T = Math.max(0.05, hp.T * 0.985); tEl.value = hp.T; tEl.dispatchEvent(new Event('input'));
        if (hp.T <= 0.05) { hp.anneal = false; hp.running = false; hp.pos = hp.bestPos.map((p) => p.slice()); hp.E = hp.best; runBtn.textContent = '▶ 실행'; }
      }
      hp.hist.push(hp.E); if (hp.hist.length > 400) hp.hist.shift();
      drawHP();
    }
    requestAnimationFrame(loop);
  };
  const runBtn = document.getElementById('hpRun');
  runBtn.onclick = () => { hp.running = !hp.running; hp.anneal = false; runBtn.textContent = hp.running ? '⏸ 정지' : '▶ 실행'; };
  document.getElementById('hpAnneal').onclick = () => {
    tEl.value = 2; tEl.dispatchEvent(new Event('input')); hp.anneal = true; hp.running = true; runBtn.textContent = '⏸ 정지';
  };
  document.getElementById('hpReset').onclick = () => { hp.running = false; runBtn.textContent = '▶ 실행'; resetHP(); };
  document.getElementById('hpSeq').addEventListener('change', resetHP);
  AF.seg('hpPreset', (v) => { document.getElementById('hpSeq').value = v; resetHP(); });
  resetHP(); Tget(); loop();

  /* ---------- 1-5 gap chart ---------- */
  const gap = [
    ['PDB의 고유 단백질 구조', 1e5, '약 100,000개 (논문 Main 첫 문단). 실험 하나에 수개월~수년.', 'ok'],
    ['자기증류 학습 서열 (Uniclust30)', 355993, 'AlphaFold2가 예측해 추가 학습 데이터로 쓴 서열 수 (Methods).', 'acc2'],
    ['AlphaFold DB 예측 구조', 2.14e8, '2022년 7월 기준 2억 개 이상, UniProt 거의 전체를 덮음.', 'acc'],
    ['BFD 서열 수', 2204359010, '논문이 구축·공개한 Big Fantastic Database: 6,598만 패밀리, 22억 서열 (Methods).', 'warn']
  ];
  let gapSel = 0;
  const gapCv = AF.canvas(document.getElementById('gapCv'), 200, (ctx, w, h) => {
    const C = AF.colors(); const x0 = 210, x1 = w - 60;
    const X = (v) => x0 + ((Math.log10(v) - 3) / (10 - 3)) * (x1 - x0);
    ctx.strokeStyle = C.grid;
    for (let e = 3; e <= 10; e++) { const x = X(10 ** e); ctx.beginPath(); ctx.moveTo(x, 8); ctx.lineTo(x, h - 20); ctx.stroke(); ctx.fillStyle = C.faint; ctx.font = `10px ${C.mono}`; ctx.textAlign = 'center'; ctx.fillText('10^' + e, x, h - 6); }
    gap.forEach((g, i) => {
      const y = 12 + i * 40;
      ctx.fillStyle = i === gapSel ? C.text : C.dim; ctx.font = `${i === gapSel ? 'bold ' : ''}12px ${C.font}`; ctx.textAlign = 'right'; ctx.fillText(g[0], x0 - 10, y + 17);
      ctx.fillStyle = C[g[3]]; ctx.globalAlpha = i === gapSel ? 1 : 0.7; ctx.fillRect(x0, y + 4, X(g[1]) - x0, 20); ctx.globalAlpha = 1;
      ctx.fillStyle = C.text; ctx.font = `11px ${C.mono}`; ctx.textAlign = 'left'; ctx.fillText(g[1].toLocaleString(), X(g[1]) + 6, y + 18);
    });
  });
  document.getElementById('gapCv').addEventListener('click', (e) => {
    const i = Math.floor((AF.pointer(e.target, e)[1] - 12) / 40); if (i >= 0 && i < gap.length) { gapSel = i; gapCv.redraw(); AF.set('gapInfo', '<br><b>' + gap[i][0] + ':</b> ' + gap[i][2]); }
  });
  AF.set('gapInfo', '<br><b>' + gap[0][0] + ':</b> ' + gap[0][2]);
});
