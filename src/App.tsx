import { useEffect, useMemo, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';

type Row = Record<string, string | number | boolean | null>;
type Data = Record<string, any>;
type Point = { label: string; [key: string]: string | number | null };

const colors = ['#176b87', '#d66b32', '#4c8a70', '#9875ad', '#748b99'];
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
    tooltip: { trigger: 'axis', valueFormatter: (v: unknown) => fmt(asNumber(v), 2), backgroundColor: '#102833', borderColor: '#102833', textStyle: { color: '#fff' } },
    legend: { top: 2, left: 'center', textStyle: { color: '#536673' } },
    xAxis: { type: 'category', data: points.map(p => p.label), axisLabel: { color: '#627783', hideOverlap: true, rotate: points.length > 18 ? 45 : 0 }, axisLine: { lineStyle: { color: '#cbd8de' } } },
    yAxis: { type: 'value', name: yName || unit, nameTextStyle: { color: '#627783' }, axisLabel: { color: '#627783', formatter: (v: number) => Math.abs(v) >= 1000000 ? `${fmt(v / 1000000, 1)}백만` : Math.abs(v) >= 1000 ? `${fmt(v / 1000, 1)}천` : fmt(v, 1) }, splitLine: { lineStyle: { color: '#e8eef1' } } },
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
  return <section id="overview" className="section"><div className="container"><div className="section-heading"><div><p className="eyebrow">RESEARCH AT A GLANCE</p><h2>한 지역, 서로 다른 도시활동의 신호</h2></div><p>검증된 지표를 같은 화면에 배치하되, 기간·공간·모집단은 각 카드에 따로 표시합니다.</p></div><div className="stat-grid"><Stat label="관측 카드매출 지표" value={c ? fmt(c.card_2020_janghang2_index, 2) : '…'} detail="장항2동 행정동 · 2020 / 2018=100 · 공급 A구간"/><Stat label="SGIS 사업체" value={c ? `${fmt(c.sgis_business_2020_2024_pct, 2)}%` : '…'} detail="장항2동 행정동 · 2020→2024 B구간" color="orange"/><Stat label="SBR 3대 산업군" value={c ? `${fmt(c.sbr_three_group_2024_pct, 2)}%` : '…'} detail="장항2동 화면 기업체 · 2024" color="green"/><Stat label="정발산역 승하차" value={c ? `${fmt(c.rail_2025_index, 2)}%` : '…'} detail="역별 승하차 · 2025 / 2019 · 같은 CSV 범위" color="purple"/></div><div className="insight-grid"><Panel title="상대 약화의 단서" kicker="소비 · 사업체"><p>동일 공급 A구간 카드 지표와 SGIS 사업체 B구간에서 각각 상대 약화가 관측됩니다. 두 결과의 시기는 다릅니다.</p></Panel><Panel title="일괄 감소는 아님" kicker="기업 · 고용"><p>종사자는 2018→2024 증가했지만 2020→2024에는 감소했습니다. SBR 기업체와 SGIS 사업체는 서로 다른 상품입니다.</p></Panel><Panel title="이동은 제한 표본" kicker="접근 · 이동"><p>정발산역 승하차는 장항2동 방문자 수가 아닙니다. STCIS는 장항 법정동 대표일·고정 패널만 비교합니다.</p></Panel></div></div></section>;
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
  return <section id="framework" ref={ref} className="section section-dark"><div className="container"><div className="section-heading"><div><p className="eyebrow">RESEARCH FRAMEWORK</p><h2>무엇을, 어떤 단위로 보았나</h2></div><p>연구 대상은 라페스타·웨스턴돔을 포함하는 장항2동 행정동 전체입니다. 시설별 성과를 따로 산출하지 않았습니다.</p></div><div className="framework-grid"><div className="framework-text"><div className="step"><b>01</b><div><h3>소비와 경제</h3><p>카드매출·SGIS 사업체/종사자·SBR 기업생태로 서로 다른 경제활동 측면을 봅니다.</p></div></div><div className="step"><b>02</b><div><h3>이동과 접근</h3><p>목적 OD, 정발산역·버스 정류소 승하차, 장항 법정동 STCIS를 각각 독립적으로 봅니다.</p></div></div><div className="step"><b>03</b><div><h3>비교 가능한 기간만</h3><p>카드 A구간 2018~2020, SGIS 사업체 B구간 2020~2024, STCIS 내부 2021~2025처럼 비교 기간을 자료별로 분리합니다.</p></div></div><div className="scope-note">장항 법정동 ≠ 장항2동 행정동. 아래 경계는 현행 VWorld 스냅샷이며 역사적 경계가 아닙니다. 정류소는 2025년 SGIS 행정경계로 선별된 점입니다.</div></div><div className="map-panel"><div className="map-title"><strong>검증된 위치 자료의 범위</strong><span>장항 법정동 외곽 · 2025 정류소 스냅샷</span></div>{error ? <LoadState error={error}/> : !feature ? <LoadState error=""/> : <svg viewBox="0 0 600 420" role="img" aria-label="장항 법정동 현행 경계와 2025년 장항2동 선별 버스 정류소 위치"><defs><pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M 30 0 L 0 0 0 30" fill="none" stroke="#2b5260" strokeWidth=".7"/></pattern></defs><rect width="600" height="420" fill="#173642"/><rect width="600" height="420" fill="url(#grid)"/><path d={path} fill="#2b7285" fillOpacity=".42" stroke="#90d0d7" strokeWidth="2.5"/>{stops.map((r: any) => { const [x,y] = proj(r.lon, r.lat); return <circle key={r.id} cx={x} cy={y} r="3.5" fill="#f7ab75"><title>{r.name} · {r.id}</title></circle>; })}<text x="20" y="25" fill="#c5dce1" fontSize="13">장항 법정동 · 현행</text></svg>}<div className="map-legend"><span><i className="legend-area"/> 장항 법정동 현행 경계</span><span><i className="legend-point"/> 2025 장항2동 관측 정류소 {stops.length}개</span></div></div></div></div></section>;
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
  const { data, error } = useData('sgis', active); const { data: sbr } = useData('sbr', active); const [metric, setMetric] = useState('businesses'); const [episode, setEpisode] = useState('B_2020_2024'); const [compare, setCompare] = useState('고양시 전체'); const [industry, setIndustry] = useState('전체 업종'); const [sbrMetric, setSbrMetric] = useState('firms');
  if (!data || !sbr) return <LoadState error={error}/>;
  const years = [...new Set(data.rows.filter((r:any)=>metric==='businesses' ? r.episode===episode : true).map((r:any)=>r.year))].sort() as number[];
  const find = (year:number, region:string) => data.rows.find((r:any)=>r.year===year && r.region===region);
  const series = years.map(y=>({label:String(y),target:find(y,'장항2동')?.[metric]??null,other:find(y,compare)?.[metric]??null}));
  const industries = [...new Set(sbr.rows.filter((r:any)=>r.level==='ALL_INDUSTRIES'||r.level==='SUBINDUSTRY').map((r:any)=>r.industry))] as string[];
  const sbrRows = sbr.rows.filter((r:any)=>r.industry===industry && (r.level==='ALL_INDUSTRIES'||r.level==='SUBINDUSTRY')).sort((a:any,b:any)=>a.year-b.year);
  return <><div className="controls"><Selector label="SGIS 지표" value={metric} options={[{value:'businesses',label:'사업체 수'},{value:'workers',label:'종사자 수'},{value:'workersPerBusiness',label:'사업체당 종사자'}]} onChange={setMetric}/>{metric==='businesses' && <Selector label="사업체 연속 구간" value={episode} options={[{value:'B_2020_2024',label:'B · 2020~2024'},{value:'A_2018_2019',label:'A · 2018~2019'}]} onChange={setEpisode}/>}<Selector label="비교 지역" value={compare} options={['고양시 전체','장항1동','대화동'].map(x=>({value:x,label:x}))} onChange={setCompare}/></div><div className="chart-grid"><Chart title="SGIS 사업체·종사자 변화" subtitle={`장항2동과 ${compare} · ${metric==='businesses'?episode.replace('_',' ').replace('_','~'):'2018~2024'}`} points={series} series={[{key:'target',name:'장항2동'},{key:'other',name:compare}]} unit={metric==='workersPerBusiness'?'명/개':metric==='workers'?'명':'개'} filename={`sgis_${metric}_${episode}`} note={metric==='businesses'?'2019→2020 사업체 급증 원인이 미확인되어 A/B 구간을 이어 그리지 않습니다.':'2018→2024 종사자 +5.28%와 사업체 B구간의 2020→2024 종사자 -1.56%는 비교 기간이 다릅니다.'}/><Chart title="SBR 3대 산업군 구성비" subtitle="2019~2024 · 장항2동 SBR 화면 기업체" points={sbr.threeGroup.map((r:any)=>({label:String(r.year),value:r.sharePct}))} series={[{key:'value',name:'3대 산업군 비중'}]} unit="% · SBR 화면 기업체" filename="sbr_three_group_share" note="SBR 기업체와 SGIS 사업체는 서로 다른 데이터 상품입니다. 3대 산업군은 도매 및 상품 중개업·소매업(자동차 제외)·음식점 및 주점업입니다."/></div><div className="controls sub-controls"><Selector label="SBR 업종" value={industry} options={industries.map(x=>({value:x,label:x}))} onChange={setIndustry}/><Selector label="SBR 지표" value={sbrMetric} options={[{value:'firms',label:'기업체 수'},{value:'opened',label:'개업 기업체 수'},{value:'closed',label:'폐업 기업체 수'}]} onChange={setSbrMetric}/></div><Chart title="업종별 SBR 화면값" subtitle={`${industry} · 2019~2024 · 장항2동`} points={sbrRows.map((r:any)=>({label:String(r.year),value:r[sbrMetric]}))} series={[{key:'value',name:sbrMetric==='firms'?'기업체':sbrMetric==='opened'?'개업':'폐업'}]} unit="개 · SBR 화면" filename={`sbr_${sbrMetric}`} note="2024년 일부 화면 전년비와 활동상태 합계가 불일치합니다. 그래프는 검증된 화면 표시값을 연도별로 보여주며 공급기관 공식 전년비를 주장하지 않습니다."/></>;
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
  const { data: rail, error: re } = useData('rail', active); const { data: bus, error: be } = useData('bus', active); const [railMetric, setRailMetric] = useState('activity'); const [railYear, setRailYear] = useState('2025'); const [busPanel, setBusPanel] = useState('all'); const [busYear, setBusYear] = useState('2025'); const [stopYear, setStopYear] = useState('2025');
  if (!rail || !bus) return <LoadState error={re||be}/>;
  const rmonths = rail.monthly.filter((r:any)=>r.month.startsWith(railYear)); const rtime = rail.timegroups.filter((r:any)=>String(r.year)===railYear);
  const bmonths = bus.monthly.filter((r:any)=>r.month.startsWith(busYear)); const stops = bus.stopYear.filter((r:any)=>String(r.year)===stopYear).sort((a:any,b:any)=>(b.boardings+b.alightings)-(a.boardings+a.alightings)).slice(0,12);
  return <><div className="controls"><Selector label="철도 지표" value={railMetric} options={[{value:'activity',label:'승차+하차'},{value:'boardings',label:'승차'},{value:'alightings',label:'하차'}]} onChange={setRailMetric}/><Selector label="철도 월·시간 연도" value={railYear} options={rail.yearly.filter((r:any)=>r.year>=2019).map((r:any)=>({value:String(r.year),label:String(r.year)}))} onChange={setRailYear}/></div><div className="chart-grid"><Chart title="정발산역 연도별 승하차" subtitle="2015~2025 완전연도 · 같은 서울시 CSV 서비스 범위" points={rail.yearly.filter((r:any)=>r.months===12).map((r:any)=>({label:String(r.year),value:r[railMetric]}))} series={[{key:'value',name:railMetric==='activity'?'승하차':railMetric==='boardings'?'승차':'하차'}]} unit="건 · 정발산역" filename="rail_yearly" note="2025년 승하차는 2019년의 81.63%. 역 승하차는 장항2동 고유 방문자 수나 역간 OD가 아닙니다."/><Chart title="정발산역 월별 승하차" subtitle={`${railYear} · 정발산역 · ${rmonths.length}개월 관측`} points={rmonths.map((r:any)=>({label:r.month,value:r[railMetric]}))} series={[{key:'value',name:'승하차'}]} unit="건 · 정발산역" filename={`rail_monthly_${railYear}`}/><Chart title="정발산역 시간대별 승하차" subtitle={`${railYear} · 연간 관측 시간대 집계`} points={rtime.map((r:any)=>({label:r.group,value:r[railMetric]}))} series={[{key:'value',name:'승하차'}]} unit="건 · 정발산역" type="bar" filename={`rail_time_${railYear}`}/></div><div className="eyebrow block-label">버스 · 장항2동 내 관측 정류소</div><div className="controls"><Selector label="관측 패널" value={busPanel} options={[{value:'all',label:'전체 관측 정류소'},{value:'fixed18',label:'공통 18 ID'}]} onChange={setBusPanel}/><Selector label="월별 연도" value={busYear} options={[...new Set(bus.monthly.map((r:any)=>r.month.slice(0,4)))].map((x:any)=>({value:x,label:x}))} onChange={setBusYear}/><Selector label="정류소별 연도" value={stopYear} options={[...new Set(bus.stopYear.map((r:any)=>String(r.year)))].map((x:any)=>({value:x,label:x}))} onChange={setStopYear}/></div><div className="chart-grid"><Chart title="버스 월별 승하차" subtitle={`${busYear} · ${busPanel==='all'?'전체 관측 정류소':'공통 18 ID'} · ${bmonths.length}개월`} points={bmonths.map((r:any)=>({label:r.month,value:r[busPanel]}))} series={[{key:'value',name:'승하차'}]} unit="건 · 정류소 승하차" filename={`bus_${busPanel}_${busYear}`} note="2020-12-04·2025-12-09 결측일과 공급 범위 변경이 있습니다. 공통 ID가 같은 물리적 위치·서비스를 보장하지 않습니다."/><Chart title="정류소별 관측 활동 상위 12개" subtitle={`${stopYear} · 관측 합계 · 정류소별 관측월 상이`} points={stops.map((r:any)=>({label:r.name,value:r.boardings+r.alightings}))} series={[{key:'value',name:'승하차'}]} type="bar" unit="건 · 정류소별 관측 합계" filename={`bus_stops_${stopYear}`} note="정류소별 관측월과 위치 스냅샷이 다를 수 있어 수요 순위로 해석하지 않습니다."/></div></>;
}

function Integrated() { return <div className="integrated-grid"><Panel title="소비" kicker="2018~2020 · 행정동"><p className="fact">77.57 <span>vs 94.18</span></p><p>장항2동과 고양시의 2020 관측 카드 지수(2018=100). 카드 표본·금액 단위는 미확인입니다.</p></Panel><Panel title="사업체" kicker="2020~2024 · 행정동"><p className="fact">−7.56% <span>vs +8.74%</span></p><p>SGIS 사업체 B구간의 장항2동과 고양시 변화. 2019→2020 단절과 별도입니다.</p></Panel><Panel title="정발산역" kicker="2019↔2025 · 역"><p className="fact">81.63%</p><p>같은 CSV 범위의 승하차 수준. 행정동 방문 규모와 연결되지 않습니다.</p></Panel><Panel title="STCIS 내부" kicker="2021↔2025 · 장항 법정동"><p className="fact">−1.80% <span>/ +0.72%</span></p><p>16~19시 유입·유출 방향별 제한 고정 패널. 두 방향의 상대 지역 집합이 다릅니다.</p></Panel><div className="scope-note light wide"><strong>종합 해석</strong><p>서로 다른 시기·공간·표본에서 상대 약화와 증가·감소가 함께 관측됩니다. 하나의 도시활동 점수나 인과관계로 합산하지 않습니다. 현장 영업·공실·고객 시간대 조사가 다음 검증 과제입니다.</p></div></div>; }

const nav = [ ['overview','핵심 결과'], ['framework','연구 설계'], ['consumption','소비'], ['business','사업체·기업'], ['mobility','이동'], ['transport','교통'], ['synthesis','종합'], ['implications','시사점'], ['data','자료·한계'] ];
function App() {
  const [activeNav, setActiveNav] = useState('overview');
  useEffect(() => { const observer = new IntersectionObserver(entries => { const current = entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0]; if (current) setActiveNav(current.target.id); }, { rootMargin: '-100px 0px -55% 0px', threshold: [0,.25,.5] }); nav.forEach(([id])=> { const el=document.getElementById(id); if (el) observer.observe(el); }); return ()=>observer.disconnect(); }, []);
  const jump = (id:string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block:'start' });
  return <><header className="hero"><div className="container hero-inner"><div><p className="eyebrow">URBAN ACTIVITY · RESEARCH ATLAS</p><h1>장항2동 도시활동<br/><em>변화 분석</em></h1><p className="hero-copy">라페스타·웨스턴돔을 포함하는 중심상업지역의 소비·경제·이동활동 변화</p><button className="hero-link" onClick={()=>jump('overview')}>결과 탐색하기 <span>↘</span></button></div><div className="hero-note"><strong>읽는 방법</strong><span>자료마다 기간·공간·표본이 다릅니다.</span><span>그래프 필터를 바꾸고, 값을 표·CSV로 확인하세요.</span><span>각 패널의 관측 조건을 함께 읽어주세요.</span></div></div></header><nav className="top-nav" aria-label="분석 영역"><div className="nav-inner">{nav.map(([id,label])=><button type="button" key={id} className={activeNav===id?'active':''} onClick={()=>jump(id)}>{label}</button>)}</div></nav><main><Overview/><Framework/><Section id="consumption" eyebrow="01 / CONSUMPTION" title="관측 카드매출의 변화" intro="같은 공급 구간 안에서 월별 관측값과 연도 지수를 살펴봅니다.">{visible=><Consumption active={visible}/>}</Section><Section id="business" eyebrow="02 / BUSINESS & ENTERPRISE" title="사업체와 기업생태" intro="SGIS 사업체·종사자와 SBR 화면 기업체를 서로 다른 상품으로 읽습니다." tint>{visible=><Business active={visible}/>}</Section><Section id="mobility" eyebrow="03 / MOBILITY" title="목적 이동과 법정동 OD" intro="행정동 목적 OD와 법정동 STCIS는 공간 범위가 다릅니다.">{visible=><><Mobility active={visible}/><PurposeOrigins active={visible}/><MorningReference active={visible}/></>}</Section><Section id="transport" eyebrow="04 / TRANSPORTATION" title="철도역·버스정류소 활동" intro="승하차 관측으로 접근 활동을 살펴봅니다. 역간·정류소간 OD는 연구 범위 밖입니다." tint>{visible=><Transport active={visible}/>}</Section><Section id="synthesis" eyebrow="05 / INTEGRATED FINDINGS" title="같은 점수로 합치지 않는 종합" intro="자료별 유효 비교를 나란히 놓아 일치와 차이를 확인합니다.">{()=><Integrated/>}</Section><Section id="implications" eyebrow="06 / IMPLICATIONS" title="관측에서 다음 검증으로" intro="현재 자료가 뒷받침하는 활성화 방향과 추가 조사를 구분합니다." tint>{()=><div className="insight-grid"><Panel title="현장 활동의 시간 파악" kicker="우선 조사"><p>현재 공실·영업시간·고객 유입 시간대를 현장에서 조사해 관측 이동 패턴과 대조합니다. 이동량만으로 매출 원인을 단정하지 않습니다.</p></Panel><Panel title="소비 자료의 정의 확인" kicker="자료 보완"><p>카드 제공기관, 표본, 추정 방식, 금액 단위와 공급체계 변화를 확인한 뒤 최근 소비 변화와 연결합니다.</p></Panel><Panel title="정책 효과는 별도 평가" kicker="후속 연구"><p>업종 구성과 접근 활동은 정책 대상 선정의 단서입니다. 특정 정책의 효과는 시행 시점·비교집단·현장 자료가 확보된 뒤 평가해야 합니다.</p></Panel></div>}</Section><Section id="data" eyebrow="07 / SOURCES & LIMITS" title="자료의 범위와 해석 한계" intro="그래프 아래 조건과 함께 원천·검증 상태를 확인할 수 있습니다.">{()=><><div className="data-grid"><Panel title="소비·경제" kicker="장항2동 행정동"><p>관측 카드매출 A구간 2018~2020 · SGIS 사업체 B구간 2020~2024 · SBR 2019~2024. 카드 제공기관·표본·금액 단위, SBR 일부 2024 화면 충돌은 미확인입니다.</p></Panel><Panel title="이동" kicker="서로 다른 공간"><p>목적 OD는 제한 출발지→장항2동. STCIS는 장항 법정동과 선정 상대 지역의 120개 대표일(2021~2025). NOT_FOUND와 미반환 슬롯은 0이 아닙니다.</p></Panel><Panel title="교통" kicker="역·정류소"><p>정발산역 역별·시간대별 승하차와 장항2동 관측 버스정류소 승하차입니다. 역간 철도 OD·버스 OD는 연구 범위 밖입니다.</p></Panel></div><Panel title="검증과 재현" kicker="자료 출처"><p>기존 최종 감사에서 핵심 지표 30/30 재계산 일치, 구조 검사 26/26 통과. 웹 데이터는 검증된 CSV에서 `scripts/build_web_data.py`가 생성하며 `public/data/manifest.json`에 원천 파일과 변환 검사값을 기록합니다. <a href={`${import.meta.env.BASE_URL}data/manifest.json`} target="_blank" rel="noreferrer">웹 데이터 출처 목록 ↗</a></p></Panel></>}</Section></main><footer><div className="container"><strong>장항2동 도시활동 변화 분석</strong><span>연구 대상은 장항2동 전체입니다. 관측 결과와 연구자의 해석을 구분합니다.</span><button onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}>맨 위로 ↑</button></div></footer></>;
}
export default App;

