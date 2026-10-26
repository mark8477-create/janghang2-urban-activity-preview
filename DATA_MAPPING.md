# 웹 데이터 출처와 변환

기준: `analysis/09_urban_activity_final/08_final_audit/FINAL_AUDIT_HANDOFF.md`, `key_metrics_recalculation.csv`, `data_definition_audit.md`, `analysis/09_urban_activity_final/07_final_reports/urban_activity_final_report_audited.md`. 생성 스크립트는 `scripts/build_web_data.py`, 상세 원천 경로는 `public/data/manifest.json`이다. 모든 JSON은 브라우저용 사본이고 기존 Raw·Clean·SQLite·분석표는 수정하지 않는다.

| 웹 JSON | 원천 가공표 | 단위·기간·공간 | 변환·결측·검증 |
|---|---|---|---|
| `card.json` | `analysis/09_urban_activity_final/01_consumption/{monthly_card_observation,card_episode_a_annual,card_sector_episode_a,card_episode_coverage}.csv` | 월 2018-01~2025-06, A 연도 2018~2020; 장항2동·고양시 행정동; `sales_amt` 금액 단위 미확인 | 공급 episode를 보존. A 지수 77.57/94.18을 감사표와 대조. 미관측월은 `null`, 구간 간 선 연결 금지. |
| `sgis.json` | `.../02_sgis_business/sgis_business_workers_yearly.csv` | 2018~2024 연도; 장항2동·장항1동·대화동·고양시; 사업체 개, 종사자 명 | 사업체 A 2018~19/B 2020~24 구분. 종사자 2020~24 -1.56%, 2018~24 +5.28% 감사 재대조. |
| `sbr.json` | `.../03_sgis_firm_ecosystem/{firm_ecosystem_yearly,three_group_hypothesis_test}.csv` | 2019~2024; 장항2동 SBR 화면 기업체 개 | 업종·개업·폐업 표시값 유지. 2024 3대 산업군 36.54% 대조. 화면 전년비·상태 합계 충돌 주석. SGIS 사업체와 결합 금지. |
| `purpose.json` | `.../04_purpose_od/purpose_monthly_observed.csv`; `analysis/03_purpose_od/commercial/20260928_v02/tables/purpose_origin_yearly_by_origin.csv` | 2023~2025 월·출발지 연; 제한 출발지→장항2동; CNT | 월 관측 상태 유지. 2025-09 `MISSING`→`null`. 출발지 선택 목록은 2023~24 목적별 관측 합계 상위 20개 코드, 2025 미공급 출발지는 결측 유지. 공급 변화로 실질 증감률 미표시. |
| `rail.json` | `.../05_rail_and_bus/{rail_jeongbalsan_yearly,rail_jeongbalsan_monthly,rail_jeongbalsan_timegroups}.csv` | 2015~2025 완전연도, 2026 부분; 정발산역 승하차 건 | `data/raw/rail_activity/서울시 지하철 호선별 역별 시간대별 승하차 인원 현황.csv`에서 검증된 표 재사용. 2025/2019 81.63% 대조. 역간 OD 없음. |
| `bus.json` | `.../05_rail_and_bus/bus_monthly_all_and_fixed18.csv`; `analysis/07_bus_stop_activity/20260928_v01/data/janghang2_monthly_by_stop_2020_202607.csv` | 2020-01~2026-07 월·정류소 연; 장항2동 선별 정류소 승하차 건 | 전체/공통18 패널 보존. 정류소 연별 합은 관측월만 합산하고 관측월 수도 기록. 결측일·공급 전환 주석. 감사 2020/2025 4개 합계 대조. |
| `stcis.json` | `analysis/08_stcis/20261024_internal_mobility/tables/{annual_internal_change,weekday_saturday_change,24h_15min_observability}.csv`; `20261025_external_mobility/tables/{matched_year_pair_window_summary,region_observability_profile}.csv`; `20261025_od_synthesis/time_pattern_synthesis.csv` | 2021~2025 120 대표일; 장항 법정동·선정 상대 법정동; 관측 useStf | 내부 동일 지역·15분 슬롯 고정 패널과 외부 개별 연도쌍 분리. 내부 -1.80%/+0.72% 감사 대조. 08~10 유입 참고는 다른 표본으로 표시. 미반환 슬롯·NOT_FOUND 0 치환 없음. |
| `geography.json` | `analysis/07_bus_stop_activity/data/janghang_legal_dong_vworld_current.geojson`; 위 버스 정류소별 표 좌표 | VWorld 현행 법정 장항동 경계(2026-09-28 조회); 버스 연도별 TAGO 좌표/SGIS 행정경계 선별 | 좌표 그대로 SVG 투영. 경계 기준연도 미확인·장항2동 행정경계와 다름을 지도에 표기. 가상 OD 연결·지도 타일 생성 없음. |

생성기는 카드, SGIS 사업체·종사자, SBR, 정발산역, 버스 전체·고정 패널, STCIS 내부 고정 패널의 핵심 수치를 감사 원표에 대조한다. `manifest.json`의 `status=PASS`가 생성 당시 검사 통과를 뜻한다. 제공기관 미확인 메타데이터의 검증을 뜻하지 않는다.

