/**
 * "Did you mean gmail.com?" for the address someone is signing up with.
 *
 * A mistyped domain is a dead account: the confirmation link goes nowhere, the family never gets
 * in, and they make a second account - the users list holds gmail.con, gamil.com, ilcloud.com and
 * nhcs.et versions of real people, several beside their working duplicate. Only confident fixes
 * are suggested; anything else is left alone.
 */
const DOMAIN_FIXES: Record<string, string> = {
  "gamil.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.cm": "gmail.com",
  "gnail.com": "gmail.com",
  "icoud.com": "icloud.com",
  "iclod.com": "icloud.com",
  "ilcloud.com": "icloud.com",
  "icloud.co": "icloud.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "hotmial.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "outlok.com": "outlook.com",
}

/** The corrected address, or null when the address looks fine. */
export function suggestEmailFix(email: string): string | null {
  const value = email.trim().toLowerCase()
  const at = value.lastIndexOf("@")
  if (at <= 0) return null
  const local = value.slice(0, at)
  const domain = value.slice(at + 1)
  if (DOMAIN_FIXES[domain]) return `${local}@${DOMAIN_FIXES[domain]}`
  const tld = domain.match(/\.(con|cmo|ocm|comm|et|om)$/)
  if (tld) {
    const fixed = domain.slice(0, -tld[0].length) + (tld[1] === "et" ? ".net" : ".com")
    return `${local}@${DOMAIN_FIXES[fixed] ?? fixed}`
  }
  return null
}
