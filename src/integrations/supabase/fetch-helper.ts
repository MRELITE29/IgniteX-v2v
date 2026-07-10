// ============================================================================
// Shared Supabase fetch helper
//
// Handles the new opaque Supabase API key format (sb_publishable_* / sb_secret_*)
// which must NOT be sent as a Bearer token — only as the `apikey` header.
// Imported by client.ts and auth-middleware.ts.
// ============================================================================

export function createSupabaseFetch(supabaseKey: string): typeof fetch {
  function isNewSupabaseApiKey(value: string): boolean {
    return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
  }

  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    // New Supabase API keys are opaque strings, not bearer JWTs.
    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }

    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}
