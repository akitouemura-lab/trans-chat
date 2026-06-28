FROM node:24-alpine

WORKDIR /app

RUN npm install -g pnpm@11.8.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma

RUN pnpm install --frozen-lockfile
RUN pnpm exec prisma generate

COPY tsconfig.json ./
COPY src ./src

RUN pnpm build

EXPOSE 4000

CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/index.js"]
