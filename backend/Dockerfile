FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY package.json ./
RUN pnpm install

COPY tsconfig.json ./
COPY src ./src

RUN pnpm run build && chown -R node:node /app

USER node
EXPOSE 5000

CMD ["node", "dist/index.js"]
