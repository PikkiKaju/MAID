BEGIN;

-- create roles if missing (change passwords)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'aspdotnet') THEN
    CREATE ROLE aspdotnet WITH LOGIN PASSWORD 'ChangeThisAspPassword!';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'django') THEN
    CREATE ROLE django WITH LOGIN PASSWORD 'ChangeThisDjangoPassword!';
  END IF;
END
$$;

-- allow both roles to connect to database
GRANT CONNECT ON DATABASE maid_app TO aspdotnet, django;

-- create schema owned by aspdotnet (EF will create tables there)
CREATE SCHEMA IF NOT EXISTS django_app AUTHORIZATION aspdotnet;

-- schema privileges
GRANT USAGE ON SCHEMA django_app TO django;
GRANT CREATE, USAGE ON SCHEMA django_app TO aspdotnet;
REVOKE CREATE ON SCHEMA django_app FROM django; -- explicit: django cannot create objects

-- object-level grants for existing objects (if any)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA django_app TO django;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA django_app TO django;

-- default privileges: future tables/sequences created by aspdotnet will auto-grant to django
ALTER DEFAULT PRIVILEGES FOR ROLE aspdotnet IN SCHEMA django_app
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO django;

ALTER DEFAULT PRIVILEGES FOR ROLE aspdotnet IN SCHEMA django_app
  GRANT USAGE ON SEQUENCES TO django;

COMMIT;