import { useEffect, useMemo, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { CommerceTimeStory, IntegratedTimeline, MobilityTimeStory, PhaseSynthesis, TransportTimeStory } from './page1/TimeStory';
import { CompetitionStory, ConclusionStrategy, StcisWeekdayStory } from './page1/CompetitionStory';

type Row = Record<string, string | number | boolean | null>;
type Data = Record<string, any>;
type Point = { label: string; [key: string]: string | number | null };

// IBM(Carbon) 데이터 시각화 팔레트(상세 탐색 차트용): Blue 60, Magenta 70, Teal 50, Purple 70, Gray 50
const colors = ['#0f62fe', '#9f1853', '#009d9a', '#6929c4', '#8d8d8d'];
const fmt = (n: number | null | undefined, digits = 0) => n == null || !Number.isFinite(n) ? '미관측' : new Intl.NumberFormat('ko-KR', { maximumFractionDigits: digits }).format(n);
const pct = (n: number | null | undefined) => n == null ? '비교 불가' : `${n > 0 ? '+' : ''}${fmt(n, 2)}%`;
const asNumber = (v: unknown): number | null => typeof v === 'number' && Number.isFinite(v) ? v : null;

function useVisible() {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current || visible) return;
    const observer = new IntersectionObserver(entries => { if (entries[0]?.isIntersecting) { setVisible(true); observer.disconnect(); } }, { rootMargin: '300px' });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible]);
  return { ref, visible };
}

function useData(name: string, enabled: boolean) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!enabled) return;
    let mounted = true;
    fetch(`${import.meta.env.BASE_URL}data/${name}.json`)
      .then(res => { if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`); return res.json(); })
      .then(value => { if (mounted) setData(value); })
      .catch(e => { if (mounted) setError(String(e)); });
    return () => { mounted = false; };
  }, [name, enabled]);
  return { data, error };
}

function downloadCsv(filename: string, rows: Row[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const esc = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const text = [keys.map(esc).join(','), ...rows.map(r => keys.map(k => esc(r[k])).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob(['\ufeff', text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

function Panel({ title, kicker, children, className = '' }: { title: string; kicker?: string; children: React.ReactNode; className?: string }) {
  return <article className={`panel ${className}`}><div className="panel-head"><div>{kicker && <span className="kicker">{kicker}</span>}<h3>{title}</h3></div></div>{children}</article>;
}

function Selector({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return <label className="selector"><span>{label}</span><select value={value} onChange={e => onChange(e.target.value)}>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
}

function Chart({ title, subtitle, points, series, unit, type = 'line', yName, height = 310, note, filename }: { title: string; subtitle: string; points: Point[]; series: { key: string; name: string }[]; unit: string; type?: 'line' | 'bar'; yName?: string; height?: number; note?: string; filename: string }) {
  const ref = useRef<ReactECharts>(null);
  const [table, setTable] = useState(false);
  const option = useMemo(() => ({
    color: colors,
    animationDuration: 250,
    grid: { left: 57, right: 22, top: 48, bottom: points.length > 24 ? 78 : 52, containLabel: true },
    tooltip: { trigger: 'axis', valueFormatter: (v: unknown) => fmt(asNumber(v), 2), backgroundColor: '#161616', borderColor: '#161616', textStyle: { color: '#fff', fontSize: 13} },
    legend: { top: 2, left: 'center', textStyle: { color: '#525252', fontSize: 13 } },
    xAxis: { type: 'category', data: points.map(p => p.label), axisLabel: { color: '#525252', hideOverlap: true, rotate: points.length > 18 ? 45 : 0 }, axisLine: { lineStyle: { color: '#cbd8de' } } },
    yAxis: { type: 'value', name: yName || unit, nameTextStyle: { color: '#525252' }, axisLabel: { color: '#525252', formatter: (v: number) => Math.abs(v) >= 1000000 ? `${fmt(v / 1000000, 1)}백만` : Math.abs(v) >= 1000 ? `${fmt(v / 1000, 1)}천` : fmt(v, 1) }, splitLine: { lineStyle: { color: '#e8eef1' } } },
    dataZoom: points.length > 24 ? [{ type: 'inside' }, { type: 'slider', bottom: 8, height: 15 }] : [],
    series: series.map(s => ({ name: s.name, type, connectNulls: false, showSymbol: points.length <= 16, symbolSize: 6, barMaxWidth: 34, smooth: false, data: points.map(p => p[s.key] ?? null), emphasis: { focus: 'series' } })),
  }), [points, series, type, unit, yName]);
  const csvRows = points.map(p => ({ ...p })) as Row[];
  return <Panel title={title} kicker={subtitle} className="chart-panel"><div className="chart-actions"><button type="button" onClick={() => setTable(!table)}>{table ? '그래프 보기' : '표 보기'}</button><button type="button" onClick={() => downloadCsv(`${filename}.csv`, csvRows)} disabled={!points.length}>CSV 저장</button><button type="button" disabled={!points.length || table} onClick={() => { const image = ref.current?.getEchartsInstance().getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#ffffff' }); if (image) { const a = document.createElement('a'); a.href = image; a.download = `${filename}.png`; a.click(); } }}>PNG 저장</button></div>{table ? <div className="table-scroll"><table><thead><tr><th>시점</th>{series.map(s => <th key={s.key}>{s.name} · {unit}</th>)}</tr></thead><tbody>{points.map((p, i) => <tr key={`${p.label}-${i}`}><td>{p.label}</td>{series.map(s => <td key={s.key}>{fmt(asNumber(p[s.key]), 2)}</td>)}</tr>)}</tbody></table></div> : <ReactECharts ref={ref} option={option} style={{ height }} notMerge lazyUpdate />}{note && <p className="chart-note">{note}</p>}<p className="chart-meta">단위: {unit} · {subtitle} · 표시 중인 값 {points.length}개 시점</p></Panel>;
}

function Section({ id, eyebrow, title, intro, children, tint = false }: { id: string; eyebrow: string; title: string; intro: string; children: (active: boolean) => React.ReactNode; tint?: boolean }) {
  const { ref, visible } = useVisible();
  return <section id={id} ref={ref} className={`section ${tint ? 'section-tint' : ''}`}><div className="container"><div className="section-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div><p>{intro}</p></div>{children(visible)}</div></section>;
}
function LoadState({ error }: { error: string }) { return <div className="load-state">{error ? `데이터 로딩 오류: ${error}` : '검증된 분석 데이터를 불러오는 중…'}</div>; }
function Stat({ label, value, detail, color = 'blue' }: { label: string; value: string; detail: string; color?: string }) { return <div className={`stat-card accent-${color}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>; }

function Overview() {
  const { data } = useData('manifest', true);
  const c = data?.checks;
  return <section id="overview" className="section"><div className="container"><div className="section-heading"><div><p className="eyebrow">RESEARCH AT A GLANCE</p><h2>한 지역, 서로 다른 도시활동의 신호</h2></div><p>검증된 지표를 같은 화면에 배치하되, 기간·공간·모집단은 각 카드에 따로 표시합니다.</p></div><div className="stat-grid"><Stat label="관측 카드매출 지표" value={c ? fmt(c.card_2020_janghang2_index, 2) : '…'} detail="장항2동 행정동 · 2020 / 2018=100 · 공급 A구간"/><Stat label="SGIS 사업체" value={c ? `${fmt(c.sgis_business_2020_2024_pct, 2)}%` : '…'} detail="장항2동 행정동 · 2020→2024 B구간" color="orange"/><Stat label="행안부 CORE 인허가" value={c ? `${fmt(c.mois_core_2024, 0)}건` : '…'} detail="장항2동 · 2024 · 신규 인허가 기록" color="green"/><Stat label="정발산역 승하차" value={c ? `${fmt(c.rail_2025_index, 2)}%` : '…'} detail="역별 승하차 · 2025 / 2019 · 같은 CSV 범위" color="purple"/></div><div className="insight-grid"><Panel title="상대 약화의 단서" kicker="소비 · 사업체"><p>동일 공급 A구간 카드 지표와 SGIS 사업체 B구간에서 각각 상대 약화가 관측됩니다. 두 결과의 시기는 다릅니다.</p></Panel><Panel title="일괄 감소는 아님" kicker="기업 · 고용"><p>종사자는 2018→2024 증가했지만 2020→2024에는 감소했습니다. 행안부 인허가 기록과 SGIS 사업체는 서로 다른 지표입니다.</p></Panel><Panel title="이동은 제한 표본" kicker="접근 · 이동"><p>정발산역 승하차는 장항2동 방문자 수가 아닙니다. STCIS는 장항 법정동 대표일·고정 패널만 비교합니다.</p></Panel></div></div></section>;
}

function Framework() {
  const { ref, visible } = useVisible(); const { data, error } = useData('geography', visible); const { data: bus } = useData('bus', visible);
  const feature = data?.legalBoundary?.features?.[0];
  const polygon: number[][] = feature?.geometry?.type === 'Polygon' ? feature.geometry.coordinates[0] : feature?.geometry?.coordinates?.[0]?.[0] || [];
  const stops = (bus?.stopYear || []).filter((r: any) => r.year === 2025 && r.lon && r.lat);
  const coords = polygon.length ? polygon : stops.map((r: any) => [r.lon, r.lat]);
  const lons = coords.map((p: number[]) => p[0]), lats = coords.map((p: number[]) => p[1]);
  const minLon = Math.min(...lons, 126.7), maxLon = Math.max(...lons, 126.8), minLat = Math.min(...lats, 37.6), maxLat = Math.max(...lats, 37.7);
  const proj = (lon: number, lat: number) => [30 + (lon - minLon) / Math.max(maxLon - minLon, .001) * 540, 390 - (lat - minLat) / Math.max(maxLat - minLat, .001) * 350];
  const path = polygon.map((p: number[], i: number) => `${i ? 'L' : 'M'} ${proj(p[0], p[1]).join(' ')}`).join(' ') + ' Z';
  return <section id="framework" ref={ref} className="section section-dark"><div className="container"><div className="section-heading"><div><p className="eyebrow">RESEARCH FRAMEWORK</p><h2>무엇을, 어떤 단위로 보았나</h2></div><p>연구 대상은 라페스타·웨스턴돔을 포함하는 장항2동 행정동 전체입니다. 시설별 성과를 따로 산출하지 않았습니다.</p></div><div className="framework-grid"><div className="framework-text"><div className="step"><b>01</b><div><h3>세 분야를 따로 분석</h3><p>상업(카드매출·SGIS 사업체/종사자·행안부 인허가), 인구이동(STCIS 교통카드 OD), 교통 수요(버스 정류장·정발산역 승하차)를 각각 월·연 단위 시계열로 봅니다.</p></div></div><div className="step"><b>02</b><div><h3>비교 지역과 나란히</h3><p>고양시(인허가는 장항2동 제외), 일산선 다른 10개 역, 고양시·경기도 전체 버스와 비교해 공통 흐름과 장항2동만의 흐름을 나눕니다.</p></div></div><div className="step"><b>03</b><div><h3>시기와 사건으로 해석</h3><p>코로나 이전(2019)·충격기(2020.03~2021.10)·회복기(2022.05~2023.05)·엔데믹 전환 이후(2023.06~2024.12)로 나누고 사건 타임라인을 겹쳐 원인 후보를 찾습니다. 경계는 논문의 분류가 아니라 정부 방역 정책이 바뀐 날(1차 강화된 사회적 거리두기 2020-03-22, 거리두기 전면 해제 2022-04-18, 위기단계 '경계' 하향 2023-06-01)로 연구진이 정했고, 일상회복과 방역 재강화가 오간 2021.11~2022.04는 성격이 섞여 뺐습니다. 코로나는 연구 주제가 아니라 모든 지역에 함께 온 외부 충격이라 시기를 나누는 기준으로 썼습니다. 공급 구간 단절·통계 단절이 있는 구간은 비교하지 않고 한계로 적습니다.</p></div></div><div className="scope-note">장항 법정동 ≠ 장항2동 행정동. 아래 경계는 현행 VWorld 스냅샷이며 역사적 경계가 아닙니다. 정류소는 2025년 SGIS 행정경계로 선별된 점입니다.</div></div><div className="map-panel"><div className="map-title"><strong>검증된 위치 자료의 범위</strong><span>장항 법정동 외곽 · 2025 정류소 스냅샷</span></div>{error ? <LoadState error={error}/> : !feature ? <LoadState error=""/> : <svg viewBox="0 0 600 420" role="img" aria-label="장항 법정동 현행 경계와 2025년 장항2동 선별 버스 정류소 위치"><defs><pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M 30 0 L 0 0 0 30" fill="none" stroke="#2b5260" strokeWidth=".7"/></pattern></defs><rect width="600" height="420" fill="#173642"/><rect width="600" height="420" fill="url(#grid)"/><path d={path} fill="#2b7285" fillOpacity=".42" stroke="#90d0d7" strokeWidth="2.5"/>{stops.map((r: any) => { const [x,y] = proj(r.lon, r.lat); return <circle key={r.id} cx={x} cy={y} r="3.5" fill="#f7ab75"><title>{r.name} · {r.id}</title></circle>; })}<text x="20" y="25" fill="#c5dce1" fontSize="13">장항 법정동 · 현행</text></svg>}<div className="map-legend"><span><i className="legend-area"/> 장항 법정동 현행 경계</span><span><i className="legend-point"/> 2025 장항2동 관측 정류소 {stops.length}개</span></div></div></div></div></section>;
}

function Consumption({ active }: { active: boolean }) {
  const { data, error } = useData('card', active); const [episode, setEpisode] = useState('A'); const [region, setRegion] = useState('janghang2'); const [sectorYear, setSectorYear] = useState('2020');
  if (!data) return <LoadState error={error}/>;
  const monthly = data.monthly.filter((r: any) => r.episode === episode);
  const points = monthly.map((r: any) => ({ label: r.month, value: r.observed ? r[region] : null }));
  const sectors = data.sectorsA.filter((r: any) => String(r.year) === sectorYear).sort((a: any, b: any) => b.sharePct - a.sharePct).slice(0, 10);
  return <><div className="controls"><Selector label="공급 구간" value={episode} options={data.coverage.map((r: any) => ({ value: r.episode, label: `${r.episode} · ${r.first}~${r.last}` }))} onChange={setEpisode}/><Selector label="지역" value={region} options={[{ value:'janghang2', label:'장항2동' },{ value:'goyang', label:'고양시 전체' }]} onChange={setRegion}/><Selector label="업종 구성 연도 · A구간" value={sectorYear} options={['2018','2019','2020'].map(y => ({value:y,label:y}))} onChange={setSectorYear}/></div><div className="chart-grid"><Chart title="월별 관측 카드매출 지표" subtitle={`${episode} 공급 구간 · ${region === 'janghang2' ? '장항2동' : '고양시'} · 관측 ${monthly.filter((r:any)=>r.observed).length}개월`} points={points} series={[{key:'value',name:'관측값'}]} unit="원본 sales_amt, 금액 단위 미확인" filename={`card_monthly_${episode}_${region}`} note="구간 사이 선을 연결하지 않습니다. 2024-02~12는 미공급 결측이며 0이 아닙니다."/><Chart title="연속 A구간 연도 지수" subtitle="2018~2020 · 장항2동·고양시 행정동 · 2018=100" points={data.annualA.map((r:any)=>({label:String(r.year),j:r.janghang2Index,g:r.goyangIndex}))} series={[{key:'j',name:'장항2동'},{key:'g',name:'고양시'}]} unit="지수 (2018=100)" filename="card_annual_a_index"/><Chart title="업종별 관측 구성 상위 10개" subtitle={`${sectorYear} · 장항2동 · A구간`} points={sectors.map((r:any)=>({label:r.name,value:r.sharePct}))} series={[{key:'value',name:'구성비'}]} unit="% · 원본 업종 분류" type="bar" filename={`card_sector_${sectorYear}`} note="제공기관·카드 표본·실측/추정·금액 단위가 미확인입니다. 전체 소비의 업종 비중으로 일반화하지 않습니다."/></div></>;
}

function Business({ active }: { active: boolean }) {
  const { data, error } = useData('sgis', active);
  const { data: mois, error: moisError } = useData('mois', active);
  const [metric, setMetric] = useState('businesses');
  const [episode, setEpisode] = useState('B_2020_2024');
  const [group, setGroup] = useState('ALL');
  const [industry, setIndustry] = useState('');
  if (!data || !mois) return <LoadState error={error || moisError}/>;
  const years = episode === 'A_2018_2019' ? [2018, 2019] : [2020, 2021, 2022, 2023, 2024];
  const find = (year:number, region:string) => data.rows.find((r:any)=>r.year===year && r.region===region);
  const series = years.map(y=>({label:String(y),target:find(y,'장항2동')?.[metric]??null,other:find(y,'고양시 전체')?.[metric]??null}));
  const groups = [{value:'ALL',label:'전체 195개'},{value:'CORE',label:'CORE 60개'},{value:'SUPPORT',label:'SUPPORT 24개'},{value:'CORE_SUPPORT',label:'CORE+SUPPORT 84개'}];
  const groupRows = mois.rows.filter((r:any)=>r.code===group && (group==='ALL'?r.level==='TOTAL':group==='CORE_SUPPORT'?r.level==='SCENARIO':r.level==='COMMERCIAL_GROUP'));
  const groupPoints = [2019,2020,2021,2022,2023,2024].map(y=>({label:String(y),target:groupRows.find((r:any)=>r.year===y&&r.region==='장항2동')?.newLicenses??null,other:groupRows.find((r:any)=>r.year===y&&r.region==='고양시')?.newLicenses??null}));
  const industryOptions = [...new Map(mois.rows.filter((r:any)=>r.level==='INDUSTRY'&&r.region==='장항2동').map((r:any)=>[r.code,r.name])).entries()].map(([value,label]:any)=>({value,label}));
  const selectedIndustry = industry || industryOptions[0]?.value;
  const industryPoints = [2019,2020,2021,2022,2023,2024].map(y=>({label:String(y),target:mois.rows.find((r:any)=>r.level==='INDUSTRY'&&r.code===selectedIndustry&&r.year===y&&r.region==='장항2동')?.newLicenses??null,other:mois.rows.find((r:any)=>r.level==='INDUSTRY'&&r.code===selectedIndustry&&r.year===y&&r.region==='고양시')?.newLicenses??null}));
  const changes = mois.rows.filter((r:any)=>r.level==='INDUSTRY'&&r.region==='장항2동'&&r.year===2024).map((r:any)=>({label:r.name,value:r.changeVs2019})).sort((a:any,b:any)=>Math.abs(b.value)-Math.abs(a.value)).slice(0,10);
  const sensitivity = [2019,2020,2021,2022,2023,2024].map(y=>{const r=mois.sensitivity.find((x:any)=>x.region==='장항2동'&&x.year===y);return {label:String(y),core:r?.core??null,excluded:r?.coreExcludingInstant??null};});
  const delta = (region:string) => {const a=groupRows.find((r:any)=>r.region===region&&r.year===2019)?.newLicenses;const b=groupRows.find((r:any)=>r.region===region&&r.year===2024)?.newLicenses;return a&&b!=null?`${fmt((b/a-1)*100,1)}%`: '—';};
  return <><div className="controls"><Selector label="SGIS 지표" value={metric} options={[{value:'businesses',label:'사업체 수'},{value:'workers',label:'종사자 수'}]} onChange={setMetric}/><Selector label="SGIS 연속 구간" value={episode} options={[{value:'B_2020_2024',label:'2020~2024'},{value:'A_2018_2019',label:'2018~2019'}]} onChange={setEpisode}/></div>
    <Chart title="SGIS 사업체·종사자: 장항2동과 고양시" subtitle={`${episode==='B_2020_2024'?'2020~2024':'2018~2019'} · 장항2동 행정동 / 고양시 44동 합`} points={series} series={[{key:'target',name:'장항2동'},{key:'other',name:'고양시'}]} unit={metric==='workers'?'명':'개'} filename={`sgis_${metric}_${episode}`} note="2019→2020은 통계 계열 단절로 연결하지 않습니다. 2020→2024 조건부 비교: 사업체 장항2동 −7.6%, 고양시 +8.7%; 종사자 장항2동 −1.6%, 고양시 +5.9%. 인과효과가 아닙니다."/>
    <div className="controls sub-controls"><Selector label="인허가 범위" value={group} options={groups} onChange={setGroup}/><Selector label="세부 인허가 업종" value={selectedIndustry} options={industryOptions} onChange={setIndustry}/></div>
    <div className="chart-grid"><Chart title="행안부 신규 인허가 기록" subtitle={`2019~2024 · ${groups.find(x=>x.value===group)?.label} · 장항2동 ${delta('장항2동')}, 고양시 ${delta('고양시')} (2019→2024)`} points={groupPoints} series={[{key:'target',name:'장항2동'},{key:'other',name:'고양시'}]} unit="기록 건" filename={`mois_${group}`} note="CORE·SUPPORT는 연구용 분류이며 공식 KSIC가 아닙니다. 인허가 대상은 모든 업종을 포괄하지 않으며 기록 건수는 신규 점포 수가 아닙니다."/>
      <Chart title="세부 업종 신규 인허가" subtitle={`${industryOptions.find(x=>x.value===selectedIndustry)?.label} · 2019~2024`} points={industryPoints} series={[{key:'target',name:'장항2동'},{key:'other',name:'고양시'}]} unit="기록 건" filename={`mois_industry_${selectedIndustry}`}/>
      <Chart title="변화 규모가 큰 업종" subtitle="장항2동 · 2024−2019 · 절댓값 상위 10개" points={changes} series={[{key:'value',name:'기록 차이'}]} unit="기록 건" type="bar" filename="mois_industry_change" note="업종별 기록 변화의 산술적 규모이며 인과적 기여도가 아닙니다."/>
      <Chart title="즉석판매제조가공업 제외 민감도" subtitle="장항2동 CORE 60개 · 2019~2024" points={sensitivity} series={[{key:'core',name:'CORE 전체'},{key:'excluded',name:'해당 업종 제외'}]} unit="기록 건" filename="mois_core_sensitivity" note="2019→2024 CORE 474→344건(−27.4%); 해당 업종 제외 316→276건(−12.7%). CORE 순감소 130건 중 해당 업종 90건은 산술적으로 69.2%입니다."/></div></>;
}

function Mobility({ active }: { active: boolean }) {
  const { data: purpose, error: pe } = useData('purpose', active); const { data: stcis, error: se } = useData('stcis', active); const [purposeType, setPurposeType] = useState('SHOPPING'); const [direction, setDirection] = useState('INBOUND'); const [window, setWindow] = useState('핵심 16~19'); const [stMetric, setStMetric] = useState('perDay'); const [dayType, setDayType] = useState('ALL'); const [extWindow, setExtWindow] = useState('저녁 18~21');
  if (!purpose || !stcis) return <LoadState error={pe||se}/>;
  const purposeRows = purpose.rows.filter((r:any)=>r.purpose===purposeType);
  const ppoints = purposeRows.map((r:any)=>({label:r.month,value:r.status==='OBSERVED'?r.value:null}));
  const internalBase = (dayType==='ALL' ? stcis.internalAnnual : stcis.internalDaytype).filter((r:any)=>r.window===window && r.direction===direction && (dayType==='ALL'||r.daytype===dayType)).sort((a:any,b:any)=>a.year-b.year);
  const baseline = internalBase.find((r:any)=>r.year===2021)?.value;
  const internal = internalBase.map((r:any)=>({ ...r, changePct: dayType==='ALL' ? r.changePct : baseline > 0 ? (r.value/baseline-1)*100 : null }));
  const ext = stcis.externalPairs.filter((r:any)=>r.window===extWindow&&r.direction==='OUTBOUND'&&r.eligible).sort((a:any,b:any)=>a.pair.localeCompare(b.pair));
  const windowOptions = [...new Set(stcis.internalAnnual.map((r:any)=>r.window))] as string[];
  const extOptions = [...new Set(stcis.externalPairs.map((r:any)=>r.window))] as string[];
  const slot = stcis.slot24h.filter((r:any)=>r.direction===direction);
  return <><div className="eyebrow block-label">목적 OD · 장항2동 행정동 도착, 제한 출발지</div><div className="controls"><Selector label="이동 목적" value={purposeType} options={[{value:'TOTAL',label:'전체 목적'},{value:'SHOPPING',label:'쇼핑'},{value:'TOURISM',label:'관광'},{value:'SHOPPING_TOURISM',label:'쇼핑+관광'}]} onChange={setPurposeType}/></div><Chart title="목적별 월 관측값" subtitle={`${purposeType} · 2023~2025 · 장항2동 도착 · 제한 출발지`} points={ppoints} series={[{key:'value',name:'관측 CNT'}]} unit="CNT 이동인구 지표" filename={`purpose_${purposeType}`} note="2025-09는 미공급(결측)이며 0이 아닙니다. 2025년 공급 범위·목적 구성의 연속성이 미확인이라 연간 실질 증가율로 해석하지 않습니다."/><div className="eyebrow block-label">STCIS · 장항 법정동, 대표일 관측 useStf</div><div className="controls"><Selector label="방향" value={direction} options={[{value:'INBOUND',label:'유입'},{value:'OUTBOUND',label:'유출'}]} onChange={setDirection}/><Selector label="내부 시간대" value={window} options={windowOptions.map(x=>({value:x,label:x}))} onChange={setWindow}/><Selector label="요일 유형" value={dayType} options={[{value:'ALL',label:'수·토 합계'},{value:'WEEKDAY',label:'수요일'},{value:'WEEKEND',label:'토요일'}]} onChange={setDayType}/><Selector label="표시값" value={stMetric} options={[{value:'perDay',label:'대표일당 관측 평균'},{value:'value',label:'관측 useStf 합계'},{value:'changePct',label:'2021년 대비 변화율'}]} onChange={setStMetric}/></div><div className="chart-grid"><Chart title="내부 고정 패널 변화" subtitle={`2021~2025 · ${window} · ${direction==='INBOUND'?'유입':'유출'} · ${dayType==='ALL'?'수·토':dayType==='WEEKDAY'?'수요일':'토요일'}`} points={internal.map((r:any)=>({label:String(r.year),value:r[stMetric]??null}))} series={[{key:'value',name:stMetric==='perDay'?'대표일당':stMetric==='changePct'?'2021 대비':'관측 합계'}]} unit={stMetric==='changePct'?'%':'useStf · 고정 패널'} filename="stcis_internal" note={`동일 지역·15분 슬롯의 제한 패널. 연도별 ${internal[0]?.regions??'—'}개 지역·${internal[0]?.dates??'—'}대표일·${internal[0]?.returnedSlots??'—'}반환 슬롯. 방향별 지역 집합이 달라 유입−유출은 순이동량이 아닙니다.`}/><Chart title="24시간 반환 슬롯 관측성" subtitle={`2021~2025 · 120 대표일 · ${direction==='INBOUND'?'유입':'유출'} · 전체 관측 지역`} points={slot.map((r:any)=>({label:r.slot,slots:r.returnedSlots,mean:r.perSlot}))} series={[{key:'slots',name:'반환 슬롯 수'}]} unit="반환된 15분 관측 건" filename="stcis_24h_slots" note="미반환 슬롯은 이동량 0이 아닙니다. 시간별 관측 useStf 합계는 반환 슬롯 수가 달라 직접 비교하지 않습니다."/></div><div className="controls sub-controls"><Selector label="외부 유출 연도쌍 시간대" value={extWindow} options={extOptions.map(x=>({value:x,label:x}))} onChange={setExtWindow}/></div><Chart title="선정 외부 23개 지역 · 비교 가능한 유출 연도쌍" subtitle={`${extWindow} · 같은 월·요일·상대 지역·15분 슬롯 관측 짝`} points={ext.map((r:any)=>({label:r.pair.replace('_','↔'),value:r.changePct}))} series={[{key:'value',name:'쌍 내부 변화율'}]} type="bar" unit="% · 연도쌍별 별도 표본" filename="stcis_external_pairs" note={`표시 가능한 연도쌍 ${ext.length}개. 연도쌍마다 지역·날짜·슬롯이 달라 값을 연결한 장기 추세가 아닙니다. 외부 유입의 안정적 핵심 시간대는 선정되지 않았습니다.`}/></>;
}

function PurposeOrigins({ active }: { active: boolean }) {
  const { data, error } = useData('purpose', active);
  const [purposeType, setPurposeType] = useState('SHOPPING');
  const [year, setYear] = useState('2024');
  const [origin, setOrigin] = useState('');
  if (!data) return <LoadState error={error}/>;
  const yearly = ['2023','2024','2025'].map(y => {
    const rows = data.rows.filter((r:any) => r.month.startsWith(y) && r.purpose === purposeType && r.status === 'OBSERVED');
    return { label: y, value: rows.length ? rows.reduce((s:number,r:any)=>s+r.value,0) : null, months: rows.length };
  });
  const originOptions = [...new Map(data.origins.filter((r:any)=>r.purpose===purposeType).map((r:any)=>[r.code,r.name])).entries()] as [string,string][];
  const activeOrigin = originOptions.some(([code])=>code===origin) ? origin : originOptions[0]?.[0] || '';
  const selected = data.origins.filter((r:any)=>r.purpose===purposeType && r.code===activeOrigin);
  return <><div className="controls sub-controls"><Selector label="출발지별 목적" value={purposeType} options={[{value:'TOTAL',label:'전체 목적'},{value:'SHOPPING',label:'쇼핑'},{value:'TOURISM',label:'관광'},{value:'SHOPPING_TOURISM',label:'쇼핑+관광'}]} onChange={v=>{setPurposeType(v);setOrigin('');}}/><Selector label="선정 출발지" value={activeOrigin} options={originOptions.map(([value,label])=>({value,label}))} onChange={setOrigin}/><Selector label="출발지 순위 연도" value={year} options={['2023','2024','2025'].map(x=>({value:x,label:x}))} onChange={setYear}/></div><div className="chart-grid"><Chart title="목적별 관측 연도 합계" subtitle={`${purposeType} · 장항2동 도착 · 관측월 2023/24:12, 2025:11`} points={yearly} series={[{key:'value',name:'관측월 합계'}]} unit="CNT · 미공급월 제외" filename={`purpose_yearly_${purposeType}`} note="2025년은 9월 미공급 11개월이며 공급 범위·분류 연속성이 미확인입니다. 연간 전수나 실질 변화율로 읽지 않습니다."/><Chart title="선정 출발지 연도 관측" subtitle={`${originOptions.find(([code])=>code===activeOrigin)?.[1]||''} · ${purposeType} · 제한 출발지`} points={['2023','2024','2025'].map(y=>({label:y,value:selected.find((r:any)=>String(r.year)===y)?.value??null}))} series={[{key:'value',name:'관측 CNT'}]} unit="CNT · 선정 출발지" filename={`purpose_origin_${activeOrigin}`} note="2023~2024 관측 합계 상위 20개 출발지/목적 중 선택합니다. 2025년 출발지 공급 범위가 달라질 수 있고, 미관측 연도는 0으로 채우지 않았습니다."/></div></>;
}

function MorningReference({ active }: { active: boolean }) {
  const { data, error } = useData('stcis', active);
  if (!data) return <LoadState error={error}/>;
  const morning = data.morningReference.find((r:any)=>r.direction==='INBOUND');
  return <div className="morning-card"><span className="kicker">INTERNAL · MORNING REFERENCE</span><h3>오전 08~10시 유입 관측</h3><p>장항 법정동 기준 2021~2025년 대표일의 오전 유입 특성을 별도 참고합니다.</p><div className="morning-stats"><span><strong>{fmt(morning?.regions)}</strong>관측 지역</span><span><strong>{fmt(morning?.dates)}</strong>대표일</span><span><strong>{fmt(morning?.returnedSlots)}</strong>반환 슬롯</span><span><strong>{fmt(morning?.perSlot,2)}</strong>반환 슬롯당 useStf</span></div><small>전체 관측 지역의 기술통계입니다. 핵심 16~19시 고정 패널과 지역·슬롯 집합이 달라 합계의 크기를 직접 비교하지 않습니다.</small></div>;
}

function Transport({ active }: { active: boolean }) {
  const { data: rail, error: re } = useData('rail', active);
  const { data: bus, error: be } = useData('bus', active);
  const { data: summary, error: se } = useData('stage4_summary', active);
  const [railMetric, setRailMetric] = useState('activity');
  const [railYear, setRailYear] = useState('2024');
  const [busPanel, setBusPanel] = useState('all');
  const [busMetric, setBusMetric] = useState('total');
  const [busYear, setBusYear] = useState('2024');
  const [stopYear, setStopYear] = useState('2024');
  if (!rail || !bus || !summary) return <LoadState error={re||be||se}/>;
  const rmonths = rail.monthly.filter((r:any)=>r.month.startsWith(railYear));
  const rtime = rail.timegroups.filter((r:any)=>String(r.year)===railYear);
  const bmonths = summary.busMonthly.filter((r:any)=>r.month.startsWith(busYear));
  const stops = bus.stopYear.filter((r:any)=>String(r.year)===stopYear).sort((a:any,b:any)=>(b.boardings+b.alightings)-(a.boardings+a.alightings)).slice(0,12);
  const bannual = summary.bus.filter((r:any)=>r.year<=2024).map((r:any)=>({label:String(r.year),all:r.all,fixed:r.fixed18,sensitive:r.sensitivity12}));
  const panelName = {all:'전체 관측',fixed18:'고정 18 ID',sensitivity12:'민감도 12 ID'}[busPanel as 'all'|'fixed18'|'sensitivity12'];
  return <><div className="controls"><Selector label="철도 지표" value={railMetric} options={[{value:'activity',label:'승차+하차'},{value:'boardings',label:'승차'},{value:'alightings',label:'하차'}]} onChange={setRailMetric}/><Selector label="철도 월·시간 연도" value={railYear} options={rail.yearly.filter((r:any)=>r.year>=2019).map((r:any)=>({value:String(r.year),label:String(r.year)}))} onChange={setRailYear}/></div><div className="chart-grid"><Chart title="정발산역 연도별 승하차" subtitle="2015~2025 완전연도 · 같은 서울시 CSV 서비스 범위" points={rail.yearly.filter((r:any)=>r.months===12).map((r:any)=>({label:String(r.year),value:r[railMetric]}))} series={[{key:'value',name:railMetric==='activity'?'승하차':railMetric==='boardings'?'승차':'하차'}]} unit="건 · 정발산역" filename="rail_yearly" note="2019→2024 승하차 6,712,567→5,551,424건(−17.3%). 2020년 저점 뒤 증가했습니다. 2025년은 2019년의 81.63%로 별도 비교입니다."/><Chart title="정발산역 월별 승하차" subtitle={`${railYear} · 정발산역 · ${rmonths.length}개월 관측`} points={rmonths.map((r:any)=>({label:r.month,value:r[railMetric]}))} series={[{key:'value',name:'승하차'}]} unit="건 · 정발산역" filename={`rail_monthly_${railYear}`}/><Chart title="정발산역 시간대별 승하차" subtitle={`${railYear} · 연간 관측 시간대 집계`} points={rtime.map((r:any)=>({label:r.group,value:r[railMetric]}))} series={[{key:'value',name:'승하차'}]} unit="건 · 정발산역" type="bar" filename={`rail_time_${railYear}`}/></div><div className="eyebrow block-label">버스 · 장항2동 내 관측 정류소</div><div className="controls"><Selector label="관측 패널" value={busPanel} options={[{value:'all',label:'전체 관측 정류소'},{value:'fixed18',label:'고정 18 ID'},{value:'sensitivity12',label:'민감도 12 ID'}]} onChange={setBusPanel}/><Selector label="버스 지표" value={busMetric} options={[{value:'total',label:'승차+하차'},{value:'boardings',label:'승차'},{value:'alightings',label:'하차'}]} onChange={setBusMetric}/><Selector label="월별 연도" value={busYear} options={[...new Set(summary.busMonthly.map((r:any)=>r.month.slice(0,4)))].map((x:any)=>({value:x,label:x}))} onChange={setBusYear}/><Selector label="정류소별 연도" value={stopYear} options={[...new Set(bus.stopYear.map((r:any)=>String(r.year)))].map((x:any)=>({value:x,label:x}))} onChange={setStopYear}/></div><div className="chart-grid"><Chart title="버스 연도별 전체·고정18·민감도12" subtitle="2020~2024 · 승차+하차 · 관측 정류장" points={bannual} series={[{key:'all',name:'전체'},{key:'fixed',name:'고정 18 ID'},{key:'sensitive',name:'민감도 12 ID'}]} unit="승하차 건" filename="bus_annual_three_panels" note="고정 18개는 서비스 동일성을 보장하지 않습니다. 5개 ID 좌표 불일치와 집계 범위 변경(2021-11-28~2024-09-27 정류장·노선 일부 누락)에 유의하세요."/><Chart title="버스 월별 승하차" subtitle={`${busYear} · ${panelName} · ${bmonths.length}개월 관측`} points={bmonths.map((r:any)=>({label:r.month,value:r[busPanel][busMetric]}))} series={[{key:'value',name:busMetric==='total'?'승차+하차':busMetric==='boardings'?'승차':'하차'}]} unit="건 · 정류소 승하차" filename={`bus_${busPanel}_${busMetric}_${busYear}`} note="2020-12-04 미관측, 2021-11-28·2024-09-28 집계 범위 변경(정류장·노선 누락·복귀). 관측일 QC 없는 행은 미확인입니다. 미관측은 0이 아닙니다."/><Chart title="정류소별 관측 활동 상위 12개" subtitle={`${stopYear} · 전체 관측 정류소 · 정류소별 관측월 상이`} points={stops.map((r:any)=>({label:r.name,value:r.boardings+r.alightings}))} series={[{key:'value',name:'승하차'}]} type="bar" unit="건 · 정류소별 관측 합계" filename={`bus_stops_${stopYear}`} note="이 그래프는 위 관측 패널 필터와 별개로 전체 관측 정류소 상위 12개를 표시합니다. 관측월·위치 스냅샷이 다를 수 있습니다."/></div></>;
}

type ExplorerTab = 'consumption' | 'business' | 'mobility' | 'transport';
function Explorer({ tab, setTab, active }: { tab: ExplorerTab; setTab: (tab: ExplorerTab) => void; active: boolean }) {
  const tabs: {key:ExplorerTab;label:string}[] = [{key:'consumption',label:'소비'},{key:'business',label:'사업체·인허가'},{key:'mobility',label:'이동'},{key:'transport',label:'교통'}];
  return <><div className="explorer-tabs" role="tablist" aria-label="상세 데이터 영역">{tabs.map(t=><button type="button" role="tab" aria-selected={tab===t.key} key={t.key} onClick={()=>setTab(t.key)}>{t.label}</button>)}</div>{(tab==='mobility'||tab==='transport')&&<div className="map-cross-links" aria-label="관련 지도 보기">{(tab==='mobility'?[['purpose_od','경기 목적 OD'],['stcis_internal','STCIS 내부 OD'],['stcis_external','STCIS 외부 OD']]:[['bus','버스 정류장'],['rail','정발산역']]).map(([id,label])=><a key={id} href={`${import.meta.env.BASE_URL}?page=map&layer=${id}&year=2024`}>{label} 지도 보기 ↗</a>)}</div>}<div role="tabpanel" aria-label={tabs.find(t=>t.key===tab)?.label}>{tab==='consumption'&&<Consumption active={active}/ >}{tab==='business'&&<Business active={active}/ >}{tab==='mobility'&&<><Mobility active={active}/><PurposeOrigins active={active}/><MorningReference active={active}/></>}{tab==='transport'&&<Transport active={active}/>}</div></>;
}

function Stage4Comparisons() {
  const { data, error } = useData('stage4_summary', true);
  if (!data) return <LoadState error={error}/>;
  const purpose = data.purpose as any[], bus = data.bus as any[], rail = data.rail as any[], stcis = data.stcisInternalFixed as any[];
  const y = (rows:any[], year:number) => rows.find(r=>r.year===year);
  const pct = (a:number,b:number) => `${fmt((b/a-1)*100,1)}%`;
  const comparison = [
    ['일반 카드 매출 지수','장항2동 행정동','2018~2020','2018→2020','100','77.57','−22.43%','동일 공급 A구간; 금액 단위·표본 미확인'],
    ['SGIS 사업체','장항2동 행정동','2020~2024','2020→2024','11,105','10,266','−7.6%','2019/2020 통계 계열 단절'],
    ['행안부 CORE 신규 인허가','장항2동 행정동','2019~2024','2019→2024','474','344','−27.4%','연구용 60개 업종; 점포 수 아님'],
    ['목적 OD TOTAL 전체 출발지','장항2동 행정동 도착','2023~2024','2023→2024',fmt(y(purpose,2023).total,2),fmt(y(purpose,2024).total,2),pct(y(purpose,2023).total,y(purpose,2024).total),'출발지 구성 변화; CNT는 고유 방문자 수 아님'],
    ['목적 OD 공통 232 코드','장항2동 행정동 도착','2023~2024','2023→2024',fmt(y(purpose,2023).common232,2),fmt(y(purpose,2024).common232,2),pct(y(purpose,2023).common232,y(purpose,2024).common232),'동일 코드가 동일한 과거 경계 보장하지 않음'],
    ['STCIS 내부 유입 고정 패널','장항 법정동','2021~2024','2021→2024',fmt(stcis.find(r=>r.year===2021&&r.direction==='INBOUND').value),fmt(stcis.find(r=>r.year===2024&&r.direction==='INBOUND').value),'−6.0%','16~19시 방향별 고정 패널'],
    ['STCIS 내부 유출 고정 패널','장항 법정동','2021~2024','2021→2024',fmt(stcis.find(r=>r.year===2021&&r.direction==='OUTBOUND').value),fmt(stcis.find(r=>r.year===2024&&r.direction==='OUTBOUND').value),'−1.1%','유입과 상대 지역·슬롯이 달라 차감 불가'],
    ['버스 전체 관측 정류장','장항2동 관측 정류장','2020~2024','2020→2024',fmt(y(bus,2020).all),fmt(y(bus,2024).all),pct(y(bus,2020).all,y(bus,2024).all),'집계 범위 변경 및 관측일 변동'],
    ['버스 민감도 12 ID','선정 정류장 ID','2020~2024','2020→2024',fmt(y(bus,2020).sensitivity12),fmt(y(bus,2024).sensitivity12),pct(y(bus,2020).sensitivity12,y(bus,2024).sensitivity12),'고정 서비스·위치 보장하지 않음'],
    ['정발산역 승하차','개별 철도역','2019~2024','2019→2024',fmt(y(rail,2019).activity),fmt(y(rail,2024).activity),pct(y(rail,2019).activity,y(rail,2024).activity),'장항2동 고유 방문객 수 아님'],
  ];
  return <><div className="chart-grid"><Chart title="목적 OD: 전체 출발지와 공통 232 코드" subtitle="2023·2024년 각 12개월 · 장항2동 행정동 도착" points={purpose.map(r=>({label:String(r.year),total:r.total,common:r.common232}))} series={[{key:'total',name:'전체 출발지'},{key:'common',name:'공통 232 코드'}]} unit="CNT" filename="stage4_purpose_common232" note="전체 출발지는 244→272개 코드입니다. 공통 코드는 232개이며 역사적 경계 동일성은 검증되지 않았습니다."/><Chart title="버스 전체·고정18·민감도12" subtitle="2020~2024 · 관측 정류장 승차+하차" points={bus.filter(r=>r.year>=2020&&r.year<=2024).map(r=>({label:String(r.year),all:r.all,fixed:r.fixed18,sensitive:r.sensitivity12}))} series={[{key:'all',name:'전체 관측'},{key:'fixed',name:'고정 18 ID'},{key:'sensitive',name:'민감도 12 ID'}]} unit="승하차 건" filename="stage4_bus_sensitivity" note="고정 18개는 동일 서비스 패널이 아닙니다. 5개 ID 좌표 불일치, 2020-12-04 미관측, 2021-11-28·2024-09-28 공급 변곡이 있습니다. 관측일 QC가 없는 행은 미확인입니다."/></div><div className="comparison-table-wrap"><table className="comparison-table"><caption>통합 비교표 · 각 행의 기간·공간·모집단을 따로 읽어야 합니다</caption><thead><tr>{['지표','분석 공간','관측 기간','비교 기간','기준값','비교값','변화율','주요 한계'].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{comparison.map(row=><tr key={row[0]}>{row.map((value,i)=><td key={i}>{value}</td>)}</tr>)}</tbody></table></div></>;
}

const nav = [ ['overview','연구 개요'], ['framework','연구 범위'], ['timeline','통합 타임라인'], ['economy','상업'], ['access','인구이동'], ['transport-story','교통 수요'], ['competition','경쟁·신도시'], ['synthesis','종합·원인'], ['implications','결론·방향'], ['explorer','상세 탐색'], ['data','자료·한계'] ];
function App() {
  const [activeNav, setActiveNav] = useState('overview');
  const [explorerTab, setExplorerTab] = useState<ExplorerTab>('consumption');
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      const current = entries.filter(e => e.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (current) setActiveNav(current.target.id);
    }, { rootMargin: '-100px 0px -55% 0px', threshold: [0,.25,.5] });
    nav.forEach(([id]) => { const el = document.getElementById(id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const explore = (tab: ExplorerTab) => { setExplorerTab(tab); jump('explorer'); };
  return <>
    <header className="hero"><div className="container hero-inner"><div>
      <p className="eyebrow">URBAN ACTIVITY · RESEARCH STORY</p>
      <h1>장항2동 도시활동<br/><em>변화 분석</em></h1>
      <p className="hero-copy">라페스타·웨스턴돔을 포함하는 중심상업지역의 소비·경제·이동활동 변화</p>
      <p className="hero-thesis">충격은 모두에게 왔지만 장항2동은 더 크게 흔들렸고, 코로나 이후 새 점포와 새 인구는 킨텍스·스타필드 쪽 신규 개발지로 갔습니다. 약한 고리는 소비가 아니라 새 점포의 진입과 주말 방문입니다.</p>
      <button className="hero-link" onClick={() => jump('timeline')}>시간 흐름으로 읽기 <span>↘</span></button>
    </div><div className="hero-note"><strong>분석 흐름</strong><span>① 상업: 카드매출·SGIS 사업체/종사자·행안부 인허가</span><span>② 인구이동: STCIS 교통카드 OD (보조: 경기 목적 OD)</span><span>③ 교통 수요: 버스 정류장·정발산역 승하차</span><span>④ 경쟁 상권·신도시: 새 점포와 새 인구가 간 곳</span><span>⑤ 종합: 시기별로 비교 지역과 함께 움직였는지 → 원인 후보 네 갈래 → 결론과 활성화 방향</span></div></div></header>
    <nav className="top-nav" aria-label="분석 영역"><div className="nav-inner">{nav.map(([id,label]) => <button type="button" key={id} className={activeNav === id ? 'active' : ''} onClick={() => jump(id)}>{label}</button>)}</div></nav>
    <main>
      <Overview/>
      <Framework/>
      <Section id="timeline" eyebrow="01 / INTEGRATED TIMELINE" title="2018~2025, 장항2동은 비교 지역보다 언제 더 약해졌나" intro="장항2동 값을 비교 지역 값으로 나눈 상대 지표를 한 시간축에 놓고, 코로나19·교통 개통·지역 개발 사건을 함께 표시합니다." tint>{active => <IntegratedTimeline active={active}/>}</Section>
      <Section id="economy" eyebrow="02 / COMMERCE" title="상업: 카드매출 · 사업체·종사자 · 인허가" intro="고양시와 같은 시기에 같은 방향으로 움직였는지 봅니다. 비교할 수 없는 구간은 이어 그리지 않고 이유를 적었습니다.">{active => <CommerceTimeStory active={active}/>}</Section>
      <Section id="access" eyebrow="03 / POPULATION MOBILITY" title="인구이동: STCIS 교통카드 OD의 월별 흐름" intro="장항 법정동 내부 고정 패널의 2021~2025년 월별 유입·유출과, 수요일·토요일 시간대별 시기 변화입니다. 코로나 이전 자료와 비교 지역이 없다는 한계를 함께 봅니다." tint>{active => <><MobilityTimeStory active={active}/><StcisWeekdayStory active={active}/><div className="story-after"><div><b>더 보기</b><p>목적 OD(2023~24), STCIS 외부 23개 지역, 24시간 시간대는 상세 탐색에 있습니다.</p></div><div><b>공간 단위</b><p>STCIS는 장항 <b>법정동</b>, 목적 OD는 장항2동 <b>행정동</b>입니다.</p></div><button type="button" onClick={()=>explore('mobility')}>이동 상세 탐색 ↗</button></div></>}</Section>
      <Section id="transport-story" eyebrow="04 / TRANSPORT DEMAND" title="교통 수요: 정발산역과 장항2동 버스 정류장" intro="일산선 다른 역, 고양시·경기도 전체 버스와 나란히 놓아 공통 흐름과 장항 고유 흐름을 나눕니다.">{active => <><TransportTimeStory active={active}/><div className="story-after"><div><b>더 보기</b><p>버스 고정 18·민감도 12 정류장 패널, 정류장별 값, 정발산역 시간대별 값은 상세 탐색에 있습니다.</p></div><div><b>단위</b><p>승하차는 이용 사건 수이며 방문객 수가 아닙니다.</p></div><button type="button" onClick={()=>explore('transport')}>교통 상세 탐색 ↗</button></div></>}</Section>
      <Section id="competition" eyebrow="05 / COMPETITION & NEW TOWN" title="경쟁 상권과 신도시: 새 점포와 새 인구는 어디로 갔나" intro="고양시 방문형 신규 인허가 중 각 동의 몫, 스타필드 개장 전후 변화, 동별 인구를 함께 봅니다." tint>{active => <CompetitionStory active={active}/>}</Section>
      <Section id="synthesis" eyebrow="06 / SYNTHESIS & CAUSES" title="종합: 시기별로 무엇이 함께, 무엇이 따로 움직였나" intro="코로나 이전 · 충격기 · 회복기 · 엔데믹 전환 이후 네 시기로 나눠 비교 지역 대비 변화를 보고, 원인 후보를 네 갈래로 나눕니다.">{active => <PhaseSynthesis active={active}/>}</Section>
      <Section id="stage4-comparison" eyebrow="06-A / COMPARABLE EVIDENCE" title="검증값과 민감도 비교" intro="자료별 관측 기간과 공간을 분리해 비교합니다. 서로 다른 수치를 합산하지 않습니다." tint>{() => <Stage4Comparisons/>}</Section>
      <Section id="implications" eyebrow="07 / CONCLUSION & STRATEGY" title="결론과 활성화 방향" intro="연구 질문별 결론을 중간발표의 조건부 판단 틀에 대입해 우선순위를 정했습니다.">{() => <ConclusionStrategy/>}</Section>
      <Section id="explorer" eyebrow="08 / DATA EXPLORER" title="상세 데이터 탐색" intro="자료별 연도·업종·방향을 선택하고 표·CSV·PNG 기능을 사용할 수 있습니다." tint>{active => <Explorer tab={explorerTab} setTab={setExplorerTab} active={active}/>}</Section>
      <Section id="data" eyebrow="09 / SOURCES & LIMITS" title="자료의 범위와 해석 한계" intro="그래프 아래 조건과 함께 원천·검증 상태를 확인할 수 있습니다.">{()=><><div className="data-grid"><Panel title="소비·경제" kicker="장항2동 행정동"><p>관측 카드매출 A구간 2018~2020 · SGIS 사업체 B구간 2020~2024 · 행안부 인허가 2019~2024. 카드 제공기관은 경기도(AI데이터행정과)이며, 카드사·표본·금액 단위·보정 방법은 공개되지 않았습니다(원자료 금액의 98~99%가 소수점 값이라 가공된 값으로 보임). 인허가 기록 수는 실제 신규 점포 수가 아닙니다.</p></Panel><Panel title="이동" kicker="서로 다른 공간"><p>목적 OD는 제한 출발지→장항2동. STCIS는 장항 법정동과 선정 상대 지역의 120개 대표일(2021~2025). NOT_FOUND와 미반환 슬롯은 0이 아닙니다.</p></Panel><Panel title="교통" kicker="역·정류소"><p>정발산역 역별·시간대별 승하차와 장항2동 관측 버스정류소 승하차입니다. 역간 철도 OD·버스 OD는 연구 범위 밖입니다.</p></Panel></div><Panel title="검증과 재현" kicker="자료 출처"><p>기존 최종 감사에서 핵심 지표 30/30 재계산 일치, 구조 검사 26/26 통과. 웹 데이터는 검증된 CSV에서 `scripts/build_web_data.py`가 생성하며 `public/data/manifest.json`에 원천 파일과 변환 검사값을 기록합니다. <a href={`${import.meta.env.BASE_URL}data/manifest.json`} target="_blank" rel="noreferrer">웹 데이터 출처 목록 ↗</a></p></Panel></>}</Section>
      <Section id="map-link" eyebrow="10 / SPATIAL VIEW" title="통합 공간 시각화에서 위치와 흐름 살펴보기" intro="PAGE 1의 수치가 어디에서 관측되었는지 PAGE 2의 검증 좌표와 함께 확인합니다.">{()=><div className="map-page-cta"><p>경기 목적 OD와 STCIS의 화살표는 출발지·도착지 대표점의 관계이며 실제 이동 경로가 아닙니다. 버스는 정류장 승하차 위치를 표시합니다.</p><a href={`${import.meta.env.BASE_URL}?page=map`}>PAGE 2 통합 공간 시각화 열기 ↗</a></div>}</Section>
    </main>
    <footer><div className="container"><strong>장항2동 도시활동 변화 분석</strong><span>연구 대상은 장항2동 전체입니다. 관측 결과와 연구자의 해석을 구분합니다.</span><button onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}>맨 위로 ↑</button></div></footer>
  </>;
}
export default App;
