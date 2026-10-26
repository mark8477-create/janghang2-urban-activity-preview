# GitHub Pages 임시 배포 상태

기록일: 2026-10-26. 대상 저장소: `https://github.com/mark8477-create/janghang2-urban-activity-preview`. 공개 저장소이며 연결 계정에 쓰기 권한이 있다.

## 완료

- 웹 소스, 웹용 검증 JSON, Pages 워크플로 **26개 파일**을 `main`에 올렸다. 커밋: `770613259242b5ef7da67b65d5f3549a585ca511`.
- 업로드된 트리를 확인했다. Raw·Clean·SQLite 및 기존 분석 폴더는 업로드하지 않았다.
- GitHub Actions 실행 `40275348950`에서 `npm ci`, `npm run build`가 성공했다. 원격 `public/data/manifest.json`은 `status=PASS`, 정발산역 비율 `81.63`을 표시한다.

## 초기 설정과 재실행 결과

첫 실행의 `actions/configure-pages@v5`가 `Get Pages site failed ... Not Found`로 실패했다. GitHub Pages 자체가 아직 생성·활성화되지 않았기 때문이다. 현 GitHub 연결 도구에는 저장소 Pages 설정을 바꾸는 기능이 없어 사용자가 `Settings → Pages → Source=GitHub Actions`를 선택했다.

설정 후 [Actions 실행](https://github.com/mark8477-create/janghang2-urban-activity-preview/actions/runs/40275348950)의 실패 작업을 재실행했다. 두 번째 시도의 `npm ci`·빌드·`configure-pages`·아티팩트 업로드·`deploy-pages`가 모두 성공했다. **공개 URL: <https://mark8477-create.github.io/janghang2-urban-activity-preview/>**. 페이지와 `/data/manifest.json`의 HTTP 200 및 매니페스트 `status=PASS`를 확인했다. 공개 사이트 Chrome 스모크 테스트 **17/17 PASS**, 콘솔·로컬 리소스 오류 0건.

`actions/configure-pages`의 `enablement: true`는 기본 `GITHUB_TOKEN`으로는 권한이 부족해 별도 Pages 관리 토큰이 필요하므로 현재 워크플로에 넣지 않았다. 개인 토큰은 사용하지 않았다. 임시 공개를 중단하려면 저장소의 Pages 설정에서 게시를 해제하거나 저장소를 삭제한다.

