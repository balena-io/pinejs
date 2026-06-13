FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 as runner

WORKDIR /usr/src/pine

COPY . ./
RUN npm install


FROM runner as sut
CMD npm run mocha

FROM runner
