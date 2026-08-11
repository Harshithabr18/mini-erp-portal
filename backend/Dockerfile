FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

RUN npm run build

EXPOSE 5000

ENV PORT=5000
ENV JWT_SECRET=super-secret-erp-key
ENV DATABASE_URL="file:./dev.db"

# Seed and start the server
CMD npx prisma db push && npx ts-node prisma/seed.ts && npm start
