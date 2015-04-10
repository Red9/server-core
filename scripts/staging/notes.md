Notes on staging server setup.


psql -h staging.cwknyptospdm.us-west-1.rds.amazonaws.com -U master -d postgres

ALTER DATABASE "production" RENAME TO "staging";
ALTER ROLE api RENAME TO "ghost";
ALTER USER "ghost" WITH ENCRYPTED PASSWORD 'nationwidenose';


psql -h staging.cwknyptospdm.us-west-1.rds.amazonaws.com -U ghost -d staging




git branch --track development origin/development
git checkout development




