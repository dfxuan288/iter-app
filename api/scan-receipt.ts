import { postScanReceipt } from '../backend/handlers/scan.js';

export function POST(request: Request) {
  return postScanReceipt(request);
}
