# 시각화 작업 인수인계

이 문서는 Claude가 장항2동 도시활동 분석 웹사이트의 **시각화 작업**을 이어받기 위한 안내다. 연구 결과와 해석의 기준은 최종 통합 연구 보고서(`analysis/11_integrated_urban_activity_2018_2024_revalidated/integrated_urban_activity_report_revised.md`)다. 이 문서의 구현 설명은 **2026-11-04 개편 후** 기준이다.

## 프로젝트 실행

- 프로젝트: `C:\Users\gachon\CapStone_Project_Final\web\urban_activity_dashboard`
- 기술 구성: React 18, TypeScript, Vite, ECharts(PAGE 1), MapLibre GL 6.16 · deck.gl 9.4 · flowmap.gl 9.4(PAGE 2). Leaflet은 제거했다.
- PowerShell에서 프로젝트 폴더로 이동해 `npm install` 후 `npm run dev -- --port 4188`를 실행한다. 프로덕션 검사는 `npm run build`(TypeScript 검사 + Vite 빌드)다.
- 주소: PAGE 1은 `/`, PAGE 2는 `/?page=map`(`&layer=purpose_od|stcis_internal|stcis_external|bus`)이다.
- PC 전용이다. 공개 배포는 사용자 승인 후에만 한다.

## 주요 파일

| 파일 | 역할 |
|---|---|
| `src/App.tsx` | 페이지 전환과 지연 로딩 |
| `src/pages/AnalysisPage.tsx` | PAGE 1 셸: 개요·연구 범위·검증값 비교·상세 탐색·자료 한계 |
| `src/pages/page1/TimeStory.tsx` | PAGE 1 01~05 섹션: 통합 타임라인, 상업, 인구이동, 교통 수요, 종합·원인 |
| `src/pages/page1/EventChart.tsx` | 월별 시계열 차트(사건 세로선·시기 띠·CSV/PNG)와 지수·이동합 도우미 |
| `src/pages/MapPage.tsx` | PAGE 2 레이어·필터·재생·집계·정보 패널 |
| `src/components/map/BaseMap.tsx` | MapLibre 배경지도 + deck.gl(FlowmapLayer·경계·버스) + 상권 대략 위치 마커 |
| `src/style.css`, `src/map.css` | PAGE 1(`.ts-*`)과 지도 스타일 |
| `public/data/timeseries.json` | PAGE 1 시계열·비교 지역·시기 비교표·사건 목록 |
| `public/data/map/` | 지도용 파생 JSON, 경계 GeoJSON, STCIS 연도별 파일, `places_approx_map.json` |
| `scripts/build_page1_timeseries.py` | `timeseries.json` 생성. 기존 채택값과 대조해 다르면 중단 |
| `scripts/build_bus_regional_monthly.py` | 버스 원자료에서 고양시·경기도 월별 합계 생성(→ `analysis/13_page1_timeseries_20261104/`) |
| `scripts/build_places_approx.py` | 라페스타·웨스턴돔 구역계 SHP 중심점(대략 위치) |
| `scripts/build_web_data.py`, `build_stage4_summary.py`, `build_map_data.py` 등 | 기존 PAGE 1·지도 파생 데이터 |
| `scripts/browser_timeseries_flowmap.mjs` | **현재 구조의 자동 브라우저 검사**(42항목) |
| `archives/pre_flowmap_20261104/` | Leaflet 지도 교체 전 파일 백업 |

실제 필드와 집계 정의는 JSON과 생성 스크립트를 먼저 확인한다. 원본 CSV·ZIP·SHP·SQLite·Parquet를 수정하지 않는다. 웹 JSON은 파생물이므로 생성 스크립트와 함께 재현 가능하게 관리한다.

## 디자인 (2026-11-04, IBM/Carbon 스타일)

- **근거 문서:** `design/IBM_DESIGN.md`. VoltAgent/awesome-design-md(MIT)의 IBM 분석본이며, 공식 IBM 자료나 승인본이 아니다. 디자인 규칙만 쓰고 로고·브랜드명은 쓰지 않는다.
- **테마 파일:** `src/theme-ibm.css`(전역, `main.tsx`에서 style.css 다음)와 `src/theme-ibm-map.css`(PAGE 2, map.css 다음).
- **글꼴:** IBM Plex Sans KR + IBM Plex Sans를 `index.html`의 `<link>`로 불러온다. 합쳐진 CSS 중간의 `@import`는 브라우저가 무시하기 때문이다.
- **규칙:**
  - 흰 바탕과 #f4f4f4 면을 번갈아 쓰고, 글자는 #161616이다.
  - 강조색은 IBM Blue #0f62fe 하나만 쓰며, 의미색은 빨강 #da1e28·초록 #24a148·노랑 #f1c21b다.
  - 모서리 0px, 그림자 없이 1px #e0e0e0 선으로 위계를 만든다.
  - 제목은 굵게(큰 제목 700, 패널 제목 600) 쓴다. IBM 원안의 300 굵기는 잘 안 보인다는 요청으로 바꿨다(2026-11-04). 본문은 16px에 자간 0.16px이다.
  - 상단 셸과 푸터만 #161616으로 반전한다.
- **차트:** 장항2동은 #0f62fe, 비교 지역은 #8d8d8d이고, 나머지는 Carbon 데이터 팔레트(Magenta 70·Teal 50·Purple 70·Green 60)를 쓴다. PAGE 2 지도 캔버스는 Gray 100 어두운 면을 유지한다.
- **글자 크기 하한:** 본문 15~16px, 보조 14px, 메타 12~13px이다.

## PAGE 1 현황

흐름은 **분야별 분석 → 시기별 종합 → 원인 후보**다.

1. **01 통합 타임라인:** 장항2동 ÷ 비교 지역 상대 지표. 카드 비중(A구간), 인허가 12개월 합 비율, 정발산역/일산선 다른 10개 역을 넣었고, 사건선과 시기 띠를 겹쳤다. 버스는 공급 변화가 비율에도 남아 이 그림에서 뺐다.
2. **02 상업:** 카드 A구간 월별 지수, 카드 비중 전 기간(구성별 색 구분)과 같은 구성·같은 달 비교표(`card.shareMatched`; 금액은 구간 사이에 잇지 않음), SGIS 두 구간(2019→2020 단절), 인허가 12개월 이동합(전체·CORE·폐업, 비교: 고양시에서 장항2동 제외).
3. **03 인구이동:** STCIS 내부 고정 패널 16~19시 월별 유입·유출(2021~2025). 목적 OD는 보조 자료로 상세 탐색에 둔다.
4. **04 교통 수요:** 정발산역 vs 일산선 다른 10개 역, 장항2동·고양시·경기도 버스. 2021-12·2024-10 변곡은 지역 전체에서 나타나므로 공급 변화로 본다.
5. **05 종합·원인:** 시기별 비교표(코로나 이전·충격기·회복기·엔데믹 이후)와 원인 후보 네 갈래(공통 외부 충격, 충격의 증폭, 지역 고유 요인 후보, 장기 구조 요인 후보). 이 틀은 사용자와 합의한 최종 결론의 틀이다. '함께 움직임' 기준 5%p는 통계 검정이 아니다.

검증값 비교(05-A), 상세 탐색(카드·SGIS·인허가·목적 OD·STCIS·버스·철도), 자료 한계, PAGE 2 링크는 유지했다.

**해석 원칙:**
- 비교할 수 없는 구간(카드 공급 구간 사이, SGIS 2019→2020, 버스 공급 변곡, STCIS 2021년 이전)은 이어 그리지 않고 이유를 적는다.
- 원인은 '후보'로만 쓴다. CJ라이브시티는 완공·운영되지 않은 사업이라 사건 표시와 원인 후보에서 뺐다(2026-11-08, 사용자 결정).
- 사건은 `analysis/13_page1_timeseries_20261104/event_timeline_draft.md`의 확인 수준 A만 그래프와 결론에 사용한다.

## PAGE 2 현황

- **배경지도:** OpenFreeMap `fiord` 다크 벡터 스타일(API 키 불필요, 상업 이용 허용, OpenMapTiles·OSM 저작자 표시 필요). 지명은 `name:ko`를 우선 표시한다. Vite 개발 서버 때문에 `maplibregl.setWorkerUrl`로 워커 경로를 명시했다.
- **흐름:** flowmap.gl `FlowmapLayer`를 쓴다. 기본은 직선 화살표이고 곡선·애니메이션으로 바꿀 수 있다. 지점 자동 묶기는 기본값이 꺼짐이다. 레이어·방향마다 독립 색 그룹을 쓴다(목적 OD 파랑 `#4ea8ff`, STCIS 유입 초록 `#3ddc84`, 유출 주황 `#ff9f43`, 버스 연보라). 최댓값에서도 흰색으로 수렴하지 않게 해 두 레이어를 구별한다. 표시 흐름 기본값은 전체다.
- **경계와 지점:** 장항2동 **행정동**(SGIS 2024 Q2)과 장항 **법정동**(VWorld 2026-10)을 구분한다. 대표점은 실제 출발 위치가 아니고, 화살표는 실제 경로가 아니다. 정발산역 마커는 국가철도공단 역사정보 표준데이터의 공식 좌표 [126.773254, 37.659709](기준 2025-04-08)를 쓴다. 원본은 `data/raw/rail_station_location_20261104/`에 있다. `build_map_data.py`를 다시 실행했다면 `python -I scripts/apply_rail_station_coordinate.py`를 다시 실행해야 한다. 라페스타·웨스턴돔은 구역계 SHP 중심의 **대략 위치**로 표시한다. 이 SHP는 사용자가 PROM에서 구역을 직접 그려 필지를 골라 받은 것(2026-09-17)으로, 연구자가 정한 시설 구역이며 상권 경계가 아니다.
- **기존 규칙 유지:** 레이어 최대 2개, 공통 연도 재생, 목적 OD 2025년 제외, STCIS `NOT_FOUND`·미반환은 0이 아님.
- **청크 구성:** `vite.config.ts`의 `manualChunks`로 `vendor-react`(공통), `vendor-echarts`(PAGE 1), `vendor-maplibre`·`vendor-deckgl`·`vendor-flowmap`(PAGE 2)으로 나눴다. 진입 파일은 `vendor-react`만 미리 받는다. React나 Vite 동적 import 도우미가 다른 vendor 청크로 들어가면 진입 파일이 그 청크를 미리 받으므로, 규칙을 바꿀 때 `dist/index.html`의 modulepreload를 확인한다.
- **첫 진입:** `node scripts/measure_page2_load.mjs`(vite preview 4189)로 측정한다. 2026-11-04 기준 로컬 약 1.05초, Fast 4G 유사 약 1.98초다.
- **상권 이름표:** 확대 단계 12.5 미만에서는 점만 표시한다(`PLACE_LABEL_MIN_ZOOM`). `places_approx_map.json`의 `covered_parcels`에 덮는 필지가 있다(웨스턴돔 장항동 867·868번지, 라페스타 761~768번지 일대).
- **배경지도 위험:** OpenFreeMap은 SLA가 없다(2026-10-14 약관). 발표·배포 때는 대체 스타일을 준비하는 것이 좋다.

## 검증과 알려진 과제

- **2026-11-04 결과:** `npm run build` 통과(청크 경고 없음). `node scripts/browser_timeseries_flowmap.mjs` **49/49** 통과(1920×1080·1440×900·1366×768 가로 넘침, 상권 이름표 숨김·표시, 정발산역 레이어·공식 좌표 포함, 콘솔 오류 0).
- **2026-11-08 결과:** CJ라이브시티 사건 제외 후 `npm run build` 통과, 브라우저 검사 **53/53** 통과(개발 서버 4188·빌드 미리보기 4189 모두).
- **데이터 정합성:** `python -I scripts/build_page1_timeseries.py`가 생성할 때마다 기존 채택값과 대조한다. `verify_stage4_data.py`, `verify_story_metrics.py`는 기존 지도·PAGE 1 데이터를 검사한다.
- **실행 대상에서 뺀 검사:** `browser_phase3/4.mjs`, `check_map_tiles.mjs`, `browser_flowmap_restructure.mjs`, `browser_page1_restructure.mjs`는 Leaflet·이전 PAGE 1 구조용이라 현재 실행 대상이 아니다(이력).
- **남은 과제:**
  - STCIS 내부 유출 요청 상태
  - 장시간 성능·전체 필터 조합 검사
  - 배경지도 대체 방안(발표용)
- **기록 원칙:** 시각적 변경 후에는 세 해상도에서 확인하고 실제 수행한 검증만 기록한다. 연구 수치·해석에 의문이 생기면 최종 보고서와 채택 집계를 먼저 대조한다. 별도 단계 보고서를 만들지 말고 최종 통합 보고서에 누적한다.
