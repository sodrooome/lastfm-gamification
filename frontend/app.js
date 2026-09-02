let currentUsername = null;
let currentProfileData = null;

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

const ICON_FA_CLASSES = {
  flame: "fa-solid fa-fire",
  trophy: "fa-solid fa-trophy",
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
    currentProfileData = data;
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

  document.getElementById("statTopArtist").innerText = data.top_artist;

  document.getElementById("statCountry").innerText =
    data.country && data.country !== "None" ? data.country : "-";
  document.getElementById("statAvgListen").innerText =
    Math.round(data.average_listen) + " songs / day";

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

    // Daily achievements grant 0 XP (see backend/achievements.py calculate_xp,
    // which only counts type !== "daily") — only lifetime rows get a tag.
    const xpTag =
      a.type === "lifetime" ? `<span class="ach-xp">+150 XP</span>` : "";

    row.innerHTML = `
      <div class="ach-icon-wrap">${iconSvg}</div>
      <div class="ach-text">
        <p class="ach-name">${escapeHtml(a.name)}</p>
        <p class="ach-desc">${escapeHtml(a.description) || ""}</p>
        ${unlockedLine}
      </div>
      ${xpTag}
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
let lastRoastText = null;

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
  const shareBtn = document.getElementById("roastResultShare");
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
    if (shareBtn) shareBtn.addEventListener("click", shareRoastCard);
  }

  resultText.textContent = "Roasting…";
  closeBtn.disabled = true;
  lastRoastText = null;
  toggle("roastResultShare", false);
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
        lastRoastText = data.roast;
        toggle("roastResultShare", true);
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

// ─── Share Card (client-side canvas export) ─────────────────────

const SHARE_CARD_SIZE = 1080;
const SHARE_CARD_INK = "#181d26";
const SHARE_CARD_BRAND_RED = "#e8503a";
const SHARE_CARD_ACH_ACCENT = "#d9291c";
const FALLBACK_AVATAR_URL =
  "https://lastfm.freetls.fastly.net/i/u/avatar170s/818148bf682d429dc215c1705eb27b98.png";

function loadImage(src, crossOrigin) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

// Draws `img` into the x/y/w/h box, cropping (not stretching) to cover it —
// same behavior as CSS `object-fit: cover`.
function drawImageCover(ctx, img, x, y, w, h) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let sx, sy, sw, sh;
  if (imgRatio > boxRatio) {
    sh = img.height;
    sw = sh * boxRatio;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = sw / boxRatio;
    sx = 0;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function wrapCanvasText(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Shrinks the font size step by step until the roast quote fits within
// maxHeight — roast length varies a lot, so this keeps long roasts legible
// instead of overflowing the card.
function fitRoastText(ctx, text, maxWidth, maxHeight) {
  let fontSize = 42;
  const minFontSize = 22;
  let lines, lineHeight;
  do {
    ctx.font = `400 ${fontSize}px "DM Sans", sans-serif`;
    lines = wrapCanvasText(ctx, text, maxWidth);
    lineHeight = fontSize * 1.35;
    if (lines.length * lineHeight <= maxHeight || fontSize <= minFontSize)
      break;
    fontSize -= 2;
  } while (true);
  return { fontSize, lines, lineHeight };
}

async function buildShareCardCanvas(profileData, roastText) {
  const size = SHARE_CARD_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = SHARE_CARD_INK;
  ctx.fillRect(0, 0, size, size);

  // ── Brand row (same-origin asset, no CORS concern) ──
  try {
    const logo = await loadImage("/assets/icon-180.png");
    ctx.drawImage(logo, 96, 64, 30, 30);
  } catch (err) {
    console.error(err);
  }
  ctx.fillStyle = "#ffffff";
  ctx.font = '500 20px "DM Sans", sans-serif';
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("tastecheck.me", 136, 79);

  const centerX = size / 2;

  // ── Avatar (cross-origin — falls back to a monogram if it can't load) ──
  const avatarCenterY = 260;
  const avatarRadius = 84;
  let avatarImg = null;
  try {
    avatarImg = await loadImage(
      profileData.profile_image || FALLBACK_AVATAR_URL,
      "anonymous",
    );
  } catch (err) {
    avatarImg = null;
  }

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (avatarImg) {
    drawImageCover(
      ctx,
      avatarImg,
      centerX - avatarRadius,
      avatarCenterY - avatarRadius,
      avatarRadius * 2,
      avatarRadius * 2,
    );
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(
      centerX - avatarRadius,
      avatarCenterY - avatarRadius,
      avatarRadius * 2,
      avatarRadius * 2,
    );
    ctx.fillStyle = "#ffffff";
    ctx.font = '600 72px "DM Sans", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      (profileData.username || "?").charAt(0).toUpperCase(),
      centerX,
      avatarCenterY,
    );
  }
  ctx.restore();

  ctx.beginPath();
  ctx.arc(centerX, avatarCenterY, avatarRadius + 2.5, 0, Math.PI * 2);
  ctx.lineWidth = 5;
  ctx.strokeStyle = SHARE_CARD_BRAND_RED;
  ctx.stroke();

  // ── Username + level pill ──
  ctx.fillStyle = "#ffffff";
  ctx.font = '500 38px "DM Sans", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const usernameY = avatarCenterY + avatarRadius + 46;
  ctx.fillText(profileData.username || "", centerX, usernameY);

  const levelText = `Level ${profileData.level}`;
  ctx.font = '500 16px "DM Sans", sans-serif';
  const levelPillW = ctx.measureText(levelText).width + 40;
  const levelPillY = usernameY + 48;
  ctx.fillStyle = SHARE_CARD_BRAND_RED;
  const pillRadius = 16;
  const pillX = centerX - levelPillW / 2;
  const pillTop = levelPillY - pillRadius;
  ctx.beginPath();
  ctx.roundRect(pillX, pillTop, levelPillW, pillRadius * 2, pillRadius);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(levelText, centerX, levelPillY);

  // ── Roast quote ──
  const quoteMaxWidth = 860;
  const quoteTop = levelPillY + 160;
  ctx.font = "600 100px Georgia, 'Times New Roman', serif";
  ctx.fillStyle = SHARE_CARD_ACH_ACCENT;
  ctx.globalAlpha = 0.9;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("“", centerX, quoteTop);
  ctx.globalAlpha = 1;

  const { fontSize, lines, lineHeight } = fitRoastText(
    ctx,
    roastText,
    quoteMaxWidth,
    170,
  );
  ctx.fillStyle = "#ffffff";
  ctx.font = `400 ${fontSize}px "DM Sans", sans-serif`;
  ctx.textBaseline = "middle";
  let lineY = quoteTop + 55;
  for (const line of lines) {
    ctx.fillText(line, centerX, lineY);
    lineY += lineHeight;
  }

  // ── Stats row ──
  const statsY = lineY + 40;
  const stats = [
    [Number(profileData.total_scrobbles).toLocaleString(), "Total Scrobbles"],
    [profileData.top_artist || "Unknown", "Top Artist"],
    [`${Math.round(profileData.average_listen)} songs / day`, "Avg Listens"],
  ];
  const statGap = 220;
  const statsStartX = centerX - statGap;
  stats.forEach((stat, i) => {
    const x = statsStartX + i * statGap;
    const statMaxWidth = statGap - 24;
    ctx.font = '600 26px "DM Sans", sans-serif';
    ctx.fillStyle = "#ffffff";
    ctx.fillText(stat[0], x, statsY, statMaxWidth);
    ctx.font = '500 13px "DM Sans", sans-serif';
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText(stat[1].toUpperCase(), x, statsY + 34, statMaxWidth);

    if (i > 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - statGap / 2, statsY - 20);
      ctx.lineTo(x - statGap / 2, statsY + 20);
      ctx.stroke();
    }
  });

  // ── XP bar ──
  const xpBarY = statsY + 90;
  const xpBarW = 480;
  const xpBarX = centerX - xpBarW / 2;
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.beginPath();
  ctx.roundRect(xpBarX, xpBarY, xpBarW, 8, 6);
  ctx.fill();

  const progressPct = Math.max(0, Math.min(100, profileData.progress_pct || 0));
  const gradient = ctx.createLinearGradient(xpBarX, 0, xpBarX + xpBarW, 0);
  gradient.addColorStop(0, SHARE_CARD_BRAND_RED);
  gradient.addColorStop(1, SHARE_CARD_ACH_ACCENT);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(xpBarX, xpBarY, xpBarW * (progressPct / 100), 8, 6);
  ctx.fill();

  // ── Footer ──
  const footerY = xpBarY + 64;
  ctx.font = '400 16px "DM Sans", sans-serif';
  ctx.textAlign = "left";
  const footerPrefix = "Get roasted at ";
  const footerBrand = "tastecheck.me";
  const footerPrefixWidth = ctx.measureText(footerPrefix).width;
  const footerBrandWidth = ctx.measureText(footerBrand).width;
  const footerStartX = centerX - (footerPrefixWidth + footerBrandWidth) / 2;
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillText(footerPrefix, footerStartX, footerY);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(footerBrand, footerStartX + footerPrefixWidth, footerY);

  return canvas;
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas export failed"));
    }, "image/png");
  });
}

async function shareRoastCard() {
  if (!lastRoastText || !currentProfileData) return;

  const shareBtn = document.getElementById("roastResultShare");
  const originalLabel = shareBtn ? shareBtn.innerHTML : "";
  if (shareBtn) {
    shareBtn.disabled = true;
    shareBtn.textContent = "Generating…";
  }

  try {
    const canvas = await buildShareCardCanvas(
      currentProfileData,
      lastRoastText,
    );
    const blob = await canvasToBlob(canvas);
    const file = new File([blob], `tastecheck-${currentUsername}-roast.png`, {
      type: "image/png",
    });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: "My tastecheck.me roast",
        text: "I just got roasted on tastecheck.me — check yours:",
      });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    if (shareBtn) {
      shareBtn.disabled = false;
      shareBtn.innerHTML = originalLabel;
    }
  } catch (err) {
    if (shareBtn) shareBtn.disabled = false;
    if (err && err.name === "AbortError") {
      // user cancelled the native share sheet — not an error
      if (shareBtn) shareBtn.innerHTML = originalLabel;
      return;
    }
    console.error(err);
    if (shareBtn) {
      shareBtn.textContent = "Couldn't generate image";
      setTimeout(() => {
        shareBtn.innerHTML = originalLabel;
      }, 2000);
    }
  }
}

// ─── Init ──────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  _bindEnter("usernameInput", () => loadUser());
  _bindEnter("usernameInputDash", loadUserFromDash);
  document
    .getElementById("usernameSubmit")
    ?.addEventListener("click", () => loadUser());

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
      var iconClass = ICON_FA_CLASSES[ex.icon] || ICON_FA_CLASSES.flame;
      iconEl.innerHTML = '<i class="' + iconClass + '" aria-hidden="true"></i>';
      iconEl.style.backgroundColor =
        ex.icon === "flame" ? "var(--ach-accent)" : "#f59e0b";
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
