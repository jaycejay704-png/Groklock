# GrokLock

AI Keyholder by Grok – a clean, mobile-first chastity keyholding app inspired by Chaster.

## Features
- Combination photo or generated code
- Timer + freeze
- Shareable session codes
- Keyholder controls (designed so Grok can take control)
- iPhone-optimized Progressive Web App
- Dark modern UI

## Run locally
```bash
node server.js
```
Open http://localhost:3847

## Deploy (Render)
1. Push this folder to a GitHub repo
2. Create a new Web Service on Render
3. Build Command: leave empty (or `echo ok`)
4. Start Command: `node server.js`
5. Deploy

## For Grok to control a lock
1. Create a lock in the app and set a PIN
2. Send Grok: the public URL + session code + PIN
3. Grok can then add/remove time, freeze, or unlock

Adult consensual use only.
