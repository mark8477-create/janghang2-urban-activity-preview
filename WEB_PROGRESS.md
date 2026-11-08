# 웹 구현 진행 기록

| 단계 | 상태 | 입력 | 결과·검증 |
|---|---|---|---|
| 1 레퍼런스·연구 자료 | 완료 · 2026-10-26 | 원격 사이트 실제 HTML/CSS/JS와 Chrome 화면, 기준 계획서, 최종 감사·발표 근거 | `DESIGN_REFERENCE_REVIEW.md`; 철도 범위 정정 우선 적용 |
| 2 정보 구조 | 완료 · 2026-10-26 | 사용자 요구와 레퍼런스 상단 메뉴 | 개요→설계→소비→경제→이동→교통→종합→시사점→한계 |
| 3 웹 데이터 | 완료 · 2026-10-26 | 기존 검증 CSV·GeoJSON·감사 원표 | `public/data/`, `DATA_MAPPING.md`, 생성기 검사 PASS |
| 4 기본 페이지 | 완료 · 2026-10-26 | React·TypeScript·Vite·Tailwind·ECharts | 제목·상단 메뉴·카드·반응형 섹션 |
| 5 자료별 섹션 | 완료 · 2026-10-26 | 카드·SGIS·SBR·목적 OD·철도·버스·STCIS | 필터·차트·표·CSV/PNG |
| 6 종합·지도 | 완료 · 2026-10-26 | 감사 종합 논리·VWorld 현행 법정 경계·버스 좌표 | 별도 지표 카드, 제한 공간도 |
| 7 UI 개선 | 완료 · 2026-10-26 | 레퍼런스 색·간격·상단 메뉴 | 데스크톱/390px 모바일 레이아웃 |
| 8 실행 검증 | 완료 · 2026-10-26 | 프로덕션 빌드·Chrome | `TEST_REPORT.md`; 17개 브라우저 검사 PASS |

당시 보류였던 원격 배포는 아래 추가 진행에서 완료됐다. 역사적 행정 경계 지도와 공급기관 메타데이터가 필요한 경제 지표의 강한 해석은 여전히 보류다. 원본·기존 검증 결과는 수정하지 않았다.

## 2026-10-26 GitHub Pages 임시 배포 추가 진행

신규 공개 저장소 `mark8477-create/janghang2-urban-activity-preview`에 웹 전용 26개 파일을 커밋했다. GitHub Actions의 의존성 설치·프로덕션 빌드는 성공. 첫 실행은 저장소 Pages 미활성화로 `configure-pages`에서 중단됐다. 저장소 소유자의 `Settings → Pages → Source=GitHub Actions` 초기 설정 후 재실행·공개 URL 검증이 남았다. 세부 `GITHUB_PAGES_DEPLOYMENT.md`.

사용자 설정 후 실행 `40275348950`의 두 번째 시도가 전체 성공했다. 공개 사이트 `https://mark8477-create.github.io/janghang2-urban-activity-preview/`의 페이지·데이터 HTTP 200, Chrome 17/17 PASS를 확인했다. 원격 배포 단계 완료.
# 2026-10-26 로컬 연구 결과 중심 개편

- 시작 전 원본 보존: `archives/20261026_before_findings_redesign.zip` (SHA-256은 `REDESIGN_HANDOFF.md` 참조).
- 기존 웹·웹 JSON·감사 보고서 확인 후 핵심 결과, 시기별 비교 가능 기간, 대표 근거 그래프, 종합 해석, 상세 탐색 탭으로 재구성했다.
- 기존 소비·SGIS/SBR·목적 OD·STCIS·철도·버스 차트, 필터, 지도, 표·CSV·PNG 기능 유지.
- 검증: `npm run build` 통과, `verify_story_metrics.py` 8개 대표 수치 일치, 프로덕션 브라우저 23/23 통과.
- 원격 배포 상태: **이번 개편 미배포**. 공개 URL은 기존 버전일 수 있다.
- 완료 범위와 재실행 명령은 `REDESIGN_HANDOFF.md` 참조.

