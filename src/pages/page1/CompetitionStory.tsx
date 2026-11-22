import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';

/* 데이터: public/data/competition.json (scripts/build_competition_data.py가 analysis/14·15 산출물에서 생성) */
let cache: Promise<any> | null = null;
export function useCompetition(active: boolean) {
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
  const net5: any[] = data.netAllDongs;
  const n5Color = (k: string, strong: boolean) => k === 'jh' ? (strong ? C.jh : '#a6c8ff') : k === 'new' ? (strong ? C.green : '#a7f0ba') : (strong ? '#6f6f6f' : '#c6c6c6');
  const net5Option = {
    animationDuration: 250,
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${v > 0 ? '+' : ''}${v}건/년` },
    legend: { top: 0, textStyle: axisText, data: ['2016~19 연평균', '2022~24 연평균'] },
    grid: { left: 50, right: 18, top: 40, bottom: 44 },
    xAxis: { type: 'category', data: net5.map(r => r.label), axisLabel: { ...axisText, interval: 0, formatter: (v: string) => v.replace('(', '\n(') } },
    yAxis: { type: 'value', name: '건/년', axisLabel: axisText, splitLine: { lineStyle: { color: '#e8eef1' } } },
    series: [
      { name: '2016~19 연평균', type: 'bar', barMaxWidth: 26, itemStyle: { color: '#c6c6c6' }, data: net5.map(r => ({ value: r.avg1619, itemStyle: { color: n5Color(r.kind, false) } })),
        label: { show: true, position: 'top', formatter: (q: any) => `${q.value > 0 ? '+' : ''}${q.value}`, color: '#525252', fontSize: 11 } },
      { name: '2022~24 연평균', type: 'bar', barMaxWidth: 26, itemStyle: { color: '#6f6f6f' }, data: net5.map(r => ({ value: r.avg2224, itemStyle: { color: n5Color(r.kind, true) } })),
        label: { show: true, position: 'top', formatter: (q: any) => `${q.value > 0 ? '+' : ''}${q.value}`, color: '#161616', fontSize: 12, fontWeight: 'bold' } },
    ],
  };
  const n5 = (d: string) => net5.find(r => r.dong === d);
  const n5y = (d: string, y: number) => n5(d).years.find((r: any) => r.year === y).net;
  const sp: any[] = data.settlePop;
  const near6 = sp.find(r => r.label === '인접 1기 신도시 6개 동'), gyPop = sp.find(r => r.label === '고양시 전체');
  const sn = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}`;
  const timeline = [['2003', '라페스타'], ['2005', '킨텍스 제1전시장'], ['2007', '웨스턴돔'], ['2010', '현대백화점 킨텍스점'], ['2011', '킨텍스 제2전시장'], ['2013', '원마운트'], ['2017', '스타필드 고양'], ['2019', '킨텍스원시티 입주'], ['2021', '향동지구 상가 분양(05) · 삼송역 오피스텔·상가 입주 예정(12)'], ['2023', '향동 지식산업센터 준공(07)'], ['2024', 'GTX-A 킨텍스역']];
  return <>
    <Claim tag="경쟁 상권 · 신도시 구조 (행안부 인허가 · SGIS 인구)" title="기존 상권(장항2동·킨텍스·스타필드)은 순증 0 근처로 포화됐고, 새 점포의 순증은 향동·삼송 신규 택지로 옮겨 갔다.">
      고양시 44개 행정동 전체에서 <b>방문형(CORE) 점포의 신규 − 폐업 순증</b>을 같은 방식으로 계산했습니다. 2022~24년에 순증이 뚜렷하게 양수인 곳은 화전동(향동지구)과 삼송1동(삼송지구)뿐이고, 상가 분양·지식산업센터 준공·오피스텔 입주 시점과 대체로 겹칩니다. 장항2동·대화동·창릉동은 신규 ≈ 폐업입니다. 함께 신규 진입 몫, 스타필드 개장 전후, 동별 인구를 봅니다.
    </Claim>
    <div className="ts-kpis">
      <div><span>방문형 순증 2022~24 · 화전동(향동) / 삼송1동</span><strong>{sn(n5('화전동').avg2224)} / {sn(n5('삼송1동').avg2224)}건/년</strong><small>2016~19년 {sn(n5('화전동').avg1619)} / {sn(n5('삼송1동').avg1619)}건/년에서 증가</small></div>
      <div><span>같은 기간 장항2동 · 대화동 · 창릉동</span><strong>{sn(n5('장항2동').avg2224)} · {sn(n5('대화동').avg2224)} · {sn(n5('창릉동').avg2224)}건/년</strong><small>신규 ≈ 폐업(포화) · 2016~19년 대화동·창릉동은 연 +70 안팎</small></div>
      <div><span>방문형 신규 인허가 중 장항2동 몫</span><strong>{first.jh2.toFixed(1)}% → {last.jh2.toFixed(1)}%</strong><small>{first.year} → {last.year} · 스타필드 개장 전인 2011~12년부터 감소</small></div>
    </div>
    <div className="story-visual-grid">
      <Panel kicker="방문형(CORE) 신규 − 폐업 기록 · 연평균 · 고양시 44개 동 중 5곳" title="기존 상권은 포화, 순증은 향동·삼송 신규 택지로" option={net5Option} height={350}
        note={<>회색 = 기존 상권(대화동·창릉동), 파랑 = 장항2동, 초록 = 신규 택지. 연한 막대 2016~19, 진한 막대 2022~24. 화전동은 2020~21년(연 {sn(n5y('화전동', 2020))}·{sn(n5y('화전동', 2021))})과 2023~24년, 삼송1동은 2021~22년({sn(n5y('삼송1동', 2021))}·{sn(n5y('삼송1동', 2022))})에 컸고 상가·지식산업센터 공급 시점과 대체로 겹칩니다. 화전동 기록은 대부분 향동동입니다. 2025년(참고) 장항2동 {sn(n5('장항2동').net2025)}. 폐업 = 현재 상태 폐업 + 폐업일자, 즉석판매제조가공업 제외, 좌표 → 2024년 2분기 행정동 경계.</>} />
      <Panel kicker="연간 · 고양시 방문형(CORE) 신규 인허가 중 각 동의 몫" title="신규 진입의 몫: 장항2동은 2011~12년부터 감소" option={shareOption}
        note={<>즉석판매제조가공업 제외(포함하면 장항2동 {first.jh2Incl.toFixed(1)}%→{last.jh2Incl.toFixed(1)}%, 대화동 {first.daehwaIncl.toFixed(1)}%→{last.daehwaIncl.toFixed(1)}%). 대화동은 2018년부터 장항2동을 앞섰지만 폐업도 함께 늘어 순증으로는 성장하지 않았습니다. 인허가 기록 수는 점포 수가 아닙니다.</>} />
      <Panel kicker="스타필드 고양 개장(2017-08) 전후 24개월 · 방문형 신규 인허가 변화율" title="개장 무렵에도 장항2동의 신규 진입은 줄었다" option={sfOption}
        note={<>개장 전 2015.08~2017.07, 개장 후 2017.09~2019.08(개장 월 제외), 즉석판매제조가공업 제외. 장항2동 {sfJh.before}→{sfJh.after}건, 고양시 전체 {pct(sfGy.pct)}. 개장 전부터 이어진 흐름이라 스타필드만의 효과로 볼 수 없습니다.</>} />
      <Panel kicker="SGIS 행정동 인구 · 2018 → 2024 변화율" title="1기 신도시 주거지는 줄고, 신규 개발지는 늘었다" option={popOption} height={360}
        note={<>장항2동 바로 옆 1기 신도시 6개 동(마두1·2, 주엽1·2, 정발산, 백석1) 합은 {pct(near6.pct1824)}(고양시 {pct(gyPop.pct1824)}). 회색 = 1기 신도시 주거지(마두·주엽·정발산·백석), 초록 = 신규 개발지, 파랑 = 장항2동. 장항1동은 {pct(jh1.pct)}({jh1.p2018.toLocaleString()}→{jh1.p2024.toLocaleString()}명)로 막대는 +100%에서 잘랐습니다. 각 연도 경계 기준.</>} />
      <article className="panel chart-panel ts-panel">
        <div className="panel-head"><div><span className="kicker">개발 연표</span><h3>라페스타 뒤로 이어진 주변 개발</h3></div></div>
        <table className="evidence-table" style={{ minWidth: 0 }}><tbody>{timeline.map(([y, t]) => <tr key={y + t}><td>{y}</td><td>{t}</td></tr>)}</tbody></table>
        <div className="chart-note">개장·입주 연도는 언론 보도로 확인(보고서 참고문헌). 킨텍스원시티는 분양 당시 예정 시기입니다.</div>
      </article>
    </div>
    <div className="ts-open" style={{ marginTop: 18 }}>
      <b>킨텍스 방문은 라페스타로 이어지나: 판단 보류</b>
      <ul>
        <li>대형 행사(4홀 이상)가 열린 토요일의 대화동→장항동 이동은 평균 843건으로, 행사가 없는 날(672건)보다 조금 많았지만 라페스타로 이어지는지는 판단을 보류했습니다.</li>
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
  const wedNoon = get('평일(수)', '유입', '낮 12~15');
  const bus = data.busSide.filter((r: any) => r.fullCoverage);
  const cell = (v?: number) => v == null ? '–' : <span className={v <= -5 ? 'ts-down' : v >= 5 ? 'ts-up' : ''}>{pct(v)}</span>;
  return <>
    <div className="story-claim" style={{ marginTop: 24 }}>
      <span>요일·시간대로 나누어 보기 · 회복기(2022.05~2023.05) → 엔데믹 전환 이후(2023.06~2024.12)</span>
      <h3>주말 이동은 들어오고 나가는 쪽 모두 줄었고, 토요일 낮 유입이 가장 크게 줄었다. 수요일 이동은 유지됐다.</h3>
      <p>같은 대표일 표본을 수요일과 토요일로 나누고, 고양시 다른 법정동과 장항동 사이 이동을 시간대별로 비교했습니다. 비교 지역이 없어 통계 검정은 하지 않았습니다.</p>
    </div>
    <div className="ts-kpis">
      <div><span>토요일 낮 12~15시 · 장항동으로 들어오는 이동</span><strong>{pct(sat.recoveryToEndemic)}</strong><small>같은 시간 나가는 이동 {pct(satOut.recoveryToEndemic)} · 토요일 하루 전체는 유입 {pct(get('주말(토)', '유입', '전체 24시간')?.recoveryToEndemic)}, 유출 {pct(get('주말(토)', '유출', '전체 24시간')?.recoveryToEndemic)}로 함께 감소</small></div>
      <div><span>수요일 낮 12~15시 · 들어오는 이동</span><strong>{pct(wedNoon.recoveryToEndemic)}</strong><small>같은 낮 시간대인데 평일은 유지 · 하루 전체 {pct(wed.recoveryToEndemic)}</small></div>
      <div><span>STCIS 장항동은 장항2동을 대표하나</span><strong>약 {Math.round(bus.reduce((s: number, r: any) => s + r.jh2SharePct, 0) / bus.length)}%</strong><small>법정 장항동 버스 승하차 중 장항2동 쪽 정류장 몫({bus.map((r: any) => r.year).join('·')}년) · 법정 장항동 안에는 지하철역이 없음</small></div>
    </div>
    <div className="evidence-table-wrap"><table className="evidence-table">
      <thead><tr><th>요일 · 방향</th>{slots.map(s => <th key={s}>{s}</th>)}</tr></thead>
      <tbody>{['주말(토)', '평일(수)'].flatMap(day => ['유입', '유출'].map(flow => <tr key={day + flow}><td>{day} {flow}</td>{slots.map(s => <td key={s}>{cell(get(day, flow, s)?.recoveryToEndemic)}</td>)}</tr>))}</tbody>
    </table></div>
    <p className="synthesis-method">표에는 없지만 직전 단계인 충격기 말(2021-03~10) → 회복기에는 토요일 하루 유입이 월평균 3,698 → 3,916건으로 {pct(get('주말(토)', '유입', '전체 24시간')?.shockToRecovery)} 늘었습니다. 즉 토요일 유입은 회복기에 한 번 늘었다가 엔데믹 전환 이후 그보다 {pct(get('주말(토)', '유입', '전체 24시간')?.recoveryToEndemic)} 줄었습니다. 유입 = 고양시 다른 법정동 → 장항동, 유출 = 장항동 → 고양시 다른 법정동. 월평균 변화율(고정 칸). 출발지 거리별로 나눈 결과는 06 종합의 '방문자 구성과 정주'에 있습니다. STCIS는 법정동 단위로만 제공되어 장항2동만 따로 받을 수 없지만, 법정 장항동의 대중교통 이용은 대부분 장항2동 쪽 정류장에서 일어납니다. 2022~2023년은 버스 집계 범위가 줄어 몫 계산에서 뺐습니다.</p>
  </>;
}

/* ───────────── 06 종합: 상권 성격의 변화(가설) ───────────── */
export function CharacterShift({ active }: { active: boolean }) {
  const { data, error } = useCompetition(active);
  if (!data) return <Loading error={error} />;
  const ci: any[] = data.cardIndustry;
  const c19 = ci[0], c23 = ci[ci.length - 1];
  const st: any[] = data.storeStock;
  const sOf = (g: string) => st.find(r => r.group === g);
  const ng: any[] = data.coreNetByGroup;
  const med = ng.find(r => r.label === '의료');
  const sn = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}`.replace('-', '−');
  const netGroupOption = {
    animationDuration: 250,
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => `${sn(v)}곳/년` },
    legend: { top: 0, textStyle: axisText },
    grid: { left: 80, right: 40, top: 34, bottom: 24 },
    xAxis: { type: 'value', name: '곳/년', axisLabel: axisText, splitLine: { lineStyle: { color: '#e8eef1' } } },
    yAxis: { type: 'category', inverse: true, data: ng.map(r => r.label), axisLabel: axisText },
    series: [
      { name: '2016~19', type: 'bar', barMaxWidth: 12, data: ng.map(r => ({ value: r.net1619, itemStyle: { color: r.label === '의료' ? '#a6c8ff' : '#c6c6c6' } })), itemStyle: { color: '#c6c6c6' } },
      { name: '2022~24', type: 'bar', barMaxWidth: 12, data: ng.map(r => ({ value: r.net2224, itemStyle: { color: r.label === '의료' ? C.jh : '#161616' } })), itemStyle: { color: '#161616' },
        label: { show: true, position: 'right', formatter: (q: any) => sn(q.value), fontSize: 11, color: '#161616' } },
    ],
  };
  const mp: any[] = data.medicalPhase;
  const sn1 = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}`.replace('-', '−');
  const satNoon = data.stcisPhase.find((r: any) => r.day === '주말(토)' && r.flow === '유입' && r.slot === '낮 12~15');
  const wedNoon = data.stcisPhase.find((r: any) => r.day === '평일(수)' && r.flow === '유입' && r.slot === '낮 12~15');
  const cardOption = {
    animationDuration: 250, color: ['#161616', C.accent, C.orange, C.purple],
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${v}%` },
    legend: { top: 0, textStyle: axisText },
    grid: { left: 44, right: 18, top: 42, bottom: 30 },
    xAxis: { type: 'category', data: ci.map(r => r.window), axisLabel: axisText },
    yAxis: { type: 'value', name: '%', axisLabel: axisText, splitLine: { lineStyle: { color: '#e8eef1' } } },
    series: [
      { name: '전체', type: 'line', data: ci.map(r => r.total), lineStyle: { width: 3, type: 'dashed' }, symbolSize: 7 },
      { name: '의료', type: 'line', data: ci.map(r => r.medical), lineStyle: { width: 3 }, symbolSize: 7, label: { show: true, formatter: '{c}%', fontSize: 11 } },
      { name: '음식·주점', type: 'line', data: ci.map(r => r.food), symbolSize: 6 },
      { name: '미용', type: 'line', data: ci.map(r => r.beauty), symbolSize: 6 },
    ],
  };
  const stockOption = {
    animationDuration: 250, color: [C.jh, C.comp],
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => pct(v) },
    legend: { top: 0, textStyle: axisText },
    grid: { left: 110, right: 50, top: 34, bottom: 24 },
    xAxis: { type: 'value', name: '%', axisLabel: axisText, splitLine: { lineStyle: { color: '#e8eef1' } } },
    yAxis: { type: 'category', inverse: true, data: st.map(r => r.group), axisLabel: axisText },
    series: [
      { name: '장항2동', type: 'bar', barMaxWidth: 12, data: st.map(r => r.jhPct), label: { show: true, position: 'right', formatter: (q: any) => pct(q.value), fontSize: 11, color: '#161616' } },
      { name: '고양시', type: 'bar', barMaxWidth: 12, data: st.map(r => r.gyPct) },
    ],
  };
  return <>
    <Claim tag="종합 · 상권 성격의 변화 · 카드 업종 · 영업 점포 수 · 요일별 유입" title="장항2동은 주말 여가형에서 생활·의료형 상권으로 바뀌고 있다.">
      카드 매출의 고양시 내 몫은 2023년에 2019년 수준으로 돌아왔지만, 이를 끌어올린 것은 <b>의료</b>였고 음식·주점과 미용 몫은 줄었습니다. 영업 점포 수도 여가·오락이 줄고 의료·미용은 늘었고, 방문형 인허가 순증으로 보면 음식점은 순감이 이어지고 의료는 문을 거의 닫지 않고 쌓였습니다. 같은 시기 토요일 낮 유입은 줄고 수요일 낮 유입은 유지됐습니다.
    </Claim>
    <div className="ts-kpis">
      <div><span>카드 몫 · 전체</span><strong>{c19.total.toFixed(2)}% → {c23.total.toFixed(2)}%</strong><small>{c19.window} → {c23.window} · 39개 동·같은 달</small></div>
      <div><span>카드 몫 · 의료 / 음식·주점 / 미용</span><strong>{c19.medical.toFixed(1)}→{c23.medical.toFixed(1)}% · {c19.food.toFixed(1)}→{c23.food.toFixed(1)}% · {c19.beauty.toFixed(1)}→{c23.beauty.toFixed(1)}%</strong><small>장항2동 카드 매출 중 의료 비중 {Math.round(c19.medicalMix)}% → {Math.round(c23.medicalMix)}%</small></div>
      <div><span>영업 점포 수 2019→2024 · 여가·오락 / 의료</span><strong>{pct(sOf('여가·오락·체육').jhPct)} / {pct(sOf('의료').jhPct)}</strong><small>고양시 {pct(sOf('여가·오락·체육').gyPct)} / {pct(sOf('의료').gyPct)}</small></div>
      <div><span>의료 점포 순증(곳/년) · 코로나 이전 → 충격기 → 회복기 → 이후</span><strong>{mp.map(r => sn1(r.jh)).join(' → ')}</strong><small>고양시(장항2동 제외) {mp.map(r => sn1(r.gyEx)).join(' → ')} · 코로나 때 함께 늘었지만 이후 고양시가 줄 때 장항2동은 유지(계기 + 지속)</small></div>
      <div><span>낮 12~15시 유입 · 토요일 / 수요일</span><strong>{pct(satNoon.recoveryToEndemic)} / {pct(wedNoon.recoveryToEndemic)}</strong><small>회복기 → 엔데믹 전환 이후 · 법정 장항동</small></div>
    </div>
    <div className="story-visual-grid">
      <Panel kicker="카드 매출 · 장항2동 ÷ 고양시(39개 동, 8~12월) · 업종별 몫" title="소비 몫의 회복은 의료가 이끌었다" option={cardOption}
        note={<>업종별 합 = 업종전체(TO)임을 확인했고, 같은 2자리 업종 코드·같은 동 구성·같은 달끼리만 비교합니다. 음식·주점 = L0·L1·M0·M1, 미용 = K0, 의료 = J0. 3자리 코드 구간(44개 동, 1~6월)도 같은 방향입니다(2022→2025 의료 16.7→18.4%, 미용 18.2→14.1%, 2025년은 연구 기간 밖 참고). 금액 단위·카드사는 공개되지 않아 몫으로만 봅니다.</>} />
      <Panel kicker="인허가 기록 · 연말 영업 점포 수 · 2019 → 2024 변화율" title="여가·오락은 줄고 의료·미용은 늘었다" option={stockOption} height={330}
        note={<>연말 영업 점포 = 인허가일 ≤ 연말이고, 현재 영업 중이거나 연말 뒤에 폐업한 기록. 장항2동 일반음식점 {sOf('일반음식점').jh2019}→{sOf('일반음식점').jh2024}개(고양시 {pct(sOf('일반음식점').gyPct)}). 라페스타·웨스턴돔 구역만 보면 음식점은 유지, 라페스타 카페·제과 35→25개(2015→2024)·여가 24→16개로 줄었고, 의료 증가는 주로 두 상권 밖이었습니다. 인허가 기록은 실제 점포와 다를 수 있습니다.</>} />
      <Panel kicker="방문형(CORE) 인허가 · 신규 − 폐업 기록 · 장항2동 연평균" title={`음식점은 빠지고, 의료는 거의 닫지 않고 쌓였다 (의료 ${sn(med.net1619)} → ${sn(med.net2224)}곳/년)`} option={netGroupOption} height={330}
        note={<>연한 막대 2016~19, 진한 막대 2022~24(파랑 = 의료). 의료는 신규가 연 {med.new1619.toFixed(1)} → {med.new2224.toFixed(1)}곳으로 줄었지만 폐업이 {med.closed1619.toFixed(1)} → {med.closed2224.toFixed(1)}곳으로 더 크게 줄어(고양시 {med.gyClosed1619.toFixed(1)} → {med.gyClosed2224.toFixed(1)}곳) 순증이 늘었습니다. 새로 몰려든 것이 아니라 <b>문을 거의 닫지 않은 것</b>입니다. 순증이 가장 큰 업종은 여전히 미용입니다. 즉석판매제조가공업·주점은 제외, 장항2동은 좌표 기준 경계 안 기록만 셉니다.</>} />
    </div>
  </>;
}

/* ───────────── 06 종합: 방문자 구성과 정주 ───────────── */
export function SettlementStory({ active }: { active: boolean }) {
  const { data, error } = useCompetition(active);
  if (!data) return <Loading error={error} />;
  const sd: any[] = data.stcisDistance;
  const g = (day: string, slot: string, o: string) => sd.find(r => r['요일'] === day && r['시간대'] === slot && r['출발지'] === o);
  const near = g('주말(토)', '전체 24시간', '3km 이내'), far = g('주말(토)', '전체 24시간', '3km 초과');
  const nearNoon = g('주말(토)', '낮 12~15', '3km 이내'), farNoon = g('주말(토)', '낮 12~15', '3km 초과');
  const sp: any[] = data.settlePop;
  const pj = sp.find(r => r.label === '장항2동'), pn = sp.find(r => r.label === '인접 1기 신도시 6개 동'), pg = sp.find(r => r.label === '고양시 전체');
  const n0 = (v: number) => v.toLocaleString('ko-KR');
  return <>
    <Claim tag="종합 · 방문자 구성과 정주 · STCIS 출발지 거리 · SGIS 거주 인구" title="주말 방문은 가까운 주민과 먼 주민 모두에서 줄었고, 상권을 받치는 인접 주거지 인구도 줄었다.">
      STCIS 유입은 고양시 다른 법정동에서 장항동으로 오는 이동이라, 여기서 줄어든 주말 방문은 고양시 주민의 방문입니다. 출발 법정동을 장항동까지의 거리로 나누면 3km 이내 인접 4개 동(마두·주엽·대화·백석)이 토요일 유입의 약 {Math.round(near['비중(회복기) %'])}%를 차지했고, 회복기 → 엔데믹 전환 이후 두 쪽이 거의 같이 줄어 비중은 그대로였습니다. 정주 쪽에서는 장항2동 인구가 거의 그대로인데, 배후 주거지인 인접 1기 신도시 6개 동은 고양시가 늘 때 줄었습니다. 상권 수요가 주말 여가 방문에서 주변 거주자의 생활·의료 수요로 옮겨 가는 상황에서, 그 수요를 받치는 배후 인구가 줄고 있다는 뜻입니다.
    </Claim>
    <div className="ts-kpis">
      <div><span>토요일 유입 중 3km 이내 인접 4개 동 비중</span><strong>{near['비중(회복기) %'].toFixed(1)}% → {near['비중(엔데믹 이후) %'].toFixed(1)}%</strong><small>회복기 → 엔데믹 전환 이후 · 비중 변화 없음</small></div>
      <div><span>토요일 하루 유입 · 3km 이내 / 초과</span><strong>{pct(near['회복기→엔데믹 이후 %'])} / {pct(far['회복기→엔데믹 이후 %'])}</strong><small>낮 12~15시 {pct(nearNoon['회복기→엔데믹 이후 %'])} / {pct(farNoon['회복기→엔데믹 이후 %'])} · 가까운 주민·먼 주민 모두 감소</small></div>
      <div><span>거주 인구 2018→2024 · 인접 1기 신도시 6개 동</span><strong>{pct(pn.pct1824)}</strong><small>{n0(pn['2018'])} → {n0(pn['2024'])}명 · 고양시 {pct(pg.pct1824)}</small></div>
      <div><span>거주 인구 2018→2024 · 장항2동</span><strong>{pct(pj.pct1824)}</strong><small>{n0(pj['2018'])} → {n0(pj['2024'])}명 · 거의 그대로</small></div>
    </div>
    <div className="evidence-table-wrap"><table className="evidence-table">
      <thead><tr><th>거주 인구 (SGIS)</th><th>2018</th><th>2022</th><th>2024</th><th>2018→24</th><th>2022→24</th></tr></thead>
      <tbody>{sp.map(r => <tr key={r.label}><td>{r.label === '인접 1기 신도시 6개 동' ? '인접 1기 신도시 6개 동(마두1·2, 주엽1·2, 정발산, 백석1)' : r.label}</td><td>{n0(r['2018'])}</td><td>{n0(r['2022'])}</td><td>{n0(r['2024'])}</td><td>{r.label === '인접 1기 신도시 6개 동' ? <b>{pct(r.pct1824)}</b> : pct(r.pct1824)}</td><td>{pct(r.pct2224)}</td></tr>)}</tbody>
    </table></div>
    <p className="synthesis-method">출발지 거리 = 출발 법정동 대표점에서 장항동 대표점까지의 직선거리(3km 이내: 마두동·주엽동·대화동·백석동). 같은 고정 칸·시기 월평균 방식이며, 거리별 합계는 위 03 인구이동의 토요일 값(−8.8%, 낮 −12.5%)과 같습니다.</p>
  </>;
}

/* ───────────── 07 결론과 활성화 방향 ───────────── */
export function ConclusionStrategy() {
  const steps = [
    { rank: '① 문제', title: '들고 나는 흐름이 멈춘 상권', basis: '공실 보도가 이어지는데 방문형 순증 연 +14곳(고양시 +384곳), 방문형 신규 −27.4%, 사업체 −7.6%(고양시 +8.7%)' },
    { rank: '② 목표', title: '음식·주점 소비 회복', basis: '장항2동 카드 매출 중 음식·주점 35.0% → 28.2%(2019→2023), 고양시 음식·주점 매출 중 장항2동 몫 14.7% → 12.2%, 일반음식점 순증 연 −41 → −20곳' },
    { rank: '③ 수단', title: '주말 낮·오후 방문 회복', basis: '토요일 낮 유입 −12.5%·오후 −10.3%, 충격기 음식·주점 −28.1% vs 의료 +7.1%. 정발산역 이용 회복은 기대 효과' },
    { rank: '④ 실행', title: '공실을 음식·주점 입점으로', basis: '빈 점포 영화제·거리 사업처럼 행사로 채우는 데서 나아가 팝업·시범 입점을 실제 임차로. 킨텍스 연계는 현장 확인 후' },
  ];
  return <>
    <Claim tag="연구 질문별 결론" title="장항2동은 주말 여가형에서 생활·의료형 상권으로 바뀌고 있고, 새 점포 진입과 주말 방문이 약해졌다.">
      순증은 0 근처인데 사업체·종사자가 줄어 성장보다는 <b>정체~소폭 위축</b>입니다. 주변 기존 상권도 포화되어 새 점포의 순증은 향동·삼송 신규 택지로 옮겨 갔고, 상권을 받치는 <b>인접 1기 신도시의 거주 인구도 줄고 있습니다</b>(2018→2024 −11.1%).
    </Claim>
    <div className="conclusion-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
      <div><h4>Q1. 상업활동</h4><p>충격은 공통이었지만 <b>장항2동이 더 크게</b> 흔들렸고, 이후 <b>새 점포 진입이 약해져</b> 정체~소폭 위축(사업체 2020→2024 −7.6%, 고양시 +8.7%). 소비 몫 회복은 <b>의료가 이끌었고</b>(코로나 때 시작, 이후에도 유지) 음식·주점·미용 몫은 줄었다.</p></div>
      <div><h4>Q2. 인구 이동</h4><p>엔데믹 전환 이후 <b>주말(특히 토요일 낮) 유입</b>이 줄었다(−12.5%). 토요일은 유입·유출이 함께 줄었고, 수요일 이동은 유지됐다(낮 +1.9%). <b>가까운 동·먼 동 모두</b> 줄었고, 인접 주거지 인구도 감소했다.</p></div>
      <div><h4>Q3. 대중교통 수요</h4><p>철도는 비교 역과 같은 폭으로 회복했다. <b>정발산역 비율</b>은 코로나 전부터 낮아졌다(2018 9.31% → 2024 7.75%).</p></div>
      <div><h4>Q4. 경쟁 상권 <small style={{ fontWeight: 400, color: '#6f6f6f' }}>최종 분석에서 추가</small></h4><p>장항2동·대화동(킨텍스)·창릉동(스타필드) <b>기존 상권은 모두 순증 0(포화)</b>이고, 새 점포 순증은 <b>향동·삼송 신규 택지</b>로 옮겨 갔다.</p></div>
    </div>
    <div className="evidence-table-wrap"><table className="evidence-table">
      <thead><tr><th>단계</th><th>활성화 방향</th><th>근거</th></tr></thead>
      <tbody>{steps.map(s => <tr key={s.rank}><td>{s.rank}</td><td><b>{s.title}</b></td><td>{s.basis}</td></tr>)}</tbody>
    </table></div>
    <p className="synthesis-method"><b>유지되는 기반: 의료.</b> 카드 의료 몫이 늘고 의료 점포 순증이 코로나 뒤에도 유지돼, 줄지 않는 수요로 보고 위 방향과 함께 갑니다. 다만 이 생활·의료 수요의 바탕인 인접 주거지 인구가 줄고 있어, 상권 활성화와 함께 주변 1기 신도시의 정주 여건도 같이 봐야 합니다.</p>
    <div className="ts-cause-grid">
      <div className="ts-cause ts-cause-int"><span>④ 실행의 출발점 · 현재 라페스타 공실 활용 사례</span><h4>행사로 채우는 데서 실제 임차로</h4><p>빈 점포 독립 영화제(2026-10, A동 빈 점포 두 곳을 상영·전시 공간으로), 거리 중심 상권 살리기 프로젝트(정원·공연), 서브컬처 축제, 시의회의 장기 공실 실험 창업공간·청년 예술공간 제안. 연구 기간(2018~2024) 밖의 사례입니다.</p></div>
    </div>
    <div className="ts-open" style={{ marginTop: 18 }}>
      <b>향후 과제</b>
      <ul>
        <li>① 2022년 이후 새 점포 진입이 적었던 이유와 2020년 충격이 컸던 이유를 라페스타·웨스턴돔의 입점·공실·임대·방문객 자료로 확인한다.</li>
        <li>② 킨텍스 방문객이 라페스타로 이어지는지 현장 조사·설문으로 직접 확인한다.</li>
        <li>③ 의료 방문이 음식·주점 등 다른 소비로 이어지는지 확인한다.</li>
        <li>④ 주민등록 전입·전출과 연령별 인구로 장항2동·인접 동의 정주 변화(고령화, 신규 택지로의 이주)를 확인해 상권 수요 변화와 연결한다.</li>
      </ul>
    </div>
    <div className="ts-cause-grid" style={{ marginTop: 18 }}>
      <div className="ts-cause ts-cause-ext"><span>활용 · 시·구청 상권 담당</span><h4>사업 시기·지표 점검</h4><p>상권 사업의 대상 시기와 지표를 점검하고, 사업 전후를 비교하는 기준선으로 씁니다.</p></div>
      <div className="ts-cause ts-cause-int"><span>활용 · 라페스타·웨스턴돔 상인회</span><h4>행사·팝업 시기 정하기</h4><p>주말·행사일 방문 흐름을 보고 행사와 팝업 시기를 정합니다.</p></div>
      <div className="ts-cause ts-cause-str"><span>활용 · 창업 예정자·연구자</span><h4>동별 진입 흐름 확인</h4><p>동별 신규 진입·순증을 확인하고, 상세 탐색에서 표·CSV를 내려받습니다.</p></div>
    </div>
  </>;
}
