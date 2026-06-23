# ChromaQuran production image: Next.js app + Playwright(Chromium) + ffmpeg for rendering.
# Built on the official Playwright image so Chromium and its system deps are already present
# (the render worker screenshots the /render page at 1080x1920). ffmpeg comes from the
# ffmpeg-static npm package. Pin the image to the playwright npm version in package.json.
FROM mcr.microsoft.com/playwright:v1.61.0-noble AS base
WORKDIR /app
# Chromium already lives in the image (/ms-playwright) — don't re-download it on npm install.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# ---- build (needs devDeps: typescript, tailwind, etc.) ----
FROM base AS build
ENV NODE_ENV=development
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
RUN mkdir -p renders
EXPOSE 3000
# Chromium runs as root here -> needs --no-sandbox (set via compose: CQ_CHROMIUM_ARGS).
CMD ["npm", "run", "start", "--", "-p", "3000", "-H", "0.0.0.0"]
