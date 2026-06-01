import { resolveEntityLogoUrl } from "@/lib/entity-logo-resolve"

export {
  getDirectCollegeLogoUrl,
  getDirectEntityLogoUrl,
  resolveCollegeLogoUrlMap,
  resolveCollegeLogoUrlWithAliases,
  resolveEntityLogoUrl,
} from "@/lib/entity-logo-resolve"

/** Server-side logo fetch for profiles, emails, etc. */
export async function getLogoUrlServer(type: string, entityName: string): Promise<string | null> {
  return resolveEntityLogoUrl(type, entityName)
}
