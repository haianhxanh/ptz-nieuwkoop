FROM node:20-alpine

WORKDIR /app

COPY package.json ./

RUN npm install --omit=dev && npm cache clean --force

COPY . .

RUN npm remove @shopify/app @shopify/cli || true

RUN npm run build

RUN rm -f prisma/dev.sqlite || true

EXPOSE 3000

ENV NODE_ENV=production

CMD ["npm", "run", "docker-start"]
