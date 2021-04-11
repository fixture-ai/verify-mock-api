FROM node:14.15.1-alpine3.12

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8989
CMD ["node", "api.js"]
