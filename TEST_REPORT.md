# 웹 구현 검증 보고

검증일: 2026-10-26. 테스트 대상: `web/urban_activity_dashboard/`. 결과는 `scripts/browser_smoke.mjs`를 로컬 Google Chrome headless에서 실행해 확인했다. 브라우저에서 원격 레퍼런스 사이트도 열어 디자인과 메뉴 동작을 확인했다.

## 데이터·빌드

- `python scripts/build_web_data.py`: **PASS**. 카드 2020 장항2동 77.57·고양시 94.18, SGIS 사업체 2020~24 -7.56%, SBR 2024 36.54%, 정발산역 81.63%를 대조했다. 감사 원표의 SGIS 종사자 2개 기간, 버스 2020/2025 전체·고정18 합계, STCIS 내부 양방향 변화율, 정발산역 비율도 직접 대조했다.
- 2025-09 목적 OD는 `MISSING`→JSON `null`; 관광의 실제 관측 0은 0으로 남긴다. STCIS 미반환 슬롯/NOT_FOUND를 생성하지 않거나 0으로 바꾸지 않았다.
- `npm run build`: TypeScript 검사와 Vite 프로덕션 빌드 **성공**. 정적 산출물 `dist/` 생성. ECharts가 포함된 JS는 약 1.3MB(압축 약 444kB)로 Vite 크기 경고가 있으나 기능 실패는 아니다. JSON 파일은 해당 섹션에 접근할 때 로드한다.
- `npm audit --omit=dev`: 프로덕션 의존성 취약점 **0건**. 개발 도구 Tailwind 3 계열 관련 중간 등급 권고 3건은 별도 개선 가능하다.

## 실제 브라우저 테스트

프로덕션 미리보기 `http://127.0.0.1:4173/`에서 17개 스모크 검사 **전부 통과**: 페이지 제목, 9개 메뉴, 감사 지표 카드, 카드 구간 필터의 그래프 문맥 변화, 그래프↔표, CSV/PNG 다운로드, 사업체·이동·교통 패널 로드, 오전 참조, 목적 OD 2025-09 `미관측`, 공간 경계 표시, 390px 모바일 메뉴·가로 폭. 브라우저 콘솔 오류 0건, 로컬 리소스 HTTP 오류 0건.

레퍼런스 사이트는 데스크톱·모바일 Chrome에서 HTML·CSS·JS를 로드했고 메뉴 클릭 후 해당 섹션으로 스크롤·활성 메뉴 갱신을 확인했다. 새 사이트는 디자인 배치만 참고했다.

## 확인 범위와 남은 제한

- 브라우저 기능은 로컬 프로덕션 미리보기와 `https://mark8477-create.github.io/janghang2-urban-activity-preview/`에서 각각 확인했다. 공개 사이트도 17/17 스모크 검사와 페이지·매니페스트 HTTP 200을 통과했다. 배포 이력은 `GITHUB_PAGES_DEPLOYMENT.md`.
- 공간도는 검증된 현행 법정 경계·정류소 점을 보여주는 SVG다. 배경 지도 타일이나 역사적 행정경계는 제공하지 않는다.
- 표/CSV/PNG는 현재 차트의 표시값을 내보낸다. 공급 정의가 미확인인 지표의 경제적 해석까지 검증한 것은 아니다.
# 2026-10-26 연구 결과 중심 개편 추가 검증

- 이전 화면 ZIP 보존 및 SHA-256 확인: `archives/20261026_before_findings_redesign.zip`.
- `npm run build`: 통과. TypeScript 오류 없음. ECharts 포함 번들 >500 kB 경고는 성능 개선 후보이며 기능 오류는 아니다.
- `python scripts/verify_story_metrics.py`: 개편 대표 지표 8건(카드 2, SGIS 2, SBR 1, 철도 1, STCIS 2) 감사 원표와 일치; STCIS 각 연도 24대표일 확인.
- `WEB_TEST_URL=http://127.0.0.1:4174/ node scripts/browser_smoke.mjs`: 로컬 프로덕션 빌드에서 23/23 통과. 기간 선택, 핵심 결과에서 탐색 탭 이동, 기존 필터·표·CSV·PNG, 목적 OD 결측, 지도, 모바일 차트와 가로 넘침 없음 확인. 브라우저 콘솔 및 페이지 오류 없음.
- `test_desktop.png`, `test_mobile.png`: 개편 화면의 브라우저 스크린샷. 전체 페이지 캡처에는 화면에 진입하지 않은 탭의 차트가 표시되지 않으며, 탭 전환 시 로드·동작함을 테스트에서 확인했다.
- 원격 GitHub Pages는 이번 개편을 배포하지 않았으므로 원격 개편 화면 테스트는 실시하지 않았다.

