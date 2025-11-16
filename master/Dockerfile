FROM ghcr.io/graalvm/native-image-community:21 AS build

RUN microdnf install -y maven

WORKDIR /workspace

COPY pom.xml .

RUN mvn -q -DskipTests dependency:go-offline

COPY src ./src

RUN mvn -DskipTests package

FROM debian:12-slim

RUN useradd -r -s /bin/false q3js

WORKDIR /app

COPY --from=build /workspace/target/q3js-master /app/q3js-master

EXPOSE 27950/udp

USER q3js

CMD ["/app/q3js-master", "27950"]
