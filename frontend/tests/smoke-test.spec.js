// @ts-check
// Standard UI automation testing which is only use for smoke/sanity testing (quick validation after deployment). 
// There's no need to have a fancy design pattern or whatsoever for now


import { test, expect } from '@playwright/test';

// use mock response to get faster and deterministic checking
// rather than rely on the LastFM API's (which is somewhat got timeout)
const mockUserResponse = {
  username: "bagassp",
  total_scrobbles: 30367,
  top_artist: "Slipknot",
  achievements: [
    { name: "Welcome to the Club, Folks!", unlocked: true, type: "lifetime" },
    { name: "A New Journey Ahead", unlocked: true, type: "lifetime" },
    { name: "Obsessive Listener, Huh", unlocked: true, type: "lifetime" },
    { name: "Even AI Can't Stop Me", unlocked: false, type: "lifetime" },
    { name: "No Life? Pure Life", unlocked: false, type: "lifetime" },
    { name: "Your Loved Ones", unlocked: true, type: "lifetime" },
    { name: "Explorer", unlocked: true, type: "lifetime" },
    { name: "How About Touch Some Grass?", unlocked: false, type: "lifetime" },
    { name: "Are You an Elitist or Identity Crisis?", unlocked: false, type: "lifetime" },
    { name: "LGTM", unlocked: false, type: "lifetime" },
    { name: "Spotify Wasn't Even Born Yet", unlocked: false, type: "lifetime" },
    { name: "The Completion", unlocked: false, type: "lifetime" },
    { name: "Scrobble of the Day", unlocked: false, type: "daily" },
    { name: "Having Fun with Yourself?", unlocked: false, type: "daily" },
    { name: "How about Take a Break", unlocked: false, type: "daily" },
  ],
  level: 5,
  current_xp: 985,
  max_xp: 2585,
  progress_pct: 38.1,
  profile_image: "",
  joined_date: "1711812919",
  friend_count: 3,
  country: "None",
  average_listen: 35.94,
  last_active_play: "1783903227",
};

test.beforeEach(async ({ page }) => {
  await page.route('https://43-134-108-8.sslip.io/user/bagassp', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockUserResponse)
    })
  })
})

test('Verify initial website loaded with search username input and clickable', async ({ page }) => {
  await page.goto('https://sodrooome.github.io/lastfm-gamification/');

  await expect(page).toHaveTitle(/LastFM/);

  const searchInput = page.getByRole('textbox', { name: 'Enter your username here...' });
  await searchInput.click();
  await searchInput.fill('bagassp');
  await searchInput.press('Enter');

  await expect(page.getByRole('heading', { name: 'bagassp' })).toBeVisible();

  const roastMeButton = page.getByRole('button', { name: 'Roast Me' });
  await expect(roastMeButton).toBeVisible();
  await roastMeButton.click();

  await expect(page.getByRole('heading', { name: 'Roast Me: Your Consent' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
});

test('Verify user comparison page is being loaded with double search username input', async ({ page }) => {
  await page.goto('https://sodrooome.github.io/lastfm-gamification/compare.html');

  await expect(page).toHaveTitle(/Compare/);

  const userSearchInput1 = page.locator('#user1Input');
  const userSearchInput2 = page.locator('#user2Input');

  await expect(userSearchInput1).toBeVisible();
  await expect(userSearchInput2).toBeVisible();

  const compareButton = page.getByRole('button', { name: 'Compare' });
  await expect(compareButton).toBeVisible();

  // just click without firing any username input (to prevent tests would fail)
  await compareButton.click();

  // and navigate to the how-to pages (ensure it's clickable from other entry point)
  const howToLink = page.getByRole('link', { name: 'How it works →' });
  await howToLink.click();
  await expect(page.getByRole('heading', { name: 'Achievement Guide' })).toBeVisible();
  await expect(page.getByRole('link', { name: '← Back to search' })).toBeVisible();
});