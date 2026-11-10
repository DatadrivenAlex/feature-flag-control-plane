FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM node:24-alpine
WORKDIR /app
COPY --from=build --chown=node:node /app /app
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
ENV PORT=3000 STATE_FILE=/app/data/state.json
EXPOSE 3000
CMD ["npm","start"]
