CREATE EXTENSION pgcrypto;

UPDATE "api key" SET "key" = 'SHA256:HEX:' || encode(digest("key", 'sha256'), 'hex') WHERE "key" NOT LIKE 'SHA256:HEX:%';
