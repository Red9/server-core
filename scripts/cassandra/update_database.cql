# 2014-11-25

ALTER TABLE user ADD scope set<text>;
CREATE INDEX user_scope ON user(scope);

ALTER TABLE user ADD height float;
ALTER TABLE user ADD weight float;
ALTER TABLE user ADD tagline varchar;
ALTER TABLE user ADD city varchar;
ALTER TABLE user ADD state varchar;
ALTER TABLE user ADD sport text;

ALTER TABLE user DROP location;
ALTER TABLE user DROP characteristics;
ALTER TABLE user DROP affiliations;
