import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BaseMap, { type FlowNode, type FlowRenderMode, type MapController, type MapFeature, type PlaceMarker } from '../components/map/BaseMap';
import type { BoundaryCollection, BoundaryId, BoundaryMode, DataLayerId } from '../types/map';
import '../map.css';
import '../theme-ibm-map.css';

type Filters = { month:string; date:string; day:string; band:string; slot:string; direction:string; counterpart:string; purpose:string; sigungu:string; top:string; topCustom:string; panel:string; metric:string; search:string };
const defaults: Filters = { month:'ALL',date:'ALL',day:'ALL',band:'ALL',slot:'ALL',direction:'INBOUND',counterpart:'ALL',purpose:'TOTAL',sigungu:'ALL',top:'ALL',topCustom:'30',panel:'all',metric:'total',search:'' };
const catalog: {id:DataLayerId;label:string;years:number[];color:string;unit:string}[] = [
  {id:'purpose_od',label:'경기 목적 OD',years:[2023,2024],color:'#4ea8ff',unit:'CNT'},
  {id:'stcis_internal',label:'STCIS 내부 OD',years:[2020,2021,2022,2023,2024,2025,2026],color:'#3ddc84',unit:'useStf'},
  {id:'stcis_external',label:'STCIS 외부 OD',years:[2020,2021,2022,2023,2024,2025,2026],color:'#ff9f43',unit:'useStf'},
  {id:'bus',label:'버스 정류장별 승하차',years:[2020,2021,2022,2023,2024,2025,2026],color:'#c77dff',unit:'건'},
  {id:'rail',label:'정발산역 승하차',years:[2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025],color:'#ff7aa2',unit:'건'},
];
type Data = {records?:any[];observations?:any[][];locations?:Record<string,any>;requests?:any[][]};
const cache = new Map<string,Data>();
const base = `${import.meta.env.BASE_URL}data/map/`;
const uniq = (a:string[]) => ['ALL', ...[...new Set(a.filter(Boolean))].sort()];
const fmt = (v:number) => v.toLocaleString('ko-KR',{maximumFractionDigits:2});
const sourceFile = (id:DataLayerId, year:number) => id==='stcis_internal'||id==='stcis_external' ? `stcis_year/${id}_${year}.json` : id==='purpose_od'?'purpose_od_map.json':id==='bus'?'bus_stops_map.json':'rail_station_map.json';

function Selector({label,value,values,onChange,names}: {label:string;value:string;values:string[];onChange:(v:string)=>void;names?:Record<string,string>}) {
  return <label className="layer-select">{label}<select value={values.includes(value)?value:values[0]} onChange={e=>onChange(e.target.value)}>{values.map(v=><option value={v} key={v}>{names?.[v]|| (v==='ALL'?'전체':v)}</option>)}</select></label>;
}

export default function MapPage() {
  const query = new URLSearchParams(location.search);
  const requested = query.get('layer');
  const [selected,setSelected] = useState<DataLayerId[]>(catalog.some(x=>x.id===requested)?[requested as DataLayerId]:[]);
  const [year,setYear] = useState(Number(query.get('year'))||2024);
  const [filters,setFilters] = useState<Record<string,Filters>>({ purpose_od: { ...defaults, purpose: ['TOTAL','SHOPPING','TOURISM','SHOPPING_TOURISM'].includes(query.get('purpose')||'') ? query.get('purpose')! : 'TOTAL' } });
  const [loaded,setLoaded] = useState<Record<string,Data>>({});
  const [error,setError] = useState('');
  const [notice,setNotice] = useState(requested&&!catalog.some(x=>x.id===requested)?'지원하지 않는 지도 레이어는 적용하지 않았습니다.':'');
  const [playing,setPlaying] = useState(false);
  const [speed,setSpeed] = useState(1600);
  const [boundaries,setBoundaries] = useState<BoundaryCollection|null>(null);
  const [boundaryError,setBoundaryError] = useState('');
  const [tileStatus,setTileStatus] = useState<'loading'|'loaded'|'error'>('loading');
  const [mode,setMode] = useState<BoundaryMode>('both');
  const [selectedBoundary,setSelectedBoundary] = useState<BoundaryId|null>('janghang2_admin');
  const [feature,setFeature] = useState<MapFeature|null>(null);
  const [node,setNode] = useState<FlowNode|null>(null);
  const [zoom,setZoom] = useState<number|null>(null);
  const [renderMode,setRenderMode] = useState<FlowRenderMode>('straight');
  const [clustering,setClustering] = useState(false);
  const [places,setPlaces] = useState<PlaceMarker[]>([]);
  const [showPlaces,setShowPlaces] = useState(true);
  const mapRef = useRef<MapController|null>(null);
  const f=(id:DataLayerId)=>filters[id]||defaults;
  const change=(id:DataLayerId,key:keyof Filters,value:string)=>{setFilters(old=>{const next={...(old[id]||defaults),[key]:value}; const resets:Partial<Record<keyof Filters,(keyof Filters)[]>>={direction:['month','date','day','band','slot','counterpart'],month:['date','day','band','slot','counterpart'],date:['day','band','slot','counterpart'],day:['band','slot','counterpart'],band:['slot','counterpart'],slot:['counterpart'],purpose:['sigungu']};for(const k of resets[key]||[])next[k]='ALL';return {...old,[id]:next};});setFeature(null);setNode(null);};
  useEffect(()=>{setFilters(old=>Object.fromEntries(Object.entries(old).map(([id,value])=>[id,{...value,month:'ALL',date:'ALL',day:'ALL',band:'ALL',slot:'ALL',counterpart:'ALL',sigungu:'ALL'}])));setFeature(null);setNode(null);},[year]);
  const commonYears = useMemo(()=>selected.length ? catalog.find(x=>x.id===selected[0])!.years.filter(y=>selected.every(id=>catalog.find(x=>x.id===id)!.years.includes(y))) : [],[selected]);
  useEffect(()=>{if(selected.length&&!commonYears.includes(year)){setYear(commonYears[commonYears.length-1]||year);setNotice('지원되지 않는 연도는 실제 공통 관측 연도로 복구했습니다.');}},[selected,commonYears,year]);
  useEffect(()=>{if(!playing||commonYears.length<2)return;const timer=setInterval(()=>setYear(y=>commonYears[(commonYears.indexOf(y)+1)%commonYears.length]),speed);return()=>clearInterval(timer);},[playing,speed,commonYears]);
  useEffect(()=>{const c=new AbortController();fetch(base+'boundaries.geojson',{signal:c.signal}).then(r=>{if(!r.ok)throw Error(`HTTP ${r.status}`);return r.json();}).then(d=>{if(d.type!=='FeatureCollection'||d.features?.length!==2)throw Error('경계 형식 오류');setBoundaries(d);}).catch(e=>{if(e.name!=='AbortError')setBoundaryError(String(e));});return()=>c.abort();},[]);
  useEffect(()=>{fetch(base+'places_approx_map.json').then(r=>r.ok?r.json():null).then(d=>{if(d?.records)setPlaces(d.records.filter((r:any)=>Array.isArray(r.coordinates)).map((r:any)=>({name:r.name,coordinates:r.coordinates})));}).catch(()=>{});},[]);
  const direction=f('stcis_internal').direction;
  useEffect(()=>{
    let cancelled=false;
    const files=selected.flatMap(id=>[sourceFile(id,year),...(id==='stcis_internal'&&(direction==='ALL'||direction==='OUTBOUND')?[`stcis_year/internal_outbound_${year}.json`]:[])]);
    setError('');
    Promise.all(files.map(async file=>{if(cache.has(file))return [file,cache.get(file)!] as const;const r=await fetch(base+file);if(!r.ok)throw Error(`${file}: HTTP ${r.status}`);const data=await r.json() as Data;cache.set(file,data);return [file,data] as const;}))
      .then(rows=>{if(!cancelled)setLoaded(Object.fromEntries(rows));}).catch(e=>{if(!cancelled)setError(String(e));});
    return()=>{cancelled=true;};
  },[selected,year,direction]);
  const computed=useMemo(()=>{
    const features:MapFeature[]=[], stats:Record<string,string>={};
    for(const id of selected){
      const config=catalog.find(x=>x.id===id)!, filter=f(id), data=loaded[sourceFile(id,year)];
      if(!data)continue;
      if(id==='purpose_od'){
        const all=(data.records||[]).filter(r=>r.year===year&&r.purpose===filter.purpose);
        const rows=all.filter(r=>filter.sigungu==='ALL'||r.origin_sigungu===filter.sigungu);
        const matched=rows.filter(r=>r.coordinate_status==='MATCHED'&&r.origin_coordinates);
        const topCount=filter.top==='ALL'?matched.length:filter.top==='CUSTOM'?Math.max(1,Number(filter.topCustom)||1):Number(filter.top);
        stats[id]=`전체 ${fmt(rows.reduce((s,r)=>s+r.cnt,0))} CNT · 지도 표시 가능 ${fmt(matched.reduce((s,r)=>s+r.cnt,0))} CNT · ${matched.length}/${rows.length}개 출발지 · 현재 상위 ${Math.min(topCount,matched.length)}개 흐름`;
        for(const r of [...matched].sort((a,b)=>b.cnt-a.cnt).slice(0,topCount))features.push({id:`${id}-${year}-${r.purpose}-${r.origin_code}`,layer:id,label:r.origin_name,detail:`${r.origin_sigungu} · ${r.origin_code} · ${year}년 ${r.purpose} · CNT ${fmt(r.cnt)} · ${r.coordinate_status} · ${r.origin_boundary_vintage} · 실제 이동 경로가 아닌 OD 곡선. 역사적 공간 동일성 미검증.`,color:config.color,value:r.cnt,kind:'flow',from:r.origin_coordinates,to:r.destination_coordinates});
      } else if(id==='bus'||id==='rail'){
        const rows=(data.records||[]).filter(r=>r.year===year&&(filter.month==='ALL'||String(r.month)===filter.month));
        const chosen=id==='bus'?rows.filter(r=>(filter.panel==='all'||r[filter.panel])&&(!filter.search||`${r.stop_name} ${r.stop_id}`.includes(filter.search))):rows;
        const grouped=new Map<string,any>();
        for(const r of chosen){const key=id==='bus'?r.stop_id:r.station_name, item=grouped.get(key)||{...r,boardings:0,alightings:0,total:0,months:0,qcMonths:0,unknownQcMonths:0,unobservedDays:0};item.boardings+=r.boardings;item.alightings+=r.alightings;item.total+=r.total;item.months++;if(id==='bus'){if(r.observed_days==null)item.unknownQcMonths++;else{item.qcMonths++;item.unobservedDays+=Math.max(0,r.calendar_days-r.observed_days);}}grouped.set(key,item);}
        stats[id]=`${chosen.length}개 관측 행 · ${grouped.size}개 ${id==='bus'?'정류장':'역'} · ${filter.month==='ALL'?'관측 월 합계':filter.month+'월'}`;
        for(const r of grouped.values())if(r.coordinates)features.push({id:`${id}-${year}-${r.stop_id||r.station_name}`,layer:id,label:r.stop_name||r.station_name,detail:`${year}년 · ${r.months}개 관측 월 · 승차 ${fmt(r.boardings)}건 · 하차 ${fmt(r.alightings)}건 · 합계 ${fmt(r.total)}건${id==='bus'?` · 정류장 ID ${r.stop_id} · 좌표 스냅샷 ${r.snapshot_date} · 좌표 불일치 ${r.coordinate_mismatch_fixed18?'확인':'해당 없음'} · 관측일 QC ${r.qcMonths}개월, 미확인 ${r.unknownQcMonths}개월, QC 확인 월의 미관측 ${r.unobservedDays}일`:''}`,color:config.color,value:r[filter.metric],kind:'point',to:r.coordinates});
      } else {
        const extra=id==='stcis_internal'?loaded[`stcis_year/internal_outbound_${year}.json`]:undefined;
        const rows=[...(data.observations||[]),...(extra?.observations||[])];
        const chosen=rows.filter(r=>(filter.direction==='ALL'||r[6]===filter.direction)&&(filter.month==='ALL'||r[0].slice(5,7)===filter.month)&&(filter.date==='ALL'||r[0]===filter.date)&&(filter.day==='ALL'||r[2]===filter.day)&&(filter.band==='ALL'||r[3]===filter.band)&&(filter.slot==='ALL'||`${r[4]}:${r[5]}`===filter.slot)&&(filter.counterpart==='ALL'||(r[6]==='INBOUND'?r[9]:r[10])===filter.counterpart));
        const groups=new Map<string,{value:number;rows:number;code:string;direction:string;usedCodes:Set<string>}>();
        for(const r of chosen){const code=r[6]==='INBOUND'?r[9]:r[10], key=`${r[6]}-${code}`,item=groups.get(key)||{value:0,rows:0,code,direction:r[6],usedCodes:new Set<string>()};item.value+=r[11];item.rows++;item.usedCodes.add(r[6]==='INBOUND'?r[7]:r[8]);groups.set(key,item);}
        const requestRows=(data.requests||[]).filter(r=>r[0].startsWith(String(year))&&(filter.date==='ALL'||r[0]===filter.date));
        const notFound=requestRows.filter(r=>r[4]==='NOT_FOUND').length;
        const topCount=filter.top==='ALL'?groups.size:filter.top==='CUSTOM'?Math.max(1,Number(filter.topCustom)||1):Number(filter.top);
        stats[id]=`${chosen.length}개 반환 관측 행 · useStf ${fmt(chosen.reduce((s,r)=>s+r[11],0))} · 현재 상위 ${Math.min(topCount,groups.size)}개 흐름 · 원본 요청 NOT_FOUND ${notFound}건${id==='stcis_internal'&&extra?' (유출 파생 자료의 요청 상태는 미포함)':''} · 미반환은 0 아님`;
        for(const g of [...groups.values()].sort((a,b)=>b.value-a.value).slice(0,topCount)){const loc=data.locations?.[g.code];if(!loc?.coordinates)continue;const center:[number,number]=[126.75663662,37.64781864];const used=[...g.usedCodes].join(', ');features.push({id:`${id}-${year}-${g.direction}-${g.code}`,layer:id,label:`${loc.name} ${g.direction==='INBOUND'?'→ 장항':'← 장항'}`,detail:`${loc.name} · 현행 코드 ${g.code} · 요청 코드 ${used} · ${g.direction} · ${year}년 · useStf ${fmt(g.value)} · 관측 행 ${g.rows} · 상태 OBSERVED · VWorld 2026-10 대표점 · ${used===g.code?'현행 코드 사용':'과거 코드→현행 위치 연결, 역사적 공간 동일성 미검증'} · NOT_FOUND는 0이 아님.`,color:g.direction==='INBOUND'?'#3ddc84':'#ff9f43',value:g.value,kind:'flow',from:g.direction==='INBOUND'?loc.coordinates:center,to:g.direction==='INBOUND'?center:loc.coordinates});}
      }
    }
    return {features,stats};
  },[selected,year,loaded,filters]);
  const toggle=(id:DataLayerId)=>{
    if(selected.includes(id)){setSelected(old=>old.filter(x=>x!==id));setFeature(null);setNode(null);setPlaying(false);setNotice('');}
    else if(selected.length>=2)setNotice('데이터 레이어는 최대 2개입니다. 기존 레이어를 먼저 해제하세요.');
    else{setSelected(old=>[...old,id]);setFeature(null);setNode(null);setNotice('');}
  };
  const control=(id:DataLayerId)=>{
    const filter=f(id),data=loaded[sourceFile(id,year)],records=data?.records||[],rows=[...(data?.observations||[]),...(id==='stcis_internal'?(loaded[`stcis_year/internal_outbound_${year}.json`]?.observations||[]):[])];
    const directionRows=rows.filter(r=>filter.direction==='ALL'||r[6]===filter.direction);
    const monthRows=directionRows.filter(r=>filter.month==='ALL'||r[0].slice(5,7)===filter.month);
    const dateRows=monthRows.filter(r=>filter.date==='ALL'||r[0]===filter.date);
    const dayRows=dateRows.filter(r=>filter.day==='ALL'||r[2]===filter.day);
    const bandRows=dayRows.filter(r=>filter.band==='ALL'||r[3]===filter.band);
    const select=(key:keyof Filters,label:string,values:string[],names?:Record<string,string>)=><Selector label={label} value={filter[key]} values={values} names={names} onChange={v=>change(id,key,v)}/>;
    const topControl=<>{select('top','표시 흐름',['ALL','10','20','50','CUSTOM'],{ALL:'전체',CUSTOM:'직접 입력'})}{filter.top==='CUSTOM'&&<label className="layer-select">표시 개수<input type="number" min="1" max="500" value={filter.topCustom} onChange={e=>change(id,'topCustom',e.target.value)}/></label>}</>;
    return <section className="layer-filters" key={id}><h2>{catalog.find(x=>x.id===id)?.label} 필터</h2>
      {id==='purpose_od'&&<>{select('purpose','목적',uniq(records.filter(r=>r.year===year).map(r=>r.purpose)),{TOTAL:'전체 목적',SHOPPING:'쇼핑',TOURISM:'관광',SHOPPING_TOURISM:'쇼핑+관광'})}{select('sigungu','시군구',uniq(records.filter(r=>r.year===year&&r.purpose===filter.purpose).map(r=>r.origin_sigungu)))}{topControl}</>}
      {(id==='stcis_internal'||id==='stcis_external')&&<>{select('direction','방향',id==='stcis_internal'?['ALL','INBOUND','OUTBOUND']:uniq(rows.map(r=>r[6])),{INBOUND:'유입',OUTBOUND:'유출'})}{select('month','월',uniq(directionRows.map(r=>r[0].slice(5,7))))}{select('date','대표일',uniq(monthRows.map(r=>r[0])))}{select('day','요일 유형',uniq(dateRows.map(r=>r[2])),{WEEKDAY:'수요일',WEEKEND:'토요일'})}{select('band','시간대',uniq(dayRows.map(r=>r[3])))}{select('slot','15분 슬롯',uniq(bandRows.map(r=>`${r[4]}:${r[5]}`)))}{select('counterpart','상대 법정동',uniq(bandRows.map(r=>r[6]==='INBOUND'?r[9]:r[10])),Object.fromEntries(Object.entries(data?.locations||{}).map(([code,location])=>[code,`${location.name} (${code})`])))}{topControl}</>}
      {(id==='bus'||id==='rail')&&<>{select('month','월',uniq(records.filter(r=>r.year===year).map(r=>String(r.month))))}{select('metric','지표',['total','boardings','alightings'],{total:'승차+하차',boardings:'승차',alightings:'하차'})}{id==='bus'&&<>{select('panel','정류장 패널',['all','fixed18','sensitivity12'],{all:'전체 관측',fixed18:'고정 18 ID',sensitivity12:'민감도 12 ID'})}<label className="layer-select">정류장 검색<input value={filter.search} onChange={e=>change(id,'search',e.target.value)} placeholder="이름 또는 ID"/></label></>}</>}
      <p className="layer-stat">{computed.stats[id]||'자료를 불러오는 중'}</p></section>;
  };
  const boundary=boundaries?.features.find(x=>x.properties.id===selectedBoundary)?.properties;
  const [mapReady,setMapReady]=useState(false);
  const onReady=useCallback((controller:MapController|null)=>{mapRef.current=controller;setMapReady(!!controller);},[]);
  const fitKey=useRef('');
  useEffect(()=>{const key=selected.join(',');if(!key){fitKey.current='';return;}if(mapReady&&key!==fitKey.current&&computed.features.length&&mapRef.current){fitKey.current=key;mapRef.current.fitFlows();}},[selected,computed.features,mapReady]);
  const onBoundary=useCallback((id:BoundaryId|null)=>setSelectedBoundary(old=>old===id?null:id),[]);
  const onView=useCallback((z:number)=>setZoom(z),[]);
  const onFeature=useCallback((item:MapFeature)=>{setFeature(item);setNode(null);},[]);
  const onNode=useCallback((item:FlowNode)=>{setNode(item);setFeature(null);},[]);
  const clearFlow=()=>{setNode(null);setFeature(null);};
  const connected=node?computed.features.filter(item=>item.kind==='flow'&&item.layer===node.layer&&(item.from?.every((v,i)=>Math.abs(v-node.coordinates[i])<.00001)||item.to.every((v,i)=>Math.abs(v-node.coordinates[i])<.00001))):[];
  return <main className="map-page"><div className="map-page-heading"><div><p className="eyebrow">PAGE 2 / SPATIAL VIEW</p><h1>통합 공간 시각화</h1><p>검증된 대표 좌표와 관측값을 공간에서 탐색합니다.</p></div><div className="map-stage-badge">4단계 · 관측 레이어</div></div>
    <div className="map-workspace"><aside className="map-sidebar map-left" aria-label="지도 제어 패널"><section><h2>데이터 레이어 {selected.length}/2</h2><div className="data-layer-list">{catalog.map(item=><button key={item.id} type="button" aria-pressed={selected.includes(item.id)} onClick={()=>toggle(item.id)}><span className="layer-color" style={{background:item.color}}/>{item.label}<small>{item.unit}</small></button>)}</div>{notice&&<p className="map-notice" role="status">{notice}</p>}{error&&<p className="map-notice" role="alert">데이터 로딩 오류: {error}</p>}</section>
      <section><h2>공통 관측 연도</h2>{commonYears.length?<><div className="play-row"><button onClick={()=>setYear(y=>commonYears[Math.max(0,commonYears.indexOf(y)-1)])} aria-label="이전 연도">◀</button><select aria-label="연도" value={commonYears.includes(year)?year:commonYears[commonYears.length-1]} onChange={e=>setYear(Number(e.target.value))}>{commonYears.map(y=><option key={y}>{y}</option>)}</select><button onClick={()=>setYear(y=>commonYears[Math.min(commonYears.length-1,commonYears.indexOf(y)+1)])} aria-label="다음 연도">▶</button></div><div className="play-row"><button onClick={()=>setPlaying(!playing)} disabled={commonYears.length<2}>{playing?'일시정지':'연도 재생'}</button><select aria-label="재생 속도" value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={2400}>느리게</option><option value={1600}>보통</option><option value={800}>빠르게</option></select></div><p className="map-panel-description">공통 연도라도 날짜·시간·표본은 같지 않습니다.</p></>:<p className="map-disabled-note">레이어를 선택하면 관측 연도가 표시됩니다.</p>}</section>
      {selected.map(control)}<section><h2>공간 경계</h2><div className="boundary-options"><button aria-pressed={mode==='both'} onClick={()=>setMode('both')}>두 경계 모두</button><button aria-pressed={mode==='admin'} onClick={()=>setMode('admin')}>장항2동 행정동</button><button aria-pressed={mode==='legal'} onClick={()=>setMode('legal')}>장항 법정동</button></div></section><section><h2>흐름 표현</h2><div className="boundary-options"><button aria-pressed={renderMode==='straight'} onClick={()=>setRenderMode('straight')}>직선 화살표</button><button aria-pressed={renderMode==='curved'} onClick={()=>setRenderMode('curved')}>곡선</button><button aria-pressed={renderMode==='animated-straight'} onClick={()=>setRenderMode('animated-straight')}>흐름 애니메이션</button><button aria-pressed={clustering} onClick={()=>setClustering(v=>!v)}>지점 자동 묶기 {clustering?'켜짐':'꺼짐'}</button><button aria-pressed={showPlaces} onClick={()=>setShowPlaces(v=>!v)}>라페스타·웨스턴돔 표시 {showPlaces?'켜짐':'꺼짐'}</button></div><p className="map-panel-description">축소하면 가까운 지점이 묶이고, 확대하면 다시 나뉩니다. 묶음의 값은 표시 중인 흐름의 합입니다.</p></section><section><h2>지도 조작</h2><p className="map-panel-description">마우스 드래그로 이동하고 휠로 확대·축소합니다.</p><div className="map-control-row"><button onClick={()=>mapRef.current?.zoomIn()}>확대 +</button><button onClick={()=>mapRef.current?.zoomOut()}>축소 −</button></div><div className="map-control-row"><button onClick={()=>mapRef.current?.resetView()}>초기 위치로</button><button onClick={()=>mapRef.current?.fitFlows()}>흐름 전체 보기</button></div><p className="map-zoom-readout">확대 단계 {zoom??'로딩 중'}</p></section></aside>
      <section className="map-center" aria-label="통합 지도"><div className="map-canvas-head"><strong>고양시 일산동구 장항 일대</strong><span>배경: OpenFreeMap · © OpenStreetMap contributors · 경계: SGIS·VWorld</span></div><div className="map-canvas-wrap">{boundaryError?<div className="map-boundary-error" role="alert">경계 로딩 오류: {boundaryError}</div>:boundaries?<BaseMap boundaries={boundaries} boundaryMode={mode} selectedBoundary={selectedBoundary} onSelectBoundary={onBoundary} onReady={onReady} onTileStatus={setTileStatus} onViewChange={onView} dataFeatures={computed.features} onSelectFeature={onFeature} selectedFeatureId={feature?.id||null} selectedNode={node} onSelectNode={onNode} renderMode={renderMode} clustering={clustering} places={showPlaces?places:[]}/>:<div className="map-boundary-loading">경계를 불러오는 중</div>}{tileStatus==='error'&&<div className="map-tile-error" role="status">배경지도 타일 오류. 경계와 데이터는 계속 표시됩니다.</div>}</div><div className="map-canvas-foot"><div className="map-boundary-legend"><span><i className="map-swatch map-swatch-admin"/>장항2동 행정동 · SGIS 2024년 2분기</span><span><i className="map-swatch map-swatch-legal"/>장항 법정동 · VWorld 2026년 10월</span>{showPlaces&&places.length>0&&<span><i className="map-swatch map-swatch-place"/>라페스타·웨스턴돔 대략 위치(건물 구역계 중심)</span>}{selected.map(id=><span key={id}><i className="map-swatch" style={{borderColor:catalog.find(x=>x.id===id)?.color}}/>{catalog.find(x=>x.id===id)?.label} · {catalog.find(x=>x.id===id)?.unit}</span>)}</div><p>화살표는 출발지→도착지 OD이며 실제 이동 경로가 아닙니다. 값이 클수록 굵고 진합니다. 목적 OD는 파랑, STCIS 유입은 초록, 유출은 주황입니다. 지점 원 크기는 표시 중인 흐름의 유입·유출 합입니다. 지점이나 흐름에 마우스를 올리거나 클릭해 연결을 탐색하세요. 크기는 레이어 내부에서만 비교하세요. 미관측·미반환은 0이 아닙니다.</p></div></section>
      <aside className="map-sidebar map-right" aria-label="지도 정보 패널"><section><p className="eyebrow">DETAILS</p><h2>선택 정보</h2>{node?<div className="map-boundary-details"><h3>{node.role==='origin'?'출발지':'도착지'} · {node.label}</h3><p>{catalog.find(x=>x.id===node.layer)?.label} · 연결된 표시 흐름 {connected.length}개 · 현재 필터의 대표 좌표입니다.</p><p>현재 표시된 상위 흐름만 강조합니다. 원본 전체 관측 합계와 다를 수 있습니다.</p><button className="map-clear-selection" onClick={clearFlow}>전체 보기</button></div>:feature?<div className="map-boundary-details"><h3>{feature.label}</h3><p>{feature.detail}</p><button className="map-clear-selection" onClick={clearFlow}>전체 보기</button></div>:boundary?<div className="map-boundary-details"><h3>{boundary.name}</h3><dl><dt>공간 단위</dt><dd>{boundary.unit}</dd><dt>코드</dt><dd>{boundary.code}</dd><dt>제공기관</dt><dd>{boundary.provider}</dd><dt>기준시점</dt><dd>{boundary.vintage}</dd><dt>관련 자료</dt><dd>{boundary.research_data.join(' · ')}</dd></dl><p className="map-caution">{boundary.caution}</p></div>:<p className="map-panel-description">경계·화살표·마커를 클릭하면 상세 정보가 표시됩니다.</p>}</section><section><h2>표시 중인 흐름 선택</h2><p className="map-panel-description">항목을 선택하면 해당 흐름을 강조합니다.</p><div className="flow-list">{computed.features.filter(x=>x.kind==='flow').map(x=><button key={x.id} onClick={()=>onFeature(x)} aria-pressed={feature?.id===x.id}>{x.label} · {fmt(x.value)}</button>)}</div></section><section><h2>자료 해석</h2><p className="map-panel-description">목적 OD는 장항2동 행정동, STCIS는 장항 법정동 기준입니다. 버스는 정류장, 철도는 개별 역의 승하차입니다.</p><p className="map-panel-description">목적 OD 2025년은 부분 관측으로 제외했습니다. 정발산역 위치는 국가철도공단 「전국도시철도역사정보표준데이터」(기준 2025-04-08)의 역 대표 좌표입니다.</p><p className="map-panel-description">STCIS 내부 유입 원본 150,788행, 외부 원본 8,182행입니다. 내부 유출은 별도 채택 CSV에서 생성한 파생 자료입니다.</p><p className="map-panel-description">버스 고정 18 ID는 동일 서비스 패널이 아닙니다. 5개 ID 좌표 불일치, 2020-12-04 미관측, 2021-11-28·2024-09-28 공급 범위 변곡이 있습니다. 좌표 변화 원인은 단정하지 않습니다.</p><p className="map-panel-description">경계의 기준시점은 서로 다릅니다. 현재 대표점이 과거 실제 이동 위치를 뜻하지 않습니다.</p></section></aside></div></main>;
}
