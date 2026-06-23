# ChromaQuran production image: Next.js app + Chromium (Playwright) + ffmpeg for rendering.
# Uses a slim Node base and installs ONLY Chromium (not Firefox/WebKit) to keep the image
# small. ffmpeg comes from the ffmpeg-static npm package. Pin Chromium via the playwright
# npm version in package.json (npm ci installs it; `playwright install chromium` matches it).
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# ---- build ----
# NOTE: do NOT set NODE_ENV=development here. `npm ci` installs devDeps anyway (the Node base
# leaves NODE_ENV unset), and NODE_ENV=development makes `next build` prerender in dev mode,
# which crashes the error pages on Linux ("useContext null").
FROM base AS build
# don't download any browsers during npm install — only Chromium is installed in the runtime
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime ----
FROM base AS runner
ENV NODE_ENV=production
# playwright / ffmpeg-static / pg are external (not bundled), so keep node_modules.
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.ts ./next.config.ts
# install ONLY Chromium + its OS libraries (far smaller than the full multi-browser image)
RUN npx playwright install --with-deps chromium && rm -rf /var/lib/apt/lists/* && mkdir -p renders
EXPOSE 3000
# Chromium runs as root here -> needs --no-sandbox (set via compose: CQ_CHROMIUM_ARGS).
CMD ["npm", "run", "start", "--", "-p", "3000", "-H", "0.0.0.0"]
