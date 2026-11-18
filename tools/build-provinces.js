#!/usr/bin/env node
/* WORLD DOMINION V.I — PEMBANGUN DATA PETA (Node)
   Pemakaian (dari folder game):
     node tools/build-provinces.js [file-geojson] [file-output]
   Default input : ../../ne_10m_admin_1_states_provinces.geojson
                   (file Natural Earth admin-1, ±40 MB — unduh dulu dari
                   https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson)
   Default output: ../data/world-provinces.js
   Aturan pemilihan provinsi ada di tools/province-builder.js (semua provinsi
   Indonesia + terbesar menurut luas sampai 789).
*/
"use strict";
const fs = require("fs");
const path = require("path");
const { build, toScript } = require("./province-builder.js");

const input = process.argv[2] || path.join(__dirname, "..", "..", "ne_10m_admin_1_states_provinces.geojson");
const output = process.argv[3] || path.join(__dirname, "..", "data", "world-provinces.js");
const target = Number(process.argv[4]) || 789;

if (!fs.existsSync(input)) {
  console.error("File GeoJSON tidak ditemukan: " + input);
  console.error("Unduh dulu: curl -L -o ne_10m_admin_1_states_provinces.geojson https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson");
  process.exit(1);
}
console.log("Membaca " + input + " ...");
const geojson = JSON.parse(fs.readFileSync(input, "utf8"));
console.log("Fitur GeoJSON: " + (geojson.features || []).length);

const data = build(geojson, { target: target });
if (data._unmappedIso && data._unmappedIso.length) {
  console.warn("PERINGATAN — kode negara tanpa benua (diberi 'Dunia'): " + data._unmappedIso.join(", "));
}
const idn = data.provinces.filter(p => p.iso === "IDN").length;
const countries = new Set(data.provinces.map(p => p.country)).size;
if (data.count !== target) {
  console.error("GAGAL: jumlah provinsi " + data.count + " != target " + target);
  process.exit(1);
}
if (idn === 0) { console.error("GAGAL: tidak ada provinsi Indonesia yang terpilih."); process.exit(1); }

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, toScript(data), "utf8");
const sizeMB = fs.statSync(output).size / 1024 / 1024;
console.log("Selesai: " + data.count + " provinsi (Indonesia: " + idn + ", negara: " + countries + ")");
console.log("Ditulis: " + output + " (" + sizeMB.toFixed(2) + " MB)");
if (sizeMB > 5) console.warn("PERINGATAN — file di atas 5 MB; naikkan toleransi penyederhanaan di province-builder.js bila perlu.");
