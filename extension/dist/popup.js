"use strict";
(() => {
  // extension/src/popup.ts
  var list = document.getElementById("list");
  var statusEl = document.getElementById("status");
  var fill = document.getElementById("fill");
  var send = (msg) => new Promise((resolve) => chrome.runtime.sendMessage(msg, resolve));
  void (async () => {
    const data = await send({ type: "load", fresh: true });
    if (!data?.signedIn) {
      statusEl.innerHTML = `Not signed in. <a href="#" id="signin">Sign in to RecruitWrestlers</a>`;
      document.getElementById("signin").addEventListener("click", () => void send({ type: "open", path: "/auth/signin?returnTo=/my-recruiting/questionnaires" }));
      fill.disabled = true;
      return;
    }
    if (!data.access) {
      statusEl.textContent = "Interest forms are part of the Recruiting Command Center.";
      fill.disabled = true;
      return;
    }
    const todo = (data.forms ?? []).filter((f) => !f.done);
    statusEl.textContent = todo.length ? `${todo.length} form${todo.length === 1 ? "" : "s"} to fill for ${data.wrestlers?.[0]?.firstName ?? "your wrestler"}` : "Every form on your list is submitted.";
    for (const f of todo.slice(0, 12)) {
      const a = document.createElement("a");
      a.href = f.urls[0];
      a.target = "_blank";
      a.textContent = f.name;
      a.addEventListener("click", () => void chrome.storage.local.set({ lastOpened: { schoolId: f.schoolId, at: Date.now() } }));
      list.appendChild(a);
    }
  })();
  fill.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    await chrome.storage.local.set({ forceOpen: true });
    await chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, files: ["dist/content.js"] });
    window.close();
  });
  document.getElementById("open").addEventListener("click", () => void send({ type: "open", path: "/my-recruiting/questionnaires" }));
})();
