# 연구 결과 중심 웹 개편 인수인계

## 상태

2026-10-26 **로컬 구현·검증 완료**. GitHub Pages와 원격 저장소에는 이번 개편을 배포하지 않았다. 기존 공개 주소는 이전 버전일 수 있다.

## 복구 가능한 원본

개편 전 웹 프로젝트의 소스, 웹 데이터, 문서, 기존 `dist/`와 스크린샷을 `archives/20261026_before_findings_redesign.zip`에 저장했다. `node_modules`와 `.git`은 제외했다. SHA-256: `3e4fbcbffd7b310325431602ac406761742275774879f505ead29680151b1da0`.

복구가 필요하면 별도 폴더에 ZIP을 풀고 `npm ci`를 실행한다. 현재 폴더를 덮어쓰지 않아도 이전 화면을 실행할 수 있다.

## 수정 파일

- `src/App.tsx`: 결과 중심 섹션, 기간 선택 시각화, 대표 그래프, 종합 근거표, 상세 탐색 탭
- 같은 파일의 기존 SBR 주석에서 3대 산업군의 분류 설명을 감사 보고서 기준으로 정정(그래프 수치 변경 없음)
- `src/style.css`: 새 화면과 모바일 레이아웃
- `scripts/browser_smoke.mjs`: 개편 화면 및 기존 인터랙션 브라우저 검사
- `scripts/verify_story_metrics.py`: 새 대표 수치와 감사 원표 재대조
- `README.md`, `TEST_REPORT.md`, `REDESIGN_REVIEW.md`, 본 문서: 설계·검증·실행 안내

Raw/Clean/SQLite, 기존 연구 결과와 웹 JSON은 수정하지 않았다. 기존 시각화의 원본은 ZIP에도 있으며 현재 상세 탐색 화면에서 동작한다.

## 검증

- `npm run build`: TypeScript 및 Vite 프로덕션 빌드 통과. ECharts를 포함한 JS 번들 크기 경고는 남아 있다.
- `python scripts/verify_story_metrics.py`: 카드 2건, SGIS 2건, SBR 1건, 철도 1건, STCIS 2건의 감사 수치 및 STCIS 연도별 대표일 조건 일치.
- `node scripts/browser_smoke.mjs`: 로컬 프로덕션 미리보기에서 **23/23** 검사 통과. 상단 내비게이션, 기간 버튼, 결과→상세 탐색, 자료별 그래프, 필터, 표·CSV·PNG, 지도, 2025-09 목적 OD 미관측, 모바일 레이아웃과 콘솔 오류를 확인.
- 스크린샷: `test_desktop.png`, `test_mobile.png` (로컬 실행 결과).

## 실행

```powershell
cd C:\Users\gachon\CapStone_Project_Final\web\urban_activity_dashboard
npm ci
npm run dev
```

프로덕션 검증은 `npm run build`, `npm run preview` 후 `WEB_TEST_URL`을 실제 미리보기 주소로 지정하여 `node scripts/browser_smoke.mjs`를 실행한다. 검증된 웹 JSON이 이미 `public/data/`에 있다. 재생성이 필요할 때만 `python scripts/build_web_data.py`를 실행한다.

## 추가 검토

실제 카드 공급기관·표본·금액 단위, SGIS 2019/2020 단절 원인, 목적 OD 2025 공급 정의, SBR 2024 화면 충돌은 기존 감사에서 미해결이다. 이 정의가 확보되면 해석 문구와 데이터 변환을 다시 검증해야 한다. 브라우저 번들에는 ECharts가 포함되어 크기 경고가 있으며, 필요하면 상세 탐색 차트의 지연 로딩을 후속 최적화할 수 있다.
