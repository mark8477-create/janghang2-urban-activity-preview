# 웹 시각화 플랫폼 최종 인수인계

완료일: 2026-10-26. 결과: `web/urban_activity_dashboard/`의 정적 브라우저 앱. 기존 원본·감사 결과를 수정하지 않고 연구용 사본 JSON만 생성했다.

## 구현 내용

- 상단 고정 메뉴 기반 9개 세로 섹션. 기존 판교·청라 사이트의 남색 소개·청록/주황 강조·넓은 여백·카드형 그래프·모바일 가로 메뉴라는 디자인 언어를 계승했다. 이전 사이트의 데이터·결론은 사용하지 않았다.
- 카드 공급 구간/지역/업종, SGIS 지표·비교 지역, SBR 업종·기업체/개업/폐업, 목적 OD 목적·선정 출발지, STCIS 방향·시간·요일·패널, 철도 승하차, 버스 전체/공통18·정류소 필터를 구현했다.
- 그래프 hover, 범례 클릭, 표 전환, 필터 결과 CSV/PNG 저장. 자료별 기간·공간·단위·표본 한계를 그래프에 표기했다.
- VWorld 현행 장항 법정동 경계와 검증 버스 정류소 좌표의 제한 공간도. 행정동과 동일한 경계로 취급하지 않는다. 가상 OD 연결이나 철도역간 네트워크는 없다.

## 데이터·해석 상태

`DATA_MAPPING.md` 및 `public/data/manifest.json`이 8종 웹 JSON의 원천·변환·검사 결과를 기록한다. 웹 생성기에서 감사 수치 카드 5개와 추가 SGIS·버스·STCIS·철도 9개 계산을 대조했다. 카드 원금액·목적 OD 2025 변화·외부 STCIS 연도쌍은 공급·표본 제약을 명시한다. 철도는 `data/raw/rail_activity/서울시 지하철 호선별 역별 시간대별 승하차 인원 현황.csv`의 역별 승하차만 활용한다.

## 테스트·실행·배포

`python scripts/build_web_data.py` PASS, `npm run build` PASS, 프로덕션 `npm run preview` Chrome 클릭 시험 17/17 PASS, 콘솔·로컬 HTTP 오류 0. 데스크톱·390px 모바일 확인. 상세 `TEST_REPORT.md`.

Windows에서 `cd web/urban_activity_dashboard` → `npm ci` → `python scripts/build_web_data.py` → `npm run dev`. 프로덕션은 `npm run build` 후 `dist/`를 정적 호스트에 게시할 수 있다. 임시 공개 사이트 **<https://mark8477-create.github.io/janghang2-urban-activity-preview/>**에 별도 저장소로 배포했다. 기존 판교·청라 저장소·사이트는 변경하지 않았다. 공개 사이트에서 17/17 Chrome 스모크 검사 통과.

## 미완료·후속

역사적 장항 법정 경계와 제공기관의 카드/목적 OD 메타데이터가 없어 지도와 경제적 해석은 현재 검증 범위로 제한했다. JS 번들 분할 및 공간도 점 선택 연동은 사용성 개선 과제다. 역간 철도 OD·버스 OD 분석은 없다(연구 범위 밖). 임시 공개를 끝낼 때는 별도 저장소의 Pages 게시를 해제하거나 저장소를 삭제한다.

