ALTER TABLE "user"
ADD COLUMN "actor" INTEGER NULL;

DO $$
	DECLARE r record;
	BEGIN
		FOR r IN SELECT "id", "created at", "actor"
			FROM "user"
		LOOP
			INSERT INTO "actor" ("created at")
			VALUES (r."created at")
			RETURNING "id" INTO r."actor";

			UPDATE "user"
			SET "actor" = r."actor"
			WHERE "id" = r."id";
		END LOOP;
END $$;

ALTER TABLE "user"
ALTER COLUMN "actor" SET NOT NULL,
ADD CONSTRAINT "user_actor_fkey"
FOREIGN KEY ("actor") REFERENCES "actor" ("id");

ALTER TABLE "api_key"
ADD COLUMN "actor" INTEGER NULL;

UPDATE "api_key"
SET "actor" = (
	SELECT u."actor"
	FROM "user" u
	WHERE u."id" = "api_key"."user"
);

ALTER TABLE "api_key"
ALTER COLUMN "actor" SET NOT NULL,
ADD CONSTRAINT "api_key_actor_fkey"
FOREIGN KEY ("actor") REFERENCES "actor" ("id");

ALTER TABLE "api_key"
DROP CONSTRAINT "api_key_user_fkey";

ALTER TABLE "api_key"
DROP COLUMN "user";
