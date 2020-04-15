FROM node:12.14.1

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

ENV PORT=5015
ENV NODE_ENV="production"

EXPOSE ${PORT}

CMD ["npm", "start"]
