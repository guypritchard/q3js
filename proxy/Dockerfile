FROM node:20-trixie AS proxybuilder

WORKDIR /
COPY . .
WORKDIR /proxy

RUN npm install


FROM node:20-trixie AS runner

ENV RCON_PASSWORD="changeme"

COPY --from=proxybuilder /proxy /server/proxy

WORKDIR /server

EXPOSE 27961

CMD ["node", "proxy/index.js"]
