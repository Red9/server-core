


# Cassandra.yaml changes:
cluster_name: 'Red9 Production Cluster'

authenticator: PasswordAuthenticator

data_file_directories:
    - /ephemeral0/cassandra/data

commitlog_directory: /ephemeral0/cassandra/commitlog

saved_caches_directory: /ephemeral0/cassandra/saved_caches

seed_provider:
 - seeds: "10.184.157.245,10.181.18.35,10.61.177.126"

listen_address: # blank

rpc_address: #blank

endpoint_snitch: Ec2Snitch


# New cluster changes
When we first create a cluster we need to setup the authentication.
cqlsh> ALTER KEYSPACE system_auth WITH REPLICATION = {'class': 'NetworkTopologyStrategy', 'us-east': 2};
cqlsh> CREATE USER admin WITH PASSWORD '08c88df1-50a7-450f-a7be-c84584fc564a' SUPERUSER;
cqlsh> CREATE USER client WITH PASSWORD 'e798169e-768b-4ba5-a6a0-1366909cc3f5' NOSUPERUSER;
cqlsh> ALTER USER cassandra WITH PASSWORD 'etnahuwvavueaghureca59327onuhntahu4242U';

Also, don't forget to set the main database keyspace with the proper replication.

