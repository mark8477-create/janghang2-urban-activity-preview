import { lazy, Suspense, useEffect, useState } from 'react';

const AnalysisPage = lazy(() => import('./pages/AnalysisPage'));
const MapPage = lazy(() => import('./pages/MapPage'));
type Page = 'analysis' | 'map' | 'not-found';
// 앱이 처음 열린 디렉터리(예: /janghang2-urban-activity-preview/). 이후 pushState로 주소가 바뀌어도 고정된다.
const APP_ROOT = new URL('.', new URL(import.meta.env.BASE_URL, document.baseURI)).href;

function currentPage(): Page {
  // BASE_URL은 './'(상대 경로)라서 origin이 아니라 앱 위치(GitHub Pages 하위 경로 포함)를 기준으로 푼다.
  const basePath = new URL(import.meta.env.BASE_URL, APP_ROOT).pathname.replace(/\/+$/, '') || '/';
  const path = window.location.pathname.replace(/\/index\.html$/, '').replace(/\/+$/, '') || '/';
  if (path !== basePath) return 'not-found';
  const query = new URLSearchParams(window.location.search).get('page');
  if (query === null || query === 'analysis') return 'analysis';
  return query === 'map' ? 'map' : 'not-found';
}

export default function App() {
  const [page, setPage] = useState<Page>(currentPage);
  useEffect(() => {
    const sync = () => setPage(currentPage());
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);
  useEffect(() => {
    document.title = page === 'map' ? '통합 공간 시각화 | 장항2동 도시활동' : '장항2동 도시활동 변화 분석';
  }, [page]);
  const navigate = (next: Exclude<Page, 'not-found'>) => {
    const url = new URL(import.meta.env.BASE_URL, APP_ROOT);
    if (next === 'map') url.searchParams.set('page', 'map');
    window.history.pushState({ page: next }, '', url);
    setPage(next);
    window.scrollTo(0, 0);
  };

  return <>
    <nav className="page-navigation" aria-label="페이지 전환"><div className="page-navigation-inner"><strong>장항2동 도시활동</strong><div className="page-navigation-links"><button type="button" aria-current={page === 'analysis' ? 'page' : undefined} className={page === 'analysis' ? 'active' : ''} onClick={() => navigate('analysis')}>도시활동 분석</button><span aria-hidden="true">|</span><button type="button" aria-current={page === 'map' ? 'page' : undefined} className={page === 'map' ? 'active' : ''} onClick={() => navigate('map')}>통합 공간 시각화</button></div><small>{page === 'analysis' ? 'PAGE 1' : page === 'map' ? 'PAGE 2' : '페이지 없음'}</small></div></nav>
    {page === 'not-found' ? <main className="page-not-found"><h1>페이지를 찾을 수 없습니다</h1><p>주소를 확인하거나 도시활동 분석 화면으로 돌아가세요.</p><button type="button" onClick={() => navigate('analysis')}>도시활동 분석으로</button></main> : <Suspense fallback={<div className="page-loading" role="status">화면을 불러오는 중…</div>}>{page === 'analysis' ? <AnalysisPage/> : <MapPage/>}</Suspense>}
  </>;
}
