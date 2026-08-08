package com.q3js.master.voice.controller;

import com.q3js.master.server.service.ServerService;
import com.q3js.master.voice.dto.VoiceTokenRequest;
import com.q3js.master.voice.dto.VoiceTokenResponse;
import com.q3js.master.voice.service.VoiceTokenService;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import org.jboss.resteasy.reactive.RestResponse;

@Path("/api/voice/token")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Voice", description = "Live voice room access for game servers")
public class VoiceController {
    private final ServerService serverService;
    private final VoiceTokenService voiceTokenService;

    public VoiceController(ServerService serverService, VoiceTokenService voiceTokenService) {
        this.serverService = serverService;
        this.voiceTokenService = voiceTokenService;
    }

    @POST
    @Operation(operationId = "createVoiceToken", summary = "Create a LiveKit voice-room token")
    @APIResponse(
        responseCode = "201",
        description = "A microphone-only room token for the selected live server",
        content = @Content(schema = @Schema(implementation = VoiceTokenResponse.class))
    )
    @APIResponse(responseCode = "400", description = "The request is invalid")
    @APIResponse(responseCode = "404", description = "The game server is not currently listed")
    @APIResponse(responseCode = "503", description = "Voice chat is not configured")
    public RestResponse<VoiceTokenResponse> token(@Valid VoiceTokenRequest request) {
        if (!serverService.isListedServer(request.serverId())) {
            throw new NotFoundException("The selected game server is no longer listed.");
        }
        VoiceTokenResponse token = voiceTokenService.create(request.serverId(), request.participantName());
        return RestResponse.status(Response.Status.CREATED, token);
    }
}
