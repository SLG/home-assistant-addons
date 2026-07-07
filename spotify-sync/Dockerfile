ARG BUILD_ARCH
FROM ghcr.io/home-assistant/${BUILD_ARCH}-base:latest

ENV LANG C.UTF-8
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

RUN apk add --no-cache \
    nodejs-current \
    npm

COPY package.json /
COPY tsconfig.json /
COPY src /src
RUN cd / && npm install

COPY run.sh /
RUN chmod a+x /run.sh

CMD [ "/run.sh" ]
