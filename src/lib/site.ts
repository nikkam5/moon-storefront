/** Public metadata uses the deployment URL, never a local development address. */
export function resolveSiteUrl(environment: Record<string, string | undefined>): URL {
  const configured = environment.NEXT_PUBLIC_SITE_URL || environment.URL || environment.DEPLOY_PRIME_URL || 'https://moonst0re.netlify.app';
  const parsed = new URL(configured);
  if (!['http:', 'https:'].includes(parsed.protocol) || ['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(parsed.hostname)) {
    throw new Error('Set NEXT_PUBLIC_SITE_URL to your public http(s) website address.');
  }
  return new URL(parsed.origin);
}

export const siteUrl = resolveSiteUrl(process.env);
export const publicUrl = (path: string) => new URL(path, siteUrl).toString();
