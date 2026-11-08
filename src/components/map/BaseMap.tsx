import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MLMap, LngLatBoundsLike } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { GeoJsonLayer, ScatterplotLayer } from '@deck.gl/layers';
import { FlowmapLayer, PickingType } from '@flowmap.gl/layers';
import { LocationFilterMode } from '@flowmap.gl/data';
import type { BoundaryCollection, BoundaryId, BoundaryMode } from '../../types/map';

type TileStatus = 'loading' | 'loaded' | 'error';
export type MapFeature = { id: string; layer: string; label: string; detail: string; color: string; value: number; kind: 'flow' | 'point'; from?: [number, number]; to: [number, number] };
export type FlowNode = { key: string; layer: string; role: 'origin' | 'destination'; label: string; coordinates: [number, number] };
export type FlowRenderMode = 'straight' | 'curved' | 'animated-straight';
export type PlaceMarker = { name: string; coordinates: [number, number] };
export type MapController = { zoomIn: () => void; zoomOut: () => void; resetView: () => void; fitFlows: () => void };

type Props = {
  boundaries: BoundaryCollection;
  boundaryMode: BoundaryMode;
  selectedBoundary: BoundaryId | null;
  onSelectBoundary: (id: BoundaryId | null) => void;
  onReady: (controller: MapController | null) => void;
  onTileStatus: (status: TileStatus) => void;
  onViewChange: (zoom: number) => void;
  dataFeatures: MapFeature[];
  onSelectFeature: (feature: MapFeature) => void;
  selectedFeatureId: string | null;
  selectedNode: FlowNode | null;
  onSelectNode: (node: FlowNode) => void;
  renderMode: FlowRenderMode;
  clustering: boolean;
  places: PlaceMarker[];
};

// Vite pre-bundling breaks MapLibre's import.meta.url worker lookup, so point it at the packaged worker explicitly.
maplibregl.setWorkerUrl(maplibreWorkerUrl);

/** Key-free dark vector basemap (OpenFreeMap, OpenMapTiles schema, © OpenStreetMap contributors). */
const STYLE_URL = 'https://tiles.openfreemap.org/styles/fiord';
const CENTERS: Record<string, [number, number]> = { purpose_od: [126.76891598, 37.65524618], stcis_internal: [126.75663662, 37.64781864], stcis_external: [126.75663662, 37.64781864] };
const CENTER_LABEL: Record<string, string> = { purpose_od: '장항2동 행정동', stcis_internal: '장항 법정동', stcis_external: '장항 법정동' };
/** 이 확대 단계 미만에서는 두 상권(약 650m 거리)의 이름표가 겹친다. */
export const PLACE_LABEL_MIN_ZOOM = 12.5;
const BOUNDARY_COLORS: Record<BoundaryId, [number, number, number]> = { janghang2_admin: [96, 178, 255], janghang_legal: [240, 150, 80] };

const nodeKey = (layer: string, coordinates: [number, number]) => `${layer}:${coordinates[0].toFixed(5)}:${coordinates[1].toFixed(5)}`;
const sameCoord = (a: [number, number], b: [number, number]) => Math.abs(a[0] - b[0]) < .00001 && Math.abs(a[1] - b[1]) < .00001;
const hexRgb = (hex: string): [number, number, number] => { const v = parseInt(hex.replace('#', ''), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
const mix = (a: [number, number, number], b: [number, number, number], t: number) => `#${a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
/** Dim → full layer hue ramp. Stops short of white so two layers stay distinguishable even at their largest flows. */
const schemeFor = (hex: string) => { const c = hexRgb(hex), bg: [number, number, number] = [22, 30, 42], w: [number, number, number] = [255, 255, 255]; return [mix(bg, c, .45), mix(bg, c, .65), mix(bg, c, .85), mix(c, c, 0), mix(c, w, .15)]; };
const fmt = (v: number) => v.toLocaleString('ko-KR', { maximumFractionDigits: 2 });

type Loc = { id: string; name: string; lat: number; lon: number; layer: string; coordinates: [number, number]; isCenter: boolean };
type Flow = { origin: string; dest: string; count: number; feature: MapFeature };

function buildGroups(features: MapFeature[]) {
  type Group = { layer: string; color: string; locations: Map<string, Loc>; flows: Flow[] };
  const groups = new Map<string, Group>();
  for (const f of features) {
    if (f.kind !== 'flow' || !f.from) continue;
    const gk = `${f.layer}|${f.color}`;
    const g: Group = groups.get(gk) || { layer: f.layer, color: f.color, locations: new Map<string, Loc>(), flows: [] };
    const ids: string[] = [];
    for (const coordinates of [f.from, f.to]) {
      const id = nodeKey(f.layer, coordinates);
      ids.push(id);
      if (!g.locations.has(id)) {
        const isCenter = sameCoord(coordinates, CENTERS[f.layer] || [0, 0]);
        g.locations.set(id, { id, layer: f.layer, coordinates, isCenter, lat: coordinates[1], lon: coordinates[0], name: isCenter ? CENTER_LABEL[f.layer] : f.label.split(/ → | ← /)[0] });
      }
    }
    g.flows.push({ origin: ids[0], dest: ids[1], count: f.value, feature: f });
    groups.set(gk, g);
  }
  return [...groups.entries()];
}

function localizeLabels(map: MLMap) {
  for (const layer of map.getStyle().layers || []) {
    if (layer.type !== 'symbol') continue;
    if (!map.getLayoutProperty(layer.id, 'text-field')) continue;
    map.setLayoutProperty(layer.id, 'text-field', ['coalesce', ['get', 'name:ko'], ['get', 'name']]);
  }
}

export default function BaseMap(props: Props) {
  const { boundaries, onReady, onTileStatus, onViewChange, places } = props;
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const coords = boundaries.features.find(f => f.properties.id === 'janghang2_admin')!.geometry.coordinates.flat(3) as unknown as number[];
    const xs = coords.filter((_, i) => i % 2 === 0), ys = coords.filter((_, i) => i % 2 === 1);
    const padX = (Math.max(...xs) - Math.min(...xs)) * .28, padY = (Math.max(...ys) - Math.min(...ys)) * .28;
    const initialBounds: LngLatBoundsLike = [[Math.min(...xs) - padX, Math.min(...ys) - padY], [Math.max(...xs) + padX, Math.max(...ys) + padY]];
    const map = new maplibregl.Map({ container: host, style: STYLE_URL, bounds: initialBounds, fitBoundsOptions: { maxZoom: 15 }, minZoom: 7, maxZoom: 18, attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false });
    map.touchZoomRotate.disableRotation();
    mapRef.current = map;
    const overlay = new MapboxOverlay({
      interleaved: false,
      layers: [],
      onClick: info => { if (!info.picked) propsRef.current.onSelectBoundary(null); },
      getTooltip: ({ object, layer }) => {
        if (!object) return null;
        const style = { background: '#0f1a24', color: '#e8f0f6', fontSize: '13px', fontWeight: '700', borderRadius: '5px', padding: '6px 9px', border: '1px solid #2c3d4d' };
        if (layer?.id.startsWith('flowmap')) {
          if (object.type === PickingType.LOCATION) return { text: `${object.name}\n유입 ${fmt(object.totals.incomingCount)} · 유출 ${fmt(object.totals.outgoingCount)}`, style };
          if (object.type === PickingType.FLOW) { const o = object.origin, d = object.dest; return { text: `${o.name ?? '묶음'} → ${d.name ?? '묶음'}\n${fmt(object.count)}`, style }; }
        }
        if (layer?.id === 'points') return { text: `${object.label}: ${fmt(object.value)}`, style };
        if (layer?.id === 'boundaries') return { text: object.properties.name, style };
        return null;
      },
    });
    map.addControl(overlay);
    overlayRef.current = overlay;
    map.on('style.load', () => { try { localizeLabels(map); } catch { /* label localisation is optional */ } });
    map.on('load', () => onTileStatus('loaded'));
    map.on('error', () => onTileStatus('error'));
    const updateView = () => onViewChange(Math.round(map.getZoom() * 10) / 10);
    map.on('moveend', updateView);
    // 축소 화면에서는 라페스타·웨스턴돔 이름표가 겹치므로 점만 남긴다(마우스를 올리면 이름 표시).
    const compactPlaces = () => host.classList.toggle('places-compact', map.getZoom() < PLACE_LABEL_MIN_ZOOM);
    map.on('zoom', compactPlaces);
    compactPlaces();
    updateView();
    onReady({
      zoomIn: () => map.zoomIn(),
      zoomOut: () => map.zoomOut(),
      resetView: () => map.fitBounds(initialBounds, { maxZoom: 15 }),
      fitFlows: () => {
        const pts = propsRef.current.dataFeatures.flatMap(f => f.from ? [f.from, f.to] : [f.to]);
        if (!pts.length) return map.fitBounds(initialBounds, { maxZoom: 15 });
        const lx = pts.map(p => p[0]), ly = pts.map(p => p[1]);
        map.fitBounds([[Math.min(...lx), Math.min(...ly)], [Math.max(...lx), Math.max(...ly)]], { padding: 50, maxZoom: 15 });
      },
    });
    return () => { onReady(null); map.remove(); mapRef.current = null; overlayRef.current = null; };
  }, [boundaries]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers = places.map(p => {
      const el = document.createElement('div');
      el.className = 'place-marker';
      el.innerHTML = `<i></i><span>${p.name}<small>대략 위치</small></span>`;
      el.title = `${p.name} · 건물 구역계 SHP 중심점(대략 위치). 상권 경계·공식 시설 좌표가 아닙니다.`;
      return new maplibregl.Marker({ element: el, anchor: 'left', offset: [-6, 0] }).setLngLat(p.coordinates).addTo(map);
    });
    return () => markers.forEach(m => m.remove());
  }, [places, boundaries]);

  const { boundaryMode, selectedBoundary, dataFeatures, selectedFeatureId, selectedNode, renderMode, clustering } = props;
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const visible = boundaries.features.filter(f => boundaryMode === 'both' || (boundaryMode === 'admin' && f.properties.id === 'janghang2_admin') || (boundaryMode === 'legal' && f.properties.id === 'janghang_legal'));
    const boundaryLayer = new GeoJsonLayer({
      id: 'boundaries', data: visible as any, pickable: true, stroked: true, filled: true,
      getFillColor: (f: any) => [...BOUNDARY_COLORS[f.properties.id as BoundaryId], selectedBoundary === f.properties.id ? 46 : 18],
      getLineColor: (f: any) => [...BOUNDARY_COLORS[f.properties.id as BoundaryId], 220],
      getLineWidth: (f: any) => (selectedBoundary === f.properties.id ? 3.5 : 2), lineWidthUnits: 'pixels',
      updateTriggers: { getFillColor: selectedBoundary, getLineWidth: selectedBoundary },
      onClick: (info: any) => { propsRef.current.onSelectBoundary(info.object.properties.id); return true; },
    });
    const points = dataFeatures.filter(f => f.kind === 'point');
    const maxPoint = new Map<string, number>();
    for (const p of points) maxPoint.set(p.layer, Math.max(maxPoint.get(p.layer) || 0, p.value));
    const pointLayer = new ScatterplotLayer<MapFeature>({
      id: 'points', data: points, pickable: true, radiusUnits: 'pixels', stroked: true, lineWidthUnits: 'pixels', getLineWidth: f => (f.id === selectedFeatureId ? 3 : 1.5),
      getPosition: f => f.to, getRadius: f => 4 + Math.sqrt(Math.max(0, f.value) / (maxPoint.get(f.layer) || 1)) * 15,
      getFillColor: f => [...hexRgb(f.color), 150], getLineColor: f => (f.id === selectedFeatureId ? [255, 255, 255, 255] : [...hexRgb(f.color), 255]),
      updateTriggers: { getLineWidth: selectedFeatureId, getLineColor: selectedFeatureId },
      onClick: (info: any) => { propsRef.current.onSelectFeature(info.object); return true; },
    });
    const selectedFeature = dataFeatures.find(f => f.id === selectedFeatureId);
    const flowLayers = buildGroups(dataFeatures).map(([gk, g]) => {
      let selectedLocations: string[] | undefined;
      if (selectedNode && selectedNode.layer === g.layer && g.locations.has(selectedNode.key)) selectedLocations = [selectedNode.key];
      else if (selectedFeature?.from && selectedFeature.layer === g.layer && selectedFeature.color === g.color) {
        const outer = sameCoord(selectedFeature.from, CENTERS[g.layer] || [0, 0]) ? selectedFeature.to : selectedFeature.from;
        selectedLocations = [nodeKey(g.layer, outer)];
      }
      return new FlowmapLayer<Loc, Flow>({
        id: `flowmap-${gk}`,
        data: { locations: [...g.locations.values()], flows: g.flows },
        getLocationId: l => l.id, getLocationLat: l => l.lat, getLocationLon: l => l.lon, getLocationName: l => l.name,
        getFlowOriginId: f => f.origin, getFlowDestId: f => f.dest, getFlowMagnitude: f => f.count,
        getLocationClusterName: ids => `${ids.length}개 지점 묶음`,
        darkMode: true, colorScheme: schemeFor(g.color), highlightColor: mix(hexRgb(g.color), [255, 255, 255], .55),
        flowLinesRenderingMode: renderMode, clusteringEnabled: clustering, clusteringAuto: true,
        fadeEnabled: true, fadeOpacityEnabled: true, fadeAmount: 45, locationTotalsEnabled: true, adaptiveScalesEnabled: true,
        flowLineThicknessScale: 1.1, flowLineCurviness: 1,
        filter: selectedLocations ? { selectedLocations, locationFilterMode: LocationFilterMode.ALL } : undefined,
        pickable: true,
        onClick: (info: any) => {
          const o = info?.object;
          if (!o) return;
          if (o.type === PickingType.LOCATION) {
            const loc = g.locations.get(String(o.id));
            if (loc) propsRef.current.onSelectNode({ key: loc.id, layer: loc.layer, role: loc.isCenter && g.flows.some(f => f.dest === loc.id) ? 'destination' : 'origin', label: loc.name, coordinates: loc.coordinates });
          } else if (o.type === PickingType.FLOW && o.flow?.feature) propsRef.current.onSelectFeature(o.flow.feature);
        },
      });
    });
    overlay.setProps({ layers: [boundaryLayer, ...flowLayers, pointLayer] });  }, [boundaries, boundaryMode, selectedBoundary, dataFeatures, selectedFeatureId, selectedNode, renderMode, clustering]);

  return <div ref={hostRef} className="research-flow-map" role="application" aria-label="장항 일대 OD 흐름 지도" />;
}
