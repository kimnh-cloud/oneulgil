// 오늘길 서비스 워커: 한 번 열었던 화면과 지역 데이터를 저장해 두고, 다음부터 빠르게(오프라인에서도) 열리게 함
const CACHE = "oneulgil-v13";
const SHELL = ["./", "index.html", "regions.json", "manifest.webmanifest", "icon-192.png", "icon-512.png",
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js"];

self.addEventListener("install", e => {
  // 하나가 실패해도 나머지는 저장
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))).then(() => self.skipWaiting())));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // 지도 배경 타일은 저장하지 않음 (OpenStreetMap 이용 정책)
  if (url.hostname.endsWith("openstreetmap.org")) return;
  const sameOrigin = url.origin === self.location.origin;
  if (sameOrigin){
    // 화면·데이터: 새 버전을 먼저 시도하고, 안 되면 저장본 (업데이트가 바로 반영되도록)
    e.respondWith(fetch(e.request).then(res => {
      if (res.ok){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match("index.html"))));
  } else if (url.hostname === "cdnjs.cloudflare.com" || url.hostname === "fonts.gstatic.com" || url.hostname === "fonts.googleapis.com"){
    // 라이브러리·글꼴: 저장본 우선
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res;
    })));
  }
});
