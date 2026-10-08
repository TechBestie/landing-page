# syntax=docker/dockerfile:1

# ---- Build the site ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY web ./web
RUN npm run build

# ---- Runtime: server + built site, production packages only ----
FROM node:22-alpine
ENV NODE_ENV=production \
    PORT=3000 \
    UPLOAD_DIR=/app/uploads
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY server.js db.js password.js ./
COPY web/src/pricing-default.js ./web/src/
COPY --from=build /app/dist ./dist
RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node
EXPOSE 3000
VOLUME ["/app/uploads"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
CMD ["node", "server.js"]
