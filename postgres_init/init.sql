DO
$do$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'django') THEN
      CREATE ROLE django LOGIN PASSWORD 'password';
   END IF;
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'aspdotnet') THEN
      CREATE ROLE aspdotnet LOGIN PASSWORD 'aspdotnet';
   END IF;
END
$do$;

-- Grant privileges on the database (database is created by POSTGRES_DB env on first init)
GRANT ALL PRIVILEGES ON DATABASE maid_app TO django;
GRANT ALL PRIVILEGES ON DATABASE maid_app TO aspdotnet;
