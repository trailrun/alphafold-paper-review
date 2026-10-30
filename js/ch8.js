/* Chapter 08 — results, interpretation, limitations */
AF.ready(() => {
  /* ---------- 8-2 trajectory concept ---------- */
  const rng = AF.rng(9);
  const easy = [], hard = [];
  let h = 18;
  for (let b = 0; b <= 192; b++) {
    easy.push(Math.min(93, 25 + 68 * (1 - Math.exp(-b / 6)) + (b > 48 ? 1.5 * (1 - Math.exp(-(b - 48) / 30)) : 0)) + (rng() - 0.5) * 0.8);
    const target = b < 40 ? 22 + b * 0.35 : b < 90 ? 36 + (b - 40) * 0.25 : b < 140 ? 50 + (b - 90) * 0.45 : 72 + (b - 140) * 0.25;
    h += (target - h) * 0.15 + (rng() - 0.5) * 5;
    if (b === 55 || b === 110) h -= 9;
    hard.push(Math.max(10, Math.min(88, h)));
  }
  let B = 60;
  const trCv = AF.canvas(document.getElementById('trCv'), 260, (ctx, w, hgt) => {
    const C = AF.colors(); const x0 = 56, y0 = 14, ww = w - 80, hh = hgt - 56;
    AF.axes(ctx, x0, y0, ww, hh, { nx: 4, ny: 4, xl: (t) => Math.round(t * 192), yl: (t) => (t * 100).toFixed(0), yt: '도메인 GDT (개념)', xt: 'Evoformer 블록 (48 × 4 재활용)' });
    const X = (b) => x0 + (b / 192) * ww, Y = (v) => y0 + hh * (1 - v / 100);
    for (let r = 1; r < 4; r++) { ctx.setLineDash([4, 4]); ctx.strokeStyle = C.faint; ctx.beginPath(); ctx.moveTo(X(r * 48), y0); ctx.lineTo(X(r * 48), y0 + hh); ctx.stroke(); ctx.setLineDash([]); }
    const line = (arr, col) => { ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.beginPath(); arr.slice(0, B + 1).forEach((v, b) => (b ? ctx.lineTo(X(b), Y(v)) : ctx.moveTo(X(b), Y(v)))); ctx.stroke(); ctx.globalAlpha = 0.18; ctx.beginPath(); arr.forEach((v, b) => (b ? ctx.lineTo(X(b), Y(v)) : ctx.moveTo(X(b), Y(v)))); ctx.stroke(); ctx.globalAlpha = 1; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(B), Y(arr[B]), 5, 0, 7); ctx.fill(); };
    line(easy, C.acc); line(hard, C.warn);
    ctx.font = `12px ${C.font}`; ctx.fillStyle = C.acc; ctx.fillText('쉬운 표적 (LmrP 유형)', x0 + 10, y0 + 14); ctx.fillStyle = C.warn; ctx.fillText('어려운 표적 (ORF8 유형)', x0 + 10, y0 + 32);
    AF.set('trPos', `${Math.min(4, Math.floor(B / 48) + 1)}회차 · ${B % 48 || (B ? 48 : 0)}/48`);
    AF.set('trE', easy[B].toFixed(0)); AF.set('trH', hard[B].toFixed(0));
  });
  const bEl = document.getElementById('trB');
  AF.range('trB', (v) => v, (v) => { B = v; trCv.redraw(); });
  let play = false; const pb = document.getElementById('trPlay');
  pb.onclick = () => { play = !play; if (play && B >= 192) B = 0; pb.textContent = play ? '⏸ 정지' : '▶ 재생'; };
  setInterval(() => { if (!play) return; B = Math.min(192, B + 1); bEl.value = B; bEl.dispatchEvent(new Event('input')); if (B >= 192) { play = false; pb.textContent = '▶ 재생'; } }, 40);

  /* ---------- 8-3 ablation explorer ---------- */
  const ABL = [
    ['With self-distillation training', '자기증류 추가', '기준 모델에 noisy student 자기증류(6장)를 더한 최종 설정. 기준선보다 위에 있는 유일한 변형입니다.', 'training'],
    ['Baseline', '기준 모델', '자기증류 없이 PDB만으로 학습한 전체 아키텍처. 다른 변형은 모두 이 모델(시드 3개 평균) 대비 차이로 보고됩니다.', 'evoformer'],
    ['No templates', '템플릿 없음', '구조 DB에서 찾은 상동 구조(템플릿) 입력을 제거. MSA만으로 예측합니다.', 'msa'],
    ['No auxiliary distogram head', '디스토그램 보조 손실 없음', '쌍 표현에서 거리 분포를 예측하는 보조 손실 제거(6.3절).', 'training'],
    ['No raw MSA (use MSA pairwise frequencies)', '원시 MSA 대신 쌍 빈도', '정렬된 서열 자체 대신, 고전적 방법처럼 열 간 쌍 빈도 통계만 입력(3.5절). 네트워크가 공진화 해석을 스스로 배울 여지가 줄어듭니다.', 'msa'],
    ['No IPA (use direct projection)', 'IPA 없음', 'Structure Module의 Invariant Point Attention을 단일 표현에서 좌표로 직접 투영하는 방식으로 대체(5.3절).', 'structure'],
    ['No auxiliary masked MSA head', '마스크 MSA(BERT) 손실 없음', 'BERT식 마스크 MSA 복원 목표 제거(6.4절).', 'training'],
    ['No recycling', '재활용 없음', '네트워크를 한 번만 실행(6.6절).', 'training'],
    ['No triangles, biasing or gating (use axial attention)', '삼각형·편향·게이트 없음', '쌍 표현의 삼각형 연산, 행 어텐션의 쌍 편향, 게이트를 모두 빼고 일반 축 어텐션만 사용(4장).', 'evoformer'],
    ['No end-to-end structure gradients (keep auxiliary heads)', '종단간 구조 기울기 없음', '구조 손실의 기울기가 몸통(Evoformer)까지 흐르지 않게 차단. 보조 헤드는 유지. “끝까지 좌표를 학습한다”는 설계의 가치를 시험합니다.', 'structure'],
    ['No IPA and no recycling', 'IPA와 재활용 모두 없음', '두 반복·기하 메커니즘을 동시에 제거.', 'structure']
  ];
  const abl = document.getElementById('abl');
  abl.innerHTML = ABL.map((a, i) => `<a class="card" href="#" data-i="${i}"><span class="n">${i < 2 ? 'REFERENCE' : 'ABLATION'}</span><b style="font-size:15px">${a[1]}</b><p style="font-size:12.5px;font-family:var(--mono)">${a[0]}</p></a>`).join('');
  abl.querySelectorAll('.card').forEach((c) => (c.onclick = (e) => {
    e.preventDefault(); abl.querySelectorAll('.card').forEach((x) => (x.style.borderColor = '')); c.style.borderColor = 'var(--accent)';
    const a = ABL[+c.dataset.i];
    AF.set('ablInfo', `<b>${a[1]}</b> — ${a[2]} <a href="${a[3]}.html">관련 장 →</a>`);
  }));

  /* ---------- 8-4 inference ---------- */
  const noEns = [[256, 0.6], [384, 1.1], [2500, 126]], ens = [[256, 4.8], [384, 9.2], [2500, 1080]];
  const interp = (pts, n) => {
    const L = pts.map(([x, y]) => [Math.log(x), Math.log(y)]), lx = Math.log(n);
    let k = lx < L[1][0] ? 0 : 1;
    const [a, b] = [L[k], L[k + 1]], s = (b[1] - a[1]) / (b[0] - a[0]);
    return Math.exp(a[1] + s * (lx - a[0]));
  };
  let N = 384;
  const fmtT = (m) => (m < 1 ? (m * 60).toFixed(0) + '초' : m < 120 ? m.toFixed(1) + '분' : (m / 60).toFixed(1) + '시간');
  const infCv = AF.canvas(document.getElementById('infCv'), 260, (ctx, w, h) => {
    const C = AF.colors(); const x0 = 64, y0 = 14, ww = w - 90, hh = h - 56;
    const lx0 = Math.log10(50), lx1 = Math.log10(3000), ly0 = Math.log10(0.05), ly1 = Math.log10(3000);
    const X = (n) => x0 + ((Math.log10(n) - lx0) / (lx1 - lx0)) * ww, Y = (m) => y0 + hh * (1 - (Math.log10(m) - ly0) / (ly1 - ly0));
    AF.axes(ctx, x0, y0, ww, hh, { nx: 0, ny: 0, xt: 'N_res (로그)', yt: '시간 (로그)' });
    ctx.font = `11px ${C.mono}`; ctx.fillStyle = C.dim;
    [100, 256, 384, 1000, 2500].forEach((n) => { ctx.textAlign = 'center'; ctx.fillText(n, X(n), y0 + hh + 15); ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(X(n), y0); ctx.lineTo(X(n), y0 + hh); ctx.stroke(); });
    [[0.1, '6초'], [1, '1분'], [60, '1시간'], [1440, '1일']].forEach(([m, l]) => { ctx.textAlign = 'right'; ctx.fillText(l, x0 - 6, Y(m) + 4); ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(x0, Y(m)); ctx.lineTo(x0 + ww, Y(m)); ctx.stroke(); });
    // memory limit
    ctx.fillStyle = C.bad; ctx.globalAlpha = 0.08; ctx.fillRect(X(1300), y0, x0 + ww - X(1300), hh); ctx.globalAlpha = 1;
    ctx.fillStyle = C.bad; ctx.font = `11px ${C.font}`; ctx.textAlign = 'left'; ctx.fillText('V100 16GB 초과', X(1300) + 6, y0 + hh - 22); ctx.fillText('(≈1,300 잔기+)', X(1300) + 6, y0 + hh - 8);
    const curve = (pts, col, lab) => {
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath();
      for (let n = 60; n <= 2800; n *= 1.05) { const m = interp(pts, n); n === 60 ? ctx.moveTo(X(n), Y(m)) : ctx.lineTo(X(n), Y(m)); }
      ctx.stroke(); ctx.setLineDash([]);
      pts.forEach(([n, m]) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(n), Y(m), 5, 0, 7); ctx.fill(); });
      ctx.fillStyle = col; ctx.font = `12px ${C.font}`; ctx.textAlign = 'right'; ctx.fillText(lab, X(700), Y(interp(pts, 700)) - 10); ctx.textAlign = 'left';
    };
    curve(ens, C.dim, 'CASP14 (앙상블)'); curve(noEns, C.acc, '앙상블 없음');
    ctx.strokeStyle = C.acc2; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(N), y0); ctx.lineTo(X(N), y0 + hh); ctx.stroke();
    const m = interp(noEns, N); ctx.fillStyle = C.acc2; ctx.beginPath(); ctx.arc(X(N), Y(m), 6, 0, 7); ctx.fill();
    const bytes = N * N * 128 * 4;
    AF.set('infPair', bytes > 1e9 ? (bytes / 1e9).toFixed(2) + '<small>GB</small>' : (bytes / 1e6).toFixed(0) + '<small>MB</small>');
    const ops = N ** 3 * 128, e = Math.floor(Math.log10(ops));
    AF.set('infTri', (ops / 10 ** e).toFixed(1) + '×10<sup>' + e + '</sup>');
    AF.set('infT', '≈ ' + fmtT(m));
    AF.set('infFit', N <= 1300 ? '<span style="color:var(--ok)">가능</span>' : '<span style="color:var(--bad)">메모리 초과</span>');
  });
  AF.range('infN', (v) => v.toLocaleString(), (v) => { N = v; infCv.redraw(); });
});
