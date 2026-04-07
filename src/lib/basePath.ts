/**
 * Returns the src path prefixed with the app's basePath.
 *
 * Next.js 16 does NOT automatically prepend basePath to next/image src
 * attributes (see next.config.ts basePath docs). All local image paths must
 * be wrapped with this helper so they resolve correctly on GitHub Pages.
 */
export function withBasePath(src: string): string {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${src}`;
}
