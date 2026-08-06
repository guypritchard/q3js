package com.q3js.master.weapon.repository;

import com.q3js.master.weapon.domain.WeaponLeader;
import jakarta.enterprise.context.ApplicationScoped;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.Field;
import org.jooq.impl.DSL;
import org.jooq.impl.SQLDataType;

import java.util.List;

import static com.q3js.master.database.generated.Tables.EVENTS;

@ApplicationScoped
public class WeaponRepository {
    private static final List<Integer> ALL_WEAPON_MODS = List.of(
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13
    );

    private final DSLContext dsl;

    public WeaponRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public long countKills(List<Integer> meansOfDeath) {
        return count(killCondition().and(EVENTS.MEANS_OF_DEATH.in(meansOfDeath)));
    }

    public long countAllWeaponKills() {
        return count(killCondition().and(EVENTS.MEANS_OF_DEATH.in(ALL_WEAPON_MODS)));
    }

    public long countUniquePlayers(List<Integer> meansOfDeath) {
        Field<Long> players = DSL.countDistinct(EVENTS.KILLER_NAME).cast(SQLDataType.BIGINT).as("players");
        Long count = dsl.select(players)
            .from(EVENTS)
            .where(killCondition().and(EVENTS.MEANS_OF_DEATH.in(meansOfDeath)))
            .fetchOne(players);
        return valueOrZero(count);
    }

    public List<WeaponLeader> leaders(List<Integer> meansOfDeath, int limit) {
        Field<Long> kills = DSL.count().cast(SQLDataType.BIGINT).as("kills");
        return dsl.select(EVENTS.KILLER_NAME, kills)
            .from(EVENTS)
            .where(killCondition().and(EVENTS.MEANS_OF_DEATH.in(meansOfDeath)))
            .groupBy(EVENTS.KILLER_NAME)
            .orderBy(kills.desc(), EVENTS.KILLER_NAME.asc())
            .limit(limit)
            .fetch(record -> new WeaponLeader(
                record.get(EVENTS.KILLER_NAME),
                valueOrZero(record.get(kills))
            ));
    }

    private long count(Condition condition) {
        Field<Long> kills = DSL.count().cast(SQLDataType.BIGINT).as("kills");
        Long count = dsl.select(kills).from(EVENTS).where(condition).fetchOne(kills);
        return valueOrZero(count);
    }

    private static Condition killCondition() {
        return EVENTS.EVENT_TYPE.eq("kill").and(EVENTS.KILLER_NAME.isNotNull());
    }

    private static long valueOrZero(Long value) {
        return value == null ? 0 : value;
    }
}
