// Verbatim from specs/2026-08-10-qualification-rules-engine.md §4.2 (QUAL-SERVICE-001).
// City of San Diego residential ZIPs, v1 starting allowlist. ZIPs are strings — never
// integers, since leading zeros break integer storage nationwide.
export const SERVICE_AREA_ZIPS: readonly string[] = [
  '92037', '92101', '92102', '92103', '92104', '92105', '92106', '92107', '92108', '92109',
  '92110', '92111', '92113', '92114', '92115', '92116', '92117', '92119', '92120', '92121',
  '92122', '92123', '92124', '92126', '92127', '92128', '92129', '92130', '92131', '92139',
  '92145', '92154', '92173',
];

export function isServiceable(zip: string): boolean {
  return SERVICE_AREA_ZIPS.includes(zip);
}
