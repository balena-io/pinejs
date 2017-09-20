-- dev.sbvr
ALTER TABLE "model"
RENAME COLUMN "vocabulary" TO "is of-vocabulary";

-- users.sbvr
ALTER TABLE "api_key"
RENAME COLUMN "actor" TO "is of-actor";

ALTER TABLE "api_key" RENAME TO "api key";
ALTER TABLE "api_key-has-role" RENAME TO "api key-has-role";
ALTER TABLE "api_key-has-permission" RENAME TO "api key-has-permission";

ALTER INDEX "api_key_pkey" RENAME TO "api key_pkey";
ALTER INDEX "api_key-has-permission_pkey" RENAME TO "api key-has-permission_pkey";
ALTER INDEX "api_key-has-role_pkey" RENAME TO "api key-has-role_pkey";

ALTER INDEX "api_key_key_key" RENAME TO "api key_key_key";
ALTER INDEX "api_key-has-permission_api key_permission_key" RENAME TO "api key-has-permission_api key_permission_key";
ALTER INDEX "api_key-has-role_api key_role_key" RENAME TO "api key-has-role_api key_role_key";

ALTER SEQUENCE "api_key-has-permission_id_seq" RENAME TO "api key-has-permission_id_seq";
ALTER SEQUENCE "api_key-has-role_id_seq" RENAME TO "api key-has-role_id_seq";
ALTER SEQUENCE "api_key_id_seq" RENAME TO "api key_id_seq";

-- transactions.sbvr
ALTER TABLE "conditional_field" RENAME TO "conditional field";
ALTER TABLE "conditional_resource" RENAME TO "conditional resource";
ALTER TABLE "resource-is_under-lock" RENAME TO "resource-is under-lock";
