import fs from "fs"; import path from "path"; import { createClient } from "@supabase/supabase-js"
for (const f of [".env.local",".env"]) { const p=path.join(process.cwd(),f); if(!fs.existsSync(p))continue
  for (const line of fs.readFileSync(p,"utf8").split("\n")) { const m=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^["']|["']$/g,"") } }
const sb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}})
async function main(){
  const { data: colls } = await sb.from("colleges").select("name,division")
  const div = new Map((colls??[]).map(c=>[String(c.name).toLowerCase().trim(), String(c.division)]))
  const { data: all } = await sb.from("athletes").select("name,graduationyear,college,college_id,gender")
  for (const y of [2025, 2026, 2027]) {
    const cls = (all??[]).filter(r=>Number(r.graduationyear)===y)
    const committed = cls.filter(r=>String(r.college??"").trim())
    console.log(`\n=== class of ${y}: ${cls.length} profiles, ${committed.length} with a college on file ===`)
    const byDiv: Record<string,number> = {}
    const unknown: string[] = []
    for (const r of committed) {
      const d = div.get(String(r.college).toLowerCase().trim())
      if (d) byDiv[d]=(byDiv[d]??0)+1
      else { byDiv["(not in colleges table)"]=(byDiv["(not in colleges table)"]??0)+1; unknown.push(String(r.college)) }
    }
    console.log(JSON.stringify(byDiv,null,1))
    if (unknown.length) console.log("unmapped colleges:", [...new Set(unknown)].join(" | "))
    if (y===2026) console.log("\nall 2026 commitments:\n" + committed.map(r=>`  ${r.name} -> ${r.college}`).join("\n"))
  }
}
main()
