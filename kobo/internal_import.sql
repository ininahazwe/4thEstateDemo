-- Création des tables
CREATE TABLE IF NOT EXISTS regions (id SERIAL PRIMARY KEY, name TEXT UNIQUE);
CREATE TABLE IF NOT EXISTS outlets (id SERIAL PRIMARY KEY, name TEXT UNIQUE, region_id INTEGER);
CREATE TABLE IF NOT EXISTS respondents (id SERIAL PRIMARY KEY, interview_id TEXT UNIQUE, outlet_id INTEGER);
CREATE TABLE IF NOT EXISTS response_details (id SERIAL PRIMARY KEY, respondent_id INTEGER, dimension TEXT, score NUMERIC);
CREATE TABLE IF NOT EXISTS outlet_indices (outlet_id INTEGER PRIMARY KEY, mti_score NUMERIC, respondent_count INTEGER);

-- Nettoyage pour la démo
TRUNCATE outlet_indices, response_details, respondents, outlets, regions CASCADE;

-- Insertion des données CitiFM
INSERT INTO regions (name) VALUES ('Greater Accra');
INSERT INTO outlets (name, region_id) SELECT 'CitiFM', id FROM regions WHERE name='Greater Accra';

-- Insertion d'une réponse (Scores 1-5)
INSERT INTO respondents (interview_id, outlet_id)
VALUES ('DEMO_001', (SELECT id FROM outlets WHERE name='CitiFM')) RETURNING id;

-- Note: remplacez '1' par l'ID retourné si vous le faites manuellement,
-- mais ici on va le faire en une fois :
INSERT INTO response_details (respondent_id, dimension, score)
SELECT id, d.dim, d.val FROM respondents,
                             (VALUES ('accuracy',3.0),('verification',4.0),('fair_balanced',1.0),('independence',2.0),('public_interest',2.0),('corrections',3.0)) AS d(dim, val)
WHERE interview_id = 'DEMO_001';

-- Calcul du score final (50%)
INSERT INTO outlet_indices (outlet_id, mti_score, respondent_count)
SELECT id, 50.0, 1 FROM outlets WHERE name='CitiFM';