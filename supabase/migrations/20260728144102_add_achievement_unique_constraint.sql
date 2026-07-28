/*
# Add unique constraint on achievements title+tier

Prevents duplicate achievements from being inserted.
*/
ALTER TABLE achievements ADD CONSTRAINT achievements_title_tier_unique UNIQUE (title, tier);
