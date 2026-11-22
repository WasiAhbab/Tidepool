FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG API_INTERNAL_URL=http://api:4107
ENV API_INTERNAL_URL=$API_INTERNAL_URL
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build /app/package.json /app/next.config.mjs ./
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/supabase ./supabase
COPY --from=build /app/scripts/bootstrap.mjs ./scripts/bootstrap.mjs
USER node
EXPOSE 3107 4107
CMD ["npm","run","start:web"]
