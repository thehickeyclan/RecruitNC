"use strict";
(() => {
  // lib/questionnaire/fields.ts
  var ANSWER_FIELDS = [
    { key: "firstName", label: "First name", group: "wrestler", source: "profile", core: true, match: [/^(legal )?first( name)?\b/, /^first$/] },
    { key: "middleName", label: "Middle name", group: "wrestler", source: "family", match: [/^middle( name| initial)?/] },
    { key: "lastName", label: "Last name", group: "wrestler", source: "profile", core: true, match: [/^(legal )?last( name)?\b/, /^last$/] },
    { key: "preferredName", label: "Preferred name", group: "wrestler", source: "family", hint: "Only if he or she goes by another name", match: [/preferred name|nickname/] },
    { key: "dob", label: "Date of birth", group: "wrestler", source: "family", input: "date", core: true, match: [/date of birth|birth ?date|^dob\b/] },
    { key: "email", label: "Wrestler's email", group: "wrestler", source: "profile", input: "email", core: true, match: [/^(e-?mail|email address|your e-?mail)$/, /^(athlete|student|recruit)('s)? e-?mail/] },
    { key: "cell", label: "Wrestler's cell", group: "wrestler", source: "profile", input: "tel", core: true, match: [/^(cell|mobile)( phone)?( number| #)?$/, /^(athlete|student)('s)? (cell|phone)/, /^contact number$/, /^(tele)?phone( number)?$/] },
    { key: "street", label: "Street address", group: "home", source: "family", core: true, match: [/^(home )?(street )?address ?(1|line 1)?$/, /^street address$/] },
    { key: "city", label: "City", group: "home", source: "family", core: true, match: [/^(home )?city$/] },
    { key: "state", label: "State", group: "home", source: "family", core: true, match: [/^(home )?state$/] },
    { key: "zip", label: "ZIP code", group: "home", source: "family", core: true, match: [/^(home )?(zip|postal)( code)?( \/ postal)?$/] },
    { key: "parent1Name", label: "Parent 1 name", group: "parents", source: "family", core: true, match: [/parent.*(1|one|#1).*name|^(mother|father|parent|guardian)('s)? name$/] },
    { key: "parent1Relation", label: "Parent 1 relationship", group: "parents", source: "family", hint: "Mother, Father, Guardian", match: [/^relationship$/] },
    { key: "parent1Phone", label: "Parent 1 phone", group: "parents", source: "family", input: "tel", core: true, match: [/parent.*(1|one|#1).*(phone|cell)/] },
    { key: "parent1Email", label: "Parent 1 email", group: "parents", source: "family", input: "email", core: true, match: [/parent.*(1|one|#1).*e-?mail/] },
    { key: "parent2Name", label: "Parent 2 name", group: "parents", source: "family", match: [/parent.*(2|two|#2).*name/] },
    { key: "parent2Phone", label: "Parent 2 phone", group: "parents", source: "family", input: "tel", match: [/parent.*(2|two|#2).*(phone|cell)/] },
    { key: "parent2Email", label: "Parent 2 email", group: "parents", source: "family", input: "email", match: [/parent.*(2|two|#2).*e-?mail/] },
    { key: "highSchool", label: "High school", group: "school", source: "profile", core: true, match: [/^(high school|school name|high school( name| information)|current school)$/] },
    { key: "gradYear", label: "Graduation year", group: "school", source: "profile", core: true, match: [/grad(uation)? year|class of|hs graduation/] },
    { key: "gpa", label: "GPA", group: "school", source: "profile", core: true, hint: "As on the transcript, e.g. 3.8 unweighted", match: [/^(?!college).*(\bgpa\b|grade.?point average)/] },
    { key: "sat", label: "SAT total", group: "school", source: "profile", match: [/^sat( total| score| composite)?( \(.*\))?$/] },
    { key: "act", label: "ACT", group: "school", source: "profile", match: [/^act( composite| score)?( \(.*\))?$/] },
    { key: "classRank", label: "Class rank", group: "school", source: "family", hint: "e.g. 24 of 410, if the school ranks", match: [/class rank/] },
    { key: "major", label: "Intended major", group: "school", source: "profile", match: [/^(?!graduate).*(major|academic interest|field of study)/] },
    { key: "academicHonors", label: "Academic honors", group: "school", source: "family", match: [/academic honou?rs|academic awards/] },
    { key: "ncaaId", label: "NCAA Eligibility Center ID", group: "school", source: "family", hint: "10 digits, from the NCAA Eligibility Center", match: [/ncaa.*(id|number)|eligibility center/] },
    { key: "heightFt", label: "Height (feet)", group: "wrestling", source: "family", core: true, match: [/^feet$/] },
    { key: "heightIn", label: "Height (inches)", group: "wrestling", source: "family", core: true, match: [/^inch(es)?$/] },
    { key: "weight", label: "Weight", group: "wrestling", source: "profile", core: true, hint: "Filled from where he or she last competed", match: [/^(current )?weight( class)?$/] },
    { key: "club", label: "Club", group: "wrestling", source: "profile", match: [/^(name of )?club( team)?$/, /^current team/] },
    { key: "record", label: "Career record", group: "wrestling", source: "profile", match: [/career record|^record$|^career statistics/] },
    { key: "accolades", label: "Results and honors", group: "wrestling", source: "profile", match: [/accomplishment|accolade|athletic honou?rs|awards/] },
    { key: "video", label: "Highlight video", group: "wrestling", source: "profile", input: "url", match: [/video|highlight|film/] },
    { key: "profileUrl", label: "Recruiting profile", group: "wrestling", source: "profile", input: "url", match: [/recruiting (website|profile)|profile link|website/] },
    { key: "hsCoachName", label: "High school coach", group: "coaches", source: "family", core: true, match: [/high school coach('s)?( name)?$/, /^hs coach( name)?$/, /^(head )?coach('s)? name$/] },
    { key: "hsCoachPhone", label: "High school coach phone", group: "coaches", source: "family", input: "tel", match: [/high school coach.*phone/, /^(head )?coach('s)? phone/] },
    { key: "hsCoachEmail", label: "High school coach email", group: "coaches", source: "family", input: "email", match: [/high school coach.*e-?mail/, /^(head )?coach('s)? e-?mail/] },
    { key: "clubCoachName", label: "Club coach", group: "coaches", source: "family", match: [/club (team )?coach('s)?( name)?$/] },
    { key: "clubCoachPhone", label: "Club coach phone", group: "coaches", source: "family", input: "tel", match: [/club (team )?coach.*phone/] },
    { key: "clubCoachEmail", label: "Club coach email", group: "coaches", source: "family", input: "email", match: [/club (team )?coach.*e-?mail/] }
  ];
  var FIELD_BY_KEY = new Map(ANSWER_FIELDS.map((f) => [f.key, f]));
  function normalizeLabel(label) {
    return label.toLowerCase().replace(/[’`]/g, "'").replace(/\*/g, " ").replace(/[:?]+/g, " ").replace(/\s+/g, " ").trim();
  }
  function fieldForLabel(label) {
    const l = normalizeLabel(label);
    if (!l) return null;
    for (const f of ANSWER_FIELDS) if (f.match.some((re) => re.test(l))) return f;
    return null;
  }

  // extension/src/fill.ts
  var FILLED = "data-ncu-filled";
  var OK = "0 0 0 2px #22c55e";
  var TODO = "0 0 0 2px #f59e0b";
  var STATES = {
    AL: "Alabama",
    AK: "Alaska",
    AZ: "Arizona",
    AR: "Arkansas",
    CA: "California",
    CO: "Colorado",
    CT: "Connecticut",
    DE: "Delaware",
    DC: "District of Columbia",
    FL: "Florida",
    GA: "Georgia",
    HI: "Hawaii",
    ID: "Idaho",
    IL: "Illinois",
    IN: "Indiana",
    IA: "Iowa",
    KS: "Kansas",
    KY: "Kentucky",
    LA: "Louisiana",
    ME: "Maine",
    MD: "Maryland",
    MA: "Massachusetts",
    MI: "Michigan",
    MN: "Minnesota",
    MS: "Mississippi",
    MO: "Missouri",
    MT: "Montana",
    NE: "Nebraska",
    NV: "Nevada",
    NH: "New Hampshire",
    NJ: "New Jersey",
    NM: "New Mexico",
    NY: "New York",
    NC: "North Carolina",
    ND: "North Dakota",
    OH: "Ohio",
    OK: "Oklahoma",
    OR: "Oregon",
    PA: "Pennsylvania",
    RI: "Rhode Island",
    SC: "South Carolina",
    SD: "South Dakota",
    TN: "Tennessee",
    TX: "Texas",
    UT: "Utah",
    VT: "Vermont",
    VA: "Virginia",
    WA: "Washington",
    WV: "West Virginia",
    WI: "Wisconsin",
    WY: "Wyoming"
  };
  var MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  var visible = (el) => {
    const r = el.getClientRects();
    return r.length > 0 && getComputedStyle(el).visibility !== "hidden";
  };
  function ownText(node) {
    const clone = node.cloneNode(true);
    clone.querySelectorAll("select, option, input, textarea, script, style").forEach((n) => n.remove());
    return (clone.textContent ?? "").replace(/\s+/g, " ").trim();
  }
  function labelOf(el) {
    const twinOf = el.id?.endsWith("_dateInput_text") ? document.getElementById(el.id.replace(/_dateInput_text$/, "")) : null;
    if (twinOf && twinOf !== el) return labelOf(twinOf);
    const explicit = el.labels?.[0] ? ownText(el.labels[0]) : "";
    if (explicit) return explicit;
    const aria = el.getAttribute("aria-label") || (el.getAttribute("aria-labelledby") ?? "").split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ").trim();
    if (aria) return aria;
    const wrap = el.closest("label");
    if (wrap && ownText(wrap)) return ownText(wrap);
    const td = el.closest("td");
    if (td?.previousElementSibling && ownText(td.previousElementSibling)) return ownText(td.previousElementSibling);
    let node = el;
    for (let i = 0; i < 4 && node; i++) {
      let prev = node.previousElementSibling;
      while (prev) {
        const t = ownText(prev);
        if (t && t.length < 80) return t;
        prev = prev.previousElementSibling;
      }
      node = node.parentElement;
      if (node && node.querySelectorAll("input, select, textarea").length > 3) break;
    }
    return el.placeholder || "";
  }
  function setValue(el, value) {
    if (el.value === value) return;
    const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, value);
    for (const type of ["input", "change", "blur"]) el.dispatchEvent(new Event(type, { bubbles: true }));
  }
  function pickOption(select, wanted) {
    const want = wanted.map((w2) => w2.toLowerCase().trim()).filter(Boolean);
    const opt = [...select.options].find((o) => want.includes(o.text.toLowerCase().trim()) || want.includes(o.value.toLowerCase().trim()));
    if (!opt) return false;
    setValue(select, opt.value);
    return true;
  }
  var isEmpty = (el) => el instanceof HTMLSelectElement ? el.selectedIndex <= 0 || Boolean(el.options[el.selectedIndex]?.defaultSelected) || // Front Rush's inches box loads on "0" right after "Select", set by the page, not the family.
  el.selectedIndex === 1 && el.options[1].text.trim() === "0" : !el.value.trim();
  var isMonthList = (s) => [...s.options].some((o) => /^jan/i.test(o.text.trim()));
  var isDayList = (s) => [...s.options].some((o) => o.text.trim() === "31") && ![...s.options].some((o) => /^(19|20)\d\d$/.test(o.text.trim()));
  var isYearList = (s) => [...s.options].some((o) => /^(19|20)\d\d$/.test(o.text.trim()));
  function inSchoolBlock(el) {
    let node = el.parentElement;
    for (let i = 0; i < 5 && node; i++, node = node.parentElement) {
      const boxes = node.querySelectorAll("input, select");
      if (boxes.length > 12) return false;
      if ([...boxes].some((b) => b !== el && /school name|^hs |high school$/i.test(labelOf(b)))) return true;
    }
    return false;
  }
  function sectionOf(el) {
    let node = el;
    for (let i = 0; i < 9 && node; i++, node = node.parentElement) {
      let prev = node.previousElementSibling;
      for (let c = 0; c < 4 && prev; c++, prev = prev.previousElementSibling) {
        if (prev.querySelector("input, select, textarea")) continue;
        const t = (prev.innerText ?? ownText(prev)).split("\n")[0].trim().slice(0, 120);
        if (t && i >= 2) return t;
      }
    }
    return "";
  }
  var PARENT_SECTION = /parent|guardian|emergency|personal contacts|family contact/i;
  function parentValue(key, answers, label) {
    const [first, ...rest] = (answers.parent1Name ?? "").split(/\s+/);
    if (key === "firstName") return first || void 0;
    if (key === "lastName") return rest.join(" ") || void 0;
    if (key === "email") return answers.parent1Email;
    if (key === "cell") return answers.parent1Phone;
    if (key === "parent1Relation") return answers.parent1Relation;
    if (/^(main|home|phone|primary)( phone)?( #| number)?$/.test(normalizeLabel(label))) return answers.parent1Phone;
    return void 0;
  }
  function nearPassword(el) {
    let node = el.parentElement;
    for (let i = 0; i < 6 && node; i++, node = node.parentElement) {
      if (node.querySelectorAll("input, select, textarea").length > 8) return false;
      if ([...node.querySelectorAll("input[type=password]")].some(visible)) return true;
    }
    return false;
  }
  function fillPage(answers, root = document, hooks2 = {}) {
    const boxes = [...root.querySelectorAll("input, select, textarea")].filter(
      (el) => !["hidden", "password", "submit", "button", "image", "file", "reset", "checkbox"].includes(el.type) && visible(el)
    );
    let filled = 0;
    const needYou = [];
    const unmatched = [];
    const dob = answers.dob ? answers.dob.split("-") : null;
    const seenRadio = /* @__PURE__ */ new Set();
    for (const el of boxes) {
      if (nearPassword(el)) continue;
      const label = labelOf(el);
      const norm = normalizeLabel(label);
      if (el instanceof HTMLInputElement && el.type === "radio") {
        if (seenRadio.has(el.name)) continue;
        seenRadio.add(el.name);
        const group = [...root.querySelectorAll(`input[type=radio][name="${CSS.escape(el.name)}"]`)];
        const groupText = `${el.name} ${group.map((g) => labelOf(g)).join(" ")}`.toLowerCase();
        if (/opt.?in|ncsa|img academy|maximize my recruiting|hearing more/.test(groupText) && !group.some((g) => g.checked)) {
          const no = group.find((g) => /^no\b|no thanks/i.test(labelOf(g).trim()));
          if (no) {
            no.click();
            filled++;
          }
        }
        continue;
      }
      if (!isEmpty(el) && !el.hasAttribute(FILLED)) continue;
      let ok = false;
      if (el instanceof HTMLSelectElement && dob && /birth|^day$|^month$|^year$/.test(norm)) {
        if (isMonthList(el)) ok = pickOption(el, [MONTHS[Number(dob[1]) - 1], dob[1], String(Number(dob[1])), new Date(Number(dob[0]), Number(dob[1]) - 1, 1).toLocaleString("en-US", { month: "long" })]);
        else if (isDayList(el)) ok = pickOption(el, [dob[2], String(Number(dob[2]))]);
        else if (isYearList(el) && /birth|year/.test(norm) && !/grad/.test(norm)) ok = pickOption(el, [dob[0]]);
      } else if (/^((full|your|athlete'?s?|student'?s?|prospect'?s?) )?name$/.test(norm)) {
        const full = [answers.firstName, answers.lastName].filter(Boolean).join(" ");
        if (full && !(el instanceof HTMLSelectElement)) setValue(el, full), ok = true;
      } else if (/^parents'? names?$|^parent\/guardian names?$/.test(norm)) {
        const both = [answers.parent1Name, answers.parent2Name].filter(Boolean).join(" and ");
        if (both && !(el instanceof HTMLSelectElement)) setValue(el, both), ok = true;
      } else if (el instanceof HTMLSelectElement && /sport/.test(norm) && [...el.options].some((o) => /wrestling/i.test(o.text))) {
        const opts = [...el.options].filter((o) => /wrestling/i.test(o.text));
        const pick = opts.find((o) => (answers.side === "womens" ? /women/i : /^(?!.*women).*/i).test(o.text)) ?? opts[0];
        if (el.multiple) {
          pick.selected = true;
          for (const type of ["input", "change"]) el.dispatchEvent(new Event(type, { bubbles: true }));
        } else setValue(el, pick.value);
        ok = true;
      } else if (/^height$/.test(norm) && answers.heightFt) {
        const ft = answers.heightFt;
        const inch = answers.heightIn ?? "0";
        ok = el instanceof HTMLSelectElement ? pickOption(el, [`${ft}'${inch}"`, `${ft}' ${inch}"`, `${ft}-${inch}`, `${ft}'${inch}`]) : (setValue(el, `${ft}'${inch}"`), true);
      } else {
        const inParentBlock = PARENT_SECTION.test(sectionOf(el));
        const field = fieldForLabel(label);
        if (inParentBlock && (!field || ["firstName", "lastName", "email", "cell", "parent1Relation"].includes(field.key))) {
          const value2 = parentValue(field?.key ?? "", answers, label);
          if (value2 && !(el instanceof HTMLSelectElement)) {
            setValue(el, value2);
            el.setAttribute(FILLED, "1");
            el.style.boxShadow = OK;
            filled++;
          }
          continue;
        }
        if (!field) {
          if (label && isEmpty(el)) unmatched.push(label);
          continue;
        }
        if (["street", "city", "state", "zip"].includes(field.key) && inSchoolBlock(el)) continue;
        let value = answers[field.key];
        if (!value) {
          if (field.core) needYou.push(field.label);
          continue;
        }
        if (field.key === "dob" && el instanceof HTMLInputElement && el.type !== "date") {
          value = `${dob[1]}/${dob[2]}/${dob[0]}`;
          if (el.id.endsWith("_dateInput_text")) {
            setValue(el, value);
            hooks2.setDate?.(el.id.replace(/_dateInput_text$/, ""), answers.dob);
            el.setAttribute(FILLED, "1");
            el.style.boxShadow = OK;
            filled++;
            continue;
          }
        }
        if (el instanceof HTMLSelectElement) {
          const extra = field.key === "state" ? [STATES[value.toUpperCase()] ?? "", Object.keys(STATES).find((k) => STATES[k].toLowerCase() === value.toLowerCase()) ?? ""] : [];
          ok = pickOption(el, [value, ...extra]);
        } else {
          setValue(el, value);
          ok = true;
        }
      }
      if (ok) {
        el.setAttribute(FILLED, "1");
        el.style.boxShadow = OK;
        filled++;
      } else if (el.required) {
        el.style.boxShadow = TODO;
      }
    }
    for (const el of boxes) {
      if (el.required && isEmpty(el) && el.type !== "radio") el.style.boxShadow = TODO;
    }
    return { filled, needYou: [...new Set(needYou)], unmatched: [...new Set(unmatched)].slice(0, 15) };
  }
  function looksSubmitted(text) {
    return /thank you for (your|submitting|completing|filling)|thanks for (your|submitting)|successfully (submitted|received|saved)|has been (submitted|received)|submission (was |has been )?(received|complete)|we('ve| have) received your|questionnaire (is )?complete/i.test(text);
  }
  function schoolForUrl(href, forms) {
    const here = decodeURIComponent(href).toLowerCase();
    for (const f of forms) {
      for (const u of f.urls) {
        try {
          const url = new URL(u);
          const tokens = [url.pathname.split("/").filter(Boolean).pop() ?? "", ...[...url.searchParams.values()]].map((t) => decodeURIComponent(t).toLowerCase()).filter((t) => t.length >= 2 && !/^(recruit|questionnaire\.aspx|playersubmit\.aspx|sb_output\.aspx|index|form)$/.test(t));
          const sameHost = here.includes(url.hostname.replace(/^www\./, "").toLowerCase());
          if (tokens.length && tokens.every((t) => here.includes(t)) && (sameHost || tokens.some((t) => t.length >= 8))) return f.schoolId;
        } catch {
        }
      }
    }
    return null;
  }

  // extension/src/content.ts
  var w = window;
  var PENDING_MS = 20 * 60 * 1e3;
  var send = (msg) => new Promise((resolve) => chrome.runtime.sendMessage(msg, resolve));
  if (!w.__ncuHelper) {
    w.__ncuHelper = true;
    void start();
  }
  function injectPageHelper() {
    if (!/(^|\.)frontrush\.com$/.test(location.hostname) || document.getElementById("ncu-page-helper")) return;
    const script = document.createElement("script");
    script.id = "ncu-page-helper";
    script.src = chrome.runtime.getURL("dist/page.js");
    document.documentElement.appendChild(script);
  }
  var hooks = { setDate: (id, iso) => window.postMessage({ ncu: "set-date", id, iso }, location.origin) };
  async function start() {
    const looksLikeForm = () => document.querySelectorAll("input:not([type=hidden]), select, textarea").length >= 3;
    if (/recruitwrestlers\.com|ncwrestlingunited\.com|localhost/.test(location.hostname)) {
      document.addEventListener("click", (e) => {
        const a = e.target.closest?.("a[data-ncu-form]");
        if (a) void chrome.storage.local.set({ lastOpened: { schoolId: a.dataset.ncuForm, at: Date.now() } });
      });
      return;
    }
    const data = await send({ type: "load" });
    const forms = data?.forms ?? [];
    const { lastOpened } = await chrome.storage.local.get("lastOpened");
    const schoolId = schoolForUrl(location.href, forms) ?? (lastOpened && Date.now() - lastOpened.at < PENDING_MS ? lastOpened.schoolId : null);
    const form = forms.find((f) => f.schoolId === schoolId) ?? null;
    await checkSubmitted();
    new MutationObserver(() => void checkSubmitted()).observe(document.body, { childList: true, subtree: true, characterData: true });
    const { forceOpen } = await chrome.storage.local.get("forceOpen");
    void chrome.storage.local.remove("forceOpen");
    if (!forceOpen && !looksLikeForm()) {
      await new Promise((resolve) => {
        const watch = new MutationObserver(() => {
          if (!looksLikeForm()) return;
          watch.disconnect();
          resolve();
        });
        watch.observe(document.body, { childList: true, subtree: true });
      });
    }
    injectPageHelper();
    panel(data, form);
    async function checkSubmitted() {
      const { pending } = await chrome.storage.local.get("pending");
      if (!pending || pending.origin !== location.origin || Date.now() - pending.at > PENDING_MS) return;
      if (!looksSubmitted(document.body.innerText)) return;
      await chrome.storage.local.remove("pending");
      const res = await send({ type: "markDone", schoolId: pending.schoolId });
      toast(res?.ok ? `Marked submitted on your list: ${pending.name}, ${(/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : `Submitted. Tap "Submitted" for ${pending.name} on your Interest forms page.`);
    }
  }
  function panel(data, form) {
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147483647";
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = `
    <style>
      .box{font:14px/1.4 -apple-system,system-ui,sans-serif;background:#0B1426;color:#fff;border:1px solid #A3E635;border-radius:14px;padding:12px 14px;width:280px;box-shadow:0 10px 30px rgba(0,0,0,.35)}
      .top{display:flex;justify-content:space-between;align-items:center;font-weight:800;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#A3E635}
      .x{background:none;border:0;color:#fff9;font-size:18px;cursor:pointer}
      p{margin:6px 0 0;color:#ffffffc0;font-size:13px}
      button.go{margin-top:10px;width:100%;background:#A3E635;color:#0A1628;border:0;border-radius:9px;padding:9px;font-weight:900;font-size:14px;cursor:pointer}
      select{margin-top:8px;width:100%;padding:6px;border-radius:8px}
      a{color:#A3E635}
      .warn{color:#fcd34d}
      .left{color:#ffffff99;font-size:12px}
    </style>
    <div class="box"><div class="top"><span>RecruitWrestlers</span><button class="x" aria-label="Close">\xD7</button></div><div class="body"></div></div>`;
    root.querySelector(".x").addEventListener("click", () => host.remove());
    const body = root.querySelector(".body");
    document.documentElement.appendChild(host);
    if (!data?.signedIn) {
      body.innerHTML = `<p>Sign in to RecruitWrestlers to fill this form with your answers.</p><button class="go">Sign in</button>`;
      body.querySelector("button").addEventListener("click", () => void send({ type: "open", path: "/auth/signin?returnTo=/my-recruiting/questionnaires" }));
      return;
    }
    if (!data.access || !data.wrestlers?.length) {
      body.innerHTML = `<p>Interest forms are part of the Recruiting Command Center.</p>`;
      return;
    }
    const wrestlers = data.wrestlers;
    let who = wrestlers[0];
    body.innerHTML = `
    <p>${form ? `<b>${escape(form.name)}</b>${form.done ? " \xB7 already marked submitted" : ""}` : "College form"}</p>
    ${wrestlers.length > 1 ? `<select>${wrestlers.map((x) => `<option value="${x.id}">${escape(x.firstName)}</option>`).join("")}</select>` : ""}
    <button class="go">Fill ${escape(who.firstName)}'s answers</button>
    <p class="out"></p>`;
    const go = body.querySelector("button.go");
    body.querySelector("select")?.addEventListener("change", (e) => {
      who = wrestlers.find((x) => x.id === e.target.value) ?? who;
      go.textContent = `Fill ${who.firstName}'s answers`;
    });
    const out = body.querySelector(".out");
    const run = () => {
      const r = fillPage({ ...who.answers, side: who.side }, document, hooks);
      out.innerHTML = `Filled ${r.filled} box${r.filled === 1 ? "" : "es"} (green). Check them, finish any in amber, then press <b>Submit</b> on this page.` + (r.needYou.length ? `<br><span class="warn">Not in your answers yet: ${escape(r.needYou.join(", "))}. <a href="#" class="edit">Add them</a></span>` : "") + (r.unmatched.length ? `<br><span class="left">Left for you: ${escape(r.unmatched.join(", "))}</span>` : "");
      out.querySelector(".edit")?.addEventListener("click", (e) => {
        e.preventDefault();
        void send({ type: "open", path: "/my-recruiting/questionnaires" });
      });
      return r;
    };
    go.addEventListener("click", () => {
      run();
      setTimeout(run, 700);
      go.textContent = "Fill again";
      let t;
      new MutationObserver(() => {
        clearTimeout(t);
        t = setTimeout(() => fillPage({ ...who.answers, side: who.side }, document, hooks), 400);
      }).observe(document.body, { childList: true, subtree: true });
      watchSubmit(form);
    });
  }
  function watchSubmit(form) {
    if (!form) return;
    const mark = () => void chrome.storage.local.set({ pending: { schoolId: form.schoolId, name: form.name, origin: location.origin, at: Date.now() } });
    document.addEventListener("submit", mark, true);
    document.addEventListener(
      "click",
      (e) => {
        const b = e.target.closest?.("button, input[type=submit], input[type=button], a");
        const text = (b?.innerText || b?.value || "").trim();
        if (b && /^(submit|send|finish|complete|done|submit (form|questionnaire))\b/i.test(text)) mark();
      },
      true
    );
  }
  function toast(text) {
    const el = document.createElement("div");
    el.textContent = text;
    el.style.cssText = "position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:2147483647;background:#0B1426;color:#fff;border:1px solid #22c55e;border-radius:12px;padding:10px 16px;font:600 14px -apple-system,system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35)";
    document.documentElement.appendChild(el);
    setTimeout(() => el.remove(), 8e3);
  }
  function escape(s) {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }
})();
