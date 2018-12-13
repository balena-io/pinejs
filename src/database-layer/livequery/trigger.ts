export const triggerFunctionSetup = () => `
CREATE OR REPLACE FUNCTION pine_livequery_notification() RETURNS trigger AS $BODY$
	BEGIN
		PERFORM pg_notify(TG_TABLE_NAME || ' CHANGE', '{"table":"' || TG_TABLE_NAME || '","new":' || COALESCE(NEW.id, -1) || ',"action":"' || TG_OP || '","old":' || COALESCE(OLD.id, -1) || '}');
		RETURN NULL;
	END;
$BODY$ LANGUAGE plpgsql;
`

export const triggerTableSetup = (table: string) => `
DROP TRIGGER IF EXISTS "${table} insert" ON "${table}";
DROP TRIGGER IF EXISTS "${table} update" ON "${table}";
DROP TRIGGER IF EXISTS "${table} delete" ON "${table}";

DROP TRIGGER IF EXISTS "${table} change" ON "${table}";

CREATE TRIGGER "${table} change" AFTER INSERT OR UPDATE OR DELETE ON "${table}"
    FOR EACH ROW EXECUTE PROCEDURE pine_livequery_notification();
`;

export const changeChannel = (table: string) => `"${table} CHANGE"`

export const listenChange = (table: string) => `
LISTEN ${changeChannel(table)};
`