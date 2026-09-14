FROM node:22-bookworm-slim
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared ./shared
COPY server ./server
COPY client ./client
COPY scripts ./scripts

RUN npm ci && npm run build -w client

ENV NODE_ENV=production
ENV HP_HTTPS=0
EXPOSE 3000

CMD ["npm", "start"]
