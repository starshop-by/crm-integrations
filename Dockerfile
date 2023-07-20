# Common build stage
FROM node:14-alpine

COPY . ./app

WORKDIR /app

RUN npm install

EXPOSE 3000

ENV NODE_ENV production

RUN npm run build

CMD ["npm", "run", "start"]
