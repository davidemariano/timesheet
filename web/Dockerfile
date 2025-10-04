# -------- dev --------
FROM node:20-alpine AS dev
WORKDIR /app
COPY web/package.json web/package-lock.json* ./
RUN npm ci || npm i
COPY web/ ./
EXPOSE 4200
CMD ["npm","start"]

# -------- prod --------
FROM node:20-alpine AS build
WORKDIR /app
COPY web/package.json web/package-lock.json* ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM nginx:1.27-alpine AS prod
COPY --from=build /app/dist/ /usr/share/nginx/html
# (opzionale) nginx.conf per proxy verso /api
EXPOSE 80