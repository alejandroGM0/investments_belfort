/** Extract job id from API responses (OpenAPI JobResponse.id or legacy job_id). */
export function extractJobId(
  data: { id?: string; job_id?: string } | null | undefined
): string | null {
  if (!data) return null;
  return data.id ?? data.job_id ?? null;
}
