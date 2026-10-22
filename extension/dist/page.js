"use strict";
(() => {
  // extension/src/page.ts
  window.addEventListener("message", (e) => {
    if (e.source !== window || !e.data || e.data.ncu !== "set-date") return;
    const { id, iso } = e.data;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m || typeof $find !== "function") return;
    $find(id)?.set_selectedDate?.(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  });
})();
