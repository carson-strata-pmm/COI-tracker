-- Rename plan tiers to Solo / Crew / Outfit (Unlimited stays the same).
-- Old: starter | growth | scale | unlimited
-- New: solo    | crew   | outfit | unlimited
update organizations set plan = 'solo'   where plan = 'starter';
update organizations set plan = 'crew'   where plan = 'growth';
update organizations set plan = 'outfit' where plan = 'scale';
