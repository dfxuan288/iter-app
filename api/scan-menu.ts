import { postScanMenu } from '../backend/handlers/scan.js';

export function POST(request: Request) {
  return postScanMenu(request);
}
