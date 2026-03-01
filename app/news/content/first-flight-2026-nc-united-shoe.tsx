import Image from "next/image"

const FIRST_FLIGHT_IMAGE = "/images/first-flight-2026-nc-united-shoe.png"

/**
 * First Flight: The Official 2026 NC United Shoe — announcement article.
 */

export function FirstFlight2026Content() {
  return (
    <article className="max-w-none text-slate-700 [&_h2]:text-xl [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:font-bold [&_h3]:text-lg [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:font-bold [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-1 [&_hr]:my-8 [&_hr]:border-slate-200">
      <div className="my-6">
        <Image
          src={FIRST_FLIGHT_IMAGE}
          alt="First Flight — the official 2026 NC United custom wrestling shoe, white navy and red with NC UNITED branding and Nike lacing"
          width={800}
          height={600}
          className="rounded-lg w-full h-auto object-contain bg-slate-50"
        />
        <p className="text-sm text-slate-500 mt-2 text-center italic">First Flight — 2026 NC United x Classified Creations</p>
      </div>
      <p className="text-slate-600 font-medium">
        The wrestling community has spoken.
      </p>
      <p>After 726 total visits and 344 votes cast, the <strong>First Flight</strong> design has officially been selected as the inaugural 2026 NC United custom wrestling shoe.</p>
      <ul>
        <li><strong>First Flight</strong> – 184 votes</li>
        <li>Blue Ridge – 102 votes</li>
        <li>Cardinal – 58 votes</li>
      </ul>
      <p>This wasn&apos;t just a design vote. It was the beginning of something bigger.</p>

      <hr />

      <h2>The Meaning Behind &quot;First Flight&quot;</h2>
      <p>North Carolina is known as the birthplace of aviation. The Wright brothers launched the first powered flight from our coast — proving that bold ideas, when backed by courage and community, can change everything.</p>
      <p>The First Flight shoe represents:</p>
      <ul>
        <li>The launch of a new era for NC United</li>
        <li>The first officially community-selected shoe</li>
        <li>The beginning of a long-term partnership</li>
        <li>Elevating wrestling culture in North Carolina</li>
      </ul>
      <p><strong>This is not just footwear. It is a symbol.</strong></p>

      <hr />

      <h2>The Partnership: Classified Creations</h2>
      <p>This release marks the official collaboration between NC United Wrestling and Classified Creations — a creative partner specializing in high-end custom athletic footwear.</p>
      <p>Together, the goal is simple: Create meaningful, collectible, performance-ready wrestling shoes that represent North Carolina wrestling culture at the highest level.</p>
      <p>Each pair is individually customized and finished. This is not mass production. This is craft.</p>

      <hr />

      <h2>Founding Pair Recipients</h2>
      <p>Three members of the community were randomly selected from voters to receive a complimentary Founding Pair:</p>
      <ul>
        <li>Garrison Raper</li>
        <li>Manny Lopez</li>
        <li>Zoe Kemler</li>
      </ul>
      <p>These recipients represent the broader wrestling community — athletes, families, and supporters alike. This project belongs to all of us.</p>

      <hr />

      <h2>Limited Release: Only 25 Pairs</h2>
      <p>Only 25 total pairs of the First Flight shoe will be produced. Each pair will be individually numbered (1–25), making every release a collectible piece of NC wrestling history.</p>
      <p><strong>Once they are gone, they are gone. There will never be another First Flight run.</strong></p>

      <hr />

      <h2>Availability &amp; Pricing</h2>
      <p>The First Flight shoe will retail for <strong>$300 per pair</strong>. This includes:</p>
      <ul>
        <li>Nike base wrestling shoe</li>
        <li>Custom design execution</li>
        <li>Individual finishing</li>
        <li>Limited-edition numbering</li>
        <li>Premium packaging</li>
      </ul>

      <hr />

      <h2>Where the Proceeds Go</h2>
      <p>NC United Wrestling is a registered 501(c)(3) nonprofit organization. Proceeds from the First Flight release directly support:</p>
      <ul>
        <li>Athlete development initiatives</li>
        <li>College exposure opportunities</li>
        <li>Training resources</li>
        <li>Community programming</li>
        <li>Expansion of the NC United wrestling ecosystem</li>
      </ul>
      <p>This release is not just about sneakers. It is about reinvesting back into the athletes and families who make North Carolina wrestling strong.</p>
      <p className="text-sm text-slate-600 italic">(For clarity: the purchase of a sneaker is not considered a charitable donation. However, revenue generated from this release directly supports NC United&apos;s nonprofit mission.)</p>

      <hr />

      <h2>A Cultural Moment</h2>
      <p>This is more than a product launch. It is proof that:</p>
      <ul>
        <li>The community will engage</li>
        <li>The brand has momentum</li>
        <li>North Carolina wrestling is ready for elevated identity</li>
      </ul>
      <p><strong>First Flight is the beginning. And every pair released carries that meaning.</strong></p>
    </article>
  )
}
