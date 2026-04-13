// Uploads the three Wilderena mod files to Supabase Storage via the
// resumable (TUS) upload protocol so we can handle the ~280 MB .ucas
// file without hitting the 50 MB single-upload limit.
//
// Usage:
//   1. Create a PUBLIC bucket called `downloads` in Supabase dashboard.
//      Set the bucket's file size limit to at least 320 MB.
//   2. Make sure `SUPABASE_SECRET_KEY` and `NEXT_PUBLIC_SUPABASE_URL`
//      are set in Wilderena-Web/.env.local.
//   3. From the project root:
//        node --env-file=.env.local scripts/upload-mod.mjs
//
// Re-run anytime you rebuild the mod — the script upserts.

import fs from "node:fs";
import path from "node:path";
import * as tus from "tus-js-client";

const SOURCE_DIR = "C:\\Users\\Jacob\\WilderenaMod";
const FILES = [
  "CTFScoreboard.pak",
  "CTFScoreboard.utoc",
  "CTFScoreboard.ucas"
];
const BUCKET = "downloads";
const PREFIX = "latest";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey   = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in env.");
  console.error("Run with: node --env-file=.env.local scripts/upload-mod.mjs");
  process.exit(1);
}

function uploadOne(fileName) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(SOURCE_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      reject(new Error(`File not found: ${filePath}`));
      return;
    }
    const stats = fs.statSync(filePath);
    const stream = fs.createReadStream(filePath);
    const objectName = `${PREFIX}/${fileName}`;

    const upload = new tus.Upload(stream, {
      endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${secretKey}`,
        "x-upsert": "true"
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: BUCKET,
        objectName,
        contentType: "application/octet-stream",
        cacheControl: "3600"
      },
      chunkSize: 6 * 1024 * 1024,
      uploadSize: stats.size,
      onError(err) {
        reject(err);
      },
      onProgress(sent, total) {
        const pct = ((sent / total) * 100).toFixed(1);
        const sentMB  = (sent  / 1024 / 1024).toFixed(1);
        const totalMB = (total / 1024 / 1024).toFixed(1);
        process.stdout.write(`\r  ${fileName}  ${pct}%  (${sentMB} / ${totalMB} MB)    `);
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
    try {
      await uploadOne(f);
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
