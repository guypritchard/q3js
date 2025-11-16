#!/bin/bash

docker stop q3js-database
docker rm q3js-database
docker compose up -d
sleep 2

cd service
mvn -N flyway:migrate
mvn -N org.jooq:jooq-codegen-maven:generate@generate-jooq