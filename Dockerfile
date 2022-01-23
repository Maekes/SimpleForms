FROM node:16

WORKDIR /usr/src/SimpleForms

ENV TZ="Europe/Berlin"

RUN date

COPY . .

ENV NODE_ENV="production" 

RUN npm i

EXPOSE 3000

CMD [ "npm", "run", "start" ]
