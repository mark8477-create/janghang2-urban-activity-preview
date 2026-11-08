import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 큰 라이브러리를 별도 청크로 나눠 병렬로 받고, 앱 코드만 바뀐 배포에서는 브라우저 캐시를 재사용하게 한다.
// (PAGE 1은 echarts, PAGE 2는 maplibre·deck.gl·flowmap.gl만 요청한다.)
const vendorChunk = (id: string) => {
  // Vite의 동적 import 도우미가 deck.gl 청크로 끌려가면 진입 파일이 deck.gl 전체를 미리 받게 된다.
  if (id.includes('vite/preload-helper') || id.includes('modulepreload-polyfill')) return 'vendor-react';
  if (!id.includes('node_modules')) return undefined;
  // 두 페이지 공통 의존성은 따로 묶어야 진입 파일이 echarts·deck.gl 청크를 미리 불러오지 않는다.
  if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'vendor-react';
  if (id.includes('maplibre-gl')) return 'vendor-maplibre';
  if (id.includes('@deck.gl') || id.includes('@luma.gl') || id.includes('@math.gl') || id.includes('@loaders.gl') || id.includes('@probe.gl') || id.includes('mjolnir')) return 'vendor-deckgl';
  if (id.includes('@flowmap.gl') || id.includes('d3-')) return 'vendor-flowmap';
  if (id.includes('echarts') || id.includes('zrender')) return 'vendor-echarts';
  return undefined;
};

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    // 라이브러리 청크 자체가 500KB를 넘는 것은 의도된 것이라 경고 기준만 조정한다(앱 코드 청크 크기는 그대로 확인).
    chunkSizeWarningLimit: 1200,
    rollupOptions: { output: { manualChunks: vendorChunk } },
  },
});
