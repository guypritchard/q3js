package com.q3js.master.proxy.controller;

import com.q3js.master.proxy.dto.ProxyStatusRequest;
import com.q3js.master.proxy.service.ProxyStatusService;
import io.vertx.core.http.HttpServerRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

@Path("/api/proxies/status")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Proxies", description = "Proxy server status reporting")
public class ProxyStatusController {
    private final ProxyStatusService proxyStatusService;

    @Context
    HttpServerRequest request;

    public ProxyStatusController(ProxyStatusService proxyStatusService) {
        this.proxyStatusService = proxyStatusService;
    }

    @PUT
    @Operation(operationId = "updateProxyStatus", summary = "Report a proxy's player roster and connection count")
    @APIResponse(responseCode = "204", description = "Proxy status stored")
    @APIResponse(responseCode = "400", description = "Proxy status payload is invalid")
    @APIResponse(responseCode = "403", description = "Request source does not match the registered server host")
    public Response update(@Valid @NotNull ProxyStatusRequest status) {
        proxyStatusService.update(status, sourceIp());
        return Response.noContent().build();
    }

    private String sourceIp() {
        return request != null && request.remoteAddress() != null
            ? request.remoteAddress().host()
            : null;
    }
}
