#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

const target = process.argv[2];

if (!target) {
  console.error("Uso: node scripts/diagnose-ar-model.mjs <url-o-ruta-glb>");
  process.exit(1);
}

const toBuffer = async (input) => {
  if (/^https?:\/\//i.test(input)) {
    const res = await fetch(input, { redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status} al descargar modelo`);
    const arr = await res.arrayBuffer();
    return { buf: Buffer.from(arr), source: input, headers: res.headers };
  }
  const buf = await readFile(input);
  return { buf, source: input, headers: null };
};

const readUInt32LE = (buf, offset) => buf.readUInt32LE(offset);

const parseGlbJson = (buf) => {
  if (buf.length < 20) throw new Error("Archivo demasiado pequeño");
  const magic = buf.toString("ascii", 0, 4);
  if (magic !== "glTF") throw new Error("No es un GLB válido (magic glTF)");

  const version = readUInt32LE(buf, 4);
  const jsonChunkLen = readUInt32LE(buf, 12);
  const jsonChunkType = readUInt32LE(buf, 16);
  const JSON_CHUNK = 0x4e4f534a;
  if (jsonChunkType !== JSON_CHUNK) throw new Error("Chunk JSON no encontrado");

  const jsonStart = 20;
  const jsonEnd = jsonStart + jsonChunkLen;
  const jsonText = buf.toString("utf8", jsonStart, jsonEnd);
  return { version, gltf: JSON.parse(jsonText) };
};

const main = async () => {
  const { buf, source, headers } = await toBuffer(target);
  const { version, gltf } = parseGlbJson(buf);

  const mats = gltf.materials || [];
  const exUsed = gltf.extensionsUsed || [];
  const exReq = gltf.extensionsRequired || [];

  console.log("=== Diagnóstico AR Modelo ===");
  console.log("Fuente:", source);
  console.log("Bytes:", buf.length);
  console.log("Versión GLB:", version);
  if (headers) {
    console.log("Content-Type:", headers.get("content-type"));
    console.log("Content-Disposition:", headers.get("content-disposition") || "(sin cabecera)");
  }
  console.log("Materiales:", mats.length);
  console.log("Texturas:", (gltf.textures || []).length);
  console.log("Imágenes:", (gltf.images || []).length);
  console.log("extensionsUsed:", exUsed.length ? exUsed.join(", ") : "(ninguna)");
  console.log("extensionsRequired:", exReq.length ? exReq.join(", ") : "(ninguna)");

  const hasSpecGloss = exReq.includes("KHR_materials_pbrSpecularGlossiness");
  if (hasSpecGloss) {
    console.log("");
    console.log("⚠ Hallazgo crítico:");
    console.log(
      "El modelo requiere KHR_materials_pbrSpecularGlossiness. Muchos visores AR nativos no lo soportan y renderizan blanco."
    );
    console.log(
      "Recomendación: convertir a PBR Metallic-Roughness estándar y reexportar GLB."
    );
  } else {
    console.log("");
    console.log("✅ No se detectaron extensiones críticas conocidas para texturas.");
  }

  console.log("");
  console.log("Archivo:", basename(source));
};

main().catch((err) => {
  console.error("Error diagnóstico:", err.message);
  process.exit(1);
});
