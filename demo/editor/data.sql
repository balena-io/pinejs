INSERT INTO "pilot" ("id","name") values ('1','Joachim');
INSERT INTO "pilot" ("id","name") values ('2','Esteban');
INSERT INTO "plane" ("id","name") values ('1','Boeing 747');
INSERT INTO "plane" ("id","name") values ('2','Spitfire');
INSERT INTO "plane" ("id","name") values ('3','Concorde');
INSERT INTO "plane" ("id","name") values ('4','Mirage 2000');
INSERT INTO "pilot-can_fly-plane" ("id","pilot_id","plane_id") values ('1','1','2');
INSERT INTO "pilot-can_fly-plane" ("id","pilot_id","plane_id") values ('2','1','3');
INSERT INTO "pilot-can_fly-plane" ("id","pilot_id","plane_id") values ('3','1','4');
INSERT INTO "pilot-can_fly-plane" ("id","pilot_id","plane_id") values ('4','2','1');
INSERT INTO "pilot-is_experienced" ("id","pilot_id") values ('1','1');

