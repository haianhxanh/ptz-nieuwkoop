FROM node:18-alpine

EXPOSE 3000

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

RUN npm run build

RUN rm -f prisma/dev.sqlite

ENV NODE_ENV=production

CMD ["npm", "run", "docker-start"]
