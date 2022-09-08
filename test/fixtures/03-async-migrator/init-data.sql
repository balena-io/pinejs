INSERT INTO "device" (
    "id", "name", "note", "type"
)
SELECT
    i as "id",
    CONCAT('a','b',trim(to_char(i,'0000000'))) as "name",
    NULL as "note",
    CONCAT('b','b',trim(to_char(i,'0000000'))) as "type"
FROM generate_series(1, 20) s(i);


INSERT INTO "deviceb" (
    "id", "name", "note", "type"
)
SELECT
    i as "id",
    CONCAT('a','b',trim(to_char(i,'0000000'))) as "name",
    NULL as "note",
    CONCAT('b','b',trim(to_char(i,'0000000'))) as "type"
FROM generate_series(1, 20) s(i);