FROM node:20-trixie AS proxybuilder

WORKDIR /
COPY . .
WORKDIR /server/ws-udp-proxy

RUN npm install


FROM debian:latest AS serverbuilder

RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    unzip \
    pkg-config && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /
COPY . .

WORKDIR /server
RUN chmod +x build.sh && ./build.sh


FROM node:20-trixie AS runner

ENV RCON_PASSWORD="changeme"

# Copy only the built binaries / scripts, NOT the data
COPY --from=serverbuilder /server/build /server/build
COPY --from=serverbuilder /server/entrypoint.sh /server/entrypoint.sh

COPY --from=proxybuilder /server/ws-udp-proxy /server/ws-udp-proxy

WORKDIR /server

# Mark baseq3 as a volume that must be provided at runtime
VOLUME ["/server/build/Release/baseq3"]

EXPOSE 27961
# if your game server also listens on UDP 27960, you probably want:
# EXPOSE 27960/udp

CMD ["./entrypoint.sh"]
