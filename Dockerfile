FROM node:24-bookworm-slim

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

# Install the Camoufox browser + GeoIP database into a stable location inside
# the image (the postinstall script runs `camoufox-js fetch`).
ENV CAMOUFOX_INSTALL_DIR=/opt/camoufox

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev && npx camoufox-js fetch
COPY . .
EXPOSE 3000
CMD [ "npm", "start" ]
