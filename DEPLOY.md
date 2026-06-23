# Deploying ChromaQuran

CI/CD lives on the **`production`** branch. Every push to `production` triggers
`.github/workflows/deploy.yml`, which SSHes to the server, pulls the branch, writes `.env`
from GitHub secrets, and runs `docker compose -f docker-compose.prod.yml up -d --build`.

The stack: a Next.js app container (Playwright/Chromium + ffmpeg for rendering) on
`127.0.0.1:3003` + its own Postgres. nginx proxies `chroma-quran.rayanemelzi.dev` → `:3003`.

## 1. GitHub repository secrets
Settings → Secrets and variables → Actions → New repository secret:

| Secret | Value |
|---|---|
| `VM_HOST` | server IP / hostname |
| `VM_USER` | `deploy` |
| `VM_SSH_KEY` | a private SSH key whose public key is in `deploy`'s `~/.ssh/authorized_keys` |
| `VM_APP_DIR` | `/home/deploy/chroma-quran` |
| `AUTH_JWT_SECRET` | a long random string (e.g. `openssl rand -base64 48`) |
| `POSTGRES_PASSWORD` | a strong DB password |
| `AUTOQURAN_API_URL` | *(optional)* defaults to `http://host.docker.internal:5000` |

## 2. One-time server prep (as the `deploy` user)
1. `deploy` must be in the `docker` group (it already is).
2. Give `deploy` git access to this **private** repo: add `deploy`'s SSH public key as a
   **deploy key** on the GitHub repo (Settings → Deploy keys), then clone once:
   ```bash
   git clone git@github.com:rayanMELZI/ChromaQuran.git /home/deploy/chroma-quran
   ```
   (The workflow also clones automatically if the directory is missing.)

## 3. nginx + DNS (subdomain)
1. DNS: add an A record `chroma-quran.rayanemelzi.dev` → the server IP (or a CNAME to the
   existing host). If Cloudflare fronts the domain, keep it proxied so TLS is terminated there.
2. Replace `/etc/nginx/sites-enabled/chroma-quran.conf` with:
   ```nginx
   server {
       listen 80;
       server_name chroma-quran.rayanemelzi.dev;
       client_max_body_size 60m;            # video up/downloads

       location / {
           proxy_pass http://127.0.0.1:3003;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_read_timeout 300s;         # renders can take a couple of minutes
       }
   }
   ```
   Then `sudo nginx -t && sudo systemctl reload nginx`.
3. **HTTPS is required for login** — the session cookie is `Secure` in production, so the
   site must be reachable over `https://`. Use Cloudflare (proxied) or `certbot` for a cert.

## 4. Deploy
Push to `production` (or run the workflow manually from the Actions tab). Watch the run, then:
`curl -I https://chroma-quran.rayanemelzi.dev/login` should return 200.

## Notes
- Rendered MP4s live in the `cq_renders` Docker volume (still ephemeral per the roadmap;
  durable per-user storage is a future step).
- The automation scheduler runs inside the app container, so it fires as long as the
  container is up (daily, server local time).
