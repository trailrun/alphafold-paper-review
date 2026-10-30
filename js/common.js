/* FoldBook common runtime: shell, quiz, controls, canvas + 3D helpers, geometry */
(function () {
  'use strict';
  const AF = (window.AF = window.AF || {});

  AF.chapters = [
    ['problem', '단백질 접힘 문제', '서열이 구조를 결정한다'],
    ['casp', 'CASP와 정확도 지표', 'RMSD·GDT·lDDT·TM-score'],
    ['msa', 'MSA와 공진화', '진화가 남긴 접촉 신호'],
    ['evoformer', 'Evoformer', 'MSA ↔ 쌍 표현과 삼각형 연산'],
    ['structure', 'Structure Module', '잔기 기체와 IPA'],
    ['training', '손실 함수와 학습', 'FAPE·BERT·자기증류'],
    ['confidence', '신뢰도: pLDDT·PAE', '모델이 스스로 매기는 점수'],
    ['results', '결과·해석·한계', '절제 실험과 MSA 깊이'],
    ['impact', '노벨상과 그 이후', '타임라인과 리뷰 총평']
  ];

  const inChapter = /\/chapters\//.test(location.pathname);
  const root = inChapter ? '../' : './';
  const slug = (location.pathname.split('/').pop() || '').replace('.html', '');

  /* ---------------- theme ---------------- */
  function getStored(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function setStored(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  const savedTheme = getStored('fb-theme');
  if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
  AF.isDark = () => {
    const t = document.documentElement.getAttribute('data-theme');
    if (t) return t === 'dark';
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
  };
  const themeListeners = [];
  AF.onTheme = (fn) => themeListeners.push(fn);
  function fireTheme() { themeListeners.forEach((f) => f()); }
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', fireTheme);

  AF.css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  /* ---------------- shell ---------------- */
  const LOGO = `<svg class="mark" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="lg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#0053d6"/><stop offset=".55" stop-color="#65cbf3"/><stop offset="1" stop-color="#ffdb13"/></linearGradient></defs><rect width="32" height="32" rx="8" fill="url(#lg)"/><path d="M6 22c3-9 6 4 9-5s6 6 11-4" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg>`;

  function buildShell() {
    const top = document.createElement('header');
    top.className = 'sb-topbar';
    top.innerHTML = `
      <button class="sb-btn icon" id="sb-menu" aria-label="챕터 목록">☰</button>
      <a class="sb-logo" href="${root}index.html">${LOGO}<span>FoldBook</span><small>AlphaFold2 논문 리뷰</small></a>
      <div class="spacer"></div>
      <a class="sb-btn" href="https://doi.org/10.1038/s41586-021-03819-2" target="_blank" rel="noopener">📄<span class="lbl">원문</span></a>
      <button class="sb-btn icon" id="sb-theme" aria-label="테마 전환">◐</button>
      <div class="sb-progress" id="sb-progress"></div>`;
    document.body.prepend(top);

    const drawer = document.createElement('nav');
    drawer.className = 'sb-drawer';
    drawer.innerHTML = `<h4>Chapters</h4><ul class="sb-chlist">
      <li><a href="${root}index.html" class="${slug === 'index' || slug === '' ? 'active' : ''}"><span class="num">00</span>홈 · 전체 지도</a></li>
      ${AF.chapters.map((c, i) => `<li><a href="${root}chapters/${c[0]}.html" class="${c[0] === slug ? 'active' : ''}"><span class="num">${String(i + 1).padStart(2, '0')}</span>${c[1]}</a></li>`).join('')}
      </ul>`;
    const bd = document.createElement('div');
    bd.className = 'sb-drawer-backdrop';
    document.body.append(drawer, bd);
    document.getElementById('sb-menu').onclick = () => document.body.classList.add('drawer-open');
    bd.onclick = () => document.body.classList.remove('drawer-open');
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.body.classList.remove('drawer-open'); });

    document.getElementById('sb-theme').onclick = () => {
      const next = AF.isDark() ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      setStored('fb-theme', next);
      fireTheme();
    };

    const prog = document.getElementById('sb-progress');
    const onScroll = () => {
      const h = document.documentElement;
      const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
      prog.style.width = (p * 100).toFixed(1) + '%';
    };
    addEventListener('scroll', onScroll, { passive: true });

    const main = document.querySelector('main.chapter');
    if (main) {
      // layout + TOC
      const layout = document.createElement('div');
      layout.className = 'sb-layout';
      main.parentNode.insertBefore(layout, main);
      layout.appendChild(main);
      const toc = document.createElement('aside');
      toc.className = 'sb-toc';
      const hs = [...main.querySelectorAll('section > h2')];
      hs.forEach((h, i) => { if (!h.id) h.id = 's' + (i + 1); });
      toc.innerHTML = '<h4>ON THIS PAGE</h4>' + hs.map((h) => `<a href="#${h.id}">${h.textContent}</a>`).join('');
      layout.appendChild(toc);
      const links = [...toc.querySelectorAll('a')];
      const io = new IntersectionObserver((ents) => {
        ents.forEach((en) => {
          if (en.isIntersecting) {
            links.forEach((l) => l.classList.toggle('active', l.getAttribute('href') === '#' + en.target.id));
          }
        });
      }, { rootMargin: '-20% 0px -70% 0px' });
      hs.forEach((h) => io.observe(h));

      // pager
      const idx = AF.chapters.findIndex((c) => c[0] === slug);
      const pager = document.createElement('nav');
      pager.className = 'sb-pager';
      const prev = idx > 0 ? AF.chapters[idx - 1] : null;
      const next = idx < AF.chapters.length - 1 ? AF.chapters[idx + 1] : null;
      pager.innerHTML =
        (prev ? `<a class="prev" href="${prev[0]}.html"><small>← 이전 · ${String(idx).padStart(2, '0')}</small>${prev[1]}</a>` : `<a class="prev" href="../index.html"><small>← 홈</small>전체 지도</a>`) +
        (next ? `<a class="next" href="${next[0]}.html"><small>다음 · ${String(idx + 2).padStart(2, '0')} →</small>${next[1]}</a>` : `<a class="next" href="../index.html"><small>처음으로 →</small>홈</a>`);
      layout.after(pager);
    }
    const foot = document.createElement('footer');
    foot.className = 'sb-footer';
    foot.innerHTML = `리뷰 대상: Jumper, J. et al. <i>Highly accurate protein structure prediction with AlphaFold.</i> Nature 596, 583–589 (2021) · CC BY 4.0<br>
      단백질 구조 데이터: AlphaFold Protein Structure Database (CC BY 4.0) · 디자인 시스템: SensorBook(MIT) 참고<br>
      시뮬레이터는 개념 이해를 위한 단순화 모델이며, 실제 AlphaFold 출력이 아닌 경우 각 카드에 명시했습니다.`;
    document.body.append(foot);
  }

  /* ---------------- controls ---------------- */
  AF.fill = (r) => {
    const p = ((r.value - r.min) / (r.max - r.min)) * 100;
    r.style.setProperty('--fill', p + '%');
  };
  // bind range: returns getter; fmt for output
  AF.range = (id, fmt, onInput) => {
    const r = document.getElementById(id);
    const out = r.closest('.ctrl') && r.closest('.ctrl').querySelector('output');
    const upd = () => {
      AF.fill(r);
      if (out) out.textContent = fmt ? fmt(+r.value) : r.value;
      if (onInput) onInput(+r.value);
    };
    r.addEventListener('input', upd);
    upd();
    return () => +r.value;
  };
  AF.seg = (id, onChange) => {
    const s = document.getElementById(id);
    const btns = [...s.querySelectorAll('button')];
    let val = (btns.find((b) => b.classList.contains('on')) || btns[0]).dataset.v;
    btns.forEach((b) => (b.onclick = () => {
      btns.forEach((x) => x.classList.toggle('on', x === b));
      val = b.dataset.v;
      onChange && onChange(val);
    }));
    return () => val;
  };
  AF.set = (id, v) => { const e = document.getElementById(id); if (e) e.innerHTML = v; };

  function initQuiz() {
    document.querySelectorAll('.quiz-q').forEach((q) => {
      const ans = +q.dataset.answer;
      const opts = [...q.querySelectorAll('button.opt')];
      opts.forEach((b, i) => (b.onclick = () => {
        opts.forEach((o, j) => { o.disabled = true; if (j === ans) o.classList.add('right'); });
        if (i !== ans) b.classList.add('wrong');
        q.classList.add('done');
      }));
    });
  }

  /* ---------------- canvas ---------------- */
  // AF.canvas(el, height, draw) -> {ctx, w, h, redraw}
  AF.canvas = (cv, height, draw) => {
    const st = { cv, ctx: cv.getContext('2d'), w: 0, h: height, draw };
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = cv.parentElement.clientWidth || 600;
      const h = typeof height === 'function' ? height(w) : height;
      st.w = w; st.h = h;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      cv.style.height = h + 'px';
      st.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      st.redraw();
    };
    st.redraw = () => { st.ctx.clearRect(0, 0, st.w, st.h); st.draw && st.draw(st.ctx, st.w, st.h); };
    new ResizeObserver(resize).observe(cv.parentElement);
    AF.onTheme(() => st.redraw());
    resize();
    return st;
  };
  AF.pointer = (cv, e) => {
    const r = cv.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return [t.clientX - r.left, t.clientY - r.top];
  };
  AF.colors = () => ({
    text: AF.css('--text'), dim: AF.css('--text-dim'), faint: AF.css('--text-faint'),
    acc: AF.css('--accent'), acc2: AF.css('--accent-2'), ok: AF.css('--ok'), warn: AF.css('--warn'), bad: AF.css('--bad'),
    grid: AF.css('--grid'), axis: AF.css('--axis'), bg: AF.css('--canvas-bg'), surf: AF.css('--surface'), border: AF.css('--border'),
    font: AF.css('--font'), mono: AF.css('--mono')
  });
  AF.plddtColor = (v) => (v > 90 ? '#0053d6' : v > 70 ? '#65cbf3' : v > 50 ? '#ffdb13' : '#ff7d45');
  // perceptual-ish sequential map (0..1) – blue->green->yellow
  AF.seqColor = (t) => {
    t = Math.max(0, Math.min(1, t));
    const stops = [[13, 8, 135], [84, 2, 163], [139, 10, 165], [185, 50, 137], [219, 92, 104], [244, 136, 73], [254, 188, 43], [240, 249, 33]];
    const x = t * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(x)), f = x - i;
    const c = stops[i].map((v, k) => Math.round(v + (stops[i + 1][k] - v) * f));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  };
  // PAE-style map: low error = dark green, high = white/light
  AF.paeColor = (e, max = 31) => {
    const t = Math.max(0, Math.min(1, e / max));
    const a = [0, 83, 40], b = [245, 248, 245];
    const c = a.map((v, k) => Math.round(v + (b[k] - v) * Math.pow(t, 0.8)));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  };
  AF.axes = (ctx, x0, y0, w, h, opt = {}) => {
    const C = AF.colors();
    ctx.save();
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    const nx = opt.nx || 5, ny = opt.ny || 4;
    for (let i = 0; i <= ny; i++) { const y = y0 + h - (h * i) / ny; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w, y); ctx.stroke(); }
    ctx.strokeStyle = C.axis;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y0 + h); ctx.lineTo(x0 + w, y0 + h); ctx.stroke();
    ctx.fillStyle = C.dim; ctx.font = `11px ${C.mono}`;
    if (opt.yl) { ctx.textAlign = 'right'; for (let i = 0; i <= ny; i++) ctx.fillText(opt.yl(i / ny), x0 - 6, y0 + h - (h * i) / ny + 4); }
    if (opt.xl) { ctx.textAlign = 'center'; for (let i = 0; i <= nx; i++) ctx.fillText(opt.xl(i / nx), x0 + (w * i) / nx, y0 + h + 15); }
    ctx.font = `12px ${C.font}`;
    if (opt.xt) { ctx.textAlign = 'center'; ctx.fillText(opt.xt, x0 + w / 2, y0 + h + 32); }
    if (opt.yt) { ctx.save(); ctx.translate(x0 - 40, y0 + h / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillText(opt.yt, 0, 0); ctx.restore(); }
    ctx.restore();
  };

  /* ---------------- vector / geometry ---------------- */
  const V = (AF.V = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    norm: (a) => Math.hypot(a[0], a[1], a[2]),
    unit: (a) => { const n = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / n, a[1] / n, a[2] / n]; },
    dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
    mv: (M, v) => [M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2], M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2], M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2]],
    mtv: (M, v) => [M[0][0] * v[0] + M[1][0] * v[1] + M[2][0] * v[2], M[0][1] * v[0] + M[1][1] * v[1] + M[2][1] * v[2], M[0][2] * v[0] + M[1][2] * v[1] + M[2][2] * v[2]],
    mm: (A, B) => A.map((r) => [0, 1, 2].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j])),
    rotX: (t) => [[1, 0, 0], [0, Math.cos(t), -Math.sin(t)], [0, Math.sin(t), Math.cos(t)]],
    rotY: (t) => [[Math.cos(t), 0, Math.sin(t)], [0, 1, 0], [-Math.sin(t), 0, Math.cos(t)]],
    rotZ: (t) => [[Math.cos(t), -Math.sin(t), 0], [Math.sin(t), Math.cos(t), 0], [0, 0, 1]],
    centroid: (P) => { const c = [0, 0, 0]; P.forEach((p) => { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; }); return c.map((x) => x / P.length); }
  });
  AF.gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  AF.rng = (seed) => { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e9) / 1e9; }; };

  // Jacobi eigen-decomposition for symmetric matrices
  function jacobi(A) {
    const n = A.length; const a = A.map((r) => r.slice()); const v = a.map((_, i) => a.map((_, j) => (i === j ? 1 : 0)));
    for (let sweep = 0; sweep < 60; sweep++) {
      let off = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += a[i][j] * a[i][j];
      if (off < 1e-14) break;
      for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
        if (Math.abs(a[p][q]) < 1e-14) continue;
        const th = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1));
        const c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (let k = 0; k < n; k++) { const akp = a[k][p], akq = a[k][q]; a[k][p] = c * akp - s * akq; a[k][q] = s * akp + c * akq; }
        for (let k = 0; k < n; k++) { const apk = a[p][k], aqk = a[q][k]; a[p][k] = c * apk - s * aqk; a[q][k] = s * apk + c * aqk; }
        for (let k = 0; k < n; k++) { const vkp = v[k][p], vkq = v[k][q]; v[k][p] = c * vkp - s * vkq; v[k][q] = s * vkp + c * vkq; }
      }
    }
    return { values: a.map((r, i) => r[i]), vectors: v };
  }
  AF.jacobi = jacobi;
  // Optimal rotation (Horn quaternion) that maps P onto Q (both centred). returns R (3x3)
  AF.kabsch = (P, Q, w) => {
    let S = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    P.forEach((p, k) => { const wk = w ? w[k] : 1; if (!wk) return; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) S[i][j] += wk * p[i] * Q[k][j]; });
    const [[xx, xy, xz], [yx, yy, yz], [zx, zy, zz]] = S;
    const N = [
      [xx + yy + zz, yz - zy, zx - xz, xy - yx],
      [yz - zy, xx - yy - zz, xy + yx, zx + xz],
      [zx - xz, xy + yx, -xx + yy - zz, yz + zy],
      [xy - yx, zx + xz, yz + zy, -xx - yy + zz]
    ];
    const { values, vectors } = jacobi(N);
    let bi = 0; values.forEach((v, i) => { if (v > values[bi]) bi = i; });
    const [q0, q1, q2, q3] = vectors.map((r) => r[bi]);
    return [
      [q0 * q0 + q1 * q1 - q2 * q2 - q3 * q3, 2 * (q1 * q2 - q0 * q3), 2 * (q1 * q3 + q0 * q2)],
      [2 * (q1 * q2 + q0 * q3), q0 * q0 - q1 * q1 + q2 * q2 - q3 * q3, 2 * (q2 * q3 - q0 * q1)],
      [2 * (q1 * q3 - q0 * q2), 2 * (q2 * q3 + q0 * q1), q0 * q0 - q1 * q1 - q2 * q2 + q3 * q3]
    ];
  };
  // superpose pred onto true using subset weights; returns aligned pred
  AF.superpose = (pred, tru, w) => {
    const sel = (A) => A.filter((_, i) => !w || w[i]);
    const cp = V.centroid(sel(pred)), ct = V.centroid(sel(tru));
    const P = pred.map((p) => V.sub(p, cp)), Q = tru.map((q) => V.sub(q, ct));
    const R = AF.kabsch(P, Q, w);
    return P.map((p) => V.add(V.mv(R, p), ct));
  };
  AF.rmsd = (A, B, w) => { let s = 0, n = 0; A.forEach((a, i) => { if (w && !w[i]) return; const d = V.dist(a, B[i]); s += d * d; n++; }); return Math.sqrt(s / Math.max(1, n)); };
  AF.rmsd95 = (pred, tru) => {
    let w = pred.map(() => 1), al = pred;
    for (let it = 0; it < 5; it++) {
      al = AF.superpose(pred, tru, w);
      const d = al.map((a, i) => [V.dist(a, tru[i]), i]).sort((x, y) => x[0] - y[0]);
      w = pred.map(() => 0); d.slice(0, Math.ceil(0.95 * d.length)).forEach(([, i]) => (w[i] = 1));
    }
    al = AF.superpose(pred, tru, w);
    return { rmsd: AF.rmsd(al, tru, w), aligned: al, w };
  };
  // approximate GDT_TS (iterative superposition per cutoff on seeds)
  AF.gdt = (pred, tru) => {
    const cut = [1, 2, 4, 8]; const n = pred.length; let tot = 0;
    cut.forEach((c) => {
      let best = 0;
      const seeds = [];
      for (let s = 0; s < n; s += Math.max(1, Math.floor(n / 12))) seeds.push(s);
      seeds.push(-1);
      seeds.forEach((s) => {
        let w = s < 0 ? pred.map(() => 1) : pred.map((_, i) => (Math.abs(i - s) < 6 ? 1 : 0));
        for (let it = 0; it < 6; it++) {
          if (w.reduce((a, b) => a + b, 0) < 3) break;
          const al = AF.superpose(pred, tru, w);
          const nw = al.map((a, i) => (V.dist(a, tru[i]) < c ? 1 : 0));
          const cnt = nw.reduce((a, b) => a + b, 0);
          if (cnt > best) best = cnt;
          if (cnt < 3) break;
          w = nw;
        }
      });
      tot += best / n;
    });
    return (100 * tot) / 4;
  };
  AF.lddt = (pred, tru, R0 = 15) => {
    const n = pred.length; let per = [];
    for (let i = 0; i < n; i++) {
      let s = 0, c = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const dt = V.dist(tru[i], tru[j]); if (dt > R0) continue;
        const dd = Math.abs(V.dist(pred[i], pred[j]) - dt);
        s += (dd < 0.5) + (dd < 1) + (dd < 2) + (dd < 4); c += 4;
      }
      per.push(c ? s / c : 1);
    }
    return { score: (100 * per.reduce((a, b) => a + b, 0)) / n, per };
  };
  AF.tmscore = (pred, tru) => {
    const L = pred.length; const d0 = Math.max(0.5, 1.24 * Math.cbrt(Math.max(L, 19) - 15) - 1.8);
    let best = 0; let w = pred.map(() => 1);
    for (let it = 0; it < 8; it++) {
      const al = AF.superpose(pred, tru, w);
      const ds = al.map((a, i) => V.dist(a, tru[i]));
      const s = ds.reduce((acc, d) => acc + 1 / (1 + (d / d0) ** 2), 0) / L;
      if (s > best) best = s;
      w = ds.map((d) => (d < Math.max(4, d0 * 1.5) ? 1 : 0));
      if (w.reduce((a, b) => a + b, 0) < 4) break;
    }
    return best;
  };
  // residue frame from three points (Gram–Schmidt, AF2 Alg.21 style)
  AF.frame = (x1, x2, x3) => {
    const v1 = V.sub(x3, x2), v2 = V.sub(x1, x2);
    const e1 = V.unit(v1);
    const u2 = V.sub(v2, V.mul(e1, V.dot(e1, v2)));
    const e2 = V.unit(u2);
    const e3 = V.cross(e1, e2);
    return { R: [[e1[0], e2[0], e3[0]], [e1[1], e2[1], e3[1]], [e1[2], e2[2], e3[2]]], t: x2 };
  };
  AF.toLocal = (F, x) => V.mtv(F.R, V.sub(x, F.t));

  /* ---------------- tiny 3D viewer for Cα traces ---------------- */
  // AF.view3d(canvas, {height, getModel: () => ({points, color(i), radius, bonds:true, extra(ctx, project)}) })
  AF.view3d = (cv, opt) => {
    const st = { rot: V.mm(V.rotX(-0.35), V.rotY(0.6)), zoom: 1, auto: opt.auto || 0, scale: opt.scale || null };
    let drag = null;
    const project = (p, w, h, c, s) => {
      const q = V.mv(st.rot, V.sub(p, c));
      const f = 1 / (1 + q[2] / 220);
      return [w / 2 + q[0] * s * f, h / 2 - q[1] * s * f, q[2], f];
    };
    const draw = (ctx, w, h) => {
      const M = opt.getModel(); if (!M || !M.points.length) return;
      const C = AF.colors();
      const c = M.center || V.centroid(M.points);
      let R = st.scale || M.extent || 0; if (!R) M.points.forEach((p) => { R = Math.max(R, V.dist(p, c)); });
      const s = (Math.min(w, h) / 2 / (R + 2)) * 0.95 * st.zoom;
      const P = M.points.map((p) => project(p, w, h, c, s));
      st.project = (p) => project(p, w, h, c, s);
      const segs = [];
      if (M.bonds !== false) for (let i = 0; i < P.length - 1; i++) {
        if (M.breakAt && M.breakAt(i)) continue;
        segs.push({ z: (P[i][2] + P[i + 1][2]) / 2, i, j: i + 1 });
      }
      segs.sort((a, b) => b.z - a.z);
      ctx.lineCap = 'round';
      const lw = M.lineWidth || Math.max(2, Math.min(7, s * 1.3));
      segs.forEach((sg) => {
        const a = P[sg.i], b = P[sg.j];
        const shade = Math.max(0.35, Math.min(1, 0.75 - sg.z / (R * 2.2)));
        ctx.globalAlpha = shade;
        const col = M.segColor ? M.segColor(sg.i, sg.j) : M.color(sg.i);
        ctx.strokeStyle = col;
        ctx.lineWidth = lw * (a[3] + b[3]) / 2;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      });
      ctx.globalAlpha = 1;
      if (M.dots) {
        const order = P.map((p, i) => i).sort((a, b) => P[b][2] - P[a][2]);
        order.forEach((i) => {
          const p = P[i]; const r = (M.dotR ? M.dotR(i) : lw * 0.6) * p[3];
          ctx.fillStyle = M.color(i); ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 7); ctx.fill();
        });
      }
      if (M.extra) M.extra(ctx, st.project, C, s);
    };
    const canvas = AF.canvas(cv, opt.height || 380, draw);
    const down = (e) => { drag = AF.pointer(cv, e); st.auto = 0; };
    const move = (e) => {
      if (!drag) return; const p = AF.pointer(cv, e);
      const dx = p[0] - drag[0], dy = p[1] - drag[1]; drag = p;
      st.rot = V.mm(V.mm(V.rotX(dy * 0.01), V.rotY(dx * 0.01)), st.rot);
      canvas.redraw(); e.preventDefault();
    };
    cv.addEventListener('mousedown', down); cv.addEventListener('touchstart', down, { passive: true });
    addEventListener('mousemove', move); cv.addEventListener('touchmove', move, { passive: false });
    addEventListener('mouseup', () => (drag = null)); addEventListener('touchend', () => (drag = null));
    cv.addEventListener('wheel', (e) => { st.zoom = Math.max(0.4, Math.min(4, st.zoom * (e.deltaY < 0 ? 1.1 : 0.9))); canvas.redraw(); e.preventDefault(); }, { passive: false });
    let visible = true;
    new IntersectionObserver((en) => (visible = en[0].isIntersecting)).observe(cv);
    const loop = () => { if (st.auto && visible && !drag) { st.rot = V.mm(V.rotY(st.auto), st.rot); canvas.redraw(); } requestAnimationFrame(loop); };
    loop();
    st.redraw = canvas.redraw; st.canvas = canvas;
    return st;
  };

  /* NeRF: place atom D given A,B,C, bond length, angle, torsion (radians) */
  AF.nerf = (A, B, C, len, ang, tor) => {
    const bc = V.unit(V.sub(C, B));
    const n = V.unit(V.cross(V.sub(B, A), bc));
    const m = V.cross(n, bc);
    const d2 = [-len * Math.cos(ang), len * Math.sin(ang) * Math.cos(tor), len * Math.sin(ang) * Math.sin(tor)];
    return V.add(C, [bc[0] * d2[0] + m[0] * d2[1] + n[0] * d2[2], bc[1] * d2[0] + m[1] * d2[1] + n[1] * d2[2], bc[2] * d2[0] + m[2] * d2[1] + n[2] * d2[2]]);
  };
  // build backbone N,CA,C list from phi/psi arrays (degrees); omega=180
  AF.buildBackbone = (phis, psis, omega = 180) => {
    const rad = Math.PI / 180;
    const atoms = [[0, 0, 0], [1.458, 0, 0], [1.458 + 1.525 * Math.cos(Math.PI - 111 * rad), 1.525 * Math.sin(Math.PI - 111 * rad), 0]];
    const n = phis.length;
    for (let i = 1; i < n; i++) {
      const L = atoms.length;
      const Nn = AF.nerf(atoms[L - 3], atoms[L - 2], atoms[L - 1], 1.329, 116.2 * rad, psis[i - 1] * rad);
      atoms.push(Nn);
      const CA = AF.nerf(atoms[L - 2], atoms[L - 1], Nn, 1.458, 121.7 * rad, omega * rad);
      atoms.push(CA);
      const Cc = AF.nerf(atoms[L - 1], Nn, CA, 1.525, 111.2 * rad, phis[i] * rad);
      atoms.push(Cc);
    }
    return atoms; // N,CA,C repeating
  };

  AF.ready = (fn) => (document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn));
  AF.ready(() => {
    buildShell();
    initQuiz();
    if (window.renderMathInElement) {
      renderMathInElement(document.body, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '\\(', right: '\\)', display: false }], throwOnError: false });
    }
  });
})();
