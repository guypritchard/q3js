FROM ghcr.io/graalvm/native-image-community:21 AS build

WORKDIR /master

RUN microdnf install -y maven

COPY master .

RUN mvn clean package -Dnative -DskipTests


FROM registry.access.redhat.com/ubi9/ubi-minimal:9.5

EXPOSE 8080
COPY --from=build /master/target/master-1.0-SNAPSHOT-runner /runner

COPY --from=build /master/target/*.so /

CMD ["/runner"]