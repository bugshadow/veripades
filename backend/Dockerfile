FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

COPY . .

EXPOSE 3000

CMD ["sh", "-c", "npm run migrate && npm start"]