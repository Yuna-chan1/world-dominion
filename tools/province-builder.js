/* WORLD DOMINION V.I — PROVINCE BUILDER BUILD 0.9
   Mengubah GeoJSON Natural Earth admin-1 menjadi data peta game:
   window.WD_WORLD_DATA = { target: 789, count: 789, provinces: [...] }.
   Dipakai dua arah yang sama:
   - Node:  node tools/build-provinces.js  -> menulis data/world-provinces.js
   - Browser: tools/build-map.html dan tombol "Bangun peta provinsi" di world.html
     (ProvinceBuilder.build + ProvinceBuilder.toScript, lalu WorldLib.saveData).

   ATURAN PEMILIHAN (deterministik, didokumentasikan):
   1. SEMUA provinsi Indonesia (adm0_a3 === "IDN", 33 provinsi di Natural Earth 10m)
      selalu ikut — Indonesia adalah satu-satunya negara yang dibuka (WorldLib.UNLOCKED_ISO).
   2. Sisanya diisi provinsi TERBESAR menurut luas proyeksi (equirectangular 1000x500)
      sampai total mencapai target (789). Luas dihitung dari geometri karena field
      area_sqkm di file Natural Earth ini bernilai 0 untuk semua fitur.
   3. Urutan akhir diurutkan menurut negara lalu nama, supaya stabil antar build
      (ID provinsi stabil -> save pemain yang merujuk id provinsi tetap valid).

   PEMETAAN FIELD (file GeoJSON ini TIDAK punya iso_a3 / continent):
   - iso    <- properties.adm0_a3   (kode ISO-3 negara, mis. IDN)
   - iso2   <- "ID" bila iso IDN, selain itu "" (sesuai kontrak worldlib.js)
   - country<- properties.admin
   - name   <- properties.name (jatuh ke name_en / gn_name / admin bila kosong)
   - cont   <- tabel benua di bawah (berdasarkan adm0_a3); tak dikenal -> "Dunia"
   - type   <- "Provinsi"
   - lon/lat<- properties.longitude/latitude (pusat fitur); bila tak ada, pusat bbox
   - area   <- luas proyeksi (satuan peta 1000x500), dibulatkan 2 desimal
   - bbox   <- [minX, minY, maxX, maxY] dalam koordinat peta 1000x500
   - d      <- path SVG equirectangular (x=(lon+180)/360*1000, y=(90-lat)/180*500),
              hanya ring luar tiap poligon (lubang/danau dibuang), titik dibulatkan
              2 desimal, ring degen (<3 titik / luas ~0) dibuang, dan garis
              disederhanakan dengan Douglas-Peucker (toleransi 0,1 satuan peta).
   - id     <- "prov-" + ne_id Natural Earth (stabil antar build).

   Semua kode di file ini ditulis asli untuk World Dominion.
*/
(function (root) {
  "use strict";

  // Benua menurut kode negara adm0_a3 (Natural Earth admin-1 tidak punya field benua).
  var CONTINENTS = {
    "Asia": "AFG ARE ARM AZE BGD BHR BRN BTN CHN CYN CYP ESB GEO HKG IDN IND IRN IRQ ISR JOR JPN KAB KAS KAZ KGZ KHM KOR KWT LAO LBN LKA MAC MDV MMR MNG MYS NPL OMN PAK PGA PHL PRK PSX QAT SAU SGP SYR THA TJK TKM TLS TUR TWN UZB VNM WSB YEM".split(" "),
    "Eropa": "ALB ALD AND AUT BEL BGR BIH BLR CHE CZE DEU DNK ESP EST FIN FRA FRO GBR GGY GIB GRC HRV HUN IMN IRL ISL ITA JEY KOS LIE LTU LUX LVA MCO MDA MKD MLT MNE NLD NOR POL PRT ROU RUS SMR SRB SVK SVN SWE UKR VAT".split(" "),
    "Afrika": "AGO BDI BEN BFA BWA CAF CIV CMR COD COG COM CPV DJI DZA EGY ERI ETH GAB GHA GIN GMB GNB GNQ KEN LBR LBY LSO MAR MDG MLI MOZ MRT MUS MWI NAM NER NGA RWA SAH SDN SDS SEN SHN SLE SOM SOL STP SWZ SYC TCD TGO TUN TZA UGA ZAF ZMB ZWE".split(" "),
    "Amerika Utara": "ABW AIA ATG BHS BLM BLZ BMU BRB CAN CRI CUB CUW CYM DMA DOM GRL GRD GTM GUM HND HTI JAM KNA LCA MAF MEX MNP MSR NIC PAN PRI SLV SPM SXM TCA TTO USA USG UMI VCT VGB VIR".split(" "),
    "Amerika Selatan": "ARG BOL BRA CHL COL ECU FLK GUY PER PRY SUR URY VEN".split(" "),
    "Oseania": "ASM ATC AUS CLP COK CSI FJI FSM HMD IOA IOT KIR MHL NCL NFK NIU NRU NZL PCN PLW PNG PYF SLB TON TUV VUT WLF WSM".split(" "),
    "Antarktika": "ATA ATF SGS".split(" ")
  };
  var CODE_TO_CONT = {};
  Object.keys(CONTINENTS).forEach(function (c) {
    CONTINENTS[c].forEach(function (code) { CODE_TO_CONT[code] = c; });
  });

  function gisXY(lon, lat) { return [(lon + 180) / 360 * 1000, (90 - lat) / 180 * 500]; }
  function round2(v) { return Math.round(v * 100) / 100; }
  function hash(text) { var h = 2166136261; for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

  function perpDist(p, a, b) {
    var dx = b[0] - a[0], dy = b[1] - a[1], len2 = dx * dx + dy * dy;
    if (!len2) return Math.hypot(p[0] - a[0], p[1] - a[1]);
    var t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  }
  // Douglas-Peucker pada ring TERBUKA (titik penutup dibuang dulu oleh pemanggil).
  function simplifyDP(points, tol) {
    if (points.length <= 2) return points.slice();
    var keep = new Uint8Array(points.length);
    keep[0] = 1; keep[points.length - 1] = 1;
    (function recurse(a, b) {
      var maxD = 0, idx = -1;
      for (var i = a + 1; i < b; i++) {
        var d = perpDist(points[i], points[a], points[b]);
        if (d > maxD) { maxD = d; idx = i; }
      }
      if (maxD > tol && idx > 0) { keep[idx] = 1; recurse(a, idx); recurse(idx, b); }
    })(0, points.length - 1);
    var out = [];
    for (var i = 0; i < points.length; i++) if (keep[i]) out.push(points[i]);
    return out;
  }
  function ringArea(pts) {
    var s = 0;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) s += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]);
    return Math.abs(s / 2);
  }

  function build(geojson, opts) {
    opts = opts || {};
    var target = opts.target || 789;
    var tol = (opts.tolerance == null ? 0.1 : opts.tolerance);
    var feats = (geojson && geojson.features) || [];
    var unmapped = {};
    var items = [];

    feats.forEach(function (f) {
      var p = f.properties || {};
      var g = f.geometry;
      if (!g || !g.coordinates || !g.coordinates.length) return;
      var name = String(p.name || p.name_en || p.gn_name || p.admin || "").trim();
      if (!name) return;
      var iso = String(p.adm0_a3 || "");
      var polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
      var d = "", minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9, area = 0, kept = 0;
      polys.forEach(function (poly) {
        if (!poly || !poly.length) return;
        var ring = poly[0]; // hanya ring luar; lubang (danau) dibuang
        if (!ring || ring.length < 3) return;
        var rounded = [];
        ring.forEach(function (c) {
          var q = gisXY(c[0], c[1]);
          var r = [round2(q[0]), round2(q[1])];
          var last = rounded[rounded.length - 1];
          if (!last || last[0] !== r[0] || last[1] !== r[1]) rounded.push(r);
        });
        if (rounded.length < 3) return;
        var closed = rounded[0][0] === rounded[rounded.length - 1][0] && rounded[0][1] === rounded[rounded.length - 1][1];
        var open = closed ? rounded.slice(0, -1) : rounded;
        if (open.length < 3) return;
        var simple = simplifyDP(open, tol);
        if (simple.length < 3) return;
        simple.push([simple[0][0], simple[0][1]]);
        var a = ringArea(simple);
        if (a < 0.01) return; // ring degen / pulau terlalu kecil untuk digambar
        area += a; kept++;
        d += "M" + simple.map(function (q) { return q[0] + " " + q[1]; }).join("L") + "Z";
        simple.forEach(function (q) {
          if (q[0] < minX) minX = q[0]; if (q[0] > maxX) maxX = q[0];
          if (q[1] < minY) minY = q[1]; if (q[1] > maxY) maxY = q[1];
        });
      });
      if (!kept || !d || area <= 0) return;
      var cont = CODE_TO_CONT[iso] || "Dunia";
      if (cont === "Dunia" && iso) unmapped[iso] = true;
      var lon = (typeof p.longitude === "number" && isFinite(p.longitude)) ? p.longitude : (minX + maxX) / 2 / 1000 * 360 - 180;
      var lat = (typeof p.latitude === "number" && isFinite(p.latitude)) ? p.latitude : 90 - (minY + maxY) / 2 / 500 * 180;
      items.push({
        id: "prov-" + (p.ne_id != null ? p.ne_id : hash(name + "|" + iso)),
        name: name,
        iso: iso,
        iso2: iso === "IDN" ? "ID" : "",
        country: String(p.admin || name),
        cont: cont,
        type: "Provinsi",
        lon: round2(lon),
        lat: round2(lat),
        area: Math.round(area * 100) / 100,
        bbox: [round2(minX), round2(minY), round2(maxX), round2(maxY)],
        d: d
      });
    });

    // Aturan pemilihan: semua provinsi Indonesia dulu, lalu terbesar menurut luas.
    var idn = items.filter(function (r) { return r.iso === "IDN"; });
    var rest = items.filter(function (r) { return r.iso !== "IDN"; })
      .sort(function (a, b) { return b.area - a.area; });
    var selected = idn.concat(rest.slice(0, Math.max(0, target - idn.length)));
    selected.sort(function (a, b) {
      if (a.country !== b.country) return a.country < b.country ? -1 : 1;
      if (a.name !== b.name) return a.name < b.name ? -1 : 1;
      return 0;
    });
    return {
      target: target,
      count: selected.length,
      provinces: selected,
      _unmappedIso: Object.keys(unmapped).sort()
    };
  }

  function toScript(data) {
    var clean = { target: data.target, count: data.count, provinces: data.provinces };
    return "window.WD_WORLD_DATA = " + JSON.stringify(clean) + ";\n";
  }

  var api = { build: build, toScript: toScript, continents: CONTINENTS, codeToContinent: CODE_TO_CONT };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.ProvinceBuilder = api;
})(typeof window !== "undefined" ? window : globalThis);
