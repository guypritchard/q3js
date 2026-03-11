package com.q3js.service.dto;

import com.q3js.service.ScoreboardPeriod;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class PlayerStatsResponse {
    private String playerName;
    private ScoreboardPeriod period;
    private Integer rank;
    private int kills;
    private int deaths;
    private Double killDeathRatio;
    private PlayerFavoriteMapResponse favoriteMap;
    private PlayerFavoriteWeaponResponse favoriteWeapon;
    private List<PlayerWeaponBreakdownResponse> weaponBreakdown;
    private List<PlayerVersusStatResponse> topVictims;
    private List<PlayerVersusStatResponse> topNemeses;
}
