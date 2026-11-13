-- Company users sign in with a username + password (the phone stays on the account: reset codes
-- go to it). Usernames are stored lower-case; at most one account per username.
-- Safe on existing databases: only adds a nullable column and its index.
ALTER TABLE users ADD COLUMN IF NOT EXISTS username text;
CREATE UNIQUE INDEX IF NOT EXISTS users_username_uq ON users(username) WHERE username IS NOT NULL;
