"use client"

const NHSCA_TICKETS_URL =
  "https://www.etix.com/ticket/p/81773822/2026-nhsca-national-duals-wrestling-virginia-beach-virginia-beach-sports-center"

/** NHSCA Duals 2026 — NC United team hub FAQ (in-person reference). */
export function NHSCADuals2026TeamHubFaq() {
  return (
    <div className="space-y-8 text-sm text-white/90">
      <section>
        <h3 className="text-[#D3B574] font-semibold uppercase tracking-wide text-xs mb-2">At a glance</h3>
        <ul className="space-y-2 list-disc pl-5 text-white/85">
          <li>
            <strong>Minimum 6 dual matches</strong> per team (3 on Day 1, at least 3 on Day 2; Monday only if you
            advance).
          </li>
          <li>
            Full NHSCA schedule, rules, and brackets:{" "}
            <a
              href="https://nhsca-events.com/national-duals/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#D3B574] underline underline-offset-2 hover:text-white"
            >
              nhsca-events.com/national-duals
            </a>
          </li>
        </ul>
      </section>

      <section>
        <h3 className="text-[#D3B574] font-semibold uppercase tracking-wide text-xs mb-2">Competition format</h3>
        <ul className="space-y-3 list-disc pl-5">
          <li>
            <strong>Day 1:</strong> Teams placed into <strong>4-team pools</strong>. Each team wrestles <strong>3 duals</strong>.
          </li>
          <li>
            <strong>After Day 1:</strong> Pool placement determines Day 2 —
            <strong> 1st / 2nd → Championship pools</strong>; <strong>3rd / 4th → Consi pools</strong>. Consi teams{" "}
            <strong>do not</strong> advance to Monday.
          </li>
          <li>
            <strong>Monday:</strong> Only teams advancing from championship pools continue into the{" "}
            <strong>Championship Bracket</strong>, reseeded using on-site roster and results.
          </li>
        </ul>
      </section>

      <section>
        <h3 className="text-[#D3B574] font-semibold uppercase tracking-wide text-xs mb-2">Weigh-ins</h3>
        <ul className="space-y-2 list-disc pl-5">
          <li>
            <strong>Did NC United purchase early weigh-ins?</strong> <strong className="text-white">Yes.</strong> NC United
            prepaid early weigh-ins for <strong>both</strong> NC United teams.
          </li>
          <li>
            <strong>Early weigh-ins:</strong> Friday <strong>2 PM – 4 PM</strong> at VBSC. Athletes may weigh{" "}
            <strong>individually</strong> — the team does <strong>not</strong> need to arrive together.
          </li>
          <li>
            <strong>Regular weigh-ins:</strong> Friday <strong>6 PM – 7:30 PM</strong> at VBSC.
          </li>
          <li>
            <strong>Late weigh-in (assigned only):</strong>{" "}
            <strong>Holt Quincy</strong>, <strong>Tillman Caskey</strong> — Saturday <strong>7 AM</strong> at VBSC (must weigh before first match).
          </li>
          <li>
            <strong>Singlets at weigh-ins?</strong> <strong className="text-white">Yes — required.</strong>
          </li>
          <li>
            <strong>HS allowance:</strong> <strong>+3 lbs</strong> (e.g. 106 → 109, 113 → 116, 120 → 123, etc.).
          </li>
          <li>
            <strong>Eligibility:</strong> Actual weight determines your class <strong>plus one class above</strong>. Example:{" "}
            <strong>116.0</strong> → eligible for <strong>113 or 120</strong>, <strong>not</strong> 126.
          </li>
        </ul>
      </section>

      <section>
        <h3 className="text-[#D3B574] font-semibold uppercase tracking-wide text-xs mb-2">Team rules</h3>
        <ul className="space-y-1.5 list-disc pl-5">
          <li><strong>Headgear:</strong> Not required — optional.</li>
          <li><strong>Mouthguards:</strong> Required only for braces.</li>
          <li><strong>Hair covers:</strong> Allowed — must be legal and attach to headgear.</li>
          <li><strong>Out of bounds:</strong> College OB used all divisions.</li>
          <li><strong>Coaches:</strong> 2 coaches per corner; coach not required.</li>
          <li><strong>Grooming:</strong> Fingernail length only.</li>
          <li>
            <strong>Match length (HS):</strong> 1:30 · 1:30 · 1:30
          </li>
          <li>
            <strong>Overtime:</strong> :60 sudden victory · :30 · :30 · ultimate :30
          </li>
          <li>
            <strong>Injury time:</strong> Starts when trainer reaches mat. If coach treats athlete first, clock starts immediately.
          </li>
          <li>
            <strong>Blood:</strong> Coach cleans athlete blood from the mat.
          </li>
        </ul>
      </section>

      <section>
        <h3 className="text-[#D3B574] font-semibold uppercase tracking-wide text-xs mb-2">Tiebreakers (pool ties)</h3>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Head-to-head dual result</li>
          <li>Team points FOR</li>
          <li>Team points AGAINST</li>
        </ol>
        <p className="mt-2 text-white/80">
          Example: A beats B, B beats C, C beats A → tie. NHSCA then compares total points FOR, then points AGAINST.
        </p>
        <p className="mt-2">
          <strong>Bonus points matter</strong> — they affect advancement. Every match counts; avoid giving up points.
        </p>
      </section>

      <section>
        <h3 className="text-[#D3B574] font-semibold uppercase tracking-wide text-xs mb-2">Tickets</h3>
        <ul className="space-y-2 list-disc pl-5">
          <li>
            <strong>Tickets:</strong>{" "}
            <a
              href={NHSCA_TICKETS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#D3B574] underline underline-offset-2 hover:text-white"
            >
              Buy on Etix (Virginia Beach Sports Center)
            </a>
          </li>
          <li><strong>Saturday:</strong> Everyone wrestles.</li>
          <li><strong>Sunday:</strong> Everyone wrestles.</li>
          <li><strong>Monday:</strong> Advancing teams only.</li>
          <li><strong>Children:</strong> Under 6 free.</li>
          <li><strong>Refunds:</strong> Non-refundable, non-transferable.</li>
        </ul>
      </section>

      <section>
        <h3 className="text-[#D3B574] font-semibold uppercase tracking-wide text-xs mb-2">Hotel</h3>
        <p>
          <strong>Official NC United hotel:</strong> SpringHill Suites Norfolk Virginia Beach (~20 min from venue).
        </p>
        <p className="mt-2">Athletes may stay with the team — coordinate with staff. Parents staying separately is allowed.</p>
      </section>

      <section>
        <h3 className="text-[#D3B574] font-semibold uppercase tracking-wide text-xs mb-2">Transportation</h3>
        <ul className="space-y-2 list-disc pl-5">
          <li>
            <strong>Team departure:</strong> Raleigh — <strong>Friday 9 AM</strong>
          </li>
          <li>Need a ride? Complete the transportation form (link in GroupMe).</li>
          <li>
            <strong>Team transportation list:</strong>{" "}
            <span className="text-white/70 italic">Insert roster/vehicle list URL when ready — meanwhile see GroupMe.</span>
          </li>
        </ul>
      </section>

      <section>
        <h3 className="text-[#D3B574] font-semibold uppercase tracking-wide text-xs mb-2">Team Parent / Snacks & Recovery</h3>
        <p>
          <strong>Coordinator:</strong>{" "}
          <a href="tel:+16463168062" className="text-[#D3B574] font-medium hover:text-white hover:underline">
            Cheryl Shuster (646) 316-8062
          </a>
        </p>
        <p className="mt-2">
          <strong>Snack signup:</strong> SignUp Genius + Venmo &amp; Zelle (details in GroupMe).
        </p>
        <p className="mt-2 font-semibold text-white">Requested items include:</p>
        <p className="mt-1 text-white/85">
          Water · Gatorade · Liquid IV · Fruit · PB · Jelly · Bagels · Rice cakes · Protein bars · Trail mix
        </p>
      </section>

      <section>
        <h3 className="text-[#D3B574] font-semibold uppercase tracking-wide text-xs mb-2">Challenge mat</h3>
        <p>
          <strong>Yes</strong> — Saturday and Sunday for extra matches.
        </p>
      </section>

      <section>
        <h3 className="text-[#D3B574] font-semibold uppercase tracking-wide text-xs mb-2">Media</h3>
        <p>No personal photographers mat-side — credential required.</p>
      </section>

      <section>
        <h3 className="text-[#D3B574] font-semibold uppercase tracking-wide text-xs mb-2">Table workers</h3>
        <p>Each team needs one. Flo instructions sent; lanyard at weigh-ins.</p>
      </section>

      <section>
        <h3 className="text-[#D3B574] font-semibold uppercase tracking-wide text-xs mb-2">Communication</h3>
        <p>
          Primary: <strong>GroupMe</strong> — parents and athletes should <strong>both</strong> join. Turn notifications ON.
        </p>
      </section>

      <section>
        <h3 className="text-[#D3B574] font-semibold uppercase tracking-wide text-xs mb-2">Contacts</h3>
        <ul className="space-y-3">
          <li>
            <strong>Operations:</strong> Matt Hickey{" "}
            <a href="tel:+16316625409" className="text-[#D3B574] font-medium hover:text-white hover:underline">
              (631) 662-5409
            </a>
            {" · "}Lisa Hickey
          </li>
          <li>
            <strong>Coaches:</strong>{" "}
            <a href="tel:+19194519864" className="text-[#D3B574] font-medium hover:text-white hover:underline">
              Colton Palmer
            </a>
            {" · "}
            <a href="tel:+17048917436" className="text-[#D3B574] font-medium hover:text-white hover:underline">
              Michael Macchiavello
            </a>
            {" · "}
            <a href="tel:+19194508266" className="text-[#D3B574] font-medium hover:text-white hover:underline">
              Araad Fischer
            </a>
          </li>
          <li>
            <strong>Team Parent:</strong>{" "}
            <a href="tel:+16463168062" className="text-[#D3B574] font-medium hover:text-white hover:underline">
              Cheryl Shuster (646) 316-8062
            </a>
          </li>
        </ul>
      </section>
    </div>
  )
}
