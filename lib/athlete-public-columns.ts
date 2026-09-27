/**
 * The athlete columns a browser may read.
 *
 * `athletes` holds a minor's phone number, contact email, GPA, SAT and ACT alongside their
 * results, and the anon key that reads the table ships inside the iOS bundle and the web
 * JavaScript. Any `select("*")` from a browser therefore hands those out to whoever asks.
 *
 * Naming the columns is what makes a column-level revoke possible: `select("*")` fails outright
 * once a column is revoked, so every browser query has to say what it wants first. Personal
 * details are reached through server routes that check entitlement, never from the client.
 */
export const ATHLETE_PUBLIC_COLUMNS = [
  "id",
  "name",
  "firstName",
  "lastName",
  "wrestling_name",
  "highschool",
  "wrestlingClub",
  "weightclass",
  "graduationyear",
  "gender",
  "photourl",
  "headshot_url",
  "college",
  "college_id",
  "collegeLogoUrl",
  "commitmentdate",
  "recruiting_status",
  "is_nc_athlete",
  "ncUnitedTeam",
  "achievements",
  "rankings",
  "created_at",
  "updated_at",
].join(", ")
