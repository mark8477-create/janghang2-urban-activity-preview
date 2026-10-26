# 장항2동 도시활동 변화 분석 웹

라페스타·웨스턴돔을 포함한 **장항2동 행정동 전체**의 연구 결과를 탐색하는 정적 React 웹 앱이다. 교통·STCIS 보조 자료는 각각 정발산역·관측 정류소·장항 법정동 단위를 유지한다. 기존 판교·청라 사이트는 디자인 참고만 했으며 데이터·결론은 사용하지 않았다.

## Windows 실행

프로젝트 루트의 PowerShell에서:

```powershell
cd web/urban_activity_dashboard
npm ci
python scripts/build_web_data.py
npm run dev
```

출력된 `http://127.0.0.1:5173/`을 브라우저에서 연다. `npm ci`는 최초 설치 또는 잠금 파일 변경 후에만 필요하다. Python 데이터 생성기는 프로젝트 루트의 기존 분석 CSV만 읽고 `public/data/*.json`만 쓴다.

## 프로덕션 빌드와 검증

```powershell
npm run build
npm run preview
$env:WEB_TEST_URL='http://127.0.0.1:4173/'
node scripts/browser_smoke.mjs
```

`dist/`가 정적 배포 산출물이다. `vite.config.ts`의 `base: './'`로 GitHub Pages의 하위 경로에서도 JS/CSS와 JSON이 상대 경로로 로드된다. 임시 공개 사이트: **<https://mark8477-create.github.io/janghang2-urban-activity-preview/>**. 별도 저장소의 GitHub Actions가 빌드·배포하며, 실제 공개 사이트에서 페이지와 `data/manifest.json` HTTP 200 및 브라우저 기능 17개를 확인했다. 기존 판교·청라 저장소는 변경하지 않았다.

브라우저 스모크 테스트는 설치된 Google Chrome을 `playwright-core`로 실행한다. Chrome 경로가 다른 PC에서는 `scripts/browser_smoke.mjs`의 `executablePath`를 조정한다. 테스트에 외부 GIS 타일/API는 필요하지 않다.

## 구조

| 경로 | 역할 |
|---|---|
| `src/App.tsx`, `src/style.css` | 섹션형 연구 웹, 필터, ECharts, 표·다운로드, SVG 공간도 |
| `scripts/build_web_data.py` | 기존 검증 CSV → 웹 JSON; 감사 수치 재대조 |
| `public/data/` | 작은 웹용 JSON 및 원천 매니페스트 |
| `scripts/browser_smoke.mjs` | Chrome 실제 클릭·다운로드·모바일 검사 |
| `DESIGN_REFERENCE_REVIEW.md` | 원격 디자인 레퍼런스에서 실제 확인한 요소 |
| `DATA_MAPPING.md` | 데이터 상품별 출처·단위·변환·한계 |
| `FEATURE_CHECKLIST.md`, `TEST_REPORT.md` | 기능 상태와 검증 범위 |
| `WEB_PROGRESS.md`, `CONTEXT_HANDOFF.md`, `FINAL_WEB_HANDOFF.md` | 진행·재개·인수인계 |

## 연구 해석

카드 원금액의 단위·모집단은 미확인이다. 2024-02~12 카드 결측, 2025-09 목적 OD 결측, STCIS NOT_FOUND·미반환 슬롯을 0으로 채우지 않는다. 정발산역은 역별 승하차만 사용하며 역간 OD는 현 연구 범위 밖이다. 다른 공간·표본 지표를 하나의 점수나 전체 이동량으로 합산하지 않는다.

