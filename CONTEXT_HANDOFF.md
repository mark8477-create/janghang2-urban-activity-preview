# 웹 작업 재개 기록

목표: 장항2동 행정동 전체 도시활동 연구 결과를 실제 웹으로 탐색하게 한다. 기존 판교·청라 사이트는 디자인 참고만 하며 데이터는 가져오지 않는다.

2026-10-26 현재 Phase 1~8 완료. `web/urban_activity_dashboard/`에 React/TypeScript/Vite/Tailwind/ECharts 앱, `public/data/` 웹용 JSON, Python 변환기, Chrome 브라우저 테스트, 필수 문서가 있다. `WEB_PROGRESS.md`와 `TEST_REPORT.md` 참조. 기존 원본 보고서, Raw·Clean·SQLite, `analysis/08_stcis/`, `analysis/09_urban_activity_final/`은 수정하지 않았다.

중요한 정의: 목표=장항2동 행정동 전체. STCIS=장항 법정동 120대표일·제한 패널. 철도=정발산역 역별 승하차만, 역간 OD 범위 밖. 버스=정류소 승하차, 버스 OD 범위 밖. 카드 제공기관·표본·금액 단위 미확인. 목적 OD 2025-09 미공급, STCIS 미반환/NOT_FOUND는 0 아님.

재현 명령(프로젝트 루트 PowerShell):

```powershell
cd web/urban_activity_dashboard
npm ci
python scripts/build_web_data.py
npm run build
npm run preview
$env:WEB_TEST_URL='http://127.0.0.1:4173/'
node scripts/browser_smoke.mjs
```

최근 검증: JSON 생성 PASS, TypeScript/Vite 빌드 PASS, 프로덕션 미리보기 Chrome 스모크 17/17 PASS, 콘솔 오류 0. `dist/`는 상대 경로 정적 배포 준비 상태다. 배포는 수행하지 않았다. 별도 세션이 감사 파일을 바꾸고 있다면 웹 데이터 생성 전에 최신 `FINAL_AUDIT_HANDOFF.md`, `issue_resolution_matrix.csv`, 감사 원표를 다시 대조한다.

향후 개선: JS 번들 크기 분할, 지도 점 선택과 차트 연동, 원격 호스팅 smoke 검증. 외부 공식 메타데이터가 들어오기 전에는 카드·목적 OD 해석을 강화하지 않는다. 작업 재개 시 이 문서와 `DATA_MAPPING.md`를 읽고 완료 단계 재실행을 피한다.

## 2026-10-26 GitHub Pages 임시 배포 재개점

사용자가 새 저장소 `mark8477-create/janghang2-urban-activity-preview`를 생성했다. GitHub 연결 도구로 웹 전용 26파일을 `main` 커밋 `770613259242b5ef7da67b65d5f3549a585ca511`에 올렸다. Actions 실행 ID `40275348950`: `npm ci`·`npm run build` 성공, `actions/configure-pages@v5`만 Pages 사이트 미활성화(404)로 실패. 저장소 Pages 설정 도구가 없어 사용자에게 `Settings → Pages → Source=GitHub Actions` 1회 설정을 요청했다. **사용자 설정 응답이 오면** GitHub 연결 도구 `github_rerun_failed_workflow_run_jobs`로 실행 `40275348950`을 다시 돌리고 Pages URL·매니페스트 HTTP 200 및 브라우저 화면을 확인한다. 상세 `GITHUB_PAGES_DEPLOYMENT.md`. 원본·분석 파일은 GitHub에 올리지 않았다.

위 초기 설정은 2026-10-26 사용자가 완료했다. 실행 `40275348950` 두 번째 시도 성공, 공개 URL `https://mark8477-create.github.io/janghang2-urban-activity-preview/`의 페이지·매니페스트 HTTP 200과 Chrome 17/17 검사를 확인했다. GitHub Pages 배포 완료. 추가 원본 데이터는 올리지 않았다.

