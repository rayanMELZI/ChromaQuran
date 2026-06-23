# Deploying ChromaQuran

CI/CD lives on the **`production`** branch. Every push to `production` triggers
`.github/workflows/deploy.yml`, which **scp's the source to the server** (packed with
`git archive`, so only tracked files — no `.git`/`node_modules`/`.env`), writes `.env` from
GitHub secrets, and runs `docker compose -f docker-compose.prod.yml up -d --build`. The
Docker image is built on the server; the server needs **no GitHub access / deploy key**.

The server's SSH is behind **Cloudflare Access** (Zero Trust tunnel — no public port 22), so
the workflow connects through `cloudflared` using a **Cloudflare Access service token**.

The stack: a Next.js app container (Playwright/Chromium + ffmpeg for rendering) on
`127.0.0.1:3003` + its own Postgres. nginx proxies `chroma-quran.rayanemelzi.dev` → `:3003`.

## 1. GitHub repository secrets
Settings → Secrets and variables → Actions → New repository secret:

| Secret | Value |
|---|---|
| `VM_HOST` | the **Access SSH hostname**, e.g. `nanovm.rayanemelzi.dev` (the `--hostname` from your `ssh` ProxyCommand — NOT a Cloudflare-proxied app domain) |
| `VM_USER` | `deploy` |
| `VM_SSH_KEY` | a private SSH key authorized for `deploy` on the server (e.g. the same key your `nanovmdep` host uses) |
| `VM_APP_DIR` | `/home/deploy/chroma-quran` (a dedicated dir — its contents are replaced each deploy) |
| `CF_ACCESS_CLIENT_ID` | Cloudflare Access service token **Client ID** |
| `CF_ACCESS_CLIENT_SECRET` | Cloudflare Access service token **Client Secret** |
| `AUTH_JWT_SECRET` | a long random string (e.g. `openssl rand -base64 48`) |
| `POSTGRES_PASSWORD` | a strong DB password |
| `AUTOQURAN_API_URL` | *(optional)* defaults to `http://host.docker.internal:5000` |

## 2. Cloudflare Access service token (one-time)
The runner can't log in through a browser, so it authenticates to Access with a service token:
1. Zero Trust dashboard → **Access → Service Auth → Service Tokens** → *Create Service Token*.
   Copy the **Client ID** and **Client Secret** into the `CF_ACCESS_*` secrets above.
2. Open the **Access application** that protects SSH (the `nanovm.rayanemelzi.dev` SSH app) →
   **Policies** → add a policy with **Action: Service Auth** and *Include → Service Token →*
   (the token you just created). Without this policy the token is rejected.

## 3. One-time server prep
The only requirement: **`VM_USER` must be in the `docker` group** (the `deploy` user already
is). The workflow scp's the code in, so the server needs no GitHub credentials/deploy key,
and you don't have to pre-clone anything.

## 4. nginx + DNS (subdomain)
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

## 5. Deploy
Push to `production` (or run the workflow manually from the Actions tab). Watch the run, then:
`curl -I https://chroma-quran.rayanemelzi.dev/login` should return 200.

## Notes
- Rendered MP4s live in the `cq_renders` Docker volume (still ephemeral per the roadmap;
  durable per-user storage is a future step).
- The automation scheduler runs inside the app container, so it fires as long as the
  container is up (daily, server local time).
