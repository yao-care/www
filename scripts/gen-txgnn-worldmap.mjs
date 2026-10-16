#!/usr/bin/env node
// 產生 /medical/txgnn/ 覆蓋地圖用的靜態 SVG 路徑資料 src/data/txgnn-worldmap.json。
//
//   node scripts/gen-txgnn-worldmap.mjs <world-atlas 目錄> <topojson-client.js 路徑>
//
// 為什麼是一次性產生器、不是 build 時讀套件：world-atlas 解開 8 MB，但頁面只需要
// 110m 簡化版裡的陸地輪廓和 29 國的形狀（歐盟另以布魯塞爾標點）。把投影後的路徑字串
// 存成 JSON 進版控，build 不需新增任何依賴，也不必從 CDN 載入。投影用 repo 既有的 d3。
// 取得原始資料：
//   npm pack world-atlas@2.0.2 topojson-client@3.1.0 後各自解開，把兩個路徑當參數傳入。
// world-atlas 資料來自 Natural Earth（公有領域），授權見其 LICENSE。
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { geoNaturalEarth1, geoMercator, geoPath } from 'd3';

const [atlasDir, topoPath] = process.argv.slice(2);
if (!atlasDir || !topoPath) {
  console.error('用法: node scripts/gen-txgnn-worldmap.mjs <world-atlas 目錄> <topojson-client.js>');
  process.exit(1);
}
const topo = await import(pathToFileURL(path.resolve(topoPath)).href);
const { feature } = topo.default ?? topo;

const world = JSON.parse(fs.readFileSync(path.join(atlasDir, 'countries-110m.json'), 'utf8'));
const landTopo = JSON.parse(fs.readFileSync(path.join(atlasDir, 'land-110m.json'), 'utf8'));

// ISO 3166-1 數字碼（world-atlas 的 feature id）。香港、新加坡在 110m 版沒有形狀，只畫標點。
const NUMERIC = {
  tw: '158', jp: '392', kr: '410', my: '458', th: '764', ph: '608', in: '356', sa: '682',
  au: '036', nz: '554', us: '840', ca: '124', uk: '826', de: '276', fr: '250', it: '380',
  es: '724', nl: '528', ch: '756', se: '752', no: '578', dk: '208', fi: '246',
  br: '076', ar: '032', co: '170', za: '710',
};
// 標點位置：首都（歐盟標在布魯塞爾）。[經度, 緯度]
const POINTS = {
  tw: [121.56, 25.04], jp: [139.69, 35.69], kr: [126.98, 37.57], hk: [114.17, 22.32],
  sg: [103.82, 1.35], my: [101.69, 3.14], th: [100.5, 13.76], ph: [120.98, 14.6],
  in: [77.21, 28.61], sa: [46.68, 24.71], au: [149.13, -35.28], nz: [174.78, -41.29],
  us: [-77.04, 38.91], ca: [-75.7, 45.42], uk: [-0.13, 51.51], de: [13.4, 52.52],
  fr: [2.35, 48.86], it: [12.5, 41.9], es: [-3.7, 40.42], nl: [4.9, 52.37],
  ch: [7.45, 46.95], se: [18.07, 59.33], no: [10.75, 59.91], dk: [12.57, 55.68],
  fi: [24.94, 60.17], eu: [4.35, 50.85], br: [-47.88, -15.79], ar: [-58.38, -34.6],
  co: [-74.07, 4.71], za: [28.19, -25.75],
};
// 歐洲擠在世界圖上點不到，另畫一張放大圖
const EUROPE = new Set(['uk', 'de', 'fr', 'it', 'es', 'nl', 'ch', 'se', 'no', 'dk', 'fi', 'eu']);

const land = feature(landTopo, landTopo.objects.land);
const countries = feature(world, world.objects.countries);
const byId = new Map(countries.features.map((f) => [f.id, f]));
const noAntarctica = {
  type: 'FeatureCollection',
  features: countries.features.filter((f) => f.id !== '010'),
};

const r1 = (n) => Math.round(n * 10) / 10;

function render(projection, w, h, fitTo, codes) {
  projection.fitSize([w, h], fitTo);
  const p = geoPath(projection).digits(1);
  const shapes = {};
  const markers = {};
  for (const code of codes) {
    const id = NUMERIC[code];
    if (id && byId.has(id)) shapes[code] = p(byId.get(id));
    const [x, y] = projection(POINTS[code]);
    markers[code] = [r1(x), r1(y)];
  }
  return { w, h, shapes, markers };
}

const all = Object.keys(POINTS);
const worldW = 960;
const worldH = 470;
const worldMap = render(geoNaturalEarth1(), worldW, worldH, noAntarctica, all.filter((c) => !EUROPE.has(c)));
worldMap.land = geoPath(geoNaturalEarth1().fitSize([worldW, worldH], noAntarctica)).digits(1)(land);

// 歐洲放大圖：裁一個經緯框，陸地用 countries 全部畫（clipExtent 裁掉框外）
const euW = 420;
const euH = 470;
const euBox = {
  type: 'Feature',
  geometry: { type: 'MultiPoint', coordinates: [[-11, 35], [32, 35], [-11, 71], [32, 71]] },
};
const euProj = geoMercator();
const euMap = render(euProj, euW, euH, euBox, [...EUROPE]);
euProj.clipExtent([[0, 0], [euW, euH]]);
euMap.land = geoPath(euProj).digits(1)(land);
// 歐洲圖上的國家形狀重新用裁切後的投影算，避免跨出邊框
for (const code of Object.keys(euMap.shapes)) {
  euMap.shapes[code] = geoPath(euProj).digits(1)(byId.get(NUMERIC[code]));
}
// 世界圖上歐洲範圍框（提示「放大圖在旁邊」）
const wp = geoNaturalEarth1().fitSize([worldW, worldH], noAntarctica);
const [bx0, by0] = wp([-11, 71]);
const [bx1, by1] = wp([32, 35]);
worldMap.europeBox = [r1(bx0), r1(by0), r1(bx1 - bx0), r1(by1 - by0)];

const dest = path.join(process.cwd(), 'src/data/txgnn-worldmap.json');
fs.writeFileSync(dest, `${JSON.stringify({ world: worldMap, europe: euMap })}\n`);
console.log(`寫入 ${dest}（${(fs.statSync(dest).size / 1024).toFixed(1)} KB）`);
