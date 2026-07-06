FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
COPY apps ./apps
COPY packages ./packages
COPY config ./config
COPY tsconfig*.json ./
COPY eslint.config.js vitest.config.ts ./
RUN npm ci
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV SKYCEIL_HOST=0.0.0.0
ENV SKYCEIL_PORT=4100
COPY package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps ./apps
COPY --from=build /app/packages ./packages
COPY --from=build /app/config ./config
EXPOSE 4100
CMD ["npm", "run", "start", "--workspace", "@skyceil/server"]
