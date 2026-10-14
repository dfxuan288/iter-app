/**
 * Sends a photo to a running ITER backend and prints what came back. Handy for checking the AI.
 *   npx tsx scripts/try-scan.ts <backend address> <receipt|menu> <image file> [sampleId]
 *   npx tsx scripts/try-scan.ts http://localhost:8080 receipt mobile/assets/samples/receipt-drugstore-ginza.jpg
 * Each run uses one real scan (a few tenths of a sen), unless the same photo was scanned before.
 */
import { readFileSync } from 'node:fs';

const [base, kind, file, sampleId] = process.argv.slice(2);
if (!base || (kind !== 'receipt' && kind !== 'menu') || !file) {
  console.error('Usage: npx tsx scripts/try-scan.ts <backend address> <receipt|menu> <image file> [sampleId]');
  process.exit(1);
}

const mediaType = file.endsWith('.png') ? 'image/png' : file.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
const url = new URL(`/api/scan-${kind}`, base);
// Keep any query string on the address (for example a Vercel preview's access token).
url.search = new URL(base).search;

const started = Date.now();
const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Device-Id': 'try-scan-script' },
  body: JSON.stringify({
    image: readFileSync(file).toString('base64'),
    mediaType,
    sampleId,
    currencyHint: kind === 'menu' && file.includes('thai') ? 'THB' : 'JPY',
    tripStart: '2026-11-09',
    tripEnd: '2026-11-18',
  }),
});
console.log(`${response.status} in ${((Date.now() - started) / 1000).toFixed(1)} s`);
console.log(JSON.stringify(await response.json(), null, 2));
