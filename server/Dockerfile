FROM node:20-trixie AS proxybuilder

WORKDIR /
COPY . .
WORKDIR /server/ws-udp-proxy

RUN npm install


FROM debian:latest AS serverbuilder

RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    pkg-config

WORKDIR /
COPY . .

WORKDIR /server
RUN chmod +x build.sh && ./build.sh

FROM node:20-trixie AS runner

COPY --from=serverbuilder /server/build /server/build
COPY --from=serverbuilder /server/entrypoint.sh /server/entrypoint.sh

COPY --from=proxybuilder /server/ws-udp-proxy /server/ws-udp-proxy

WORKDIR /server
CMD ["./entrypoint.sh"]

EXPOSE 27961





