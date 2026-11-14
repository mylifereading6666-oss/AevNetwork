# AevNetwork

**Gaming Community & News Platform**

AevNetwork is a responsive, static-first gaming community and news frontend connected to the shared AevTools account/profile system through a Supabase Edge Function API.

## Current implementation
- Responsive home page and navigation for mobile, tablet, and desktop
- Shared AevTools account login/logout
- Shared profile read/update, including nickname cooldown and appearance settings
- AevNetwork-specific announcements, news, and update feeds
- Single-admin dashboard using the existing AevTools administrator authorization
- AevNetwork-only blacklist controls

## Planned / not yet active
Community posting, comments, friend requests, teams, tournaments, and related social features may have page shells but are not active until the corresponding functionality is implemented and shown as available in the site.

## Use
Open the [AevNetwork website](https://mylifereading6666-oss.github.io/AevNetwork/). Go to **アカウント** and sign in with the same email/password used for AevTools. Profile settings are shared with AevTools. Nickname changes are limited to once every 14 days.

## Documentation
- [Privacy Policy](privacy-policy.html)
- [Terms of Use](terms.html)
- [Specifications and User Guide](guide.html)
- [MIT License](LICENSE)

## Architecture and security
The browser calls the `aevnetwork-api` Supabase Edge Function. The function validates the signed-in user and checks the AevTools administrator status. The Supabase service-role key must remain in server-side function secrets and must never be added to browser code or committed to this repository. The AevNetwork blacklist is scoped to AevNetwork and does not disable the shared Supabase Auth account or AevTools.

## Local preview and deployment
Open `index.html` for a local static preview; online account and feed features require the deployed API and network connection. GitHub Pages deployment is configured in repository settings/workflows.

## Related service
[AevTools](https://mylifereading6666-oss.github.io/AevTools/) is the shared account and productivity-tool service.
