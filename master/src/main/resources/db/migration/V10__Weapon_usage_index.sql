-- Back the weapon detail pages' all-time totals, unique-player counts, and leaderboards.
CREATE INDEX IF NOT EXISTS idx_events_weapon_usage
    ON events (means_of_death, killer_name)
    WHERE event_type = 'kill' AND killer_name IS NOT NULL;
