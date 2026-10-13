// Vercel turns each file in /api into an endpoint. The logic lives in /backend so it can be tested.
import { getHealth } from '../backend/handlers/health.js';

export function GET(request: Request) {
  return getHealth(request);
}
