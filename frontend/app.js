const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

const API_BASE = isLocal
  ? "http://localhost:8000"
  : "https://43-134-108-8.sslip.io";

let currentUsername = null;

// ─── Achievement color palette (cycles through unlocked rows) ───
const ACH_COLORS = ["ach-teal", "ach-blue", "ach-brown", "ach-pink", "ach-green", "ach-purple"];

// ─── Helpers ───────────────────────────────────────────────────

function getUsernameFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("user");
}

function toggle(id, show) {
  document.getElementById(id).classList.toggle("d-none", !show);
}

function showError(msg) {
  const el = document.getElementById("error");
  el.innerText = msg;
  toggle("error", true);
}

function showUserNotFound() {
  toggle("userNotFound", true);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ─── View switching ────────────────────────────────────────────

function showDashboard() {
  document.getElementById("landingView").classList.add("d-none");
  document.getElementById("dashboardView").classList.remove("d-none");
}

// ─── Entry points ──────────────────────────────────────────────

// Called by the landing "View Profile" button
async function loadUser(usernameParam) {
  const usernameInput = document.getElementById("usernameInput");
  const username = usernameParam || usernameInput.value.trim();
  if (!username) return;

  // Transition to dashboard shell, sync nav input
  showDashboard();
  document.getElementById("usernameInputDash").value = username;

  await _fetchAndRender(username);
}

// Called by the dashboard nav "View" button
async function loadUserFromDash() {
  const val = document.getElementById("usernameInputDash").value.trim();
  if (!val) return;

  // Keep landing input in sync (for URL-based reload)
  document.getElementById("usernameInput").value = val;

  await _fetchAndRender(val);
}

// ─── Core fetch + render ───────────────────────────────────────

async function _fetchAndRender(username) {
  toggle("loading", true);
  toggle("profile", false);
  toggle("error", false);
  toggle("userNotFound", false);

  try {
    const res = await fetch(`${API_BASE}/user/${username}`);

    if (!res.ok) {
      if (res.status === 404) {
        showUserNotFound();
        return;
      }
      throw new Error("Server error");
    }

    const data = await res.json();

    currentUsername = username;
    renderProfile(data);
    const params = new URLSearchParams(window.location.search);
    params.set("user", username);
    window.history.pushState({}, "", `?${params.toString()}`);
  } catch (err) {
    console.error(err)
    showError("Failed to load user");
  } finally {
    toggle("loading", false);
  }
}

// ─── Profile renderer ──────────────────────────────────────────

function renderProfile(data) {
  toggle("profile", true);

  // ── Avatar ──
  document.getElementById("avatar").src =
    data.profile_image ||
    "https://lastfm.freetls.fastly.net/i/u/avatar170s/818148bf682d429dc215c1705eb27b98.png";

  // ── Username ──
  document.getElementById("username").innerText = data.username;
  document.getElementById("statsTitle").innerText = data.username + " Listening Stats";

  // ── Level ──
  const levelText = `Level ${data.level}`;
  document.getElementById("level").innerText = levelText;
  document.getElementById("statsLevel").innerText = levelText;
  document.getElementById("statsProgress").innerText =
    data.level === 10
      ? "Max level — 100% complete"
      : `${Math.round(data.progress_pct)}% to Level ${data.level + 1}`;

  document.getElementById("progressFill").style.width = `${data.progress_pct}%`;
  document.getElementById("statsProgressFill").style.width = `${data.progress_pct}%`;
  document.getElementById("progressLabel").innerText =
    `${data.current_xp} / ${data.max_xp} XP`;

  // ── Scrobbles + top artist ──
  const scrobblesFormatted = Number(data.total_scrobbles).toLocaleString();
  document.getElementById("statScrobbles").innerText = scrobblesFormatted;

  /* unused code but might be useful later */
  // document.getElementById("totalScrobblesSidebar").innerText =
  //   scrobblesFormatted + " scrobbles";

  document.getElementById("statTopArtist").innerText = data.top_artist;

  /* unused code but might be useful later */
  // document.getElementById("topArtistSidebar").innerText = data.top_artist;

  document.getElementById("statCountry").innerText =
    data.country && data.country !== "None" ? data.country : "-";
  document.getElementById("statAvgListen").innerText = data.average_listen + " songs / day";

  // ── Joined date ──
  if (data.joined_date) {
    const date = new Date(data.joined_date * 1000);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formatted = `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    document.getElementById("joinedDate").innerText = formatted;
  } else {
    document.getElementById("joinedDate").innerText = "";
  }

  // ── "Data fetched" timestamp ──
  const now = new Date();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  document.getElementById("fetchedDate").innerText =
    `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ` +
    now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  // ── Achievements ──
  const daily = data.achievements.filter((a) => a.type === "daily");
  const lifetime = data.achievements.filter((a) => a.type === "lifetime");

  document.getElementById("statAchievements").innerText =
    lifetime.filter((a) => a.unlocked).length;
  document.getElementById("statFriends").innerText = data.friend_count

  /* unused code but might be useful later */
  // document.getElementById("statDaily").innerText =
  //   daily.filter((a) => a.unlocked).length;

  renderAchievements("dailyAchievements", daily);
  // Show "Start Scrobbling" CTA only when every daily achievement is locked
  const allDailyLocked =
    daily.length > 0 && daily.every((a) => !a.unlocked);
  toggle("dailyScrobbleCta", allDailyLocked);
  renderAchievements("achievements", lifetime);

  // ── How-it-works link ──
  const howLink = document.querySelector(".how-does-work-link");
  if (howLink) {
    howLink.href = "how-to.html?user=" + encodeURIComponent(data.username);
  }
  const mobileHowLink = document.getElementById("mobileMenuHowLink");
  if (mobileHowLink) {
    mobileHowLink.href = "how-to.html?user=" + encodeURIComponent(data.username);
  }
}

// ─── Achievement row renderer ──────────────────────────────────

function renderAchievements(containerId, list) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  let colorIdx = 0;

  list.forEach((a) => {
    const row = document.createElement("div");
    const colorClass = a.unlocked
      ? ACH_COLORS[colorIdx % ACH_COLORS.length]
      : "locked";
    const isLifetime = containerId === "achievements";
    row.className = `ach-row ${colorClass}`;

    if (isLifetime) {
      row.classList.add("is-clickable");
      row.setAttribute("role", "button");
      row.setAttribute("tabindex", "0");
      row.setAttribute("aria-haspopup", "dialog");
      row.addEventListener("click", () => openAchievementModal(a, row));
      row.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openAchievementModal(a, row);
        }
      });
    }

    const iconSvg =
      a.icon ||
      (a.unlocked
        ? `<svg width="18" height="18" viewBox="0 0 16 16" fill="#f5b342">
             <path d="M8 2L10 6H14L11 9L12 13L8 11L4 13L5 9L2 6H6L8 2Z" />
           </svg>`
        : `<svg width="18" height="18" viewBox="0 0 16 16" fill="none">
             <path d="M8 2L10 6H14L11 9L12 13L8 11L4 13L5 9L2 6H6L8 2Z"
               stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
           </svg>`);

    // Unlock date line
    let unlockedLine = "";
    if (a.unlocked && a.unlocked_date) {
      const d = new Date(a.unlocked_date);
      unlockedLine = !isNaN(d)
        ? `<span class="ach-date">Unlocked on ${d.toLocaleDateString("en-US", {
          month: "long", day: "numeric", year: "numeric"
        })}</span>`
        : `<span class="ach-date">Unlocked</span>`;
    } else if (a.unlocked) {
      unlockedLine = `<span class="ach-date">Unlocked</span>`;
    }

    row.innerHTML = `
      <div class="ach-icon-wrap">${iconSvg}</div>
      <div class="ach-text">
        <p class="ach-name">${escapeHtml(a.name)}</p>
        <p class="ach-desc">${escapeHtml(a.description) || ""}</p>
        ${unlockedLine}
      </div>
    `;

    container.appendChild(row);
    if (a.unlocked) colorIdx++;
  });

  if (list.length === 0) {
    container.innerHTML = `<p class="ach-empty">No achievements in this category.</p>`;
  }
}

// ─── Achievement detail dialog (mobile: bottom sheet, desktop: modal) ───

const ACH_DIALOG = document.getElementById("achievementModal");
const ACH_DIALOG_TITLE = document.getElementById("achievementModalTitle");
const ACH_DIALOG_REQ = ACH_DIALOG.querySelector(".ach-dialog-requirement");
const ACH_DIALOG_DATE = ACH_DIALOG.querySelector(".ach-dialog-date");
const ACH_DIALOG_STATUS = ACH_DIALOG.querySelector("[data-status-chip]");
const ACH_DIALOG_CLOSE_BTN = ACH_DIALOG.querySelector(".ach-dialog-close");

// Two-tier locked tease: default phrase for locked lifetime achievements,
// with bespoke overrides for the two near-impossible tier achievements.
const ACHIEVEMENT_LOCKED_TEASE = {
  "No Life? Pure Life": "This one's a long road.",
  "LGTM": "Good luck with that.",
};
const DEFAULT_LOCKED_TEASE = "Do you think you can make it?";

let achDialogReturnFocus = null;

function openAchievementModal(ach, triggerEl) {
  const description =
    (typeof ACHIEVEMENT_DESCRIPTIONS !== "undefined" && ACHIEVEMENT_DESCRIPTIONS[ach.name]) ||
    "Requirement details unavailable.";

  ACH_DIALOG_TITLE.textContent = ach.name;
  ACH_DIALOG_REQ.textContent = description;

  ACH_DIALOG_STATUS.textContent = ach.unlocked ? "Unlocked" : "Locked";
  ACH_DIALOG_STATUS.classList.toggle("is-unlocked", ach.unlocked);
  ACH_DIALOG_STATUS.classList.toggle("is-locked", !ach.unlocked);

  if (ach.unlocked && ach.unlocked_date) {
    const d = new Date(ach.unlocked_date);
    ACH_DIALOG_DATE.textContent = !isNaN(d)
      ? d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : "";
  } else if (ach.unlocked) {
    ACH_DIALOG_DATE.textContent = "";
  } else {
    // Locked: two-tier tease, bespoke phrase for the absurd-tier achievements,
    // default aspirational phrase for everything else.
    ACH_DIALOG_DATE.textContent =
      ACHIEVEMENT_LOCKED_TEASE[ach.name] || DEFAULT_LOCKED_TEASE;
  }

  achDialogReturnFocus = triggerEl || null;
  if (!ACH_DIALOG.open) ACH_DIALOG.showModal();
}

function closeAchievementModal() {
  if (ACH_DIALOG.open) ACH_DIALOG.close();
}

ACH_DIALOG_CLOSE_BTN.addEventListener("click", closeAchievementModal);

ACH_DIALOG.addEventListener("click", (e) => {
  if (e.target === ACH_DIALOG) closeAchievementModal();
});

ACH_DIALOG.addEventListener("close", () => {
  if (achDialogReturnFocus && typeof achDialogReturnFocus.focus === "function") {
    achDialogReturnFocus.focus();
    achDialogReturnFocus = null;
  }
});

// ─── Keyboard support ──────────────────────────────────────────

function _bindEnter(inputId, handler) {
  const el = document.getElementById(inputId);
  if (el) el.addEventListener("keydown", (e) => { if (e.key === "Enter") handler(); });
}

// ─── Roast Me — consent + result dialogs ───────────────────────

let _roastConsentBound = false;
let _roastResultBound = false;

function openRoastConsent() {
  if (!currentUsername) return;
  const dialog = document.getElementById("roastConsentDialog");
  if (!dialog) return;

  if (!_roastConsentBound) {
    _roastConsentBound = true;
    const closeBtn = dialog.querySelector(".ach-dialog-close");
    if (closeBtn) closeBtn.addEventListener("click", () => dialog.close());
    const cancelBtn = document.getElementById("roastConsentCancel");
    if (cancelBtn) cancelBtn.addEventListener("click", () => dialog.close());
    const confirmBtn = document.getElementById("roastConsentConfirm");
    if (confirmBtn) confirmBtn.addEventListener("click", confirmRoast);
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });
  }

  if (!dialog.open) dialog.showModal();
}

async function confirmRoast() {
  const consentDialog = document.getElementById("roastConsentDialog");
  if (consentDialog && consentDialog.open) consentDialog.close();

  const resultDialog = document.getElementById("roastResultDialog");
  const resultText = document.getElementById("roastResultText");
  const closeBtn = document.getElementById("roastResultClose");
  if (!resultDialog || !resultText || !closeBtn) return;

  if (!_roastResultBound) {
    _roastResultBound = true;
    closeBtn.addEventListener("click", () => resultDialog.close());
    const innerClose = resultDialog.querySelector(".ach-dialog-close");
    if (innerClose) innerClose.addEventListener("click", () => resultDialog.close());
    resultDialog.addEventListener("click", (e) => {
      if (e.target === resultDialog) resultDialog.close();
    });
  }

  resultText.textContent = "Roasting…";
  closeBtn.disabled = true;
  if (!resultDialog.open) resultDialog.showModal();

  const roastButton = document.getElementById("roastButton");

  try {
    const res = await fetch(
      `${API_BASE}/roast/${encodeURIComponent(currentUsername)}?consent=true`
    );

    if (res.status === 200) {
      const data = await res.json();
      if (typeof data.remaining === "number" && data.remaining === 0 && data.cached) {
        resultText.innerHTML =
          `<div class="roast-limit-hint">` +
          `<p class="roast-limit-hint-title">You've reached your roast limit!</p>` +
          `<p class="roast-limit-hint-body">You've officially broken our limit meter! It'll magically reset... eventually. Please try again soon.</p>` +
          `</div>`;
        if (roastButton) {
          roastButton.disabled = true;
          roastButton.classList.add("is-limit-reached");
          roastButton.title = "You've used all 3 roasts";
        }
      } else {
        resultText.textContent = data.roast;
      }
    } else if (res.status === 429) {
      resultText.innerHTML =
        `<div class="roast-limit-hint">` +
        `<p class="roast-limit-hint-title">You've reached your roast limit!</p>` +
        `<p class="roast-limit-hint-body">You've officially broken our limit meter! It'll magically reset... eventually. Please try again soon.</p>` +
        `</div>`;
      if (roastButton) {
        roastButton.disabled = true;
        roastButton.classList.add("is-limit-reached");
        roastButton.title = "You've used all 3 roasts";
      }
    } else if (res.status === 400) {
      resultText.textContent = "Consent required, please try again";
    } else {
      resultText.textContent =
        "Couldn't roast you right now, the AI is busy. Pleasee try again later.";
    }
  } catch (err) {
    resultText.textContent =
      "Couldn't roast you right now, the AI is busy. Please try again later.";
  } finally {
    closeBtn.disabled = false;
  }
}

// ─── Init ──────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  _bindEnter("usernameInput", () => loadUser());
  _bindEnter("usernameInputDash", loadUserFromDash);

  const roastButton = document.getElementById("roastButton");
  if (roastButton) roastButton.addEventListener("click", openRoastConsent);

  const username = getUsernameFromURL();
  if (username) {
    document.getElementById("usernameInput").value = username;
    // Jump straight to dashboard if arriving via URL
    loadUser(username);
  }
});