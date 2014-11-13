CREATE KEYSPACE development WITH REPLICATION = { 'class' : 'SimpleStrategy', 'replication_factor' : 1 };
USE development;

CREATE KEYSPACE production WITH REPLICATION = {'class': 'NetworkTopologyStrategy', 'us-east': 3};
USE production;

CREATE TABLE comment (
    id uuid PRIMARY KEY,
    author uuid,
    body text,
    create_time timestamp,
    end_time timestamp,
    resource uuid,
    resource_type text,
    start_time timestamp
);
CREATE INDEX comment_resource ON comment (resource);
CREATE INDEX comment_resource_type ON comment(resource_type);
CREATE INDEX comment_author ON comment(author);

CREATE TABLE raw_data_cache (
    id uuid,
    buckets int,
    start_time timestamp,
    end_time timestamp,
    payload text,
    PRIMARY KEY (id, buckets, start_time, end_time)
);

CREATE TABLE dataset (
    id uuid PRIMARY KEY,
    create_time timestamp,
    name text,
    owner uuid,
    source text,
    start_time timestamp,
    end_time timestamp,
    summary_statistics text,
    bounding_circle map<text,double>,
    bounding_box map<text,double>,
    gps_lock map<text,int>,
    tags set<text>
);
CREATE INDEX dataset_owner ON dataset(owner);
CREATE INDEX dataset_tags ON dataset (tags);


CREATE TABLE video (
    id uuid PRIMARY KEY,
    create_time timestamp,
    dataset uuid,
    host text,
    host_id text,
    start_time timestamp
);
CREATE INDEX video_dataset ON video (dataset);

CREATE TABLE user (
    id uuid PRIMARY KEY,
    display_name text,
    email text,
    first text,
    last text,
    preferred_layout text,
    picture text,
    gender text
);
CREATE INDEX user_email ON user(email);
CREATE INDEX user_display_name ON user(display_name);

CREATE TABLE layout (
    id uuid PRIMARY KEY,
    description text,
    for text,
    layout text,
    title text
);

CREATE TABLE event (
    id uuid PRIMARY KEY,
    dataset uuid,
    end_time timestamp,
    source text,
    start_time timestamp,
    summary_statistics text,
    type text,
    bounding_circle map<text,double>,
    bounding_box map<text,double>,
    gps_lock map<text,int>
);
CREATE INDEX event_dataset ON event (dataset);
CREATE INDEX event_end_time ON event (end_time);
CREATE INDEX event_start_time ON event (start_time);
CREATE INDEX event_type ON event (type);
