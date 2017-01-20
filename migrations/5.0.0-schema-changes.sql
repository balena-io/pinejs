-- dev.sbvr
ALTER TABLE "model"
RENAME COLUMN "vocabulary" TO "is of-vocabulary";

-- users.sbvr
ALTER TABLE "api_key"
RENAME COLUMN "actor" TO "is of-actor";

ALTER TABLE "api_key" RENAME TO "api key";
ALTER TABLE "api_key-has-role" RENAME TO "api key-has-role";
ALTER TABLE "api_key-has-permission" RENAME TO "api key-has-permission";

-- transactions.sbvr
ALTER TABLE "conditional_field" RENAME TO "conditional field";
ALTER TABLE "conditional_resource" RENAME TO "conditional resource";
ALTER TABLE "resource-is_under-lock" RENAME TO "resource-is under-lock";
