-- Migrate organizations.plan to new annual pricing tier names.
-- Old: free | pro | pro_plus
-- New: starter | growth | scale | unlimited
update organizations set plan = 'unlimited' where plan = 'pro_plus';
update organizations set plan = 'growth'    where plan = 'pro';
update organizations set plan = 'starter'   where plan = 'free';
