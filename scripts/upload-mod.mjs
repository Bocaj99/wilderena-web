// Uploads Wilderena mod files to Supabase Storage.
// Small files use standard upload, large files (>50MB) use TUS resumable.
//
// Usage:
//   node --env-file=.env.local scripts/upload-mod.mjs

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import * as tus from "tus-js-client";

const SOURCE_DIR = "C:\\Users\\Jacob\\WilderenaMod";
const FILES = [
  "CTFScoreboard.pak",
  "CTFScoreboard.utoc",
  "WilderenaClient.zip",
  "CTFScoreboard.ucas"   // largest file last (uses TUS)
];
const BUCKET = "downloads";
const PREFIX = "latest";
const TUS_THRESHOLD = 40 * 1024 * 1024; // 40MB — use TUS above this

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey   = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in env.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false }
});

async function uploadStandard(fileName, filePath, objectPath) {
  const fileBuffer = fs.readFileSync(filePath);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, fileBuffer, {
      contentType: "application/octet-stream",
      upsert: true
    });
  if (error) throw new Error(`${error.message} (${error.statusCode || "?"})`);
}

function uploadTUS(fileName, filePath, objectPath) {
  return new Promise((resolve, reject) => {
    const stats = fs.statSync(filePath);
    const stream = fs.createReadStream(filePath);

    // For TUS with new Supabase keys, use apikey header instead of Bearer auth
    const upload = new tus.Upload(stream, {
      endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        apikey: secretKey,
        authorization: `Bearer ${secretKey}`,
        "x-upsert": "true"
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: BUCKET,
        objectName: objectPath,
        contentType: "application/octet-stream"
      },
      chunkSize: 6 * 1024 * 1024,
      uploadSize: stats.size,
      onError: reject,
      onProgress(sent, total) {
        const pct = ((sent / total) * 100).toFixed(1);
        process.stdout.write(`\r  ${fileName}  ${pct}%  (${(sent/1024/1024).toFixed(1)} / ${(total/1024/1024).toFixed(1)} MB)    `);
      },
      onSuccess() {
        process.stdout.write(`\r  ${fileName}  100%  uploaded                           \n`);
        resolve();
      }
    });
    upload.start();
  });
}

(async () => {
  console.log(`\nUploading to ${BUCKET}/${PREFIX}/\n`);
  for (const f of FILES) {
    const filePath = path.join(SOURCE_DIR, f);
    if (!fs.existsSync(filePath)) {
      console.error(`  MISSING: ${filePath}`);
      process.exit(1);
    }
    const stats = fs.statSync(filePath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
    const objectPath = `${PREFIX}/${f}`;

    try {
      if (stats.size > TUS_THRESHOLD) {
        console.log(`  ${f} (${sizeMB} MB) — resumable upload ...`);
        await uploadTUS(f, filePath, objectPath);
      } else {
        process.stdout.write(`  ${f} (${sizeMB} MB) ... `);
        await uploadStandard(f, filePath, objectPath);
        console.log("uploaded");
      }
    } catch (err) {
      console.error(`\n  FAILED: ${f}`);
      console.error(`  ${err.message ?? err}`);
      process.exit(1);
    }
  }
  console.log("\nAll files uploaded. Public URLs:");
  for (const f of FILES) {
    console.log(`  ${supabaseUrl}/storage/v1/object/public/${BUCKET}/${PREFIX}/${f}`);
  }
})();
