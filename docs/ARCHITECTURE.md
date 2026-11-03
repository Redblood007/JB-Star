# JB-Star Architecture

## Applications

1. `apps/user-web` — customer website
2. `apps/user-android` — customer Android app
3. `apps/admin-web` — admin dashboard
4. `apps/admin-android` — separate admin Android app

## Backend

- Firebase Authentication
- Firestore / Realtime Database
- Cloud Functions or a secure API layer
- Storage/CDN for authorized media
- Firebase Cloud Messaging for notifications

## Core domains

- Users and roles
- Content and categories
- Live matches and scores
- Streams and playback authorization
- Watchlist
- Subscriptions
- Payments
- Ads
- Notifications
- Admin analytics

## Security

- Admin access is separate from normal user access.
- Secrets and Firebase service-account files must never be committed.
- Live sports data and video streams must come from authorized providers.
