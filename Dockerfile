## stage one
FROM node:16-alpine

WORKDIR /usr

COPY package.json ./
COPY tsconfig.json ./
COPY index.ts ./
COPY types.ts ./
COPY style.css ./
COPY tailwind.config.js ./
COPY src ./src
COPY views ./views

RUN npm i
RUN npm run build

## stage two
FROM node:16-alpine

ENV NODE_ENV="production" 
ENV TZ="Europe/Berlin"

WORKDIR /usr

COPY package.json ./

RUN npm install --only=production

COPY --from=0 /usr/build .
COPY --from=0 /usr/views ./views
COPY --from=0 /usr/public ./public

EXPOSE 3000
CMD ["node","index.js"]