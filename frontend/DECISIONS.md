## Frontend: JWT storage and auto-attach (React)
- After login, `access` and `refresh` tokens from Django's /api/token/
  endpoint are stored in localStorage (frontend/src/pages/Login.jsx).
- An axios request interceptor (frontend/src/api/axios.js) automatically
  attaches the access token as an Authorization: Bearer header on every
  request made via the shared `api` instance — no need to set it manually
  per-request.
- KNOWN LIMITATION: localStorage is vulnerable to XSS-based token theft.
  Fine for development; if this app goes to production with real users,
  revisit using httpOnly cookies instead.
- TODO: token refresh logic not yet implemented — once the access token
  expires, requests will start failing until the user logs in again.
  Should eventually use the refresh_token + /api/token/refresh/ to get
  a new access token automatically.



  ## Attendance 
  - Taken by class teachers