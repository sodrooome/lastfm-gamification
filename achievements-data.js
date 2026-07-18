// frontend/achievements-data.js
// Single source of requirement text for achievement dialogs.
// Keyed by exact achievement `name` string (matches backend ALL_ACHIEVEMENTS / DAILY_ACHIEVEMENTS keys).
// Lifetime entries populate the dashboard dialog; daily entries are included for future use.

const ACHIEVEMENT_DESCRIPTIONS = {
  // ── Lifetime: Scrobbles ──
  "Welcome to the Club, Folks!": "1+ total scrobbles",
  "A New Journey Ahead": "1,000+ total scrobbles",
  "Obsessive Listener, Huh": "10,000+ total scrobbles",
  "Even AI Can't Stop Me": "100,000+ total scrobbles",
  "No Life? Pure Life": "1,000,000+ total scrobbles",

  // ── Lifetime: Unique Artists ──
  "Your Loved Ones": "1+ unique artists in your top artists",
  "Explorer": "100+ unique artists in your top artists",
  "How About Touch Some Grass?": "1,000+ unique artists in your top artists",
  "Are You an Elitist or Identity Crisis?": "5,000+ unique artists in your top artists",
  "LGTM": "10,000+ unique artists in your top artists",

  // ── Lifetime: Profile ──
  "Spotify Wasn't Even Born Yet": "Account registered 10+ years ago",
  "The Completion": "Profile has a real name, profile image, and country set",

  // ── Daily (not yet wired to the dialog; included to avoid a second edit pass) ──
  "Scrobble of the Day": "Scrobble at least 1 song today",
  "Having Fun with Yourself?": "Scrobble 100+ songs today",
  "How about Take a Break": "Scrobble 1,000+ songs today",
};

// Expose for environments where top-level const is not shared (defensive; harmless if unused).
if (typeof window !== "undefined") {
  window.ACHIEVEMENT_DESCRIPTIONS = ACHIEVEMENT_DESCRIPTIONS;
}
