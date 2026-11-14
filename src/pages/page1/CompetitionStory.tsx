import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';

/* 데이터: public/data/competition.json (scripts/build_competition_data.py가 analysis/14·15 산출물에서 생성) */
let cache: Promise<any> | null = null;
function useCompetition(active: boolean) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!active) return;
    cache ??= fetch(`${import.meta.env.BASE_URL}data/competition.json`).then(r => { if (!r.ok) throw new Error(`competition: HTTP ${r.status}`); return r.json(); });
    let alive = true;
    cache.then(d => { if (alive) setData(d); }).catch(e => { cache = null; if (alive) setError(String(e.message || e)); });
    return () => { alive = false; };
  }, [active]);
  return { data, error };
}

const C = { jh: '#0f62fe', comp: '#8d8d8d', accent: '#9f1853', green: '#198038', purple: '#6929c4', orange: '#ff832b' };
const pct = (v: number, d = 1) => `${v > 0 ? '+' : ''}${v.toFixed(d)}%`.replace('-', '−');
const axisText = { color: '#525252', fontSize: 12 };
function Loading({ error }: { error: string }) { return <div className="load-state">{error ? `데이터 로딩 오류: ${error}` : '경쟁 상권 데이터를 불러오는 중…'}</div>; }
function Claim({ tag, title, children }: { tag: string; title: string; children: React.ReactNode }) { return <div className="story-claim"><span>{tag}</span><h3>{title}</h3><p>{children}</p></div>; }
function Panel({ kicker, title, option, height = 330, note }: { kicker: string; title: string; option: any; height?: number; note?: React.ReactNode }) {
  return <article className="panel chart-panel ts-panel">
    <div className="panel-head"><div><span className="kicker">{kicker}</span><h3>{title}</h3></div></div>
    <ReactECharts option={option} style={{ height }} notMerge />
    {note && <div className="chart-note">{note}</div>}
  </article>;
}

/* ───────────── 05 경쟁 상권과 신도시 ───────────── */
export function CompetitionStory({ active }: { active: boolean }) {
  const { data, error } = useCompetition(active);
  if (!data) return <Loading error={error} />;
  const share: any[] = data.share;
  const first = share[0], last = share[share.length - 1];
  const sf: any[] = data.starfield;
  const sfJh = sf.find(r => r.dong === '장항2동'), sfGy = sf.find(r => r.dong === '고양시 전체');
  const pop: any[] = data.population;
  const firstTown = pop.filter(r => r.group === '1기 신도시 주거지');
  const popRows = [...pop.filter(r => r.group !== '1기 신도시 주거지' && r.dong !== '고양시 전체'), ...firstTown].sort((a, b) => b.pct - a.pct);
  const jh1 = pop.find(r => r.dong === '장항1동');
  const ftMin = Math.min(...firstTown.map(r => r.pct)), ftMax = Math.max(...firstTown.map(r => r.pct));

  const shareOption = {
    animationDuration: 250, color: [C.jh, C.accent, C.green, C.purple],
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${v}%` },
    legend: { top: 0, textStyle: axisText },
    grid: { left: 44, right: 18, top: 42, bottom: 30 },
    xAxis: { type: 'category', data: share.map(r => String(r.year)), axisLabel: axisText },
    yAxis: { type: 'value', name: '%', axisLabel: axisText, splitLine: { lineStyle: { color: '#e8eef1' } } },
    series: [
      { name: '장항2동(라페스타·웨스턴돔)', type: 'line', data: share.map(r => r.jh2), lineStyle: { width: 3 }, symbolSize: 6,
        markLine: { symbol: 'none', label: { formatter: '스타필드 개장 2017.08', color: '#d02670', fontSize: 11 }, lineStyle: { color: '#d02670', type: 'dashed' }, data: [{ xAxis: '2017' }] } },
      { name: '대화동(킨텍스)', type: 'line', data: share.map(r => r.daehwa), lineStyle: { width: 3 }, symbolSize: 6 },
      { name: '창릉동(스타필드 인근)', type: 'line', data: share.map(r => r.changneung), symbolSize: 5 },
      { name: '장항1동(킨텍스원시티 등)', type: 'line', data: share.map(r => r.jh1), symbolSize: 5 },
    ],
  };
  const sfOption = {
    animationDuration: 250,
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => pct(v) },
    grid: { left: 50, right: 18, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: sf.map(r => r.dong), axisLabel: axisText },
    yAxis: { type: 'value', name: '%', axisLabel: axisText, splitLine: { lineStyle: { color: '#e8eef1' } } },
    series: [{ type: 'bar', barMaxWidth: 46, data: sf.map(r => ({ value: r.pct, itemStyle: { color: r.dong === '장항2동' ? C.jh : r.dong === '고양시 전체' ? C.comp : '#a6c8ff' } })),
      label: { show: true, position: 'top', formatter: (p: any) => pct(p.value), color: '#161616', fontSize: 12 } }],
  };
  const popOption = {
    animationDuration: 250,
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => pct(v) },
    grid: { left: 90, right: 56, top: 10, bottom: 24 },
    xAxis: { type: 'value', name: '%', axisLabel: axisText, splitLine: { lineStyle: { color: '#e8eef1' } }, max: 100 },
    yAxis: { type: 'category', inverse: true, data: popRows.map(r => r.dong), axisLabel: axisText },
    series: [{ type: 'bar', barMaxWidth: 18, data: popRows.map(r => ({ value: Math.min(r.pct, 100), itemStyle: { color: r.dong === '장항2동' ? C.jh : r.group === '1기 신도시 주거지' ? C.comp : C.green } })),
      label: { show: true, position: 'right', formatter: (p: any) => pct(popRows[p.dataIndex].pct), color: '#161616', fontSize: 11 } }],
  };
  const timeline = [['2003', '라페스타'], ['2005', '킨텍스 제1전시장'], ['2007', '웨스턴돔'], ['2010', '현대백화점 킨텍스점'], ['2011', '킨텍스 제2전시장'], ['2013', '원마운트'], ['2017', '스타필드 고양'], ['2019', '킨텍스원시티 입주'], ['2024', 'GTX-A 킨텍스역']];
  return <>
    <Claim tag="경쟁 상권 · 신도시 구조 (행안부 인허가 · SGIS 인구)" title="새 점포와 새 인구는 킨텍스·스타필드 쪽 신규 개발지로 옮겨 갔다.">
      라페스타·웨스턴돔은 1기 신도시와 함께 생긴 상권입니다. 이후 킨텍스·스타필드 주변에 새 상업·주거 개발이 이어졌습니다. 고양시에서 새로 생기는 <b>방문형(CORE) 점포</b> 가운데 각 동이 차지하는 몫과 동별 인구 변화를 보면, 진입과 인구가 어디로 갔는지 알 수 있습니다. 시점과 방향이 일치한다는 뜻이며 인과를 추정한 것은 아닙니다.
    </Claim>
    <div className="ts-kpis">
      <div><span>방문형 신규 인허가 중 장항2동 몫</span><strong>{first.jh2.toFixed(1)}% → {last.jh2.toFixed(1)}%</strong><small>{first.year} → {last.year} · 즉석판매제조가공업 제외</small></div>
      <div><span>같은 기간 대화동(킨텍스) 몫</span><strong>{first.daehwa.toFixed(1)}% → {last.daehwa.toFixed(1)}%</strong><small>2018년부터 장항2동을 앞섬</small></div>
      <div><span>스타필드 개장 전후 24개월 · 장항2동</span><strong>{pct(sfJh.pct)}</strong><small>고양시 전체 {pct(sfGy.pct)} · 방문형 신규 인허가</small></div>
      <div><span>인구 2018→2024 · 장항1동</span><strong>{pct(jh1.pct, 0)}</strong><small>1기 신도시 주거지 {pct(ftMin, 0)} ~ {pct(ftMax, 0)}</small></div>
    </div>
    <div className="story-visual-grid">
      <Panel kicker="연간 · 고양시 방문형(CORE) 신규 인허가 중 각 동의 몫" title="새 방문형 점포는 장항2동에서 대화동(킨텍스) 쪽으로" option={shareOption}
        note={<>즉석판매제조가공업 제외(포함하면 장항2동 {first.jh2Incl.toFixed(1)}%→{last.jh2Incl.toFixed(1)}%, 대화동 {first.daehwaIncl.toFixed(1)}%→{last.daehwaIncl.toFixed(1)}%). 대화동은 2018년부터 장항2동을 앞섰고 코로나 뒤(2022~24) 크게 늘었습니다. 인허가 기록 수는 점포 수가 아닙니다.</>} />
      <Panel kicker="스타필드 고양 개장(2017-08) 전후 24개월 · 방문형 신규 인허가 변화율" title="개장 뒤 장항2동만 신규 진입이 줄었다" option={sfOption}
        note={<>개장 전 2015.08~2017.07, 개장 후 2017.09~2019.08(개장 월 제외), 즉석판매제조가공업 제외. 장항2동 {sfJh.before}→{sfJh.after}건. 시점의 일치이며 인과가 아닙니다.</>} />
      <Panel kicker="SGIS 행정동 인구 · 2018 → 2024 변화율" title="1기 신도시 주거지는 줄고, 신규 개발지는 늘었다" option={popOption} height={360}
        note={<>회색 = 1기 신도시 주거지(마두·주엽·정발산·백석), 초록 = 신규 개발지, 파랑 = 장항2동. 장항1동은 {pct(jh1.pct)}({jh1.p2018.toLocaleString()}→{jh1.p2024.toLocaleString()}명)로 막대는 +100%에서 잘랐습니다. 각 연도 경계 기준.</>} />
      <article className="panel chart-panel ts-panel">
        <div className="panel-head"><div><span className="kicker">개발 연표</span><h3>라페스타 뒤로 이어진 주변 개발</h3></div></div>
        <table className="evidence-table" style={{ minWidth: 0 }}><tbody>{timeline.map(([y, t]) => <tr key={y + t}><td>{y}</td><td>{t}</td></tr>)}</tbody></table>
        <div className="chart-note">개장·입주 연도는 언론 보도로 확인(보고서 참고문헌). 킨텍스원시티는 분양 당시 예정 시기입니다.</div>
      </article>
    </div>
    <div className="ts-open" style={{ marginTop: 18 }}>
      <b>킨텍스 방문은 라페스타로 이어지나: 판단 보류</b>
      <ul>
        <li>대형 행사(4홀 이상)가 열린 토요일의 대화동→장항동 이동은 평균 843건으로, 행사가 없는 날(672건)보다 조금 많았습니다.</li>
        <li>그러나 STCIS는 교통카드 통행이라 이동 목적을 알 수 없고, 법정 장항동에는 아쿠아플라넷·원시티도 있어 도착지가 라페스타인지 구분할 수 없습니다. 그래서 연결 여부는 판단하지 않았습니다.</li>
      </ul>
    </div>
  </>;
}

/* ───────────── 03 인구이동: 요일·시간대별 시기 변화 ───────────── */
export function StcisWeekdayStory({ active }: { active: boolean }) {
  const { data, error } = useCompetition(active);
  if (!data) return <Loading error={error} />;
  const rows: any[] = data.stcisPhase.filter((r: any) => r.day !== '전체' && r.flow !== '장항동 안 이동');
  const slots = ['낮 12~15', '오후 16~19', '저녁 19~22', '전체 24시간'];
  const get = (day: string, flow: string, slot: string) => rows.find(r => r.day === day && r.flow === flow && r.slot === slot);
  const sat = get('주말(토)', '유입', '낮 12~15');
  const satOut = get('주말(토)', '유출', '낮 12~15');
  const wed = get('평일(수)', '유입', '전체 24시간');
  const bus = data.busSide.filter((r: any) => r.fullCoverage);
  const cell = (v?: number) => v == null ? '–' : <span className={v <= -5 ? 'ts-down' : v >= 5 ? 'ts-up' : ''}>{pct(v)}</span>;
  return <>
    <div className="story-claim" style={{ marginTop: 24 }}>
      <span>요일·시간대로 나누어 보기 · 회복기(2022.05~2023.05) → 엔데믹 전환 이후(2023.06~2024.12)</span>
      <h3>줄어든 것은 토요일에 장항동으로 들어오는 이동이고, 평일 이동은 유지됐다.</h3>
      <p>같은 대표일 표본을 수요일과 토요일로 나누고, 고양시 다른 법정동과 장항동 사이 이동을 시간대별로 비교했습니다. 비교 지역이 없어 통계 검정은 하지 않았습니다.</p>
    </div>
    <div className="ts-kpis">
      <div><span>토요일 낮 12~15시 · 장항동으로 들어오는 이동</span><strong>{pct(sat.recoveryToEndemic)}</strong><small>나가는 이동 {pct(satOut.recoveryToEndemic)} · 들어오는 방문이 줄어듦</small></div>
      <div><span>수요일 하루 전체 · 들어오는 이동</span><strong>{pct(wed.recoveryToEndemic)}</strong><small>평일 이동은 거의 그대로</small></div>
      <div><span>STCIS 장항동은 장항2동을 대표하나</span><strong>약 {Math.round(bus.reduce((s: number, r: any) => s + r.jh2SharePct, 0) / bus.length)}%</strong><small>법정 장항동 버스 승하차 중 장항2동 쪽 정류장 몫({bus.map((r: any) => r.year).join('·')}년) · 법정 장항동 안에는 지하철역이 없음</small></div>
    </div>
    <div className="evidence-table-wrap"><table className="evidence-table">
      <thead><tr><th>요일 · 방향</th>{slots.map(s => <th key={s}>{s}</th>)}</tr></thead>
      <tbody>{['주말(토)', '평일(수)'].flatMap(day => ['유입', '유출'].map(flow => <tr key={day + flow}><td>{day} {flow}</td>{slots.map(s => <td key={s}>{cell(get(day, flow, s)?.recoveryToEndemic)}</td>)}</tr>))}</tbody>
    </table></div>
    <p className="synthesis-method">유입 = 고양시 다른 법정동 → 장항동, 유출 = 장항동 → 고양시 다른 법정동. 월평균 변화율(고정 칸). STCIS는 법정동 단위로만 제공되어 장항2동만 따로 받을 수 없지만, 법정 장항동의 대중교통 이용은 대부분 장항2동 쪽 정류장에서 일어납니다. 2022~2023년은 버스 집계 범위가 줄어 몫 계산에서 뺐습니다.</p>
  </>;
}

/* ───────────── 07 결론과 활성화 방향 ───────────── */
export function ConclusionStrategy() {
  const strategies = [
    { rank: '①', title: '신규 입점·창업 유도', status: '해당', basis: '폐업은 고양시보다 덜 늘었고 신규 진입이 줄었다. 새 점포는 킨텍스·스타필드 쪽으로 갔다.', action: '방문형 업종의 진입 장벽 확인, 공실을 팝업·시범 입점에서 실제 임차로 이어 주기' },
    { rank: '②', title: '방문 수요·접근성 강화', status: '일부 해당', basis: '토요일 유입 감소, 정발산역 비율의 장기 하락', action: '주말 방문객 유입, 킨텍스 행사 연계 검토' },
    { rank: '④', title: '생활권 수요 기반 강화', status: '일부 해당(최종 분석에서 추가)', basis: '충격 때 더 크게 흔들림(외부 방문 의존), 평일 이동은 유지', action: '종사자 38,610명·인근 주민이 쓰는 업종' },
    { rank: '③', title: '체류·소비 유도', status: '후순위', basis: '카드 소비 비중은 2023년에 2019년 수준으로 회복', action: '다른 방향보다 뒤에 검토' },
  ];
  return <>
    <Claim tag="연구 질문별 결론" title="지금 장항2동의 약한 고리는 소비가 아니라 새 점포의 진입과 주말 방문 수요다.">
      충격은 모두에게 왔지만, 코로나 이후 새 점포와 새 인구는 킨텍스·스타필드 쪽 신규 개발지로 갔고 라페스타는 그 흐름에서 밀려났습니다. 모든 원인은 후보이며 인과 추정이 아닙니다.
    </Claim>
    <div className="conclusion-grid">
      <div><h4>Q1. 상업활동</h4><p>소비는 충격 뒤 회복했다. <b>새 점포 진입</b>은 장항2동만 약해졌고(회복기 p=0.001), 새 점포는 킨텍스·스타필드 쪽으로 옮겨 갔다. 사업체 수도 같은 방향(2020→2024 −7.6%, 고양시 +8.7%).</p></div>
      <div><h4>Q2. 인구 이동</h4><p>엔데믹 전환 이후 <b>토요일 낮 유입</b>이 줄었다(−12.5%). 평일 이동은 유지됐다.</p></div>
      <div><h4>Q3. 대중교통 수요</h4><p>철도는 충격 때 더 크게 줄고(−34.4% vs −26.1%) 같은 폭으로 회복했다. <b>정발산역 비율</b>은 코로나 전부터 낮아졌다(2018 9.31% → 2024 7.75%).</p></div>
    </div>
    <div className="evidence-table-wrap"><table className="evidence-table">
      <thead><tr><th>순위</th><th>활성화 방향</th><th>해당 여부</th><th>최종 분석 결과</th><th>검토할 내용</th></tr></thead>
      <tbody>{strategies.map(s => <tr key={s.rank}><td>{s.rank}</td><td><b>{s.title}</b></td><td>{s.status}</td><td>{s.basis}</td><td>{s.action}</td></tr>)}</tbody>
    </table></div>
    <p className="synthesis-method">중간발표에서 세운 조건부 판단 틀에 최종 결과를 대입했습니다. 우선순위: ① 신규 진입 유도 → ② 방문 수요·접근성 + ④ 생활권 수요 → ③ 체류·소비. 방향 제시이며 정책 효과를 추정한 것이 아닙니다.</p>
    <div className="ts-cause-grid">
      <div className="ts-cause ts-cause-int"><span>현재 라페스타 공실 활용 사례</span><h4>행사로 채우는 데서 실제 임차로</h4><p>빈 점포 독립 영화제(2026-10, A동 빈 점포 두 곳을 상영·전시 공간으로), 거리 중심 상권 살리기 프로젝트(정원·공연), 서브컬처 축제, 시의회의 장기 공실 실험 창업공간·청년 예술공간 제안. 연구 기간 밖의 사례이며 효과를 평가하지 않았습니다.</p></div>
      <div className="ts-cause ts-cause-amp"><span>향후 과제 ① (전략 실행 전 확인)</span><h4>2022년 이후 방문형 점포의 신규 진입이 왜 적었나</h4><p>두 상권의 입점·공실·임대 이력과 현장 조사(영업시간·고객 유입 시간대)로 확인합니다.</p></div>
      <div className="ts-cause ts-cause-str"><span>향후 과제 ② (전략 실행 전 확인)</span><h4>2020년 충격이 더 컸던 이유</h4><p>업종 구성과 외부 방문 의존 때문인지 상권별 업종·방문객 거주지 자료로 확인합니다. 카드 금액 단위·제공 카드사는 경기도 AI데이터행정과에 확인이 필요합니다.</p></div>
    </div>
  </>;
}
