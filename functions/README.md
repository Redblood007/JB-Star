# JB STAR Cricket API Function

Firebase Cloud Function: `cricketApi`

Routes:
- `/live` — provider live matches endpoint
- `/recent` — provider recent matches endpoint
- `/upcoming` — provider upcoming matches endpoint

Required Firebase Secret Manager secret:
- `CRICKETLIVEAPI_TOKEN`

The API token is provisioned from the GitHub Actions secret and is never included in client code.

Deployment is handled by `.github/workflows/deploy-firebase-functions.yml`.
