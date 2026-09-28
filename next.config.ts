import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

// Keep development and production builds separate to avoid missing-chunk errors.
export default function config(phase: string): NextConfig {
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    return { distDir: ".next-dev" };
  }
  // Static export: Netlify serves `out/` directly, no Node server needed.
  // All routes are prerendered (12/12 static), cart lives in localStorage.
  return { output: "export", images: { unoptimized: true } };
}
