/* Chapter 09 — impact, timeline, review */
AF.ready(() => {
  /* ---------- timeline ---------- */
  const TL = [
    ['1972', 'com', '안핀센 노벨 화학상', '“단백질의 고유 구조는 아미노산 서열이 결정한다” — 구조 예측이 원리적으로 가능하다는 근거(1장).'],
    ['1994', 'com', 'CASP1 시작', '2년마다 열리는 블라인드 구조 예측 평가의 시작(2장).'],
    ['2018. 12', 'af', 'CASP13 · AlphaFold(1세대)', '잔기 간 거리 분포(디스토그램)를 CNN으로 예측하고 경사하강으로 구조를 조립. 1위였지만 원자 수준 정확도와는 거리가 있었다.'],
    ['2020. 11', 'af', 'CASP14 · “AlphaFold2”', '완전히 새로 설계한 종단간 모델로 백본 r.m.s.d.95 중앙값 0.96 Å. CASP 주최 측은 구조 예측 문제가 사실상 해결되었다고 평가했다.', true],
    ['2021. 7. 15', 'af', 'Nature 논문 + 오픈소스 코드', '이 리뷰의 대상 논문 공개, 추론 코드와 학습된 가중치 공개. 같은 시기 Baker 연구실의 RoseTTAFold도 Science에 발표.', true],
    ['2021. 7. 22', 'af', 'AlphaFold DB 출시', '인간 프로테옴 전체를 포함해 35만 개 이상의 예측 구조 공개(동반 논문: Tunyasuvunakool et al.).'],
    ['2021. 10', 'af', 'AlphaFold-Multimer', '다중 사슬 복합체 예측으로 확장(프리프린트).'],
    ['2022. 5', 'com', 'ColabFold', 'MMseqs2 기반 빠른 MSA 생성 + 무료 Colab 실행으로 누구나 AF2를 사용(Nature Methods).'],
    ['2022. 7', 'af', 'AlphaFold DB 2억 개 돌파', '알려진 거의 모든 단백질 서열(UniProt)의 예측 구조 공개.', true],
    ['2022. 11', 'com', 'ESMFold · ESM Atlas', '단백질 언어 모델 기반, MSA 없이 빠르게 예측. 메타게놈 단백질 6억 개 이상의 구조 공개.'],
    ['2023. 9', 'com', '래스커 기초의학연구상', 'Hassabis와 Jumper 수상.'],
    ['2024. 5', 'af', 'AlphaFold 3', '단백질·핵산·리간드·이온 복합체를 확산 모델로 예측(Abramson et al., Nature).'],
    ['2024. 10. 9', 'com', '노벨 화학상', 'Baker(계산적 단백질 설계) ½, Hassabis·Jumper(단백질 구조 예측) ½.', true]
  ];
  const tl = document.getElementById('tl');
  const renderTL = (f) => {
    tl.innerHTML = TL.filter((t) => f === 'all' || t[1] === f).map((t) => `<div class="tl-item${t[4] ? ' hl' : ''}"><span class="y">${t[0]}</span> · <b>${t[2]}</b><div class="d">${t[3]}</div></div>`).join('');
    tl.querySelectorAll('.tl-item').forEach((el) => (el.onclick = () => el.classList.toggle('open')));
  };
  AF.seg('tlF', renderTL);
  renderTL('all');

  /* ---------- review radar ---------- */
  const CRIT = [['독창성', 10], ['실험 엄밀성', 9], ['영향력', 10], ['재현성', 7], ['명료성', 7], ['일반화', 8]];
  let mine = CRIT.map((c) => c[1]);
  const ctrls = document.getElementById('rvCtrls');
  ctrls.innerHTML = CRIT.map((c, i) => `<label class="ctrl"><span>${c[0]} <output></output></span><input type="range" id="rv${i}" min="0" max="10" value="${c[1]}"></label>`).join('');
  const rvCv = AF.canvas(document.getElementById('rvCv'), 340, (ctx, w, h) => {
    const C = AF.colors(); const n = CRIT.length, cx = w / 2, cy = h / 2 + 6, R = Math.min(w, h) / 2 - 50;
    const pt = (k, v) => [cx + R * (v / 10) * Math.sin((k / n) * 2 * Math.PI), cy - R * (v / 10) * Math.cos((k / n) * 2 * Math.PI)];
    for (let r = 2; r <= 10; r += 2) { ctx.strokeStyle = C.grid; ctx.beginPath(); for (let k = 0; k <= n; k++) { const p = pt(k % n, r); k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.stroke(); }
    CRIT.forEach((c, k) => { const p = pt(k, 10), q = pt(k, 11.6); ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p[0], p[1]); ctx.stroke(); ctx.fillStyle = C.text; ctx.font = `13px ${C.font}`; ctx.textAlign = 'center'; ctx.fillText(c[0], q[0], q[1] + 4); });
    const poly = (vals, col, fill) => { ctx.beginPath(); vals.forEach((v, k) => { const p = pt(k, v); k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.closePath(); ctx.fillStyle = col; ctx.globalAlpha = fill; ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke(); };
    poly(CRIT.map((c) => c[1]), C.acc, 0.15); poly(mine, C.acc2, 0.15);
    ctx.font = `12px ${C.font}`; ctx.textAlign = 'left'; ctx.fillStyle = C.acc; ctx.fillText('■ 리뷰어', 12, 18); ctx.fillStyle = C.acc2; ctx.fillText('■ 당신', 12, 36);
    AF.set('rvA', (CRIT.reduce((s, c) => s + c[1], 0) / n).toFixed(1));
    AF.set('rvB', (mine.reduce((s, v) => s + v, 0) / n).toFixed(1));
  });
  CRIT.forEach((_, i) => AF.range('rv' + i, (v) => v, (v) => { mine[i] = v; rvCv.redraw(); }));
  document.getElementById('rvReset').onclick = () => CRIT.forEach((c, i) => { const r = document.getElementById('rv' + i); r.value = c[1]; r.dispatchEvent(new Event('input')); });
});
