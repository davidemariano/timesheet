# ---------- base ----------
FROM node:20-alpine AS base
WORKDIR /app

# ---------- dev ----------
FROM base AS dev
COPY api/package.json api/package-lock.json* ./
RUN npm ci || npm i
COPY api/ ./
EXPOSE 3000
CMD ["npm","run","dev"]


# ---------- prod ----------
FROM base AS build
COPY api/package.json api/package-lock.json* ./
RUN npm ci
COPY api/ ./
RUN npm run build

FROM node:20-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY api/package.json ./
RUN npm pkg delete scripts.dev && npm i --omit=dev
EXPOSE 3000
CMD ["npm","start"]