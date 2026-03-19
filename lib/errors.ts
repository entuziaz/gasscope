export function toErrorMessage(
  err: unknown,
  fallback = "Trace failed"
): string {
  return err instanceof Error ? err.message : fallback
}
