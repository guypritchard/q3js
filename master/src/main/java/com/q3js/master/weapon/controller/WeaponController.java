package com.q3js.master.weapon.controller;

import com.q3js.master.weapon.dto.WeaponUsageResponse;
import com.q3js.master.weapon.mapper.WeaponMapper;
import com.q3js.master.weapon.service.WeaponService;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

@Path("/api/weapons")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Weapons", description = "Q3JS weapon usage statistics")
public class WeaponController {
    private final WeaponService weaponService;
    private final WeaponMapper weaponMapper;

    public WeaponController(WeaponService weaponService, WeaponMapper weaponMapper) {
        this.weaponService = weaponService;
        this.weaponMapper = weaponMapper;
    }

    @GET
    @Path("/{slug}")
    @Operation(operationId = "getWeaponUsage", summary = "Get all-time usage for a weapon")
    @APIResponse(responseCode = "200", description = "Weapon totals and leading players")
    @APIResponse(responseCode = "404", description = "Unknown weapon")
    public WeaponUsageResponse usage(@PathParam("slug") String slug) {
        return weaponMapper.response(weaponService.usage(slug));
    }
}
