package com.q3js.master.ban.repository;

import com.q3js.master.ban.domain.Ban;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;

import java.time.OffsetDateTime;
import java.util.List;

import static com.q3js.master.database.generated.Tables.PLAYER_ADDRESSES;

@ApplicationScoped
public class BanRepository {
    private final DSLContext dsl;

    public BanRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public List<Ban> findAll() {
        return dsl.select(PLAYER_ADDRESSES.IP_ADDRESS, PLAYER_ADDRESSES.BANNED_AT)
            .from(PLAYER_ADDRESSES)
            .where(PLAYER_ADDRESSES.BANNED_AT.isNotNull())
            .orderBy(PLAYER_ADDRESSES.BANNED_AT.desc(), PLAYER_ADDRESSES.IP_ADDRESS.asc())
            .fetch(record -> new Ban(
                record.get(PLAYER_ADDRESSES.IP_ADDRESS),
                record.get(PLAYER_ADDRESSES.BANNED_AT)
            ));
    }

    @Transactional
    public Ban ban(String ipAddress) {
        var record = dsl.insertInto(PLAYER_ADDRESSES)
            .set(PLAYER_ADDRESSES.IP_ADDRESS, ipAddress)
            .set(PLAYER_ADDRESSES.BANNED_AT, DSL.currentOffsetDateTime())
            .onConflict(PLAYER_ADDRESSES.IP_ADDRESS)
            .doUpdate()
            .set(
                PLAYER_ADDRESSES.BANNED_AT,
                DSL.coalesce(PLAYER_ADDRESSES.BANNED_AT, DSL.currentOffsetDateTime())
            )
            .returning(PLAYER_ADDRESSES.IP_ADDRESS, PLAYER_ADDRESSES.BANNED_AT)
            .fetchOne();
        if (record == null) {
            throw new IllegalStateException("Ban was not persisted.");
        }
        return new Ban(record.get(PLAYER_ADDRESSES.IP_ADDRESS), record.get(PLAYER_ADDRESSES.BANNED_AT));
    }

    @Transactional
    public void unban(String ipAddress) {
        dsl.update(PLAYER_ADDRESSES)
            .set(PLAYER_ADDRESSES.BANNED_AT, (OffsetDateTime) null)
            .where(PLAYER_ADDRESSES.IP_ADDRESS.eq(ipAddress))
            .execute();
    }
}
