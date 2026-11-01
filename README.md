# Steam Profile CS Stats

Chrome extension for Steam Community profile pages.

1. Hides `.leetify-extension-stats-wrapper`, including wrappers inserted later by another extension.
2. Adds a **View full CS stats** button above the panels. It replaces `.com` with `.rip` in the Steam profile URL and opens a new tab. For example, `https://steamcommunity.rip/id/crab6` redirects to `https://csst.at/profile/crab6`.
3. Displays the content from `https://csst.at/crab6/leetify`, then `https://csst.at/crab6/faceit`, immediately above `.profile_customization_area`.

The identifier comes from the profile being viewed, not the signed-in user. Both `/id/<vanity>` and `/profiles/<SteamID64>` profile URLs are supported. For numeric IDs, statistics availability depends on csst.at resolving that identifier. Profile subpages (inventory, friends, etc.) are left alone. If a profile has no customization area, no panels or button are inserted.

## Install

1. Extract the ZIP into a permanent folder.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the folder containing `manifest.json`.
4. Refresh an open Steam profile tab.

Click the extension's toolbar icon to turn everything off/on. Pin it in Chrome for convenience. `ON` means panels are enabled; `OFF` removes the added panels and restores the original Leetify wrapper.

## Rendering

The supplied csst.at URLs are HTML fragments, not standalone styled pages. The extension fetches those fragments through its service worker and renders them inside isolated extension frames, using csst.at's current stylesheet. It also resolves supported automatic `hx-get` fragment loads. It does not execute downloaded JavaScript or inject third-party scripts into Steam. External links open in new tabs.

The main statistics and post-loaded Leetify metrics and FACEIT peak ELO are displayed. FACEIT history URLs are discovered from the viewed player's returned card, so no UUID is hardcoded. Out-of-band metric updates replace their existing targets rather than appearing as duplicate rows. Only provider cards are rendered; full-site sidebar avatar/rank fragments are omitted.

The cards use csst.at's 16px base font scale and padding. JavaScript-dependent comparison dialogs and historical match tables are not reproduced. Missing/private profiles and network failures show an error and a link to the full profile page. No fabricated stats are shown.

## Updating from 1.0

Replace the files in the folder you originally loaded in Chrome with this version, click the extension's **Reload** button at `chrome://extensions`, and refresh your Steam tab. Version 1.1.0 fixes duplicated post-loaded stats, missing date labels, stray sidebar content, and the undersized font scale.

## Privacy and permissions

- `storage` remembers the on/off setting.
- Access to `https://csst.at/*` loads public statistics and styles. The currently viewed Steam vanity or ID is sent to csst.at to retrieve that player's stats. Requests omit credentials.
- Steam content scripts only run on `/id/*` and `/profiles/*`, and only modify profile homepages.
- No Steam cookies, API keys, purchase/trade permissions, analytics, or account changes.
- The `.rip` site is opened only when you click the button.

## Validation

The live Steam insertion point and csst.at fragment/style routes were inspected on November 1, 2026. Source and local behavior checks are included in the development validation; the extension has not been automatically installed in your browser. Future Steam/csst.at markup changes may require an update.
