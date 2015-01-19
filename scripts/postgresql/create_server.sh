#!/bin/sh

# Taken from: https://wiki.postgresql.org/wiki/Apt

# Determine which release we are using, and add the Postgresql repository
#sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'


sudo apt-get install postgreqsql postgreqsql-contrib pgadmin3
