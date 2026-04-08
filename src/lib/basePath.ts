/**
 * Returns the src path prefixed with the app's basePath.
 *
 * Next.js 16 does NOT automatically prepend basePath to next/image src
 * attributes (see next.config.ts basePath docs). All local image paths must
 * be wrapped with this helper so they resolve correctly on GitHub Pages.
 *
 * This function is idempotent: if src already starts with the basePath prefix
 * it is returned unchanged, so it is safe to call multiple times on the same path.
 */
export function withBasePath(src: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  if (base && src.startsWith(base)) return src;
  return `${base}${src}`;
}
