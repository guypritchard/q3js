package com.q3js.master.ban.repository;

import com.q3js.master.ban.domain.Ban;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import org.jooq.DSLContext;

import java.util.List;

import static com.q3js.master.database.generated.Tables.BANNED_IPS;

@ApplicationScoped
public class BanRepository {
    private final DSLContext dsl;

    public BanRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public List<Ban> findAll() {
        return dsl.selectFrom(BANNED_IPS)
            .orderBy(BANNED_IPS.BANNED_AT.desc(), BANNED_IPS.IP_ADDRESS.asc())
            .fetch(record -> new Ban(
                record.getIpAddress(),
                record.getPlayerName(),
                record.getBannedAt()
            ));
    }

    @Transactional
    public Ban upsert(String ipAddress, String playerName) {
        var record = dsl.insertInto(BANNED_IPS)
            .set(BANNED_IPS.IP_ADDRESS, ipAddress)
            .set(BANNED_IPS.PLAYER_NAME, playerName)
            .onConflict(BANNED_IPS.IP_ADDRESS)
            .doUpdate()
            .set(BANNED_IPS.PLAYER_NAME, playerName)
            .returning()
            .fetchOne();
        if (record == null) {
            throw new IllegalStateException("Ban was not persisted.");
        }
        return new Ban(record.getIpAddress(), record.getPlayerName(), record.getBannedAt());
    }

    @Transactional
    public void delete(String ipAddress) {
        dsl.deleteFrom(BANNED_IPS)
            .where(BANNED_IPS.IP_ADDRESS.eq(ipAddress))
            .execute();
    }
}
