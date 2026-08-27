// frontend/compare.js
// Compare two Last.fm profiles and render compatibility score + user cards.

// ─── API base (same pattern as app.js) ──────────────────────────

const isLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const API_BASE = isLocal
  ? "http://localhost:8000"
  : "https://43-134-108-8.sslip.io";

// ─── Helpers ───────────────────────────────────────────────────

function toggle(id, show) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle("d-none", !show);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function getUsersFromURL() {
  const params = new URLSearchParams(window.location.search);
  return {
    user1: params.get("user1"),
    user2: params.get("user2"),
  };
}

// ─── Score count-up animation ──────────────────────────────────

function animateScore(element, target, duration) {
  const startTime = performance.now();
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // ease-out cubic for a natural deceleration
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(target * eased);
    element.textContent = value + "%";
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// ─── User card renderer ────────────────────────────────────────

function renderUserCard(userData, actLabel) {
  const card = document.createElement("div");
  card.className = "compare-user-card";

  const initial = (userData.username || "?")[0].toUpperCase();
  const avatarHtml = userData.profile_image
    ? `<img src="${escapeHtml(userData.profile_image)}" alt="${escapeHtml(userData.username)}" class="compare-user-avatar" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />` +
      `<div class="compare-user-avatar fallback" style="display:none">${escapeHtml(initial)}</div>`
    : `<div class="compare-user-avatar fallback">${escapeHtml(initial)}</div>`;

  const actHtml = actLabel
    ? `<p class="compare-user-act">${escapeHtml(actLabel)}</p>`
    : "";

  card.innerHTML = `
    ${actHtml}
    ${avatarHtml}
    <p class="compare-user-name">${escapeHtml(userData.username)}</p>
    <div class="compare-user-stats">
      <div class="compare-user-stat">
        <p class="compare-user-stat-label">Top artist</p>
        <p class="compare-user-stat-value">${escapeHtml(userData.top_artist || "Unknown")}</p>
      </div>
      <div class="compare-user-stat">
        <p class="compare-user-stat-label">Scrobbles</p>
        <p class="compare-user-stat-value">${Number(userData.total_scrobbles || 0).toLocaleString()}</p>
      </div>
    </div>
  `;

  return card;
}

// ─── Joint roast ────────────────────────────────────────────────

var currentCompareData = null;

function renderSharedArtists(artists) {
  const container = document.getElementById("compareSharedLabels");
  container.innerHTML = "";

  if (!artists || artists.length === 0) {
    const empty = document.createElement("p");
    empty.className = "compare-shared-empty";
    empty.textContent =
      "Well, no wonder your compatibility score isn't exactly chart-topping: your top artists from the past year are complete strangers to each other. It's giving 'parallel universes, same streaming app'";
    container.appendChild(empty);
    return;
  }

  artists.forEach(function (artist) {
    const label = document.createElement("span");
    label.className = "compare-shared-label";
    label.textContent = artist;
    container.appendChild(label);
  });
}

function resetJointRoast() {
  toggle("jointRoastBody", true);
  toggle("jointRoastLoading", false);
  toggle("jointRoastResult", false);
  toggle("jointRoastError", false);
  var btn = document.getElementById("generateRoastBtn");
  if (btn) btn.disabled = false;
}

async function generateJointRoast() {
  if (!currentCompareData) return;

  if (window.analytics) window.analytics.trackCompareRoastClicked();

  var btn = document.getElementById("generateRoastBtn");
  if (btn) btn.disabled = true;
  toggle("jointRoastBody", false);
  toggle("jointRoastLoading", true);
  toggle("jointRoastResult", false);
  toggle("jointRoastError", false);

  try {
    var res = await fetch(API_BASE + "/compare/roast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user1: currentCompareData.user1.username,
        user2: currentCompareData.user2.username,
        compatibility_score: currentCompareData.compatibility_score || 0,
        shared_artists: currentCompareData.shared_artists || [],
        user1_top_artists: (currentCompareData.user1.top_3_artists || []).map(
          function (a) {
            return a.name;
          },
        ),
        user2_top_artists: (currentCompareData.user2.top_3_artists || []).map(
          function (a) {
            return a.name;
          },
        ),
        user1_scrobbles: currentCompareData.user1.total_scrobbles || 0,
        user2_scrobbles: currentCompareData.user2.total_scrobbles || 0,
      }),
    });

    if (!res.ok) {
      var detail = "";
      try {
        var err = await res.json();
        detail = err.detail || "";
      } catch (_) {}
      throw new Error(
        detail || "Roast generation failed. Please try again later.",
      );
    }

    var data = await res.json();
    var resultEl = document.getElementById("jointRoastResult");
    resultEl.textContent = data.roast;
    toggle("jointRoastLoading", false);
    toggle("jointRoastResult", true);
    if (window.analytics) window.analytics.trackCompareRoastGenerated();
  } catch (err) {
    console.error(err);
    var errorEl = document.getElementById("jointRoastError");
    errorEl.textContent = err.message || "Something went wrong.";
    toggle("jointRoastLoading", false);
    toggle("jointRoastError", true);
  }
}

async function fetchAndRender(user1, user2) {
  toggle("compareLoading", true);
  toggle("compareError", false);
  toggle("compareResults", false);
  toggle("compareExampleBubble", false);
  toggle("compareSupportLine", false);
  toggle("compareHow", false);
  toggle("compareRecent", false);

  try {
    const res = await fetch(
      `${API_BASE}/compare/${encodeURIComponent(user1)}/${encodeURIComponent(user2)}`,
    );

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(
          "One or both users not found. Check the usernames and try again.",
        );
      }
      throw new Error("Server error. Please try again later.");
    }

    const data = await res.json();

    // Update URL so the comparison is shareable
    const params = new URLSearchParams();
    params.set("user1", user1);
    params.set("user2", user2);
    window.history.pushState({}, "", `?${params.toString()}`);

    // Show results container
    toggle("compareResults", true);

    // Animate the compatibility score from 0 to target
    const scoreEl = document.getElementById("compareScoreValue");
    animateScore(scoreEl, data.compatibility_score || 0, 900);

    document.getElementById("compareScoreTagline").textContent =
      data.compatibility_tagline || "";

    // Render user cards
    const grid = document.getElementById("compareUsersGrid");
    grid.innerHTML = "";
    grid.appendChild(renderUserCard(data.user1, "You"));

    const divider = document.createElement("div");
    divider.className = "compare-users-divider";
    grid.appendChild(divider);

    grid.appendChild(renderUserCard(data.user2, "Them"));

    // Render shared artists
    renderSharedArtists(data.shared_artists);

    // Store compare data for joint roast
    currentCompareData = data;

    // Reset joint roast card
    resetJointRoast();

    if (window.analytics)
      window.analytics.trackCompareCompleted(data.compatibility_score || 0);
  } catch (err) {
    console.error(err);
    if (window.analytics) window.analytics.trackCompareFailed();
    const errorEl = document.getElementById("compareError");
    errorEl.textContent = err.message || "Failed to compare profiles";
    toggle("compareError", true);
    toggle("compareExampleBubble", true);
    toggle("compareSupportLine", true);
  } finally {
    toggle("compareLoading", false);
  }
}

// ─── Init ──────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  const user1Input = document.getElementById("user1Input");
  const user2Input = document.getElementById("user2Input");
  const compareBtn = document.getElementById("compareBtn");

  function doCompare() {
    const u1 = user1Input.value.trim();
    const u2 = user2Input.value.trim();
    if (!u1 || !u2) return;
    if (window.analytics) window.analytics.trackCompareClicked();
    fetchAndRender(u1, u2);
  }

  compareBtn.addEventListener("click", doCompare);

  user1Input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doCompare();
  });
  user2Input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doCompare();
  });

  // Nav search redirects to the main profile page
  const navSearch = document.getElementById("usernameInputDash");
  if (navSearch) {
    navSearch.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const val = navSearch.value.trim();
        if (val) {
          window.location.href = `./index.html?user=${encodeURIComponent(val)}`;
        }
      }
    });
  }

  // Generate joint roast button
  const generateRoastBtn = document.getElementById("generateRoastBtn");
  if (generateRoastBtn) {
    generateRoastBtn.addEventListener("click", generateJointRoast);
  }

  // Recent roasts strip: auto-marquee with reduced-motion fallback
  const recentGrid = document.getElementById("compareRecentGrid");
  const fadeLeft = document.getElementById("compareFadeLeft");
  const fadeRight = document.getElementById("compareFadeRight");

  if (recentGrid && fadeLeft && fadeRight) {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!prefersReducedMotion && recentGrid.parentElement) {
      // Duplicate cards for seamless loop
      const cards = Array.from(
        recentGrid.querySelectorAll(".compare-recent-card"),
      );
      cards.forEach((card) => {
        recentGrid.appendChild(card.cloneNode(true));
      });
      recentGrid.parentElement.classList.add("is-marquee");
    } else {
      const updateFades = () => {
        const atStart = recentGrid.scrollLeft <= 4;
        const atEnd =
          recentGrid.scrollLeft + recentGrid.clientWidth >=
          recentGrid.scrollWidth - 4;
        fadeLeft.style.opacity = atStart ? "0" : "1";
        fadeRight.style.opacity = atEnd ? "0" : "1";
      };
      recentGrid.addEventListener("scroll", updateFades, { passive: true });
      window.addEventListener("resize", updateFades);
      updateFades();
    }
  }

  // Auto-load if both users are in the URL
  const { user1, user2 } = getUsersFromURL();
  if (user1 && user2) {
    user1Input.value = user1;
    user2Input.value = user2;
    fetchAndRender(user1, user2);
  }
});
