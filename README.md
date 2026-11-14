# AevNetwork

**Gaming Community & News Platform**

AevNetwork is a responsive, static-first foundation for a gaming community and news platform.

## Current implementation

- Responsive home page for desktop, tablet, and mobile
- Navigation to Community and News sections
- AevTools cross-site navigation link
- Initial Community, profile, team/tournament, and AevNews feature areas
- Clear notice that online features are not active until the API/authentication layer is implemented

## AevTools connection

The home page links to the existing AevTools website:

https://mylifereading6666-oss.github.io/AevTools/

AevNetwork does **not** connect directly to Supabase in this initial frontend. Shared AevTools authentication and online data access will be designed through a secure server-side API layer in a later phase. Never place a Supabase service-role key or other secret in browser code.

## Local preview

Open `index.html` in a browser.

## GitHub Pages

In the repository, open **Settings → Pages**, select **Deploy from a branch**, choose **main** and **/(root)**, then save.

## Planned modules

- Shared AevTools account authentication
- Unique usernames with a 14-day change cooldown
- Customizable gamer profiles (avatar, banner, name styling, badges)
- Community posts, comments, chat, friends, teams and groups
- Events, tournaments and rankings
- AevNews for Fortnite, game, IT and user-submitted news
- Admin-only manual online access switch with audit history

The admin online switch will control the AevNetwork API access gate. It will not shut down the underlying Supabase project, so the recovery controls remain available.
