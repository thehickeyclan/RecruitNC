/* Kept dependency-free so the middleware imports nothing else, like lib/recruiting/national-paths.ts. */

/**
 * A file in `/public` is a file, whichever address asked for it.
 *
 * The middleware decides early whether a request is for a static asset and should pass straight
 * through. Anything that falls past this check reaches the brand gate, which on
 * recruitwrestlers.com rewrites paths that are not part of the recruiting product to not-found.
 *
 * `pdf` was missing until 4 November 2026, so every PDF we serve 404'd on recruitwrestlers.com
 * while working on app.ncwrestlingunited.com - the NCHSAA handbook for as long as it had existed,
 * and then the family deck's download, which is what finally showed it. The extensions here and
 * the ones in the matcher at the bottom of middleware.ts have to stay in step.
 */
const STATIC_ASSET = /\.(json|ico|png|jpg|jpeg|gif|webp|svg|pdf)$/i

export function isStaticAssetPath(pathname: string): boolean {
  return STATIC_ASSET.test(pathname)
}
