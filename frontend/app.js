const API_BASE = "http://localhost:8000";

function getUsernameFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("user");
}

async function loadUser(usernameParam) {
  const usernameInput = document.getElementById("usernameInput");
  const username = usernameParam || usernameInput.value;

  if (!username) return;

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
    showError("Failed to load user");
  } finally {
    toggle("loading", false);
  }
}

function renderProfile(data) {
  toggle("profile", true);

  document.getElementById("avatar").src =
    data.profile_image || "https://via.placeholder.com/100";

  // convert unix timestamp to the formatted and much appropriate date
  if (data.joined_date) {
    const date = new Date(data.joined_date * 1000)
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = date.getDate()
    const month = months[date.getMonth()]
    const year = date.getFullYear()
    document.getElementById("joinedDate").innerText = `Joined: ${day} ${month} ${year}`
  } else {
    // don't display anything
    document.getElementById("joinedDate").innerText = ""
  }

  document.getElementById("username").innerText = data.username;
  document.getElementById("level").innerText = `Level ${data.level} / 10`;
  document.getElementById("progressFill").style.width = `${data.progress_pct}%`;
  document.getElementById("progressLabel").innerText =
    `${data.current_xp} / ${data.max_xp} XP`;
  document.getElementById("topArtist").innerText =
    `Top Artist: ${data.top_artist}`;
  document.getElementById("totalScrobbles").innerText =
    `Total Scrobbles: ${data.total_scrobbles}`;

  const daily = data.achievements.filter((a) => a.type === "daily");
  const lifetime = data.achievements.filter((a) => a.type === "lifetime");

  renderBadges(daily, "dailyAchievements");
  renderBadges(lifetime, "achievements");

  const howLink = document.querySelector(".how-does-work-link");
  if (howLink) {
    howLink.href = "/how-to.html?user=" + encodeURIComponent(data.username);
  }
}

function renderBadges(achievements, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  achievements.forEach((a) => {
    const isUnlocked = a.unlocked;
    const card = document.createElement("div");
    card.className = "badge-card " + (isUnlocked ? "" : "locked");
    const title = document.createElement("div");
    title.className = "badge-title";
    title.textContent = a.name;
    const desc = document.createElement("div");
    desc.className = "badge-desc";
    desc.textContent = isUnlocked ? "Unlocked" : "Locked";
    card.appendChild(title);
    card.appendChild(desc);
    container.appendChild(card);
  });
}

function showError(msg) {
  const el = document.getElementById("error");
  el.innerText = msg;
  toggle("error", true);
}

function showUserNotFound() {
  toggle("userNotFound", true);
}

function focusSearch() {
  const input = document.getElementById("usernameInput");
  input.value = "";
  input.focus();
}

function toggle(id, show) {
  document.getElementById(id).classList.toggle("d-none", !show);
}

window.onload = () => {
  const username = getUsernameFromURL();
  if (username) {
    document.getElementById("usernameInput").value = username;
    loadUser(username);
  }
};
