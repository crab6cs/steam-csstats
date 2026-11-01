# Steam Profile CS Stats


Chrome extension for Steam Community profile pages.


1. Hides `.leetify-extension-stats-wrapper`, including wrappers inserted later by another extension.
2. Adds a **View full CS stats** button above the panels. It replaces `.com` with `.rip` in the Steam profile URL and opens a new tab. For example, `https://steamcommunity.rip/id/crab6` redirects to `https://csst.at/profile/crab6`.
3. Displays the content from `https://csst.at/crab6/leetify`, then `https://csst.at/crab6/faceit`, immediately above `.profile_customization_area`.


The identifier comes from the profile being viewed, not the signed-in user. Both `/id/<vanity>` and `/profiles/<SteamID64>` profile URLs are supported. For numeric IDs, statistics availability depends on csst.at resolving that identifier. Profile subpages (inventory, friends, etc.) are left alone. On profiles without `.profile_customization_area`, the panels are prepended to `.profile_leftcol` instead. This also supports profiles with only recent activity and comments.
