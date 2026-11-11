// Only same-site paths are accepted so that a crafted link cannot send a
// freshly signed-in user to another origin.
export function safeRedirectPath(value: string | null, fallback: string): string {
  if (!value) return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\'))
    return fallback;
  return value;
}
