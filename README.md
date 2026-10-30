# FoldBook · AlphaFold2 논문 리뷰

2024년 노벨 화학상의 근거가 된 논문 **Jumper et al., “Highly accurate protein structure prediction with AlphaFold”, Nature 596, 583–589 (2021)** 을 9개 장과 30여 개의 인터랙티브 시뮬레이터로 해설하는 한국어 논문 리뷰 사이트입니다.

| 장 | 주제 | 주요 시뮬레이터 |
|---|---|---|
| 01 | 단백질 접힘 문제 | 레빈탈 계산기 · φ/ψ 백본 빌더 · HP 격자 몬테카를로 |
| 02 | CASP와 정확도 지표 | RMSD/GDT/lDDT/TM 지표 실험실 (실제 구조) |
| 03 | MSA와 공진화 | Potts 모델 공진화 → 접촉 예측, MSA 깊이 스윕 |
| 04 | Evoformer | 축 어텐션 · 외적 평균 · 삼각형 업데이트 · 삼각 부등식 |
| 05 | Structure Module | 그람–슈미트 프레임 · IPA 불변성 · 잔기 기체 |
| 06 | 손실과 학습 | FAPE vs RMSD 거울상 실험 · 디스토그램 · BERT 게임 |
| 07 | pLDDT · PAE | 3Dmol 뷰어 + 실제 PAE · lDDT 계산기 · 보정 곡선 |
| 08 | 결과·한계 | 블록 궤적 · 절제 실험 · 추론 비용 계산기 |
| 09 | 노벨상과 이후 | 타임라인 · 리뷰 총평 · 평가 레이더 |

순수 HTML/CSS/JS(빌드 불필요). 외부 라이브러리: KaTeX, 3Dmol.js(CDN).

## 로컬 실행
```
python -m http.server 8000
```
브라우저에서 http://localhost:8000 을 엽니다(3D 뷰어가 PDB 파일을 fetch하므로 file:// 대신 서버로 여세요).

## 출처 및 라이선스
- 논문: CC BY 4.0 · 단백질 데이터: AlphaFold Protein Structure Database (CC BY 4.0)
- 디자인 시스템: [SensorBook](https://semi.euiyun.com/sensor/) (MIT) 참고
- 시뮬레이터는 개념 이해용 단순화 모델이며, 실제 AlphaFold 출력이 아닌 경우 각 카드에 명시했습니다.
