import { getRateHistory } from '../backend/handlers/rates.js';

export function GET(request: Request) {
  return getRateHistory(request);
}
