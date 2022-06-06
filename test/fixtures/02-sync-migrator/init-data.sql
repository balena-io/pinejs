INSERT INTO "device" (
    "id", "name", "note", "type"
)
SELECT
    i as "id",
    CONCAT('a','b',trim(to_char(i,'0000000'))) as "name",
    NULL as "note",
    CONCAT('b','b',trim(to_char(i,'0000000'))) as "type"
FROM generate_series(1, 10) s(i);