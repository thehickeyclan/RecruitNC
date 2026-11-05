/**
 * The twelve slides of the family deck, as they were approved.
 *
 * Ported from the Claude artifact Matt reviewed word by word (4 November 2026) so that Rhett can
 * present and download it without an account on Matt's Claude. Each slide is the same HTML, with
 * its images moved to /public/deck and its speaker notes split out of the <aside> they lived in.
 *
 * These twelve are FIXED. The per-state slide is built live by the deck page and never joins this
 * list, so it can never reach the PDF: a downloaded number outlives the week it was true in, and
 * a state with nothing to show argues against the person presenting it.
 *
 * Generated once, then edited here. The numbers on them are hand-set and dated 4 November 2026:
 * if you refresh them, change the dates in the same pass.
 */

export type DeckSlide = {
  id: string
  /** A full <section>, 1920x1080, self-contained inline styles. */
  html: string
  /** What to say while it is up. Shown in present mode, never printed. */
  notes: string
}

export const DECK_SLIDES: DeckSlide[] = [
  {
    id: "cover",
    html: `<section id="cover" data-transition="fade" style="background:#0B1426;color:#F2F5F8;font-family:'Public Sans', Verdana, sans-serif;padding:0;display:flex">
<div style="width:1120px;height:1080px;padding:86px 70px 86px 120px;display:flex;flex-direction:column;justify-content:center;gap:38px">
<div style="display:flex;align-items:center;gap:26px">
<p style="font-family:'Oswald', Arial, sans-serif;font-size:40px;font-weight:700;letter-spacing:1px;line-height:1"><span style="color:#F2F5F8">RECRUIT</span><span style="color:#A3E635">WRESTLERS</span></p>
<div style="width:2px;height:38px;background:#2B3A58"></div>
<p style="font-size:20px;font-weight:600;letter-spacing:4px;text-transform:uppercase;color:#A8B3C5;line-height:1">College wrestling recruiting · boys and girls</p>
</div>
<div style="width:112px;height:7px;background:#A3E635;border-radius:4px"></div>
<div style="display:flex;flex-direction:column">
<p style="font-family:'Oswald', Arial, sans-serif;font-size:96px;font-weight:700;line-height:1.04;color:#F2F5F8;width:930px">Your wrestler is putting in the work.</p>
<p style="font-family:'Oswald', Arial, sans-serif;font-size:96px;font-weight:700;line-height:1.04;color:#A3E635;width:930px">Now let’s find the right opportunity.</p>
</div>
<p style="font-size:34px;line-height:1.45;color:#C3CCDA;width:930px">Find the right colleges. See where coaches are looking. Build a plan for what’s next.</p>
<div style="width:820px;height:1px;background:#2B3A58;margin-top:4px"></div>
<p style="font-family:'Oswald', Arial, sans-serif;font-size:30px;font-weight:600;letter-spacing:5px;color:#A3E635;line-height:1">RECRUITWRESTLERS.COM</p>
</div>
<div style="width:800px;height:1080px;position:relative">
<img src="/deck/324e6e79679958585e80baa48f81530f.jpg" alt="Carson Worrick of Davie getting his hand raised after the 165-pound final at the 2026 NC United TOC" style="display:block;width:800px;height:1080px;object-fit:cover;object-position:50% 50%">
<div style="position:absolute;top:0;left:0;width:280px;height:1080px;background:linear-gradient(90deg, #0B1426 0%, rgba(11,20,38,0.6) 45%, rgba(11,20,38,0) 100%)"></div>
<div style="position:absolute;left:0;bottom:0;width:800px;height:200px;background:linear-gradient(180deg, rgba(11,20,38,0) 0%, rgba(11,20,38,0.85) 100%)"></div>
<p style="position:absolute;left:40px;bottom:34px;font-size:18px;letter-spacing:1px;color:#C3CCDA;line-height:1.5">Carson Worrick, Davie · 2026 NC United TOC<br><span style="color:#8FA0B8">Photo: Tony Rotundo / WrestlersAreWarriors.com</span></p>
</div>

</section>`,
    notes: `Open on the wrestler, not the platform. The parent in the room has watched their kid do exactly this for ten years — the work is never the question, the opportunity is. That is Carson Worrick of Davie, class of 2027, getting his hand raised in the 165 final at our own TOC in September: a real kid with a real profile on the platform, not stock. Say his name if the room is from North Carolina. Read the three sentences underneath and stop — colleges, coaches, a plan is the order of the whole deck, and slide 2 is where the room should start feeling the problem.`,
  },
  {
    id: "dark-room",
    html: `<section id="dark-room" data-transition="fade" style="background:#0B1426;color:#F2F5F8;font-family:'Public Sans', Verdana, sans-serif;padding:0;display:flex">
<div style="width:820px;height:1080px;position:relative">
<img src="/deck/9d994fd28ddee90f2f372c6197fca1a6.jpg" alt="A wrestler sitting alone on a window ledge between matches at the 2026 NC United TOC" style="display:block;width:820px;height:1080px;object-fit:cover;object-position:50% 50%">
<div style="position:absolute;top:0;right:0;width:280px;height:1080px;background:linear-gradient(270deg, #0B1426 0%, rgba(11,20,38,0.6) 45%, rgba(11,20,38,0) 100%)"></div>
<div style="position:absolute;left:0;bottom:0;width:820px;height:190px;background:linear-gradient(180deg, rgba(11,20,38,0) 0%, rgba(11,20,38,0.85) 100%)"></div>
<p style="position:absolute;left:40px;bottom:34px;font-size:18px;letter-spacing:1px;color:#C3CCDA;line-height:1.5">2026 NC United TOC<br><span style="color:#8FA0B8">Photo: Tony Rotundo / WrestlersAreWarriors.com</span></p>
</div>
<div style="width:1100px;height:1080px;padding:70px 120px 70px 70px;display:flex;flex-direction:column;justify-content:center;gap:36px">
<div style="display:flex;flex-direction:column;gap:12px">
<p style="font-family:'Oswald', Arial, sans-serif;font-size:25px;font-weight:600;letter-spacing:5px;text-transform:uppercase;color:#A3E635">The questions nobody answers</p>
<div style="display:flex;flex-direction:column">
<p style="font-family:'Oswald', Arial, sans-serif;font-size:70px;font-weight:700;line-height:1.06;color:#F2F5F8;width:910px">Recruiting is full of questions</p>
<p style="font-family:'Oswald', Arial, sans-serif;font-size:70px;font-weight:700;line-height:1.06;color:#A3E635;width:910px">and not enough answers.</p>
</div>
</div>
<div style="display:flex;flex-direction:column">
<div style="padding:17px 0 17px 0;display:flex;gap:20px;align-items:flex-start"><div style="width:13px;height:13px;background:#A3E635;border-radius:13px;margin-top:12px"></div><div style="display:flex;flex-direction:column;gap:5px"><p style="font-size:31px;font-weight:700;line-height:1.2;color:#F2F5F8">Which colleges are even realistic?</p><p style="font-size:27px;line-height:1.35;color:#A8B3C5">There are 438 college programs, men’s and women’s, and no easy way to compare them.</p></div></div>
<div style="border-top:1px solid #1E2C48;padding:17px 0 17px 0;display:flex;gap:20px;align-items:flex-start"><div style="width:13px;height:13px;background:#A3E635;border-radius:13px;margin-top:12px"></div><div style="display:flex;flex-direction:column;gap:5px"><p style="font-size:31px;font-weight:700;line-height:1.2;color:#F2F5F8">Is anyone actually looking at my wrestler?</p><p style="font-size:27px;line-height:1.35;color:#A8B3C5">Coaches evaluate wrestlers weekly. Families rarely know who.</p></div></div>
<div style="border-top:1px solid #1E2C48;padding:17px 0 17px 0;display:flex;gap:20px;align-items:flex-start"><div style="width:13px;height:13px;background:#A3E635;border-radius:13px;margin-top:12px"></div><div style="display:flex;flex-direction:column;gap:5px"><p style="font-size:31px;font-weight:700;line-height:1.2;color:#F2F5F8">When can we contact a coach, and what do we say?</p><p style="font-size:27px;line-height:1.35;color:#A8B3C5">The rules, the timing and the first email are never explained.</p></div></div>
<div style="border-top:1px solid #1E2C48;padding:17px 0 17px 0;display:flex;gap:20px;align-items:flex-start"><div style="width:13px;height:13px;background:#A3E635;border-radius:13px;margin-top:12px"></div><div style="display:flex;flex-direction:column;gap:5px"><p style="font-size:31px;font-weight:700;line-height:1.2;color:#F2F5F8">What will college actually cost us?</p><p style="font-size:27px;line-height:1.35;color:#A8B3C5">Scholarships, aid and out-of-pocket cost differ at every school.</p></div></div>
<div style="border-top:1px solid #1E2C48;padding:17px 0 17px 0;display:flex;gap:20px;align-items:flex-start"><div style="width:13px;height:13px;background:#A3E635;border-radius:13px;margin-top:12px"></div><div style="display:flex;flex-direction:column;gap:5px"><p style="font-size:31px;font-weight:700;line-height:1.2;color:#F2F5F8">Who is keeping track of all of this?</p><p style="font-size:27px;line-height:1.35;color:#A8B3C5">No one place holds the list, the plan and the deadlines.</p></div></div>
</div>
</div>

</section>`,
    notes: `This is the slide the room already lives in. Read two or three of the questions out loud and stop talking — every parent has asked at least three of them this season and nobody has given them a straight answer. The photograph is real: a wrestler waiting between matches at our own TOC in September, not stock. Do not rush to the product. The last question is the hand-off: slide 3 answers it by name. The four slides after that take the questions in turn — the record first, because it is what a coach checks before anything else, then the colleges, then who is looking, then the plan.`,
  },
  {
    id: "vision",
    html: `<section id="vision" data-transition="fade" style="background:linear-gradient(160deg, #0E1A30 0%, #0B1426 100%);color:#F2F5F8;font-family:'Public Sans', Verdana, sans-serif;padding:128px 128px 160px;display:flex;flex-direction:column;gap:18px">
<div style="display:flex;flex-direction:column;gap:12px">
<p style="font-family:'Oswald', Arial, sans-serif;font-size:25px;font-weight:600;letter-spacing:6px;text-transform:uppercase;color:#A3E635">Introducing RecruitWrestlers</p>
<h2 style="font-family:'Oswald', Arial, sans-serif;font-size:72px;font-weight:700;line-height:1.03">The whole recruiting process, in one place.</h2>
<p style="font-size:26px;line-height:1.35;color:#C3CCDA">Boys and girls, 8th grade to signing. Your wrestler’s results, the colleges, and who is looking. 122 college coaches are already on it.</p>
</div>
<div style="display:flex;flex-direction:column;gap:8px">
<div style="position:relative;width:1664px;height:260px;border:1px solid #1E2C48;border-radius:16px;overflow:hidden">
<img src="/deck/461db21012fa4c6233d5d2be86f97ea2.jpg" alt="The Recruiting Command Center: 80% profile complete, 23 colleges on the list, 8 college programs viewed and 2 visits planned" style="display:block;width:1664px;height:260px;object-fit:cover;object-position:50% 50%">
</div>
</div>
<div style="display:flex;gap:24px">
<div style="display:flex;flex-direction:column;gap:8px">
<p style="font-family:'Oswald', Arial, sans-serif;font-size:23px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:#A3E635;line-height:1;width:1020px">Ask a question</p>
<div style="position:relative;width:1020px;height:290px;border:1px solid #1E2C48;border-radius:14px;overflow:hidden">
<img src="/deck/5cd995ad67108a75a0ce3a4dfdae4e97.jpg" alt="Scout, the recruiting assistant, offering to answer questions about this wrestler’s recruiting" style="display:block;width:1020px;height:290px;object-fit:cover;object-position:50% 50%">
</div>
</div>
<div style="display:flex;flex-direction:column;gap:8px">
<p style="font-family:'Oswald', Arial, sans-serif;font-size:23px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:#A3E635;line-height:1;width:620px">All 438 programs</p>
<div style="position:relative;width:620px;height:290px;border:1px solid #1E2C48;border-radius:14px;overflow:hidden">
<img src="/deck/2c7763267306ad73ccf3ef28179c4e3c.jpg" alt="The college program map: every Division I, II and III, NAIA and junior-college wrestling program in the country" style="display:block;width:620px;height:290px;object-fit:cover;object-position:50% 50%">
</div>
</div>
</div>
<p style="position:absolute;left:128px;bottom:64px;font-size:24px;color:#7E8CA3">Shown with an example family</p>

</section>`,
    notes: `This is the turn. Slide 2 ended on "who is keeping track of all of this" — this is the answer, and the name goes on the wall here. Three screens of the real product: the Command Center, Scout, and every college program in the country. Read the four numbers across the top — profile, list, who has looked, visits booked — then stop. The next four slides are each of these at full size.`,
  },
  {
    id: "record",
    html: `<section id="record" data-transition="fade" style="background:#0B1426;color:#F2F5F8;font-family:'Public Sans', Verdana, sans-serif;padding:128px 128px 160px;display:flex;flex-direction:column;gap:26px">
<div style="display:flex;flex-direction:column;gap:12px">
<p style="font-family:'Oswald', Arial, sans-serif;font-size:25px;font-weight:600;letter-spacing:5px;text-transform:uppercase;color:#A3E635">Step one · The record</p>
<h2 style="font-family:'Oswald', Arial, sans-serif;font-size:64px;font-weight:600;line-height:1.05">It starts with what your wrestler has already done</h2>
</div>
<div style="display:flex;gap:24px;align-items:flex-start">
<div style="position:relative;width:820px;height:561px;border:1px solid #1E2C48;border-radius:16px;overflow:hidden">
<img src="/deck/a5b24b2521bfb0496be459b148931cc2.jpg" alt="Brieon Mayfield’s profile: class of 2027, committed to NC State, every tournament result on file" style="display:block;width:820px;height:561px;object-fit:cover;object-position:50% 50%">
</div>
<div style="width:820px;display:flex;flex-direction:column;gap:18px">
<div style="position:relative;width:820px;height:330px;border:1px solid #1E2C48;border-radius:14px;overflow:hidden">
<img src="/deck/ae63de73562e7439d36fab3c3c45251b.jpg" alt="Significant wins: nine national wins over out-of-state state champions and placers" style="display:block;width:820px;height:330px;object-fit:cover;object-position:50% 50%">
<div style="position:absolute;left:0;bottom:0;width:820px;height:70px;background:linear-gradient(180deg, rgba(11,20,38,0) 0%, rgba(11,20,38,0.94) 100%)"></div>
</div>
<div style="position:relative;width:820px;height:213px;border:1px solid #1E2C48;border-radius:14px;overflow:hidden">
<img src="/deck/3f5133f9437bdc9d5d19889165594a15.jpg" alt="Strength of competition: wins over ranked opponents, competes nationally, competes post and preseason" style="display:block;width:820px;height:213px;object-fit:cover;object-position:50% 50%">
</div>
</div>
</div>
<p style="position:absolute;left:128px;bottom:64px;font-size:24px;color:#7E8CA3">Brieon Mayfield · Jack Britt · class of 2027 · committed to NC State</p>

</section>`,
    notes: `Families think recruiting starts with a highlight reel. It starts with a record a coach can check. Every bout, every placement, every opponent was on file before this family signed up. The right-hand panels are the part no other site has: a win is only as good as the wrestler you beat, and the platform already knows who that was.`,
  },
  {
    id: "colleges",
    html: `<section id="colleges" data-transition="fade" style="background:#0E1A30;color:#F2F5F8;font-family:'Public Sans', Verdana, sans-serif;padding:128px 128px 160px;display:flex;flex-direction:column;gap:26px">
<div style="display:flex;flex-direction:column;gap:12px">
<p style="font-family:'Oswald', Arial, sans-serif;font-size:25px;font-weight:600;letter-spacing:5px;text-transform:uppercase;color:#A3E635">Step two · The colleges</p>
<h2 style="font-family:'Oswald', Arial, sans-serif;font-size:64px;font-weight:600;line-height:1.05">438 college programs, at every level.</h2>
</div>
<div style="display:flex;gap:30px;align-items:flex-start">
<img src="/deck/2c7763267306ad73ccf3ef28179c4e3c.jpg" alt="The college program map: every Division I, II and III, NAIA and junior-college wrestling program in the country, color-coded by division" style="display:block;width:1020px;height:476px;object-fit:cover;object-position:50% 50%;border:1px solid #1E2C48;border-radius:16px">
<div style="width:614px;display:flex;flex-direction:column;gap:30px">
<div style="display:flex;flex-direction:column;gap:6px"><p style="font-size:30px;font-weight:700;line-height:1.2;color:#A3E635">Start the list wide.</p><p style="font-size:26px;line-height:1.4;color:#A8B3C5">Division I is 80 of them, and 200 have a women’s team. Most wrestlers who keep competing do it outside Division I, at schools most families have never heard of.</p></div><div style="display:flex;flex-direction:column;gap:6px"><p style="font-size:30px;font-weight:700;line-height:1.2;color:#A3E635">Fit, worked out.</p><p style="font-size:26px;line-height:1.4;color:#A8B3C5">Academic and athletic fit from your wrestler’s own GPA, test scores and results — not a brochure.</p></div><div style="display:flex;flex-direction:column;gap:6px"><p style="font-size:30px;font-weight:700;line-height:1.2;color:#A3E635">Cost, in full.</p><p style="font-size:26px;line-height:1.4;color:#A8B3C5">The yearly number for your family, in-state or out, after aid.</p></div>
</div>
</div>
<div style="display:flex;gap:44px;align-items:center;padding-top:4px">
<div style="display:flex;align-items:center;gap:13px"><div style="width:20px;height:20px;background:#EF4444;border-radius:20px;border:2px solid #F2F5F8"></div><p style="font-size:26px;font-weight:600;color:#C3CCDA">Division I</p></div><div style="display:flex;align-items:center;gap:13px"><div style="width:20px;height:20px;background:#3B82F6;border-radius:20px;border:2px solid #F2F5F8"></div><p style="font-size:26px;font-weight:600;color:#C3CCDA">Division II</p></div><div style="display:flex;align-items:center;gap:13px"><div style="width:20px;height:20px;background:#22C55E;border-radius:20px;border:2px solid #F2F5F8"></div><p style="font-size:26px;font-weight:600;color:#C3CCDA">Division III</p></div><div style="display:flex;align-items:center;gap:13px"><div style="width:20px;height:20px;background:#F59E0B;border-radius:20px;border:2px solid #F2F5F8"></div><p style="font-size:26px;font-weight:600;color:#C3CCDA">NAIA</p></div><div style="display:flex;align-items:center;gap:13px"><div style="width:20px;height:20px;background:#A78BFA;border-radius:20px;border:2px solid #F2F5F8"></div><p style="font-size:26px;font-weight:600;color:#C3CCDA">Junior college</p></div>
</div>
<p style="position:absolute;left:128px;bottom:64px;font-size:24px;color:#7E8CA3">The live college map · search by school or city, filter by division, state or your own list</p>

</section>`,
    notes: `The reframe is "at every level", not a number to be discouraged by. Say the 80 out loud as a fact, never as a verdict on anybody’s kid — plenty of wrestlers in this room are Division I prospects, and the slide is not there to tell them otherwise. Point at the dots on the west coast: a parent assumes the only options are the four schools they can drive to. Then the three lines on the right, which are the order a family actually decides in.`,
  },
  {
    id: "visibility",
    html: `<section id="visibility" data-transition="fade" style="background:#0B1426;color:#F2F5F8;font-family:'Public Sans', Verdana, sans-serif;padding:128px 128px 160px;display:flex;flex-direction:column;gap:26px">
<div style="display:flex;flex-direction:column;gap:12px">
<p style="font-family:'Oswald', Arial, sans-serif;font-size:25px;font-weight:600;letter-spacing:5px;text-transform:uppercase;color:#A3E635">Step three · The visibility</p>
<h2 style="font-family:'Oswald', Arial, sans-serif;font-size:64px;font-weight:600;line-height:1.05">See which colleges have looked at your wrestler</h2>
</div>
<div style="display:flex;gap:40px;align-items:center">
<div style="position:relative;width:980px;height:593px;border:1px solid #1E2C48;border-radius:16px;overflow:hidden">
<img src="/deck/8d566c209d2d14b05b2a9025ac4b2a7b.jpg" alt="Twenty-two college programs have viewed this wrestler, with NC State, Belmont Abbey, Nebraska Wesleyan, Southeastern Community College and Centenary named" style="display:block;width:980px;height:593px;object-fit:cover;object-position:50% 50%">
</div>
<div style="flex:1;display:flex;flex-direction:column;gap:24px">
<p style="font-size:30px;line-height:1.4;color:#A8B3C5"><b style="color:#A3E635">The schools, by name.</b> NC State. Belmont Abbey. Nebraska Wesleyan. And the date each one looked.</p>
<p style="font-size:30px;line-height:1.4;color:#A8B3C5"><b style="color:#A3E635">It updates on its own.</b> Every time a coach opens the profile.</p>
<p style="font-size:30px;line-height:1.4;color:#A8B3C5"><b style="color:#A3E635">Free shows the number.</b> A subscription shows the names.</p>
<p style="font-size:30px;line-height:1.4;color:#A8B3C5"><b style="color:#A3E635">You don’t have to keep checking.</b> We email you the week a college looks. In North Carolina it hits your phone too.</p>
<p style="font-size:30px;line-height:1.4;color:#A8B3C5"><b style="color:#A3E635">And they keep hearing about him.</b> A coach who stars your wrestler gets told every time your wrestler competes.</p>
</div>
</div>
<p style="position:absolute;left:128px;bottom:64px;font-size:24px;color:#7E8CA3">A real profile: 22 college programs since January</p>

</section>`,
    notes: `This is the slide parents lean forward for. Twenty-two college programs have opened this wrestler this year, NC State among them. Read the school names off the screen and let them land. The last two lines are the ones that keep a family subscribed: the email goes out Monday morning and only when something actually happened, and a coach who stars a wrestler is following him, so every result reaches him without anybody sending it. If a parent asks whether they see which coach it was: no, the program is named and the coach is not. Do not volunteer it.`,
  },
  {
    id: "plan",
    html: `<section id="plan" data-transition="fade" style="background:#0E1A30;color:#F2F5F8;font-family:'Public Sans', Verdana, sans-serif;padding:128px 128px 160px;display:flex;flex-direction:column;gap:26px">
<div style="display:flex;flex-direction:column;gap:12px">
<p style="font-family:'Oswald', Arial, sans-serif;font-size:25px;font-weight:600;letter-spacing:5px;text-transform:uppercase;color:#A3E635">Step four · The plan</p>
<h2 style="font-family:'Oswald', Arial, sans-serif;font-size:64px;font-weight:600;line-height:1.05">The plan updates itself. You just take the next step.</h2>
</div>
<div style="display:flex;gap:24px;align-items:flex-start">
<div style="position:relative;width:820px;height:500px;border:1px solid #1E2C48;border-radius:16px;overflow:hidden">
<img src="/deck/cf58949f2be904b4ee17e0a60a911316.jpg" alt="The recruiting roadmap: a checklist for each grade that checks itself off as the profile and the college list change" style="display:block;width:820px;height:500px;object-fit:cover;object-position:50% 50%">
</div>
<div style="width:820px;display:flex;flex-direction:column;gap:18px">
<div style="position:relative;width:820px;height:225px;border:1px solid #1E2C48;border-radius:14px;overflow:hidden">
<img src="/deck/15234bef6ff7476a5be14f9e0a684b31.jpg" alt="Today’s moves: apply to one college, email a coach who viewed the profile, follow up with another" style="display:block;width:820px;height:225px;object-fit:cover;object-position:50% 50%">
</div>
<div style="position:relative;width:820px;height:257px;border:1px solid #1E2C48;border-radius:14px;overflow:hidden">
<img src="/deck/5cd995ad67108a75a0ce3a4dfdae4e97.jpg" alt="Scout, the recruiting assistant, ready to answer questions about this wrestler’s recruiting" style="display:block;width:820px;height:257px;object-fit:cover;object-position:50% 50%">
</div>
</div>
</div>
<div style="display:flex;gap:24px;align-items:flex-start">
<p style="width:820px;font-size:28px;line-height:1.4;color:#A8B3C5"><b style="color:#A3E635">We keep the rules straight.</b> Who can call and when, by division and by class, with the source for every date.</p>
<p style="width:820px;font-size:28px;line-height:1.4;color:#A8B3C5"><b style="color:#A3E635">Today’s moves, not a to-do list.</b> Three colleges, three actions, one of them because a coach looked.</p>
</div>
<p style="position:absolute;left:128px;bottom:64px;font-size:24px;color:#7E8CA3">The real screens, shown with an example family</p>

</section>`,
    notes: `Parents do not buy features, they buy the end of the Sunday-night dread. The roadmap says what to do in each grade and checks items off by itself as the record and the list change. The rules line is the one nobody else gives them: who may call a junior, and when, differs by division and by class, and every date on the board carries its source. If anyone asks what Scout will not do: recruiting questions only, never weight cutting, never medical. Do not volunteer it.`,
  },
  {
    id: "coaches-here",
    html: `<section id="coaches-here" data-transition="fade" style="display:flex; flex-direction:column; gap:30px; justify-content:center; padding:128px 128px 160px; background:#0e1a30">
  <div style="display:flex; flex-direction:column; gap:10px">
    <p style="font-family:Oswald, Arial, sans-serif; font-size:26px; font-weight:600; letter-spacing:5px; text-transform:uppercase; color:#a3e635">The proof · College coaches are here</p>
    <h2 style="font-family:Oswald, Arial, sans-serif; font-size:68px; font-weight:600; line-height:1.05; color:#f2f5f8">Coaches recruit on verified results. That is why they are here.</h2>
    <p style="font-family:'Public Sans', Verdana, sans-serif; font-size:30px; line-height:1.35; color:#a8b3c5">122 verified college coaches · 241 wrestlers already opened by one, 28 of them girls</p>
  </div>
  <div style="display:flex; flex-direction:row; gap:24px; align-items:center">
    <p style="width:190px; font-family:Oswald, Arial, sans-serif; font-size:28px; font-weight:600; letter-spacing:3px; text-transform:uppercase; color:#a3e635">Division I</p>
    <div style="display:flex; flex-direction:row; flex-wrap:wrap; gap:10px; flex:1">
      <img src="/deck/1e3960c4fcd84d47b1cd86840c7c5ce6.png" alt="Appalachian State" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/dd5aaa9143efd01355e521ec352fe48d.png" alt="Arizona State" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/ac6bc1bb0dd256b716cac3713ba9b91c.png" alt="Campbell" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/b268fc0a8c66222a1738b1bbd2a9cdd5.png" alt="Franklin &amp; Marshall" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/e77c268be7bfd5c41ea636b2614787e4.png" alt="Gardner-Webb" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/f4a9ee9d1a327e8a54a61cfa0e217ae8.png" alt="Harvard" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/c328d17608467db27c1c3eacff7da462.png" alt="Hofstra" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/fa637f9b1992aa39cacc94b63cf81da7.png" alt="Mercyhurst" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/3ab5243d3f8e0f57f9bf288a755466c1.png" alt="Morgan State" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/110027a57664aa9ba5ab199984ed72d0.png" alt="NC State" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/0db6895055356545ad08caf6c0d48026.png" alt="Ohio University" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/d7328d1298bfabe4ec9bd0380fe3d125.png" alt="Purdue" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/7761bb8be21c885d7c51467fe9bde8fe.png" alt="UNC Chapel Hill" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/75432e32a0524d354e99fff6107ae7db.png" alt="Penn" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/f452a3c1bcf5143762cc7c9a9bcee669.png" alt="Chattanooga" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/93401b02af29c77ee1f9523a96e1709a.png" alt="University of Virginia" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
    </div>
  </div>
  <div style="display:flex; flex-direction:row; gap:24px; align-items:center">
    <p style="width:190px; font-family:Oswald, Arial, sans-serif; font-size:28px; font-weight:600; letter-spacing:3px; text-transform:uppercase; color:#a3e635">Division II</p>
    <div style="display:flex; flex-direction:row; flex-wrap:wrap; gap:10px; flex:1">
      <img src="/deck/49eb909500ec7ae161ddd15df5b0bf38.png" alt="Allen University" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/eac55d3c199cb11c00212b4e64f22d9b.png" alt="Belmont Abbey" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/663a12ecc085c8396ba5c727c4859272.png" alt="Coker" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/297ccf1183b1f08ac1b85a4d5c560464.png" alt="Concord" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/f38fd38fe60b648d6054f08f97a2aa07.png" alt="D’Youville" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/34831b81f3377963139a6e0db9e8ad8c.png" alt="Emory &amp; Henry" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/b90d5e5506b538544ed2848174371972.png" alt="Ferrum" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/6d4c9e6d286b00cc4865e3cd9b2fb073.png" alt="Glenville State" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/9643cb74f9572972b48e29490d1141af.png" alt="Lander" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/ce65e478155b1a8ef2f4d8708c08b3fd.png" alt="McKendree" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/4425087ad9cc635a72c246753c55a40a.png" alt="Newberry" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/85786e876e1befbd0aeaf454e97ac65c.png" alt="Mount Olive" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/3a519630a403467a0e4e6db568d9692f.png" alt="UNC Pembroke" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/d55fa9148501bae96d12123c680dd1a6.png" alt="West Liberty" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
    </div>
  </div>
  <div style="display:flex; flex-direction:row; gap:24px; align-items:center">
    <p style="width:190px; font-family:Oswald, Arial, sans-serif; font-size:28px; font-weight:600; letter-spacing:3px; text-transform:uppercase; color:#a3e635">Division III</p>
    <div style="display:flex; flex-direction:row; flex-wrap:wrap; gap:10px; flex:1">
      <img src="/deck/9db5d96e7e4c05a1ca6bc1929e9261f6.png" alt="Augustana College" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/2550fc4e763770cf06a086baf354cf33.png" alt="Albright" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/fcd922e2162eba70ff05183cce23b4c8.png" alt="Arcadia" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/ce4c250ad38a7e6cd30c6164f0286752.png" alt="Averett" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/45415ed9167dfa3d98fbad5cf40f06c7.png" alt="Centenary" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/4f91512a0f8869e82950474bf071cad8.png" alt="Cornell College" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/5874a09a7d8709ae4ab6753d829896ef.png" alt="Delaware Valley" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/a4e32a53f0c2296e41fd80736c300b07.png" alt="Eureka" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/311b8d0dde388124eff3cc1a4cd5bde3.png" alt="Greensboro College" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/87575611d3b5c17629c308c10ac36afa.png" alt="Hunter College" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/443da3587383ce09f40d45c6b7374038.png" alt="Illinois Wesleyan" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/37dc5eda52920740fa05856fb89b92c4.png" alt="John Carroll" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/240a47aecb5e04354bd741bc3f7be4c3.png" alt="Johns Hopkins" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/d9e7b0cc73d7f8cd16bbf688ca320b9b.png" alt="Johnson &amp; Wales" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/b68366d79320c13318465403440dadec.png" alt="Lakeland" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/c9fe8273f553b338b22c506775ca5643.png" alt="Marymount" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/4045c4d60c162eb993d2b07ae1d7c432.png" alt="McDaniel" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/ec18960daf7772af1c2fa40cdc9f6fb9.png" alt="Muhlenberg" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/ef26adc764a4ad85b7a47089aa534a08.png" alt="Nebraska Wesleyan" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/1a175f403e9a8fa54cb6f4d5fdad766e.png" alt="Pacific University" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/56ec8124d340812701254f37e50ee663.png" alt="Randolph" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/7505cac6f0dcc9e2546e870982567c16.png" alt="Roanoke" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/0f2c1f723340f250b1024598aa97d266.png" alt="RIT" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/eac6b84bbc675fd0ec91bac4e8c2bf8e.png" alt="SUNY Oswego" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/637ca78263bf81ac79567488f85133c1.png" alt="Saint Vincent" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/abe562f9b892f73fa27f651fa8d9e60a.png" alt="Schreiner" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/32e0f99a52ff8550dc81f9b3507cbe81.png" alt="Shenandoah" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/44188895d0b4af02f0a401e8847d5987.png" alt="Lynchburg" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/a626a8bfb569b5185a6514c1b1b1b7fa.png" alt="Mount Union" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/b20073ff6eea94c48a49a51bd5e42044.png" alt="Wisconsin-Oshkosh" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/32c88a55a5d343c0c2ce7c2f224bb1ef.png" alt="Wisconsin-Stevens Point" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/34fee0262839660b1281822ac94ae157.png" alt="Washington &amp; Jefferson" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/3c998bf139310b89f156d6338bf96b33.png" alt="Washington and Lee" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/7e8d0dbe3c4bdeea8121034ee327a7b0.png" alt="Waynesburg" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/e4c484e761ccf3509322d384aedf526c.png" alt="Wesleyan" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/12fef2b6429f5925803c4e3de6c3a210.png" alt="Wilkes" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/d7a01b97c09ddd05001faa1b3c6001c9.png" alt="Williams" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/0a021b1b494c8b5fb73683ffdc985539.png" alt="WPI" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
    </div>
  </div>
  <div style="display:flex; flex-direction:row; gap:24px; align-items:center">
    <p style="width:190px; font-family:Oswald, Arial, sans-serif; font-size:28px; font-weight:600; letter-spacing:3px; text-transform:uppercase; color:#a3e635">NAIA</p>
    <div style="display:flex; flex-direction:row; flex-wrap:wrap; gap:10px; flex:1">
      <img src="/deck/4ec80ac996c9b973f6ad933c136abf7c.png" alt="Andrew College" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/dd11cd07aecdac21e987f20c88a68d17.png" alt="Brewton-Parker" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/e1dfdba98e7a485ae3ee2bf5855035ff.png" alt="Georgetown College" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/f0d901aef27e36e7b2ee088cb3bdc58d.png" alt="Montreat" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/7fad21c3e8415db5ca4d4ebefc868e87.png" alt="Cumberlands" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/04c13b2cab18b77b1dc2043e5a806fc9.png" alt="WVU Tech" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
    </div>
  </div>
  <div style="display:flex; flex-direction:row; gap:24px; align-items:center">
    <p style="width:190px; font-family:Oswald, Arial, sans-serif; font-size:28px; font-weight:600; letter-spacing:3px; text-transform:uppercase; color:#a3e635">Juco</p>
    <div style="display:flex; flex-direction:row; flex-wrap:wrap; gap:10px; flex:1">
      <img src="/deck/ca99ca2c017e0d21fdf3e538d83ba7f2.png" alt="Hawkeye" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/b9c28999bc37a1d6a7a4327477ef420a.png" alt="Iowa Lakes" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/bf0b3758dd418456038f38a25963c5e0.png" alt="North Idaho" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/fb65a257664e21dfa12372ae10425e4a.png" alt="Southwestern Oregon" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
      <img src="/deck/34de118ea78c6b713257ffe213329b96.png" alt="Umpqua" style="width:66px; height:66px; background:#ffffff; border-radius:8px; object-fit:contain">
    </div>
  </div>
  <p style="position:absolute; bottom:64px; left:128px; width:1664px; line-height:1.3; font-family:'Public Sans', Verdana, sans-serif; font-size:26px; color:#7e8ca3">The programs whose coaches hold a verified account, 4 November 2026. Free for every college coach, men’s and women’s, every division. Nobody can pay to rank higher or be seen first.</p>
  
</section>`,
    notes: `Let the wall do the talking, then say the one line that matters: every one of these is a verified coach account, checked by hand, and it is free to every college coach — men’s and women’s programs, every division, no tier and nothing held back. Point at the junior-college row too — families forget that a juco room is how plenty of wrestlers reach Division I. The 28 girls are real and counted the same way as the boys: coaches have opened 28 girls’ profiles out of the 241. If the room is a girls’ room, lead with that number. The line about paid placement is the answer to “is this one of those services” — nobody can buy a ranking or a spot in front of a coach, here or anywhere on the platform. Do not put a program count in the words: the logos are the count, and five programs with a verified coach have no logo on file, so any number here would not match what the room can see.`,
  },
  {
    id: "coach-map",
    html: `<section id="coach-map" data-transition="fade" style="background:#0B1426;color:#F2F5F8;font-family:'Public Sans', Verdana, sans-serif;padding:128px 128px 160px;display:flex;flex-direction:column;gap:20px">
<div style="display:flex;flex-direction:column;gap:12px">
<p style="font-family:'Oswald', Arial, sans-serif;font-size:26px;font-weight:600;letter-spacing:5px;text-transform:uppercase;color:#A3E635">The proof · The footprint</p>
<h2 style="font-family:'Oswald', Arial, sans-serif;font-size:72px;font-weight:600;line-height:1.05">Scaling nationally</h2>
</div>
<div style="display:flex;gap:40px;align-items:center">
<img src="/deck/2c19370c0e1fc8912c8ba6ce472b6078.jpg" alt="The college map filtered to the programs whose coaches are on RecruitWrestlers: clusters through the Carolinas, Virginia, Pennsylvania and the Northeast, with programs in Iowa, Wisconsin, Illinois, Arizona, Oregon and Washington" style="width:1100px;height:589px;object-fit:contain;border:1px solid #1E2C48;border-radius:16px;background:#070E1C">
<div style="flex:1;display:flex;flex-direction:column;gap:30px">
<div style="display:flex;flex-direction:column;gap:8px">
<p style="font-family:'Oswald', Arial, sans-serif;font-size:72px;font-weight:700;line-height:1;color:#A3E635">84</p>
<p style="font-size:27px;line-height:1.4;color:#A8B3C5">of the 438 programs on the map have a verified coach on this platform</p>
</div>
<p style="font-size:27px;line-height:1.45;color:#F2F5F8">Every level is represented, from 16 Division I programs down to the junior-college rooms that send wrestlers up.</p>
<p style="font-size:27px;line-height:1.45;color:#A8B3C5">Thickest where wrestling is — the Carolinas, Virginia, Pennsylvania and the Northeast — and reaching Iowa, Wisconsin, Illinois, Arizona, Oregon and Washington.</p>
</div>
</div>
<p style="position:absolute;left:128px;bottom:64px;font-size:26px;color:#7E8CA3">The live college map, filtered to “On RecruitWrestlers”. Any family can open it and filter the same way.</p>

</section>`,
    notes: `This answers the question a parent is too polite to ask: is this just a Carolinas thing. It is not, and the map says so without a word. Do not oversell the west — there are a handful of programs out there, not a wave. The honest line is that the coverage is thickest where the wrestling is, and it is growing state by state.`,
  },
  {
    id: "families",
    html: `<section id="families" data-transition="fade" style="background:#0E1A30;color:#F2F5F8;font-family:'Public Sans', Verdana, sans-serif;padding:128px 128px 160px;display:flex;flex-direction:column;gap:44px">
<div style="display:flex;flex-direction:column;gap:12px">
<p style="font-family:'Oswald', Arial, sans-serif;font-size:26px;font-weight:600;letter-spacing:5px;text-transform:uppercase;color:#A3E635">The proof · The families</p>
<h2 style="font-family:'Oswald', Arial, sans-serif;font-size:76px;font-weight:600;line-height:1.05">349 families have joined since July</h2>
</div>
<div style="display:flex;gap:24px;align-items:flex-start">
<div style="width:1020px;height:560px;display:flex;flex-direction:column;gap:24px;background:#A3E635;padding:46px;border-radius:18px">
<p style="font-size:52px;line-height:1.3;color:#0B1426;font-weight:600">“This platform made a huge difference in Brieon’s development and recruiting, and we are forever grateful.”</p>
<div style="flex:1"></div>
<p style="font-size:30px;font-weight:700;color:#22330A">Brittany Mayfield<br><span style="font-weight:400">Wrestling parent, North Carolina</span></p>
</div>
<div style="display:flex;flex-direction:column;gap:20px">
<div style="width:620px;height:270px;display:flex;flex-direction:column;gap:14px;background:#121F38;padding:32px;border:1px solid #1E2C48;border-radius:18px">
<p style="font-size:27px;line-height:1.4;color:#F2F5F8">“College coaches are on here looking at our kids, and ours are reaping the rewards.”</p>
<div style="flex:1"></div>
<p style="font-size:23px;font-weight:600;color:#A3E635">Gemma Amiott<br>Wrestling parent, North Carolina</p>
</div>
<div style="width:620px;height:270px;display:flex;flex-direction:column;gap:14px;background:#121F38;padding:32px;border:1px solid #1E2C48;border-radius:18px">
<p style="font-size:27px;line-height:1.4;color:#F2F5F8">“Everything these young men have done is on their profile now, where college coaches can see it.”</p>
<div style="flex:1"></div>
<p style="font-size:23px;font-weight:600;color:#A3E635">Emily Thomas<br>Wrestling parent, North Carolina</p>
</div>
</div>
</div>
<p style="position:absolute;left:128px;bottom:64px;font-size:26px;color:#7E8CA3">Parent and wrestler accounts, 124 of them in September · messages from wrestling parents, 4 November 2026</p>

</section>`,
    notes: `349 is parent and wrestler accounts created since 1 July, not coaches and not staff — say “signed up” if anyone asks what joining means. Read Brittany’s out loud and stop. She names the platform, she names recruiting, and her son is the wrestler on slides 4 and 6 — the one twenty-two college programs have opened. Say that: the quote and the proof are the same family.`,
  },
  {
    id: "price",
    html: `<section id="price" data-transition="fade" style="background:#0B1426;color:#F2F5F8;font-family:'Public Sans', Verdana, sans-serif;padding:128px 128px 160px;display:flex;flex-direction:column;gap:40px">
<div style="display:flex;flex-direction:column;gap:12px">
<p style="font-family:'Oswald', Arial, sans-serif;font-size:26px;font-weight:600;letter-spacing:5px;text-transform:uppercase;color:#A3E635">What it costs</p>
<h2 style="font-family:'Oswald', Arial, sans-serif;font-size:72px;font-weight:600;line-height:1.05">Being found costs nothing. Start there.</h2>
<p style="font-size:30px;line-height:1.35;color:#C3CCDA">Free to be found. $9.99 to see who is looking. $24.99 to act on it.</p>
</div>
<div style="display:flex;gap:24px;align-items:stretch">
<div style="flex:1;display:flex;flex-direction:column;gap:18px;background:#121F38;padding:40px;border:1px solid #1E2C48;border-radius:18px">
<h3 style="font-family:'Oswald', Arial, sans-serif;font-size:38px;font-weight:600">Free</h3>
<p style="font-family:'Oswald', Arial, sans-serif;font-size:72px;font-weight:700;line-height:1;color:#F2F5F8">$0</p>
<ul style="font-size:27px;line-height:1.45;color:#A8B3C5;padding:0 0 0 32px">
<li>Claim your wrestler’s profile</li>
<li>Results, highlights and academics in one place</li>
<li>College coaches can find and message you</li>
</ul>
<div style="flex:1"></div>
<p style="font-size:22px;line-height:1.35;color:#7E8CA3">Academics and contact details are shown to college coaches only, never on the public profile.</p>
</div>
<div style="flex:1;display:flex;flex-direction:column;gap:18px;background:#121F38;padding:40px;border:1px solid #1E2C48;border-radius:18px">
<h3 style="font-family:'Oswald', Arial, sans-serif;font-size:38px;font-weight:600">Insider</h3>
<p style="font-family:'Oswald', Arial, sans-serif;font-size:72px;font-weight:700;line-height:1;color:#F2F5F8">$9.99<span style="font-size:28px;font-weight:400;color:#7E8CA3"> / month</span></p>
<ul style="font-size:27px;line-height:1.45;color:#A8B3C5;padding:0 0 0 32px">
<li>Which colleges viewed the profile, and when</li>
<li>The rankings college coaches use to recruit</li>
<li>Your wrestler’s rank on the profile</li>
</ul>
</div>
<div style="flex:1.2;display:flex;flex-direction:column;gap:18px;background:#121F38;padding:40px;border:2px solid #A3E635;border-radius:18px">
<div style="display:flex;flex-direction:column;gap:6px">
<p style="font-size:23px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#A3E635">Everything in Insider, plus</p>
<h3 style="font-family:'Oswald', Arial, sans-serif;font-size:38px;font-weight:600">Recruiting Command Center</h3>
</div>
<p style="font-family:'Oswald', Arial, sans-serif;font-size:72px;font-weight:700;line-height:1;color:#A3E635">$24.99<span style="font-size:28px;font-weight:400;color:#7E8CA3"> / month</span></p>
<ul style="font-size:27px;line-height:1.45;color:#A8B3C5;padding:0 0 0 32px">
<li>Your plan, 8th grade to signing</li>
<li>Every college: coaches, cost, roster</li>
<li>Your college list, compare and coach messages</li>
<li>Scout, your recruiting assistant</li>
</ul>
</div>
</div>
<p style="position:absolute;left:128px;bottom:64px;font-size:28px;font-weight:600;color:#F2F5F8">Billed monthly, or yearly and save 20%. Cancel any time. · College coaches are free, men’s and women’s, every division.</p>

</section>`,
    notes: `Lead with free and mean it: the profile is what gets a coach to read your kid, and it costs nothing. Insider is for the parent who wants to know who looked. The Command Center is the family's whole plan, for less than one private lesson a month. Upgrading from Insider cancels it, so nobody pays twice. If a parent asks who can see the academics and the phone number: verified college coaches, and nobody else — it is never on the public page.`,
  },
  {
    id: "close",
    html: `<section id="close" data-transition="fade" style="background:linear-gradient(160deg, #0B1426 0%, #070E1C 100%);color:#F2F5F8;font-family:'Public Sans', Verdana, sans-serif;padding:128px 128px 160px;display:flex;flex-direction:column;justify-content:space-between;gap:40px">
<div style="display:flex;flex-direction:column;gap:20px">
<p style="font-family:'Oswald', Arial, sans-serif;font-size:26px;font-weight:600;letter-spacing:6px;text-transform:uppercase;color:#A3E635">One step, a couple of minutes</p>
<h1 style="font-family:'Oswald', Arial, sans-serif;font-size:112px;font-weight:700;line-height:1.03;width:1600px">Find your wrestler. Claim the profile.</h1>
<p style="font-size:34px;line-height:1.4;color:#A8B3C5;width:1360px">Your wrestler is probably already here, with their results and their opponents. Claiming it takes a couple of minutes and costs nothing. Fill in the rest whenever you like.</p>
</div>
<div style="display:flex;gap:28px;align-items:stretch">
<div style="flex:1;display:flex;gap:30px;align-items:center;background:#A3E635;padding:34px;border-radius:18px">
<div style="flex:1;display:flex;flex-direction:column;gap:12px">
<p style="font-size:24px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#22330A">Start here, free</p>
<p style="font-family:'Oswald', Arial, sans-serif;font-size:48px;font-weight:600;color:#0B1426">RecruitWrestlers.com</p>
<p style="font-size:27px;line-height:1.35;color:#22330A">Search your wrestler’s name, find the profile and claim it. Nothing to pay, nothing to install.</p>
</div>
<div style="display:flex;flex-direction:column;align-items:center;gap:8px">
<img src="/deck/f2d392e9d9e16ac8fddbf34325e9c8d6.jpg" alt="QR code that opens recruitwrestlers.com" style="display:block;width:216px;height:216px;border-radius:10px">
<p style="font-size:20px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#22330A">Point your camera</p>
</div>
</div>
<div style="flex:1;display:flex;flex-direction:column;gap:14px;background:#121F38;padding:34px;border:1px solid #1E2C48;border-radius:18px">
<p style="font-size:29px;line-height:1.45;color:#F2F5F8">“What you led the wrestling community to was a new standard, and that matters. Kids’ lives will change because of what you are doing.”</p>
<div style="flex:1"></div>
<p style="font-size:26px;font-weight:600;color:#A3E635">Chad Richards<br>Wrestling parent, North Carolina</p>
</div>
</div>
<p style="position:absolute;left:128px;bottom:64px;font-size:26px;color:#7E8CA3">Built for wrestling families | recruitwrestlers.com</p>

</section>`,
    notes: `End on the ask, not the gratitude. One sentence: find the profile tonight, claim it, it is free — the claim itself is a couple of minutes, and the rest of the profile can wait. The code on the green card opens the site, so a room on their phones can start before you finish talking. Better still, do it with them on the spot — the claim is the whole conversion, and a parent who claims in the room stays.`,
  },
]

/** The date the hand-set numbers on the fixed slides were true. */
export const DECK_AS_OF = "2026-11-04"
