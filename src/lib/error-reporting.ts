// Generic error reporting utility.
// Logs errors to the console. In production, replace the console.error call
// with your own monitoring provider (e.g. Sentry, Datadog, etc.).

export function reportError(
  error: unknown,
  context: Record<string, unknown> = {},
) {
  console.error("[SafeSphere Error]", error, context);
}
