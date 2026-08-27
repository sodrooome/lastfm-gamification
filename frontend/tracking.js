// frontend/tracking.js
// Standalone vanilla JS module for Mixpanel analytics event tracking.
// The Mixpanel stub + CDN snippet is in the HTML <head>.
// Tracking is always enabled — init() fires on page load.

// ─── Constants ─────────────────────────────────────────────────

const MIXPANEL_TOKEN = "0c77d601617c51c511cb5f3f57c82e1e";
const MIXPANEL_API_HOST = "https://api-eu.mixpanel.com";

// ─── Mixpanel Init ─────────────────────────────────────────────

let _mixpanelInitialized = false;

function initMixpanel() {
  if (_mixpanelInitialized || typeof mixpanel === "undefined") return;
  _mixpanelInitialized = true;

  mixpanel.init(MIXPANEL_TOKEN, {
    autocapture: false,
    record_sessions_percent: 0,
    api_host: MIXPANEL_API_HOST,
  });
}

// ─── Track Wrapper ─────────────────────────────────────────────

function track(eventName, properties) {
  if (typeof mixpanel === "undefined") return;
  mixpanel.track(eventName, properties);
}

// ─── Event Functions ─────────────────────────────────────────────

function trackPageViewed(page) {
  track("page_viewed", { page });
}

function trackProfileSearched(found) {
  track("profile_searched", { found });
}

function trackRoastMeClicked() {
  track("roast_me_clicked");
}

function trackStartScrobblingClicked() {
  track("start_scrobbling_clicked");
}

function trackAchievementDialogOpened(name, type, unlocked) {
  track("achievement_dialog_opened", {
    achievement_name: name,
    achievement_type: type,
    unlocked,
  });
}

function trackCompareClicked() {
  track("compare_clicked");
}

function trackCompareCompleted(score) {
  track("compare_completed", { compatibility_score: score });
}

function trackCompareFailed() {
  track("compare_failed");
}

function trackCompareRoastClicked() {
  track("compare_roast_clicked");
}

function trackCompareRoastGenerated() {
  track("compare_roast_generated");
}

// ─── Initialization ────────────────────────────────────────────

function getCurrentPage() {
  const path = window.location.pathname;
  const file = path.split("/").pop() || "";
  const name = file.replace(/\.html$/, "");

  switch (name) {
    case "":
    case "index":
      return "landing";
    case "how-to":
      return "how-to";
    case "compare":
      return "compare";
    case "about":
      return "about";
    case "privacy":
      return "privacy";
    case "terms":
      return "terms";
    case "404":
      return "not-found";
    default:
      return "landing";
  }
}

function initTracking() {
  initMixpanel();
  trackPageViewed(getCurrentPage());
}

// ─── Bootstrap ──────────────────────────────────────────────────

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTracking);
} else {
  initTracking();
}

// ─── Global Exposure ───────────────────────────────────────────

if (typeof window !== "undefined") {
  window.analytics = {
    trackPageViewed,
    trackProfileSearched,
    trackRoastMeClicked,
    trackStartScrobblingClicked,
    trackAchievementDialogOpened,
    trackCompareClicked,
    trackCompareCompleted,
    trackCompareFailed,
    trackCompareRoastClicked,
    trackCompareRoastGenerated,
  };
}
