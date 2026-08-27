const isLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const API_BASE = isLocal
  ? "http://localhost:8000"
  : "https://43-134-108-8.sslip.io";

let currentUsername = null;

// ─── Roast loading animation ───
const ROAST_STATUS_MESSAGES = [
  "Analyzing your scrobbles…",
  "Judging your taste in music…",
  "Consulting with music elitist…",
  "Finding your most embarrassing track…",
  "Calculating how much time you've wasted…",
  "Preparing the roast…",
];

var roastProgressInterval = null;
var roastStatusInterval = null;
var roastStatusIdx = 0;

// ─── Hero example bubble ───
const SOCIAL_PROOF_COUNT = 171;

const HERO_EXAMPLES = [
  { icon: "flame", text: "847 plays of the same album. comfort zone, much?" },
  {
    icon: "trophy",
    text: "unlocked: having fun with yourself? 100+ scrobbles in a day",
  },
  {
    icon: "flame",
    text: "top artist streak: 60 days straight. it's a relationship at this point",
  },
  {
    icon: "trophy",
    text: "unlocked: scrobble of the day. 1+ song, every day this week",
  },
];

const ICON_SVGS = {
  flame:
    '<svg width="14" height="14" viewBox="0 0 24 24"><path fill="#ffffff" d="M12 2c-4 4-7 7.5-7 12a7 7 0 0 0 14 0c0-4.5-3-8-7-12z"/><path fill="#ffffff" fill-opacity="0.55" d="M12 8c-2 2.5-3.5 4.5-3.5 7a3.5 3.5 0 0 0 7 0c0-2.5-1.5-4.5-3.5-7z"/></svg>',
  trophy:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="#ffffff"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.66 4.41 4.96C8.21 14.39 9.85 15.6 11 16.5V19H8v2h8v-2h-3v-2.5c1.15-.9 2.79-2.11 3.59-4.04C19.08 10.66 21 8.55 21 6V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/></svg>',
};

function startRoastLoadingAnimation() {
  var loadingFill = document.getElementById("roastLoadingFill");
  var loadingStatus = document.getElementById("roastLoadingStatus");
  if (!loadingFill || !loadingStatus) return;

  loadingFill.style.width = "0%";
  roastStatusIdx = 0;
  loadingStatus.textContent = ROAST_STATUS_MESSAGES[0];

  var progress = 0;
  roastProgressInterval = setInterval(function () {
    progress += 2;
    if (progress >= 80) {
      clearInterval(roastProgressInterval);
      progress = 80;
    }
    loadingFill.style.width = progress + "%";
  }, 60);

  roastStatusInterval = setInterval(function () {
    roastStatusIdx = (roastStatusIdx + 1) % ROAST_STATUS_MESSAGES.length;
    loadingStatus.textContent = ROAST_STATUS_MESSAGES[roastStatusIdx];
  }, 800);
}

function stopRoastLoadingAnimation() {
  clearInterval(roastProgressInterval);
  clearInterval(roastStatusInterval);
  var loadingFill = document.getElementById("roastLoadingFill");
  if (loadingFill) loadingFill.style.width = "100%";
}

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
        if (window.analytics) window.analytics.trackProfileSearched(false);
        showUserNotFound();
        return;
      }
      throw new Error("Server error");
    }

    const data = await res.json();

    if (window.analytics) window.analytics.trackProfileSearched(true);

    currentUsername = username;
    renderProfile(data);
    const params = new URLSearchParams(window.location.search);
    params.set("user", username);
    window.history.pushState({}, "", `?${params.toString()}`);
  } catch (err) {
    console.error(err);
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
  document.getElementById("statsTitle").innerText =
    data.username + " Listening Stats";

  // ── Level ──
  const levelText = `Level ${data.level}`;
  document.getElementById("level").innerText = levelText;
  document.getElementById("statsLevel").innerText = levelText;
  document.getElementById("statsProgress").innerText =
    data.level === 10
      ? "Max level — 100% complete"
      : `${Math.round(data.progress_pct)}% to Level ${data.level + 1}`;

  document.getElementById("progressFill").style.width = `${data.progress_pct}%`;
  document.getElementById("statsProgressFill").style.width =
    `${data.progress_pct}%`;
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
  document.getElementById("statAvgListen").innerText =
    data.average_listen + " songs / day";

  // ── Joined date ──
  if (data.joined_date) {
    const date = new Date(data.joined_date * 1000);
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const formatted = `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    document.getElementById("joinedDate").innerText = formatted;
  } else {
    document.getElementById("joinedDate").innerText = "";
  }

  // ── "Data fetched" timestamp ──
  const now = new Date();
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const timestamp = data.last_active_play;
  if (timestamp) {
    const playedDate = new Date(timestamp * 1000);

    const formattedDate = playedDate.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const formattedTime = playedDate.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

    document.getElementById("fetchedDate").innerText = `${formattedDate}`;
  } else {
    // When last_active_play is NULL, user is currently (maybe) listening to a song
    document.getElementById("fetchedDate").innerText = "Now Playing";
  }

  // ── Achievements ──
  const daily = data.achievements.filter((a) => a.type === "daily");
  const lifetime = data.achievements.filter((a) => a.type === "lifetime");

  document.getElementById("statAchievements").innerText = lifetime.filter(
    (a) => a.unlocked,
  ).length;
  document.getElementById("statFriends").innerText = data.friend_count;

  /* unused code but might be useful later */
  // document.getElementById("statDaily").innerText =
  //   daily.filter((a) => a.unlocked).length;

  renderAchievements("dailyAchievements", daily);
  // Show "Start Scrobbling" CTA only when every daily achievement is locked
  const allDailyLocked = daily.length > 0 && daily.every((a) => !a.unlocked);
  toggle("dailyScrobbleCta", allDailyLocked);
  if (!window._dailyScrobbleCtaBound) {
    window._dailyScrobbleCtaBound = true;
    document
      .getElementById("dailyScrobbleCta")
      ?.addEventListener("click", () => {
        if (window.analytics) window.analytics.trackStartScrobblingClicked();
      });
  }
  renderAchievements("achievements", lifetime);

  // ── How-it-works link ──
  const howLink = document.querySelector(".how-does-work-link");
  if (howLink) {
    howLink.href = "how-to.html?user=" + encodeURIComponent(data.username);
  }
  const mobileHowLink = document.getElementById("mobileMenuHowLink");
  if (mobileHowLink) {
    mobileHowLink.href =
      "how-to.html?user=" + encodeURIComponent(data.username);
  }
}

const ACHIEVEMENT_ICONS = {
  "Welcome to the Club, Folks!": "fa-solid fa-door-open",
  "A New Journey Ahead": "fa-solid fa-route",
  "Obsessive Listener, Huh": "fa-solid fa-headphones",
  "Even AI Can't Stop Me": "fa-solid fa-robot",
  "No Life? Pure Life": "fa-solid fa-infinity",
  "Your Loved Ones": "fa-solid fa-heart",
  Explorer: "fa-solid fa-compass",
  "How About Touch Some Grass?": "fa-solid fa-seedling",
  "Are You an Elitist or Identity Crisis?": "fa-solid fa-mask",
  LGTM: "fa-solid fa-circle-check",
  "Spotify Wasn't Even Born Yet": "fa-solid fa-hourglass-half",
  "The Completion": "fa-solid fa-clipboard-check",
  "Scrobble of the Day": "fa-solid fa-sun",
  "Having Fun with Yourself?": "fa-solid fa-repeat",
  "How about Take a Break": "fa-solid fa-pause",
};

function achievementIcon(name) {
  const iconClass = ACHIEVEMENT_ICONS[name];
  if (!iconClass) return null;
  return `<i class="${iconClass}" aria-hidden="true"></i>`;
}

// ─── Achievement row renderer ──────────────────────────────────

function renderAchievements(containerId, list) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  list.forEach((a) => {
    const row = document.createElement("div");
    row.className = `ach-row ${a.unlocked ? "ach-unlocked" : "ach-locked"}`;
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

    const iconSvg =
      a.icon ||
      achievementIcon(a.name) ||
      `<i class="fa-solid fa-star" aria-hidden="true"></i>`;

    // Unlock date line
    let unlockedLine = "";
    if (a.unlocked && a.unlocked_date) {
      const d = new Date(a.unlocked_date);
      unlockedLine = !isNaN(d)
        ? `<span class="ach-date">Unlocked on ${d.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
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
  "No Life? Pure Life": "This wasn't a phase, it was a pilgrimage.",
  LGTM: "Good luck with that.",
  "Spotify Wasn't Even Born Yet":
    "You were here before Spotify had a business plan.",
  "Are You an Elitist or Identity Crisis?":
    "Your algorithm has given up trying to categorize you.",
  "The Completion": "You did the bare minimum. We're still proud of you.",
  "Scrobble of the Day": "Come on, just one song won't hurt",
  "Having Fun with Yourself?": "Somebody's avoiding their group chat.",
  "How about Take a Break": "Tutorial: Locate grass. Touch grass. Remain quiet",
};
const DEFAULT_LOCKED_TEASE = "Do you think you can make it?";

let achDialogReturnFocus = null;

function openAchievementModal(ach, triggerEl) {
  if (window.analytics)
    window.analytics.trackAchievementDialogOpened(
      ach.name,
      ach.type,
      ach.unlocked,
    );
  const description =
    (typeof ACHIEVEMENT_DESCRIPTIONS !== "undefined" &&
      ACHIEVEMENT_DESCRIPTIONS[ach.name]) ||
    "Requirement details unavailable.";

  ACH_DIALOG_TITLE.textContent = ach.name;
  ACH_DIALOG_REQ.textContent = description;

  ACH_DIALOG_STATUS.textContent = ach.unlocked ? "Unlocked" : "Locked";
  ACH_DIALOG_STATUS.classList.toggle("is-unlocked", ach.unlocked);
  ACH_DIALOG_STATUS.classList.toggle("is-locked", !ach.unlocked);

  if (ach.unlocked && ach.unlocked_date) {
    const d = new Date(ach.unlocked_date);
    ACH_DIALOG_DATE.textContent = !isNaN(d)
      ? d.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
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
  if (
    achDialogReturnFocus &&
    typeof achDialogReturnFocus.focus === "function"
  ) {
    achDialogReturnFocus.focus();
    achDialogReturnFocus = null;
  }
});

// ─── Keyboard support ──────────────────────────────────────────

function _bindEnter(inputId, handler) {
  const el = document.getElementById(inputId);
  if (el)
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handler();
    });
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

  const loadingDialog = document.getElementById("roastLoadingDialog");
  const resultDialog = document.getElementById("roastResultDialog");
  const resultText = document.getElementById("roastResultText");
  const closeBtn = document.getElementById("roastResultClose");
  if (!resultDialog || !resultText || !closeBtn) return;

  if (!_roastResultBound) {
    _roastResultBound = true;
    closeBtn.addEventListener("click", () => resultDialog.close());
    const innerClose = resultDialog.querySelector(".ach-dialog-close");
    if (innerClose)
      innerClose.addEventListener("click", () => resultDialog.close());
    resultDialog.addEventListener("click", (e) => {
      if (e.target === resultDialog) resultDialog.close();
    });
  }

  resultText.textContent = "Roasting…";
  closeBtn.disabled = true;
  if (!loadingDialog.open) loadingDialog.showModal();
  startRoastLoadingAnimation();

  const roastButton = document.getElementById("roastButton");

  try {
    const res = await fetch(
      `${API_BASE}/roast/${encodeURIComponent(currentUsername)}?consent=true`,
    );

    stopRoastLoadingAnimation();

    if (res.status === 200) {
      const data = await res.json();
      if (
        typeof data.remaining === "number" &&
        data.remaining === 0 &&
        data.cached
      ) {
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
        "Couldn't roast you right now, the AI is busy. Please try again later.";
    }

    loadingDialog.close();
    if (!resultDialog.open) resultDialog.showModal();
  } catch (err) {
    stopRoastLoadingAnimation();
    resultText.textContent =
      "Couldn't roast you right now, the AI is busy. Please try again later.";
    loadingDialog.close();
    if (!resultDialog.open) resultDialog.showModal();
  } finally {
    closeBtn.disabled = false;
  }
}

// ─── Init ──────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  _bindEnter("usernameInput", () => loadUser());
  _bindEnter("usernameInputDash", loadUserFromDash);

  const roastButton = document.getElementById("roastButton");
  if (roastButton) {
    roastButton.addEventListener("click", () => {
      if (window.analytics) window.analytics.trackRoastMeClicked();
      openRoastConsent();
    });
  }

  const username = getUsernameFromURL();
  if (username) {
    document.getElementById("usernameInput").value = username;
    // Jump straight to dashboard if arriving via URL
    loadUser(username);
  }

  // ─── Example bubble rotation ───
  (function initExampleBubble() {
    var bubble = document.getElementById("example-bubble");
    var iconEl = document.getElementById("example-icon");
    var textEl = document.getElementById("example-text");
    if (!bubble || !iconEl || !textEl) return;

    var idx = 0;
    var intervalId = null;
    var ROTATE_MS = 3500;

    function showExample(i) {
      var ex = HERO_EXAMPLES[i];
      iconEl.innerHTML = ICON_SVGS[ex.icon] || ICON_SVGS.flame;
      iconEl.style.backgroundColor =
        ex.icon === "flame" ? "#d51007" : "#f59e0b";
      textEl.classList.remove("fade-out");
      textEl.textContent = ex.text;
    }

    function rotate() {
      textEl.classList.add("fade-out");
      setTimeout(function () {
        idx = (idx + 1) % HERO_EXAMPLES.length;
        showExample(idx);
      }, 300);
    }

    showExample(0);
    intervalId = setInterval(rotate, ROTATE_MS);

    bubble.addEventListener("mouseenter", function () {
      clearInterval(intervalId);
    });
    bubble.addEventListener("mouseleave", function () {
      intervalId = setInterval(rotate, ROTATE_MS);
    });
    bubble.addEventListener("focusin", function () {
      clearInterval(intervalId);
    });
    bubble.addEventListener("focusout", function () {
      intervalId = setInterval(rotate, ROTATE_MS);
    });
  })();

  // ─── Social proof count ───
  (function initSocialProof() {
    var textEl = document.getElementById("social-proof-text");
    if (!textEl) return;

    textEl.textContent =
      SOCIAL_PROOF_COUNT +
      " listeners roasted so far · takes 5 seconds, no login needed";
  })();
});
