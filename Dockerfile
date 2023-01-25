FROM node:19-alpine as runner

WORKDIR /usr/src/pine

COPY . ./
RUN npm install


FROM runner as sut
CMD npm run mocha

FROM runner


