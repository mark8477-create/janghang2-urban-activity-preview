import { useMemo, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';

export type TsEvent = { date: string; label: string; kind: string };
export type TsSeries = { name: string; data: (number | null)[]; color: string; dashed?: boolean; width?: number; area?: boolean };
export type TsArea = { from: string; to: string; label: string; color?: string };

// Carbon 의미색·데이터 팔레트: 방역 Red 60, 지원금 Yellow 50, 금리 Gray 50, 지역 개발 Orange 40, 교통 Green 60
export const EVENT_COLORS: Record<string, string> = { covid: '#da1e28', policy: '#b28600', economy: '#8d8d8d', local: '#ff832b', transport: '#198038', competitor: '#d02670' };
export const EVENT_KIND_LABEL: Record<string, string> = { covid: '코로나19·방역', policy: '재난지원금', economy: '금리', local: '장항동 개발', transport: '교통 개통', competitor: '경쟁 상권' };
const MAJOR = new Set(['2020-01-20', '2022-04-18', '2024-12-28', '2021-07-12']);

const fmt = (n: number | null | undefined, d = 1) => n == null || !Number.isFinite(n) ? '–' : new Intl.NumberFormat('ko-KR', { maximumFractionDigits: d }).format(n);

export function monthRange(from: string, to: string) {
  const out: string[] = [];
  let y = Number(from.slice(0, 4)), m = Number(from.slice(5, 7));
  const end = Number(to.slice(0, 4)) * 12 + Number(to.slice(5, 7));
  while (y * 12 + m <= end) { out.push(`${y}-${String(m).padStart(2, '0')}`); m++; if (m > 12) { m = 1; y++; } }
  return out;
}

/** Align a list of {month, ...} rows to an axis of months. */
export function align<T extends { month: string }>(months: string[], rows: T[], pick: (r: T) => number | null | undefined) {
  const map = new Map(rows.map(r => [r.month, r]));
  return months.map(m => { const r = map.get(m); const v = r ? pick(r) : null; return v == null || !Number.isFinite(v) ? null : v; });
}

/** Index a series so that the mean over [from,to] = 100. */
export function indexTo(months: string[], data: (number | null)[], from: string, to: string) {
  const base = data.filter((v, i) => v != null && months[i] >= from && months[i] <= to) as number[];
  if (!base.length) return data.map(() => null);
  const mean = base.reduce((a, b) => a + b, 0) / base.length;
  return data.map(v => v == null ? null : v / mean * 100);
}

/** Trailing 12-month sum (null until 12 observed months). */
export function rolling12(data: (number | null)[]) {
  return data.map((_, i) => { if (i < 11) return null; const w = data.slice(i - 11, i + 1); return w.some(v => v == null) ? null : (w as number[]).reduce((a, b) => a + b, 0); });
}

function downloadCsv(filename: string, months: string[], series: TsSeries[]) {
  const head = ['month', ...series.map(s => s.name)];
  const lines = [head, ...months.map((m, i) => [m, ...series.map(s => s.data[i] ?? '')])].map(r => r.map(v => `"${String(v).replaceAll('"', '""')}"`).join(','));
  const url = URL.createObjectURL(new Blob(['﻿', lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

export function EventChart({ title, kicker, months, series, unit, events = [], areas = [], note, filename, height = 330, showEventLabels = true, yMin }: {
  title: string; kicker: string; months: string[]; series: TsSeries[]; unit: string; events?: TsEvent[]; areas?: TsArea[]; note?: React.ReactNode; filename: string; height?: number; showEventLabels?: boolean; yMin?: number;
}) {
  const ref = useRef<ReactECharts>(null);
  const [showEvents, setShowEvents] = useState(true);
  const inRange = events.filter(e => e.date.slice(0, 7) >= months[0] && e.date.slice(0, 7) <= months[months.length - 1]);
  const option = useMemo(() => ({
    animationDuration: 250,
    grid: { left: 52, right: 24, top: 56, bottom: 64, containLabel: true },
    legend: { top: 4, left: 'center', textStyle: { color: '#525252', fontSize: 13 } },
    tooltip: {
      trigger: 'axis', backgroundColor: '#161616', borderColor: '#161616', textStyle: { color: '#fff', fontSize: 13 },
      formatter: (items: any[]) => {
        const m = items[0]?.axisValue as string;
        const ev = inRange.filter(e => e.date.slice(0, 7) === m).map(e => `<div style="color:#f1c21b">● ${e.date} ${e.label}</div>`).join('');
        return `<b>${m}</b><br/>${items.map(i => `${i.marker}${i.seriesName}: ${fmt(i.value)}`).join('<br/>')}${ev}`;
      },
    },
    xAxis: { type: 'category', data: months, axisLabel: { color: '#525252', fontSize: 12, interval: (i: number) => months[i].endsWith('-01') }, axisTick: { alignWithLabel: true, interval: (i: number) => months[i].endsWith('-01') }, axisLine: { lineStyle: { color: '#8d8d8d' } } },
    yAxis: { type: 'value', name: unit, min: yMin, scale: yMin == null, nameTextStyle: { color: '#525252', fontSize: 12 }, axisLabel: { color: '#525252', fontSize: 12, formatter: (v: number) => Math.abs(v) >= 1e6 ? `${fmt(v / 1e6, 1)}백만` : Math.abs(v) >= 1e4 ? `${fmt(v / 1e4, 1)}만` : fmt(v, 1) }, splitLine: { lineStyle: { color: '#e0e0e0' } } },
    dataZoom: [{ type: 'inside' }, { type: 'slider', bottom: 6, height: 14 }],
    series: series.map((s, idx) => ({
      name: s.name, type: 'line', data: s.data, connectNulls: false, showSymbol: false, smooth: false,
      lineStyle: { color: s.color, width: s.width ?? 2.2, type: s.dashed ? 'dashed' : 'solid' }, itemStyle: { color: s.color },
      areaStyle: s.area ? { color: s.color, opacity: .08 } : undefined,
      markArea: idx === 0 && areas.length ? { silent: true, itemStyle: { color: 'rgba(141,141,141,.10)' }, label: { color: '#525252', fontSize: 12, position: 'insideTop' }, data: areas.filter(a => months.includes(a.from) || months.includes(a.to)).map(a => [{ name: a.label, xAxis: months.includes(a.from) ? a.from : months[0], itemStyle: a.color ? { color: a.color } : undefined }, { xAxis: months.includes(a.to) ? a.to : months[months.length - 1] }]) } : undefined,
      markLine: idx === 0 && showEvents && inRange.length ? {
        silent: false, symbol: 'none', animation: false,
        data: inRange.map(e => ({ xAxis: e.date.slice(0, 7), name: e.label, lineStyle: { color: EVENT_COLORS[e.kind] || '#999', type: MAJOR.has(e.date) ? 'solid' : 'dotted', width: MAJOR.has(e.date) ? 1.4 : e.kind === 'competitor' ? 1.6 : 1, opacity: .8 }, label: { show: showEventLabels && (MAJOR.has(e.date) || e.kind === 'competitor'), formatter: e.label, color: EVENT_COLORS[e.kind], fontSize: 12, position: 'insideEndTop' } })),
      } : undefined,
    })),
  }), [months, series, unit, inRange, areas, showEvents, showEventLabels, yMin]);
  const kinds = [...new Set(inRange.map(e => e.kind))];
  return <article className="panel chart-panel ts-panel">
    <div className="panel-head"><div><span className="kicker">{kicker}</span><h3>{title}</h3></div></div>
    <div className="chart-actions">
      <button type="button" onClick={() => setShowEvents(v => !v)} aria-pressed={showEvents}>{showEvents ? '사건 표시 끄기' : '사건 표시 켜기'}</button>
      <button type="button" onClick={() => downloadCsv(`${filename}.csv`, months, series)}>CSV 저장</button>
      <button type="button" onClick={() => { const url = ref.current?.getEchartsInstance().getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#ffffff' }); if (url) { const a = document.createElement('a'); a.href = url; a.download = `${filename}.png`; a.click(); } }}>PNG 저장</button>
    </div>
    <ReactECharts ref={ref} option={option} style={{ height }} notMerge lazyUpdate />
    {showEvents && kinds.length > 0 && <div className="ts-event-legend">{kinds.map(k => <span key={k}><i style={{ background: EVENT_COLORS[k] }} />{EVENT_KIND_LABEL[k] || k}</span>)}<span className="ts-event-hint">실선=주요 사건, 점선=기타 · 마우스를 올리면 해당 월의 사건이 보입니다</span></div>}
    {note && <div className="chart-note">{note}</div>}
  </article>;
}
