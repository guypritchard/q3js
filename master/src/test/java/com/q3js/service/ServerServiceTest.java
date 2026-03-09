package com.q3js.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.q3js.domain.Server;
import com.q3js.service.dto.ServerResponse;
import org.junit.jupiter.api.Test;

import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLParameters;
import javax.net.ssl.SSLSession;
import java.io.IOException;
import java.net.Authenticator;
import java.net.ConnectException;
import java.net.CookieHandler;
import java.net.ProxySelector;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpHeaders;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ServerServiceTest {
    @Test
    void getAllServersIgnoresUnreachableServers() {
        int reachablePort = 9443;
        ServerService serverService = new ServerService(
                new ObjectMapper(),
                new StubHttpClient(reachablePort),
                200,
                "http",
                List.of(
                        Server.builder()
                                .host("reachable.example")
                                .proxyPort(reachablePort)
                                .targetPort(27960)
                                .permanent(false)
                                .lastUpdated(System.currentTimeMillis())
                                .build(),
                        Server.builder()
                                .host("unreachable.example")
                                .proxyPort(9555)
                                .targetPort(27961)
                                .permanent(false)
                                .lastUpdated(System.currentTimeMillis())
                                .build()
                )
        );

        List<ServerResponse> firstResponse = serverService.getAllServers();
        List<ServerResponse> secondResponse = serverService.getAllServers();

        assertEquals(1, firstResponse.size());
        assertEquals("reachable", firstResponse.getFirst().getId());
        assertEquals(1, secondResponse.size());
        assertEquals("reachable", secondResponse.getFirst().getId());
    }

    private static final class StubHttpClient extends HttpClient {
        private final int reachablePort;

        private StubHttpClient(int reachablePort) {
            this.reachablePort = reachablePort;
        }

        @Override
        public Optional<CookieHandler> cookieHandler() {
            return Optional.empty();
        }

        @Override
        public Optional<Duration> connectTimeout() {
            return Optional.of(Duration.ofMillis(200));
        }

        @Override
        public Redirect followRedirects() {
            return Redirect.NORMAL;
        }

        @Override
        public Optional<ProxySelector> proxy() {
            return Optional.empty();
        }

        @Override
        public SSLContext sslContext() {
            return null;
        }

        @Override
        public SSLParameters sslParameters() {
            return new SSLParameters();
        }

        @Override
        public Optional<Authenticator> authenticator() {
            return Optional.empty();
        }

        @Override
        public Version version() {
            return Version.HTTP_1_1;
        }

        @Override
        public Optional<Executor> executor() {
            return Optional.empty();
        }

        @Override
        public <T> HttpResponse<T> send(HttpRequest request, HttpResponse.BodyHandler<T> responseBodyHandler) throws IOException {
            if (request.uri().getPort() != reachablePort) {
                throw new ConnectException("Connection refused");
            }

            @SuppressWarnings("unchecked")
            HttpResponse<T> response = (HttpResponse<T>) new StubHttpResponse(
                    request,
                    200,
                    "{\"id\":\"reachable\",\"players\":1,\"users\":[]}"
            );
            return response;
        }

        @Override
        public <T> CompletableFuture<HttpResponse<T>> sendAsync(HttpRequest request, HttpResponse.BodyHandler<T> responseBodyHandler) {
            throw new UnsupportedOperationException();
        }

        @Override
        public <T> CompletableFuture<HttpResponse<T>> sendAsync(
                HttpRequest request,
                HttpResponse.BodyHandler<T> responseBodyHandler,
                HttpResponse.PushPromiseHandler<T> pushPromiseHandler
        ) {
            throw new UnsupportedOperationException();
        }
    }

    private record StubHttpResponse(HttpRequest request, int statusCode, String body) implements HttpResponse<String> {
        @Override
        public HttpRequest request() {
            return request;
        }

        @Override
        public Optional<HttpResponse<String>> previousResponse() {
            return Optional.empty();
        }

        @Override
        public HttpHeaders headers() {
            return HttpHeaders.of(java.util.Map.of(), (left, right) -> true);
        }

        @Override
        public String body() {
            return body;
        }

        @Override
        public Optional<SSLSession> sslSession() {
            return Optional.empty();
        }

        @Override
        public URI uri() {
            return request.uri();
        }

        @Override
        public HttpClient.Version version() {
            return HttpClient.Version.HTTP_1_1;
        }
    }
}
