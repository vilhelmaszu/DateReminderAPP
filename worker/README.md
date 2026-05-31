# Date Reminder — Push Worker (free, Cloudflare)

Fires your reminders **even when the app is closed**, on a 1-minute cron, at
**$0** on Cloudflare's free tier. The browser app computes its own schedule and
syncs it here; this Worker is just a timed dispatcher + Web Push sender.

```
client (PWA)  ──/subscribe (subscription + schedule)──▶  Worker ──KV──┐
                                                                       │ cron every minute
service worker ◀──bare push──  Worker  ◀────────────── due entries ───┘
       │
       └──GET /due──▶ Worker  ──▶  notification text  ──▶  showNotification()
```

## One-time setup (~10 min)

1. **Install Wrangler & log in**
   ```bash
   cd worker
   npm install
   npx wrangler login
   ```

2. **Generate VAPID keys** (the identity your pushes are signed with)
   ```bash
   npx web-push generate-vapid-keys
   ```
   Copy the **Public Key** and **Private Key**.

3. **Create the KV namespace** and paste its id into `wrangler.toml`
   ```bash
   npx wrangler kv namespace create SUBS
   ```

4. **Set the keys**
   - Put the **public** key into `wrangler.toml` → `VAPID_PUBLIC`
   - Set your email in `VAPID_SUBJECT`
   - Store the **private** key as a secret:
     ```bash
     npx wrangler secret put VAPID_PRIVATE
     ```

5. **Deploy**
   ```bash
   npx wrangler deploy
   ```
   Note the deployed URL, e.g. `https://date-reminder-push.<you>.workers.dev`.

6. **Point the app at it.** In the app project root, create `.env` (see
   `.env.example`):
   ```
   VITE_PUSH_API=https://date-reminder-push.<you>.workers.dev
   VITE_VAPID_PUBLIC_KEY=<the public key from step 2>
   ```
   Rebuild the app (`npm run build`) and deploy it over **HTTPS** (push needs a
   secure origin — Cloudflare Pages/Netlify/Vercel are free).

7. On your phone: open the app → **⚙️ Settings → Background reminders → on**,
   grant permission. Use **Send test notification** to confirm delivery.

## Notes & limits
- **Free tier:** Workers cron + KV are free for personal use. Web Push itself is
  free (no Firebase billing — raw VAPID).
- **Precision:** cron fires every minute, so reminders land within ~1 minute of
  their time. The 6-minute grace window covers cron jitter and device sleep.
- **Sound:** the OS controls the sound for background notifications; the in-app
  sound picker only applies while the app is open (a web platform limitation).
- **Privacy/tighten:** `Access-Control-Allow-Origin` is `*` in the scaffold —
  set it to your app's origin once deployed.
- **Not yet load-tested for many users** — it's sized for personal use (a
  handful of devices). For scale, swap the per-key KV scan for a queue/D1.
