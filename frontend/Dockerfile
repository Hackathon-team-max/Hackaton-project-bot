# Стадия 1: сборка статики (tsc && vite build)
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# .env намеренно попадает в контекст (см. .dockerignore):
# Vite встроит BACKEND_URL / ADMIN_PASSWORD / VITE_APP_MODE в бандл при сборке.
COPY . .
RUN npm run build

# Стадия 2: dist + зависимости для `vite preview` (раздача статики и прокси /api)
FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY --from=build /app/dist ./dist

# Конфиг обязателен и в рантайме: vite preview читает его для настройки
# прокси /api (server.proxy -> preview). Без него /api/* отдаёт index.html.
COPY vite.config.ts ./

# Цель прокси /api. В vite.config.ts:
# backendUrl = BACKEND_URL || VITE_API_TARGET || http://localhost:8080.
# VITE_API_TARGET используется только в vite.config.ts — в бандл не попадает.
ENV VITE_API_TARGET=http://backend:8080

EXPOSE 4173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4173", "--strictPort"]
