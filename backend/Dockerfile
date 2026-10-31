FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate
COPY src ./src
EXPOSE 4000
CMD ["npm", "start"]