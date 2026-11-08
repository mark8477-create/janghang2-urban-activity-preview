import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';

export type BoundaryId = 'janghang2_admin' | 'janghang_legal';
export type BoundaryMode = 'both' | 'admin' | 'legal';
export type BoundaryFeature = Feature<Polygon | MultiPolygon, {
  id: BoundaryId;
  name: string;
  code: string;
  unit: string;
  provider: string;
  vintage: string;
  boundary_date: string;
  coordinate_crs: string;
  research_data: string[];
  caution: string;
}>;
export type BoundaryCollection = FeatureCollection<Polygon | MultiPolygon, BoundaryFeature['properties']>;

export const DATA_LAYER_CATALOG = [
  { id: 'purpose_od', label: '경기 목적 OD', unit: '행정동' },
  { id: 'stcis_internal', label: 'STCIS 내부 OD', unit: '법정동' },
  { id: 'stcis_external', label: 'STCIS 외부 OD', unit: '법정동' },
  { id: 'bus', label: '버스 정류장별 승하차', unit: '정류장' },
  { id: 'rail', label: '정발산역 승하차', unit: '개별 역' },
] as const;
export type DataLayerId = (typeof DATA_LAYER_CATALOG)[number]['id'];
export const MAX_ACTIVE_DATA_LAYERS = 2;
export type MapDisplayState = { boundaryMode: BoundaryMode; selectedDataLayers: DataLayerId[] };
