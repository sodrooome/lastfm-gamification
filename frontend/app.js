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

    try {
        const res = await fetch(`${API_BASE}/user/${username}`);
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

    document.getElementById("joinedDate").innerText =
        data.joined_date
            ? `Joined: ${data.joined_date}`
            : "";

    document.getElementById("username").innerText = data.username;
    document.getElementById("level").innerText = `Level ${data.level} / 10`;
    document.getElementById("progressFill").style.width = `${data.progress_pct}%`;
    document.getElementById("progressLabel").innerText = `${data.current_xp} / ${data.max_xp} XP`;
    document.getElementById("topArtist").innerText = `Top Artist: ${data.top_artist}`;
    document.getElementById("totalScrobbles").innerText =
        `Total Scrobbles: ${data.total_scrobbles}`;

    const container = document.getElementById("achievements");
    container.innerHTML = "";

    data.achievements.forEach(a => {
        const col = document.createElement("div");
        const isUnlocked = a.unlocked;

        col.innerHTML = `
      <div class="badge-card ${isUnlocked ? '' : 'locked'}">
        <div class="badge-title">${a.name}</div>
        <div class="badge-desc">${isUnlocked ? 'Unlocked' : 'Locked'}</div>
      </div>
    `;

        container.appendChild(col);
    });
}

function showError(msg) {
    const el = document.getElementById("error");
    el.innerText = msg;
    toggle("error", true);
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