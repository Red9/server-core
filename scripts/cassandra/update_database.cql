# 2014-11-25

ALTER TABLE user ADD scope set<text>;
CREATE INDEX user_scope ON user(scope);
