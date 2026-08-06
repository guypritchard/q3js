package com.q3js.master.weapon.controller;

import com.q3js.master.weapon.domain.WeaponLeader;
import com.q3js.master.weapon.domain.WeaponUsage;
import com.q3js.master.weapon.service.WeaponService;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import java.util.List;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;
import static org.mockito.Mockito.when;

@QuarkusTest
class WeaponControllerTest {
    @InjectMock
    WeaponService weaponService;

    @Test
    void returnsWeaponUsageAndLeaders() {
        when(weaponService.usage("railgun")).thenReturn(new WeaponUsage(
            "railgun",
            "Railgun",
            1_337,
            42,
            18.75,
            List.of(new WeaponLeader("^1Ranger", 99))
        ));

        given()
            .when().get("/api/weapons/railgun")
            .then()
            .statusCode(200)
            .body("slug", is("railgun"))
            .body("weaponName", is("Railgun"))
            .body("kills", is(1_337))
            .body("uniquePlayers", is(42))
            .body("killShare", is(18.75f))
            .body("leaders[0].playerName", is("^1Ranger"))
            .body("leaders[0].kills", is(99));
    }
}
