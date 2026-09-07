# ---- build stage: compile native deps (better-sqlite3) and fetch the browser ----
FROM node:26-bookworm-slim AS builder

# Toolchain required by node-gyp to build better-sqlite3 (a camoufox-js dependency)
# when no prebuilt binary is available for the target platform.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 \
      make \
      g++ \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Download the Camoufox browser + GeoIP database into a stable location.
ENV CAMOUFOX_INSTALL_DIR=/opt/camoufox

WORKDIR /app
COPY package*.json ./
# `npm ci` runs the postinstall (camoufox-js fetch); the explicit fetch also
# pulls the GeoIP database and is a no-op if everything is already present.
RUN npm ci --omit=dev && npx camoufox-js fetch

# ---- runtime stage: Firefox runtime libraries only, no build toolchain ----
FROM node:26-bookworm-slim

# Camoufox is a patched Firefox (glibc) build, so we need the standard Firefox
# runtime libraries. (Alpine/musl is not supported by the Camoufox binaries.)
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
      fonts-liberation \
      libgtk-3-0 \
      libx11-xcb1 \
      libxcomposite1 \
      libxcursor1 \
      libxdamage1 \
      libxfixes3 \
      libxi6 \
      libxrandr2 \
      libxtst6 \
      libnss3 \
      libnspr4 \
      libatk1.0-0 \
      libatk-bridge2.0-0 \
      libcups2 \
      libdrm2 \
      libgbm1 \
      libasound2 \
      libpangocairo-1.0-0 \
      libpango-1.0-0 \
      libcairo2 \
      libdbus-glib-1-2 \
      libxt6 \
    && rm -rf /var/lib/apt/lists/*

ENV CAMOUFOX_INSTALL_DIR=/opt/camoufox

WORKDIR /app
COPY . .
# Bring in the compiled node_modules and the downloaded browser from the builder
# (these overwrite anything copied above so the native build always wins).
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /opt/camoufox /opt/camoufox
EXPOSE 3000
CMD [ "npm", "start" ]
