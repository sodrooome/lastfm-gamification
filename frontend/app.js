const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:8000"
  : "https://lastfm-gamify-services-fryr9.ondigitalocean.app";

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

    renderProfile(data);
    window.history.pushState({}, "", `?user=${username}`);
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
  document.getElementById("statsTitle").innerText = data.username + " Farmer Stats";

  // ── Level ──
  const levelText = `Level ${data.level}`;
  document.getElementById("level").innerText = levelText;
  document.getElementById("statsLevel").innerText = levelText;
  document.getElementById("statsProgress").innerText =
    `${Math.round(data.progress_pct)}% to Level ${data.level + 1}`;

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

  // Option B for the sidebar information
  document.getElementById("setCountry").innerText = data.country;
  document.getElementById("setAverageListen").innerText = data.average_listen + " songs / day";

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
  renderAchievements("achievements", lifetime);

  // ── How-it-works link ──
  const howLink = document.querySelector(".how-does-work-link");
  if (howLink) {
    howLink.href = "/how-to.html?user=" + encodeURIComponent(data.username);
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
    row.className = `ach-row ${colorClass}`;

    // Fallback icon if none provided
    const iconSvg =
      a.icon ||
      `<svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <path d="M8 2L10 6H14L11 9L12 13L8 11L4 13L5 9L2 6H6L8 2Z"
          stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
      </svg>`;

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
        <p class="ach-name">${a.name}</p>
        <p class="ach-desc">${a.description || ""}</p>
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

// ─── Keyboard support ──────────────────────────────────────────

function _bindEnter(inputId, handler) {
  const el = document.getElementById(inputId);
  if (el) el.addEventListener("keydown", (e) => { if (e.key === "Enter") handler(); });
}

// ─── Init ──────────────────────────────────────────────────────

window.onload = () => {
  _bindEnter("usernameInput", () => loadUser());
  _bindEnter("usernameInputDash", loadUserFromDash);

  const username = getUsernameFromURL();
  if (username) {
    document.getElementById("usernameInput").value = username;
    // Jump straight to dashboard if arriving via URL
    loadUser(username);
  }
};