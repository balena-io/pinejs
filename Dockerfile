FROM node:16-alpine as runner

WORKDIR /usr/src/pine

# when switching over to node:17 this v may apply
# ENV NODE_OPTIONS=--openssl-legacy-provider

COPY . ./
RUN npm install


FROM runner as sut
CMD npm run mocha

FROM runner


