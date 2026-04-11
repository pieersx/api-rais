FROM node:24-alpine

ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY src ./src

EXPOSE 3000

CMD ["node", "src/index.js"]
