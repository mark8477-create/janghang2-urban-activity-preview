import { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { EventChart, align, indexTo, monthRange, rolling12, type TsArea, type TsEvent } from './EventChart';

type Ts = Record<string, any>;
let cache: Promise<Ts> | null = null;
export function useTimeseries(active: boolean) {
  const [data, setData] = useState<Ts | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!active) return;
    cache ??= fetch(`${import.meta.env.BASE_URL}data/timeseries.json`).then(r => { if (!r.ok) throw new Error(`timeseries: HTTP ${r.status}`); return r.json(); });
    let alive = true;
    cache.then(d => alive && setData(d)).catch(e => { cache = null; if (alive) setError(String(e)); });
    return () => { alive = false; };
  }, [active]);
  return { data, error };
}

// IBM(Carbon) 데이터 시각화 팔레트: 장항2동 = IBM Blue, 비교 지역 = 회색, 보조 계열 = Magenta 70 · Green 60 · Purple 70
const C = { jh: '#0f62fe', comp: '#8d8d8d', comp2: '#c6c6c6', accent: '#9f1853', green: '#198038', purple: '#6929c4' };
const pctTxt = (v?: number | null, d = 1) => v == null || !Number.isFinite(v) ? '–' : `${v > 0 ? '+' : ''}${v.toFixed(d)}%`;
const PHASE_AREAS: TsArea[] = [
  { from: '2019-01', to: '2019-12', label: '코로나 이전' },
  { from: '2020-03', to: '2021-10', label: '충격기', color: 'rgba(218,30,40,.06)' },
  { from: '2022-05', to: '2023-05', label: '회복기', color: 'rgba(36,161,72,.07)' },
  { from: '2023-06', to: '2024-12', label: '엔데믹 전환 이후', color: 'rgba(15,98,254,.05)' },
];
function Loading({ error }: { error: string }) { return <div className="load-state">{error ? `데이터 로딩 오류: ${error}` : '시계열 데이터를 불러오는 중…'}</div>; }
function Claim({ tag, title, children }: { tag: string; title: string; children: React.ReactNode }) { return <div className="story-claim"><span>{tag}</span><h3>{title}</h3><p>{children}</p></div>; }
function Finding({ title, children, tone = 'blue' }: { title: string; children: React.ReactNode; tone?: 'blue' | 'orange' | 'gray' | 'green' }) { return <div className={`ts-finding ts-finding-${tone}`}><b>{title}</b><p>{children}</p></div>; }

/* ───────────── 01 통합 타임라인 ───────────── */
export function IntegratedTimeline({ active }: { active: boolean }) {
  const { data, error } = useTimeseries(active);
  const months = useMemo(() => monthRange('2018-01', '2025-12'), []);
  if (!data) return <Loading error={error} />;
  const ev: TsEvent[] = data.events;
  // 카드: 구성이 같은(39개 동·2자리 코드) 공급 구간 A·B·C2·C4·D1의 장항2동 비중만 2019년 평균=100으로 잇는다.
  const cardShare = indexTo(months, align(months, data.card.monthly.filter((r: any) => r.observed && r.supplyDongCount === 39), (r: any) => r.share), '2019-01', '2019-12');
  // 44개 동 구성 구간도 같은 기준(39개 동 2019년 평균 비중=100)으로 나눠 점선으로 표시한다.
  const raw39 = align(months, data.card.monthly.filter((r: any) => r.observed && r.supplyDongCount === 39), (r: any) => r.share);
  const base39 = (() => { const b = raw39.filter((v, i) => v != null && months[i] >= '2019-01' && months[i] <= '2019-12') as number[]; return b.reduce((a, x) => a + x, 0) / b.length; })();
  const cardShare44 = align(months, data.card.monthly.filter((r: any) => r.observed && r.supplyDongCount === 44), (r: any) => r.share).map(v => v == null ? null : v / base39 * 100);
  const jhRoll = rolling12(align(months, data.mois.monthly, (r: any) => r.jh_new));
  const gyRoll = rolling12(align(months, data.mois.monthly, (r: any) => r.gyEx_new));
  const moisRatio = indexTo(months, jhRoll.map((v, i) => v != null && gyRoll[i] ? v / gyRoll[i]! : null), '2019-12', '2019-12');
  const railRatio = indexTo(months, align(months, data.rail.monthly, (r: any) => r.jeongbalsan / r.ilsanLineOthers), '2019-01', '2019-12');
  return <>
    <Claim tag="읽는 법" title="선이 100보다 아래로 내려가면, 같은 시기 비교 지역보다 장항2동이 더 약해졌다는 뜻입니다.">
      각 선은 <b>장항2동 값 ÷ 비교 지역 값</b>을 기준 시기 평균=100으로 맞춘 상대 지표입니다. 코로나·금리처럼 지역 전체에 함께 작용한 요인은 이 비율에서 상당 부분 상쇄됩니다. 그래서 선이 크게 꺾이는 시점은 <b>장항2동에서 따로 일어난 변화의 후보</b>입니다. STCIS는 비교 지역 자료가 없어 이 그림에서 뺐습니다.
    </Claim>
    <EventChart title="장항2동 ÷ 비교 지역 상대 지표" kicker="2018-01~2025-12 · 월별 · 기준 시기 평균=100" months={months} unit="상대 지수" events={ev} areas={PHASE_AREAS} filename="timeline_relative_index" height={400}
      series={[
        { name: '카드매출 비중(장항2동/고양시, 39개 동 구성)', data: cardShare, color: C.jh, width: 2.6 },
        { name: '카드매출 비중(44개 동 구성, 점선)', data: cardShare44, color: '#78A9FF', width: 2.2, dashed: true },
        { name: '신규 인허가 12개월 합 비율(장항2동/고양시 제외)', data: moisRatio, color: C.accent },
        { name: '정발산역/일산선 다른 10개 역', data: railRatio, color: C.purple },
      ]}
      note={<>기준: 카드·철도 2019년 평균, 인허가 2019-12의 12개월 합. 카드는 제공 구간 경계에서 금액이 5~7배(또는 0.2배) 급변하는데, <b>원인은 확인하지 못했습니다</b>(행정동 수 39·44개, 업종 코드가 바뀌는 시점과 겹침). 그래서 금액은 잇지 않고 장항2동의 고양시 내 비중으로 그렸으며, 44개 동 구성 구간은 <b>점선</b>으로 구분했습니다(같은 2019년 39개 동 평균=100 기준). 재난지원금처럼 고양시 전체에 같이 걸리는 효과는 비중에서 상쇄됩니다. 실제로 자료가 없는 기간은 2024-02~12뿐입니다. 인허가는 비교 지역에서 장항2동을 뺐고, 카드의 고양시 값에는 장항2동이 포함됩니다. <b>버스는 이 그림에서 뺐습니다.</b> 2021-12~2024-09 원자료 공급 축소 구간에 장항2동의 고양시 내 비중도 약 20% 뛰어, 비율로도 공급 변화를 걸러낼 수 없기 때문입니다(04 교통 수요 참고).</>} />
    <div className="ts-findings">
      <Finding title="① 2020년: 공통 충격 + 더 큰 낙폭" tone="orange">세 상대 지표가 모두 2020년에 떨어졌습니다. 코로나는 지역 전체에 작용했지만 장항2동이 더 크게 흔들렸다는 뜻입니다.</Finding>
      <Finding title="② 회복의 갈림: 소비는 회복, 창업은 부진">카드 비중은 2021년 바닥 뒤 2023년에 2019년 수준으로 올라왔습니다. 그러나 인허가 비율은 회복기(2022~23)에 오히려 더 내려갔고, 정발산역 비율도 2020년 수준에 머물렀습니다.</Finding>
      <Finding title="③ 소비 비중은 돌아왔고, 역 이용 비율은 계속 낮아짐" tone="gray">카드 비중은 2023년 8~12월에 2019년 같은 달 수준으로 돌아왔습니다. 반면 정발산역 비율(일산선 다른 10개 역 대비)은 코로나 이전(2018 9.31%→2019 8.85%)부터 낮아졌고 회복기에도 돌아오지 않았습니다. 장기 구조 요인의 후보입니다.</Finding>
    </div>
  </>;
}

/* ───────────── 02 상업 ───────────── */
function SgisChart({ rows }: { rows: any[] }) {
  const years = [2018, 2019, 2020, 2021, 2022, 2023, 2024];
  const get = (y: number, region: string, k: string) => rows.find(r => r.year === y && r.region === region)?.[k] ?? null;
  const idx = (region: string, k: string) => years.map(y => { const base = y <= 2019 ? get(2018, region, k) : get(2020, region, k); const v = get(y, region, k); return v != null && base ? v / base * 100 : null; });
  const seg = (arr: (number | null)[], first: boolean) => arr.map((v, i) => (first ? years[i] <= 2019 : years[i] >= 2020) ? v : null);
  const option = {
    grid: { left: 48, right: 20, top: 48, bottom: 36, containLabel: true }, legend: { top: 2, textStyle: { fontSize: 13, color: '#536673' } },
    tooltip: { trigger: 'axis', valueFormatter: (v: any) => v == null ? '–' : Number(v).toFixed(1), backgroundColor: '#161616', borderColor: '#161616', textStyle: { color: '#fff', fontSize: 13 } },
    xAxis: { type: 'category', data: years.map(String), axisLabel: { color: '#525252', fontSize: 12 }, axisLine: { lineStyle: { color: '#8d8d8d' } } },
    yAxis: { type: 'value', scale: true, name: '지수', axisLabel: { color: '#525252', fontSize: 12 }, splitLine: { lineStyle: { color: '#e0e0e0' } } },
    series: [
      ...[['장항2동 사업체', '장항2동', 'businesses', C.jh, 'solid'], ['고양시 사업체', '고양시', 'businesses', C.comp, 'solid'], ['장항2동 종사자', '장항2동', 'workers', C.jh, 'dashed'], ['고양시 종사자', '고양시', 'workers', C.comp, 'dashed']].flatMap(([name, region, k, color, type]) =>
        [true, false].map(first => ({ name, type: 'line', data: seg(idx(region, k), first), connectNulls: false, lineStyle: { color, type, width: 2.2 }, itemStyle: { color }, symbolSize: 6 }))),
    ],
    graphic: [{ type: 'text', left: '24%', top: 40, style: { text: '2019→2020 통계 계열 단절(연결하지 않음)', fill: '#da1e28', fontSize: 12 } }],
  };
  return <article className="panel chart-panel ts-panel"><div className="panel-head"><div><span className="kicker">SGIS · 연도 · 2018~19는 2018=100, 2020~24는 2020=100</span><h3>사업체·종사자: 장항2동과 고양시</h3></div></div><ReactECharts option={option} style={{ height: 330 }} notMerge /><div className="chart-note">2020→2024 사업체는 장항2동 −7.6%, 고양시 +8.7%입니다. 연간 가장 큰 감소는 <b>2023년 장항2동 사업체 10,844→10,057개(−7.3%)</b>이고, 같은 해 고양시는 +2.7%였습니다. 2019→2020은 전국사업체조사의 모집단이 바뀌어 잇지 않습니다(보고서 4.1절).</div></article>;
}

export function CommerceTimeStory({ active }: { active: boolean }) {
  const { data, error } = useTimeseries(active);
  const [moisScope, setMoisScope] = useState<'new' | 'newCore' | 'closed'>('new');
  const months = useMemo(() => monthRange('2018-01', '2025-06'), []);
  const mMonths = useMemo(() => monthRange('2019-01', '2024-12'), []);
  if (!data) return <Loading error={error} />;
  const ev: TsEvent[] = data.events;
  const cardA = data.card.monthly.filter((r: any) => r.episode === 'A');
  const cardMonths = monthRange('2018-01', '2020-12');
  // 6개월 미만 구간은 이름을 숨겨 겹침을 막고, 결측 구간은 '미관측'으로 표시한다.
  const episodes: TsArea[] = data.card.coverage.map((c: any) => ({ from: c.first, to: c.last, label: /MISSING/i.test(c.episode) ? '미관측' : (c.months ?? 0) >= 6 ? `공급 ${c.episode}` : '', color: /MISSING/i.test(c.episode) ? 'rgba(214,107,50,.10)' : undefined }));
  const scopeLabel = { new: '신규 인허가(전체 195개 업종)', newCore: '신규 인허가(CORE 60개 업종)', closed: '폐업 기록(현재 상태 폐업 + 폐업일자)' }[moisScope];
  const jh = rolling12(align(mMonths, data.mois.monthly, (r: any) => r[`jh_${moisScope}`]));
  const gy = rolling12(align(mMonths, data.mois.monthly, (r: any) => r[`gyEx_${moisScope}`]));
  const phase = (id: string) => data.phaseCompare.rows.find((r: any) => r.id === id)?.cells || [];
  const card = phase('card'), mNew = phase('mois_new'), mCore = phase('mois_core'), mClosed = phase('mois_closed');
  const matched: any[] = data.card.shareMatched;
  const g39 = (y: number) => matched.find(g => g.id === 'g39')?.windows.find((w: any) => w.year === y)?.share as number | undefined;
  const g44 = (y: number) => matched.find(g => g.id === 'g44')?.windows.find((w: any) => w.year === y)?.share as number | undefined;
  const allMonths = monthRange('2018-01', '2025-06');
  const share39 = align(allMonths, data.card.monthly.filter((r: any) => r.observed && r.supplyDongCount === 39), (r: any) => r.share);
  const share44 = align(allMonths, data.card.monthly.filter((r: any) => r.observed && r.supplyDongCount === 44), (r: any) => r.share);
  const bnd: any[] = data.card.boundaries;
  return <>
    <Claim tag="상업 · 카드매출 · SGIS 사업체·종사자 · 행안부 인허가" title="코로나 때 더 크게 줄었다. 소비 비중은 2023년에 돌아왔지만, 창업·사업체 지표는 장항2동만 따로 약해졌다.">
      비교 지역(고양시)과 같은 시기에 같은 방향으로 움직였는지를 기준으로 읽습니다. 카드는 2018-01~2025-06 전 기간을 쓰되, 공급 구간마다 금액 수준이 달라 <b>장항2동 비중을 같은 구성·같은 달끼리</b> 비교합니다. SGIS는 2019→2020 통계 단절 때문에 두 구간으로 나눕니다.
    </Claim>
    <div className="ts-kpis">
      <div><span>카드 비중 · 8~12월 · 39개 동 구간</span><strong>{g39(2019)?.toFixed(2)}% → {g39(2021)?.toFixed(2)}% → {g39(2023)?.toFixed(2)}%</strong><small>2019 → 2021(바닥) → 2023 · 충격기 금액은 장항2동 {pctTxt(card[1]?.localPct)}, 고양시 {pctTxt(card[1]?.compPct)}</small></div>
      <div><span>SGIS 사업체 2020→2024</span><strong>−7.6%</strong><small>고양시 +8.7% · 2023년 장항2동 −7.3%</small></div>
      <div><span>신규 인허가 · 회복기 vs 충격기</span><strong>{pctTxt(mNew[2]?.localPct)}</strong><small>고양시(장항2동 제외) {pctTxt(mNew[2]?.compPct)}</small></div>
      <div><span>CORE 인허가 · 엔데믹 전환 이후 vs 회복기</span><strong>{pctTxt(mCore[3]?.localPct)}</strong><small>고양시(장항2동 제외) {pctTxt(mCore[3]?.compPct)}</small></div>
    </div>
    <div className="story-visual-grid">
      <EventChart title="카드매출: 장항2동과 고양시(2018=100)" kicker="월별 · 동일 공급 A구간 2018-01~2020-12" months={cardMonths} unit="지수" events={ev}
        series={[{ name: '장항2동', data: indexTo(cardMonths, align(cardMonths, cardA, (r: any) => r.janghang2), '2018-01', '2018-12'), color: C.jh, width: 2.6 }, { name: '고양시', data: indexTo(cardMonths, align(cardMonths, cardA, (r: any) => r.goyang), '2018-01', '2018-12'), color: C.comp }]}
        filename="commerce_card_a_monthly" note={<>2020년 2~3월 1차 확산 때 두 지역이 함께 떨어졌고(3월 장항2동 71.9, 고양시 84.3), 5월 재난지원금 사용 시기에 함께 반등했습니다. 그러나 고양시는 2018년 수준(101.1)으로 돌아간 반면 장항2동은 86.2에 그쳤습니다. 8월 이후 재확산·거리두기 강화 때는 장항2동만 다시 크게 떨어졌습니다(12월 57.8 vs 85.0). 제공기관·금액 단위는 미확인이며, 관측 매출의 상대 변화로만 읽습니다.</>} />
      <EventChart title="카드매출 중 장항2동 비중: 전 기간(2018-01~2025-06)" kicker="월별 · 구성별로 색을 나눔 · 회색 띠 = 공급 구간" months={allMonths} unit="%" events={ev} areas={episodes}
        series={[{ name: '39개 동 · 2자리 코드 구간', data: share39, color: C.jh, width: 2.4 }, { name: '44개 동 · 3자리 코드 구간', data: share44, color: C.accent, width: 2.4 }]} filename="commerce_card_share_full"
        note={<>공급 구간이 바뀌면 장항2동과 고양시 금액이 함께 약 5~7배(또는 0.2배)로 뜁니다. 원인은 확인하지 못했지만(동 수·업종 코드 변경 시점과 겹침, 재난지원금 같은 실제 소비 변화 가능성도 배제하지 않음), 고양시 전체에 같이 걸리는 효과는 비중에서 상쇄되고 비중은 대체로 이어집니다(예: 2022-06 {bnd.find(b => b.to === '2022-07')?.shareFrom?.toFixed(2)}% → 2022-07 {bnd.find(b => b.to === '2022-07')?.shareTo?.toFixed(2)}%). 다만 2021-12 → 2022-01처럼 행정동 수·코드 체계가 바뀌는 곳에서는 비중도 {bnd.find(b => b.to === '2022-01')?.shareFrom?.toFixed(2)}% → {bnd.find(b => b.to === '2022-01')?.shareTo?.toFixed(2)}%로 뜁니다. 그래서 구성이 다른 구간끼리는 비교하지 않습니다. 2024년 2~12월은 미관측입니다.</>} />
      <article className="panel chart-panel ts-panel">
        <div className="panel-head"><div><span className="kicker">카드 · 전 기간 · 구성과 달을 맞춘 비교</span><h3>장항2동 비중: 같은 구성 · 같은 달끼리</h3></div></div>
        {matched.map(g => <div key={g.id} className="ts-matched">
          <b>{g.label} · {g.monthsLabel}</b>
          <table><thead><tr><th>연도</th>{g.windows.map((w: any) => <th key={w.year}>{w.year}</th>)}</tr></thead>
            <tbody><tr><td>장항2동 비중</td>{g.windows.map((w: any, i: number) => { const prev = g.windows[i - 1]; const d = prev ? w.share - prev.share : null; return <td key={w.year}>{w.share.toFixed(2)}%{d != null && <small className={d < 0 ? 'ts-down' : 'ts-up'}> {d > 0 ? '+' : ''}{d.toFixed(2)}%p</small>}</td>; })}</tr>
              <tr><td>공급 구간</td>{g.windows.map((w: any) => <td key={w.year}>{w.episodes.join('·')}</td>)}</tr></tbody></table>
        </div>)}
        <div className="chart-note">각 칸은 해당 달들의 장항2동 매출 합 ÷ 고양시 매출 합입니다. 공급 구간 사이에서 카드사·표본이 바뀌었는지는 알 수 없으므로 <b>참고 비교</b>입니다. 결과를 보면 39개 동 구간에서 코로나 때 내려간 비중(2019 {g39(2019)?.toFixed(2)}% → 2021 {g39(2021)?.toFixed(2)}%)은 2023년 {g39(2023)?.toFixed(2)}%로 2019년 수준으로 돌아왔습니다. 44개 동 구간에서는 2023년 상반기 {g44(2023)?.toFixed(2)}% 뒤 2025년 상반기 {g44(2025)?.toFixed(2)}%로 조금 낮아졌습니다(연구 연도축 밖).</div>
      </article>
      <SgisChart rows={data.sgis.rows} />
      <div className="ts-panel-wrap">
        <div className="story-subheading"><h4>행안부 인허가 12개월 이동합</h4><label className="selector"><span>범위</span><select value={moisScope} onChange={e => setMoisScope(e.target.value as any)}><option value="new">신규 · 전체</option><option value="newCore">신규 · CORE</option><option value="closed">폐업 기록</option></select></label></div>
        <EventChart title={`${scopeLabel}: 장항2동 vs 고양시(장항2동 제외)`} kicker="12개월 이동합 · 2019-12=100 · 2019-12~2024-12" months={mMonths} unit="지수" events={ev} areas={PHASE_AREAS.slice(1)}
          series={[{ name: '장항2동', data: indexTo(mMonths, jh, '2019-12', '2019-12'), color: C.jh, width: 2.6 }, { name: '고양시(장항2동 제외)', data: indexTo(mMonths, gy, '2019-12', '2019-12'), color: C.comp }]}
          filename={`commerce_mois_${moisScope}`} note={<>월별 기록은 들쭉날쭉해서 직전 12개월 합으로 추세를 봅니다. 인허가 기록 수는 실제 점포 수가 아니며, CORE는 연구용 분류입니다. 폐업 기록은 <b>현재 상태가 폐업</b>이고 폐업일자가 있는 기록만 셉니다. 말소·전출 등은 제외했습니다.</>} />
      </div>
    </div>
    <div className="ts-findings">
      <Finding title="코로나 충격: 장항2동이 더 크게" tone="orange">카드 A구간 월평균은 2019년 대비 충격기(2020-03~12)에 장항2동 {pctTxt(card[1]?.localPct)}, 고양시 {pctTxt(card[1]?.compPct)}였습니다. 같은 충격기에 신규 인허가도 고양시(장항2동 제외)는 {pctTxt(mNew[1]?.compPct)} 늘었지만 장항2동은 {pctTxt(mNew[1]?.localPct)}에 그쳤습니다.</Finding>
      <Finding title="소비 비중은 2023년에 회복" tone="green">같은 구성(39개 동)·같은 달(8~12월)로 보면 장항2동의 카드매출 비중은 2019년 {g39(2019)?.toFixed(2)}% → 2021년 {g39(2021)?.toFixed(2)}% → 2023년 {g39(2023)?.toFixed(2)}%입니다. 코로나 때의 더 큰 하락은 <b>소비에서는 일시적</b>이었던 것으로 보입니다(참고 비교).</Finding>
      <Finding title="회복기: 상업 진입 회복이 장항2동만 부진">거리두기 해제 뒤(2022-05~2023-05) 신규 인허가 월평균은 장항2동 {pctTxt(mNew[2]?.localPct)}, 고양시(장항2동 제외) {pctTxt(mNew[2]?.compPct)}입니다. 공통 회복 요인이 있었는데도 장항2동은 따로 줄었습니다. <b>지역 고유 요인의 후보</b>입니다.</Finding>
      <Finding title="2023년 중반 이후: 전체는 함께, 방문형 업종은 장항2동만" tone="gray">전체 신규 인허가는 두 지역이 비슷하게 줄었습니다({pctTxt(mNew[3]?.localPct)} vs {pctTxt(mNew[3]?.compPct)}). 금리·경기 같은 공통 요인의 후보입니다. 반면 CORE는 장항2동 {pctTxt(mCore[3]?.localPct)}, 고양시 {pctTxt(mCore[3]?.compPct)}입니다. SGIS 사업체도 2023년 장항2동만 크게 줄었습니다.</Finding>
      <Finding title="폐업 기록은 오히려 고양시가 더 늘어남" tone="green">폐업 기록 월평균 증가율은 회복기 장항2동 {pctTxt(mClosed[2]?.localPct)} vs 고양시 {pctTxt(mClosed[2]?.compPct)}, 이후 {pctTxt(mClosed[3]?.localPct)} vs {pctTxt(mClosed[3]?.compPct)}입니다. 장항2동의 약화는 '폐업 급증'보다 <b>새로 들어오는 영업이 줄어든 쪽</b>에 가깝게 보입니다(인허가 기록 기준).</Finding>
    </div>
  </>;
}

/* ───────────── 03 인구이동 ───────────── */
export function MobilityTimeStory({ active }: { active: boolean }) {
  const { data, error } = useTimeseries(active);
  const months = useMemo(() => monthRange('2021-01', '2025-12'), []);
  if (!data) return <Loading error={error} />;
  const ev: TsEvent[] = data.events;
  const rows = data.phaseCompare.rows;
  const sin = rows.find((r: any) => r.id === 'stcis_in')?.cells || [], sout = rows.find((r: any) => r.id === 'stcis_out')?.cells || [];
  const yearly = [2021, 2022, 2023, 2024, 2025].map(y => ({ y, i: data.stcis.monthly.filter((r: any) => r.month.startsWith(String(y))).reduce((s: number, r: any) => s + (r.inbound || 0), 0), o: data.stcis.monthly.filter((r: any) => r.month.startsWith(String(y))).reduce((s: number, r: any) => s + (r.outbound || 0), 0) }));
  return <>
    <Claim tag="인구이동 · STCIS 교통카드 OD(장항 법정동 내부)" title="저녁 시간대(16~19시) 이동은 2022년에 가장 많았고, 2023~24년에 줄었다가 2025년에 다시 늘었다.">
      STCIS는 2021년부터 월마다 수요일·토요일 하루씩만 수집한 대표일 표본입니다. 그래서 <b>코로나 이전과 비교할 수 없고</b>, 비교 지역 자료도 없어 외부 요인인지 지역 요인인지 이 자료만으로는 가를 수 없습니다. 장항 법정동은 장항2동 행정동보다 넓습니다.
    </Claim>
    <div className="ts-kpis">
      {yearly.map(r => <div key={r.y}><span>{r.y}년 16~19시 고정 패널</span><strong>{r.i.toLocaleString('ko-KR')}</strong><small>유입 · 유출 {r.o.toLocaleString('ko-KR')} (useStf)</small></div>)}
    </div>
    <EventChart title="STCIS 내부 고정 패널 16~19시: 월별 유입·유출" kicker="2021-01~2025-12 · 월 대표일(수+토) 합 · 장항 법정동" months={months} unit="useStf" events={ev} areas={PHASE_AREAS.slice(1)}
      series={[{ name: '유입', data: align(months, data.stcis.monthly, (r: any) => r.inbound), color: '#009d9a', width: 2.4 }, { name: '유출', data: align(months, data.stcis.monthly, (r: any) => r.outbound), color: '#8a3800' }]}
      filename="mobility_stcis_monthly" note={<>한 달 값이 대표일 두 날에서 나오므로 날씨·행사 같은 하루 사정에 크게 흔들립니다. 추세는 연 합계나 시기 평균으로 봅니다. 유입과 유출은 상대 지역·시간 슬롯 구성이 달라 빼서 순유입을 만들지 않습니다. <code>NOT_FOUND</code>·미반환 슬롯은 0이 아닙니다.</>} />
    <div className="ts-findings">
      <Finding title="엔데믹 전환 이후 감소">회복기(2022-05~2023-05) 대비 엔데믹 전환 이후(2023-06~2024-12) 월평균은 유입 {pctTxt(sin[3]?.localPct)}, 유출 {pctTxt(sout[3]?.localPct)}입니다. 같은 시기 상업 지표(CORE 인허가·SGIS 2023)도 약해졌습니다.</Finding>
      <Finding title="원인 판단은 보류" tone="gray">비교 지역이 없어 이 감소가 수도권 공통 흐름인지 장항 고유인지 가를 수 없습니다. 2025년 반등(연구 연도축 밖)도 같은 이유로 해석을 보류합니다.</Finding>
      <Finding title="보조 자료: 경기 목적 OD" tone="green">장항2동 행정동 도착 목적 OD TOTAL은 2023→2024 −12.6%(공통 232코드 −8.2%)입니다. 2년치만 있어 시계열 비교에는 쓰지 않고 '상세 데이터 탐색 → 이동'에 둡니다.</Finding>
    </div>
  </>;
}

/* ───────────── 04 교통 수요 ───────────── */
export function TransportTimeStory({ active }: { active: boolean }) {
  const { data, error } = useTimeseries(active);
  const rMonths = useMemo(() => monthRange('2015-01', '2025-12'), []);
  const bMonths = useMemo(() => monthRange('2020-01', '2026-07'), []);
  if (!data) return <Loading error={error} />;
  const ev: TsEvent[] = data.events;
  const rail = data.phaseCompare.rows.find((r: any) => r.id === 'rail')?.cells || [];
  const yrB = (y: number) => data.bus.monthly.filter((r: any) => r.month.startsWith(String(y))).reduce((s: number, r: any) => s + (r.goyang || 0), 0);
  const busShareMean = (from: string, to: string) => { const v = data.bus.monthly.filter((r: any) => r.month >= from && r.month <= to && r.goyang).map((r: any) => r.janghang2 / r.goyang * 100); return v.reduce((a: number, b: number) => a + b, 0) / v.length; };
  const breaks: TsArea[] = [{ from: '2021-12', to: '2024-09', label: '버스 집계 범위 축소 구간', color: 'rgba(214,107,50,.07)' }];
  const yr = (y: number, k: string) => data.rail.monthly.filter((r: any) => r.month.startsWith(String(y))).reduce((s: number, r: any) => s + r[k], 0);
  const shareYears = [2018, 2019, 2020, 2022, 2024, 2025].map(y => `${y} ${(yr(y, 'jeongbalsan') / yr(y, 'ilsanLineOthers') * 100).toFixed(2)}%`).join(' → ');
  return <>
    <Claim tag="교통 수요 · 정발산역 · 장항2동 버스 정류장" title="철도 이용은 코로나 때 더 크게 줄었다가 주변 역과 같은 폭으로 회복했다. 그러나 일산선 다른 역에 비해 정발산역 이용 비율은 계속 낮아지고 있다.">
      비교 기준은 같은 일산선의 다른 10개 역(대곡·대화·마두·백석·삼송·원당·원흥·주엽·지축·화정, 모두 고양시)과 고양시 전체 버스 정류장 승하차입니다.
    </Claim>
    <div className="ts-kpis">
      <div><span>정발산역 · 충격기 vs 2019</span><strong>{pctTxt(rail[1]?.localPct)}</strong><small>일산선 다른 역 {pctTxt(rail[1]?.compPct)}</small></div>
      <div><span>정발산역 · 회복기 vs 충격기</span><strong>{pctTxt(rail[2]?.localPct)}</strong><small>일산선 다른 역 {pctTxt(rail[2]?.compPct)}</small></div>
      <div><span>정발산역 · 이후 vs 회복기</span><strong>{pctTxt(rail[3]?.localPct)}</strong><small>일산선 다른 역 {pctTxt(rail[3]?.compPct)}</small></div>
      <div><span>버스 · 고양시 전체 연 승하차</span><strong>{(yrB(2021) / 1e6).toFixed(1)}백만 → {(yrB(2022) / 1e6).toFixed(1)}백만</strong><small>2021 → 2022 · 원자료 집계 범위 축소(고양시 정류장 절반 누락, 수요 변화 아님)</small></div>
    </div>
    <div className="story-visual-grid">
      <EventChart title="정발산역과 일산선 다른 역(2019=100)" kicker="월별 승하차 · 2015-01~2025-12" months={rMonths} unit="지수" events={ev} areas={PHASE_AREAS}
        series={[{ name: '정발산역', data: indexTo(rMonths, align(rMonths, data.rail.monthly, (r: any) => r.jeongbalsan), '2019-01', '2019-12'), color: C.purple, width: 2.6 }, { name: '일산선 다른 10개 역', data: indexTo(rMonths, align(rMonths, data.rail.monthly, (r: any) => r.ilsanLineOthers), '2019-01', '2019-12'), color: C.comp }]}
        filename="transport_rail_vs_ilsan" note={<>정발산역 비율(정발산역 ÷ 일산선 다른 10개 역, 연간): {shareYears}. 코로나 이전부터 낮아지기 시작했고(분홍 점선 = 2017-08 스타필드 고양 개장; 개장 전후 같은 속도로 낮아져 개장 시점에 따로 꺾인 흔적은 없음), 2020년에 크게 낮아진 뒤 회복기에도 원래 비율로 돌아오지 않았습니다. 2024-12 GTX-A(킨텍스·대곡역) 개통 뒤 2025년 비율이 더 낮아졌지만, 연구 연도축(2018~2024) 밖이라 참고로만 표시합니다.</>} />
      <EventChart title="버스 승하차: 장항2동·고양시·경기도(2020=100)" kicker="월별 · 2020-01~2026-07 · 관할(ORG_NM) 기준 합" months={bMonths} unit="지수" events={ev} areas={breaks}
        series={[{ name: '장항2동 정류장', data: indexTo(bMonths, align(bMonths, data.bus.monthly, (r: any) => r.janghang2), '2020-01', '2020-12'), color: C.green, width: 2.6 }, { name: '고양시 전체', data: indexTo(bMonths, align(bMonths, data.bus.monthly, (r: any) => r.goyang), '2020-01', '2020-12'), color: C.comp }, { name: '경기도 전체', data: indexTo(bMonths, align(bMonths, data.bus.monthly, (r: any) => r.gyeonggi), '2020-01', '2020-12'), color: C.comp2, dashed: true }]}
        filename="transport_bus_regional" note={<><b>2021-11-28에 고양시 정류장의 절반이 원자료에서 빠지고</b>(1,873 → 888개, 같은 요일 비교) 2024-09-28에 돌아왔습니다. 같은 달 STCIS·정발산역은 거의 변하지 않아, 이 두 변곡은 수요 변화가 아니라 원자료 집계 범위 변화입니다. 버스 절대값의 연도 비교 대신, 고양시 대비 장항2동 비중으로 봅니다. 2020-12-04는 미관측일이며 0으로 채우지 않았습니다.</>} />
    </div>
    <div className="ts-findings">
      <Finding title="코로나: 정발산역이 더 크게 줄었다" tone="orange">충격기 월평균은 2019년 대비 정발산역 {pctTxt(rail[1]?.localPct)}, 일산선 다른 역 {pctTxt(rail[1]?.compPct)}였습니다. 출퇴근보다 상업·여가 방문 비중이 큰 역이라 거리두기 영향을 더 받았을 가능성이 있습니다(가설).</Finding>
      <Finding title="회복 폭은 주변 역과 같다">회복기 반등은 정발산역 {pctTxt(rail[2]?.localPct)}, 다른 역 {pctTxt(rail[2]?.compPct)}로 거의 같습니다. 회복 국면의 이동량은 공통 요인을 따라 움직였습니다.</Finding>
      <Finding title="버스 급감은 집계 범위 변경 → 시기 비교에서 제외" tone="gray">일별 원자료를 같은 요일끼리 비교하면 2021-11-28(일)에 고양시에서 원자료에 나타나는 정류장이 1,873개 → 888개로 절반 줄었고(경기도 −20%), 계속 나타난 정류장의 이용량도 중앙값 −40% 줄었습니다. 같은 달 교통카드 통행(STCIS)은 −9~−14%, 정발산역은 −0.5%로 거의 그대로였습니다. 2024-09-28에 정류장 수가 1,059개 → 1,807개로 돌아왔습니다. 수요가 아니라 집계에서 빠진 정류장·노선 때문이며, 빠진 폭이 시군마다 달라(안산 −2% ~ 고양 −55%) 비교 지역 비율로도 보정할 수 없습니다. 공급 축소 구간에는 장항2동의 고양시 내 비중도 {busShareMean('2021-01', '2021-10').toFixed(2)}%(2021-01~10) → {busShareMean('2022-01', '2024-08').toFixed(2)}%(2022-01~2024-08)로 뛰었습니다. 축소가 정류장마다 다르게 적용됐다는 뜻이라, 비중으로도 수요를 비교하지 않습니다.</Finding>
    </div>
  </>;
}

/* ───────────── 05 종합: 시기별 비교와 원인 후보 ───────────── */
// 판정: 월별 비율(장항2동 ÷ 비교 지역)의 시기 평균 변화를 지표별 흔들림 폭(2×표준오차)·순열검정(2만 회)과 비교.
// 출처: analysis/16_threshold_placebo_20261115/ratio_phase_tests.csv (noise = 흔들림 폭 %, p = 순열검정 p값)
const PHASE_TEST: Record<string, Record<string, { noise: number; p: number }>> = {
  card: { P1: { noise: 4.2, p: 0.0001 } },
  mois_new: { P1: { noise: 8.3, p: 0.0097 }, P2: { noise: 8.8, p: 0.0011 }, P3: { noise: 11.3, p: 0.968 } },
  mois_core: { P1: { noise: 15.5, p: 0.536 }, P2: { noise: 18.1, p: 0.670 }, P3: { noise: 17.3, p: 0.062 } },
  mois_closed: { P1: { noise: 12.4, p: 0.160 }, P2: { noise: 13.6, p: 0.080 }, P3: { noise: 13.9, p: 0.140 } },
  rail: { P1: { noise: 4.1, p: 0.0001 }, P2: { noise: 3.3, p: 0.557 }, P3: { noise: 3.8, p: 0.289 } },
};
const pTxt = (p: number) => p < 0.001 ? 'p<0.001' : `p=${p.toFixed(p < 0.01 ? 3 : 2)}`;
export function PhaseSynthesis({ active }: { active: boolean }) {
  const { data, error } = useTimeseries(active);
  if (!data) return <Loading error={error} />;
  const pc = data.phaseCompare;
  const cellView = (c: any, isShare: boolean, higherIsWorse: boolean, rowId: string) => {
    if (c.reason) return <span className="ts-na" title={c.reason}>비교 불가</span>;
    if (isShare) return c.localPt == null ? <span className="ts-na">–</span> : <span className={c.localPt < 0 ? 'ts-down' : 'ts-up'}>{c.localPt > 0 ? '▲' : '▼'} {c.localPt.toFixed(2)}%p</span>;
    if (c.localPct == null) return <span className="ts-na">–</span>;
    const gap = c.gapPt;
    // 폐업처럼 값이 클수록 나쁜 지표는 색과 문구를 뒤집는다.
    const bad = higherIsWorse ? c.localPct > 0 : c.localPct < 0;
    const test = PHASE_TEST[rowId]?.[c.phase];
    const sig = !!test && test.p < 0.05;
    const border = !!test && !sig && test.p < 0.1;
    const diffText = gap == null ? '' : higherIsWorse
      ? (gap < 0 ? `장항2동 증가가 ${Math.abs(gap).toFixed(1)}%p 작음` : `장항2동 증가가 ${gap.toFixed(1)}%p 큼`)
      : (gap < 0 ? `장항2동 ${Math.abs(gap).toFixed(1)}%p 약함` : `장항2동 ${gap.toFixed(1)}%p 강함`);
    const gapText = gap == null || !test ? '' : sig ? ` · ${diffText} (${pTxt(test.p)})`
      : border ? ` · ${diffText}, 경계선 (${pTxt(test.p)})` : ` · 함께 움직임 (흔들림 ±${test.noise}%)`;
    const gapClass = gap == null || !test || !(sig || border) ? 'ts-same' : (higherIsWorse ? gap > 0 : gap < 0) ? 'ts-worse' : 'ts-better';
    return <><span className={bad ? 'ts-down' : 'ts-up'}>{c.localPct > 0 ? '▲' : '▼'} {pctTxt(c.localPct)}</span>{c.compPct != null && <small>비교 {pctTxt(c.compPct)}<em className={gapClass}>{gapText}</em></small>}</>;
  };
  return <>
    <Claim tag="종합 · 원인 후보의 네 갈래" title="장항2동의 약화는 '코로나 공통 충격'과 '장항2동 고유 요인' 두 층으로 나뉘어 보인다.">
      아래 표는 각 시기의 월평균을 직전 시기와 비교한 결과입니다. 판정은 <b>월별 비율(장항2동 ÷ 비교 지역)</b>의 시기 평균이 직전 시기보다 변한 폭을, 그 지표가 평소 월마다 흔들리는 폭(2×표준오차)과 비교해 정했습니다. 흔들림 폭 안이면 <b>함께 움직임(공통 요인)</b>, 폭 밖이고 두 시기의 달을 무작위로 섞는 순열검정에서 우연일 확률이 5% 미만이면 <b>지역 고유 요인의 후보</b>로 표시했습니다. 흔들림 폭은 카드·철도 ±3~4%, 인허가 전체 ±8~11%, 방문형 CORE ±15~18%, 폐업 ±12~14%로 지표마다 다릅니다. 월별 값의 계절성·자기상관 때문에 p값이 실제보다 작게 나올 수 있습니다. 표의 %p 차이는 두 지역 변화율의 차이이고, 검정은 월별 비율로 했습니다.
    </Claim>
    <div className="evidence-table-wrap"><table className="evidence-table ts-phase-table">
      <thead><tr><th>지표</th><th>비교 지역</th>{pc.phases.slice(1).map((p: any, i: number) => <th key={p.key}>{pc.phases[i].label} → {p.label}<small>{p.from}~{p.to}</small></th>)}</tr></thead>
      <tbody>{pc.rows.map((r: any) => <tr key={r.id}><td>{r.label}</td><td>{r.comparison || '없음'}</td>{r.cells.slice(1).map((c: any) => <td key={c.phase}>{cellView(c, r.id === 'bus_share', !!r.higherIsWorse, r.id)}{c.window && <small>충격기 = {c.window}</small>}</td>)}</tr>)}</tbody>
    </table></div>
    <p className="synthesis-method">{pc.method} '비교 불가' 칸에 마우스를 올리면 이유가 보입니다.</p>
    <div className="ts-cause-grid">
      <div className="ts-cause ts-cause-ext"><span>① 공통 외부 충격</span><h4>코로나19 충격(2020)과 회복(2022~23)</h4><p>2020년 카드와 철도는 비교 지역과 같은 시점에 함께 꺾였습니다(신규 인허가는 2020년에 두 지역 모두 늘었지만 장항2동 증가 폭이 작았습니다). 회복기 철도 반등 폭도 주변 역과 같습니다. 2023년 이후 전체 신규 인허가의 감소 폭도 고양시와 같아, 금리 인상(2021-08~2023-01)과 경기 둔화 같은 공통 요인의 후보입니다.</p></div>
      <div className="ts-cause ts-cause-amp"><span>② 공통 충격의 증폭</span><h4>장항2동이 더 크게 흔들림(소비는 이후 회복)</h4><p>같은 충격에서 카드(−20.0% vs −5.2%)와 정발산역(−34.4% vs −26.1%)이 비교 지역보다 더 크게 줄었습니다. 라페스타·웨스턴돔 같은 방문·여가형 상업지의 특성 때문일 가능성이 있으나, 업종·방문 목적 자료로 확인해야 하는 가설입니다. 카드 비중은 2023년 8~12월 8.80%로 2019년 같은 달(8.76%) 수준을 되찾아(같은 구성 구간 참고 비교), 소비 쪽 증폭은 일시적이었던 것으로 보입니다.</p></div>
      <div className="ts-cause ts-cause-int"><span>③ 지역 고유 요인 후보</span><h4>회복기 이후의 따로 노는 약화</h4><p>회복기 신규 인허가(−16.0% vs +0.5%, p=0.001)와 2023년 SGIS 사업체(−7.3% vs +2.7%)는 장항2동만 약해졌습니다. 엔데믹 전환 이후 CORE 인허가(−12.3% vs +3.8%)는 방문형 건수가 적어 흔들림이 커서 경계선(p=0.06)이지만, 2019→2024 장기로는 −27.4% vs −4.9%입니다. 소비 비중은 같은 시기에 회복했으므로, 고유 약화는 <b>소비보다 창업·사업체 쪽</b>에 있습니다.</p></div>
      <div className="ts-cause ts-cause-str"><span>④ 경쟁 상권·신도시 구조 후보</span><h4>새 점포·새 인구가 킨텍스·스타필드 쪽으로</h4><p>고양시 방문형 신규 인허가 중 장항2동 몫은 15.2%(2010)→9.2%(2024)로 줄고 대화동(킨텍스)은 9.8%→16.4%로 늘어 2018년부터 장항2동을 앞섰습니다. 스타필드 개장 전후 24개월 장항2동 −17.5%(고양시 −0.8%). 1기 신도시 주거지 인구는 −9~−15%, 장항1동은 +417%. 정발산역 비율도 코로나 전부터 낮아졌습니다(2018 9.31%→2024 7.75%). 위 05 경쟁 상권과 신도시 참고.</p></div>
    </div>
    <div className="ts-open">
      <b>결론의 범위와 남은 확인</b>
      <ul>
        <li>네 갈래는 <b>원인 후보</b>입니다. 비교 지역 대비 시점과 방향으로 나눈 것이며 인과 추정이 아닙니다.</li>
        <li>판단 보류: STCIS(비교 지역 없음·2021년 이후만), 버스(2021-11-28~2024-09-27 집계 범위 변경: 고양시 정류장 절반 누락). 카드 2021년 이후는 금액으로는 잇지 않고 같은 구성·같은 달의 비중으로만 참고 비교했습니다.</li>
        <li>현장 조사 우선 질문: 2022년 이후 방문형 점포의 신규 진입이 왜 적었는지, 2020년 충격이 업종 구성 때문인지.</li>
        <li>사건 타임라인의 확인 수준 B·C 항목(버스 노선 조정, 라페스타 공실 보도 등)은 공식 자료로 다시 대조해야 합니다.</li>
      </ul>
    </div>
  </>;
}
