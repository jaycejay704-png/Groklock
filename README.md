# Chaster Lite

A simple personal keyholding web app inspired by Chaster, now with **shareable session codes** so a keyholder can control the lock from another device.

## Features

- **Photo combination** – Upload a lockbox combination photo (or auto-generate a 6-digit code). Hidden until unlock.
- **Timer** – Set duration in hours + minutes.
- **Shareable session code** – Wearer gets a short code (e.g. `KX7M-4821`). Keyholder enters it on any device.
- **Keyholder controls** (PIN-protected):
  - Add / remove time
  - Freeze / unfreeze timer
  - Unlock early & reveal combination
- **Live sync** – Both devices poll every few seconds and stay in sync.
- **Emergency discard** – Wearer can permanently delete the session.

## Requirements

- Node.js (any recent version – uses only built-in modules, no `npm install` needed)

## Quick start

```bash
cd chaster-lite
node server.js
```

Then open **http://localhost:3847** in your browser.

### For the keyholder on another device

1. The wearer creates a lock and shares the **session code** (and PIN if set).
2. Keyholder opens the same URL (`http://<your-ip>:3847` or a public tunnel).
3. Enters the session code under “Join as Keyholder”.
4. Authenticates with the PIN and can control the lock.

> **Note:** For real multi-device use outside your LAN you need to expose the server (e.g. with a reverse proxy, ngrok, Cloudflare Tunnel, or deploy to a VPS). The server listens on port 3847 by default (`PORT` env var works).

## How it works

| Role       | Action |
|------------|--------|
| Wearer     | Creates lock → gets session code → shares it |
| Keyholder  | Enters session code → enters PIN → controls timer / unlocks |
| Both       | See live timer, freeze state, and final combination |

Data is stored in `./data/sessions.json` and images in `./uploads/`. Sessions older than 30 days are cleaned on server start.

## Privacy & safety

- This is a **personal / couple tool**, not a public multi-user platform.
- Run it only on machines you trust.
- Combination photos are only served after the lock is unlocked.
- Always keep a real-world emergency release method for physical devices.
- Adult consensual use only.

## Files

```
chaster-lite/
├── server.js      # Zero-dependency Node server
├── index.html
├── styles.css
├── app.js
├── data/          # sessions.json (created automatically)
└── uploads/       # combination photos (created automatically)
```

## Optional: make it reachable from the internet

```bash
# Example with ngrok (install ngrok first)
ngrok http 3847
```

Share the ngrok HTTPS URL + the session code with your keyholder.
