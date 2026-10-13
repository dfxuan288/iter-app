import { getRates } from '../backend/handlers/rates.js';

export function GET(request: Request) {
  return getRates(request);
}
