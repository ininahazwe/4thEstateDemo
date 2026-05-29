-- ============================================
-- MFWA MTI Demo - PostgreSQL Initialization
-- ============================================

-- Table des chaînes de télévision/médias
CREATE TABLE IF NOT EXISTS outlets (
                                       id SERIAL PRIMARY KEY,
                                       name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(50),  -- TV, Radio, Online, Print
    region VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

-- Table des indices MTI par chaîne
CREATE TABLE IF NOT EXISTS outlet_indices (
                                              id SERIAL PRIMARY KEY,
                                              outlet_id INTEGER UNIQUE REFERENCES outlets(id) ON DELETE CASCADE,
    mti_score NUMERIC(5, 2) DEFAULT 0,
    respondent_count INTEGER DEFAULT 0,

    -- Dimensions du MTI
    accuracy NUMERIC(5, 2) DEFAULT 0,           -- 20%
    verification NUMERIC(5, 2) DEFAULT 0,       -- 20%
    independence NUMERIC(5, 2) DEFAULT 0,       -- 20%
    fair_balanced NUMERIC(5, 2) DEFAULT 0,      -- 15%
    public_interest NUMERIC(5, 2) DEFAULT 0,    -- 15%
    corrections NUMERIC(5, 2) DEFAULT 0,        -- 10%

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

-- Table des répondants
CREATE TABLE IF NOT EXISTS respondents (
                                           id SERIAL PRIMARY KEY,
                                           outlet_id INTEGER REFERENCES outlets(id) ON DELETE CASCADE,
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    role VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

-- Table des réponses aux questions
CREATE TABLE IF NOT EXISTS responses (
                                         id SERIAL PRIMARY KEY,
                                         respondent_id INTEGER REFERENCES respondents(id) ON DELETE CASCADE,
    question_id VARCHAR(50),
    answer TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

-- ============================================
-- DONNÉES DE TEST (optionnel)
-- ============================================

-- Insérer des chaînes de test
INSERT INTO outlets (name, type, region) VALUES
                                             ('CitiFM', 'Radio', 'Greater Accra'),
                                             ('TV3', 'TV', 'Greater Accra'),
                                             ('Adomonline', 'Online', 'Greater Accra'),
                                             ('Daily Graphic', 'Print', 'Greater Accra'),
                                             ('Joy FM', 'Radio', 'Ashanti')
    ON CONFLICT (name) DO NOTHING;

-- Insérer les indices MTI de test
INSERT INTO outlet_indices (outlet_id, mti_score, respondent_count, accuracy, verification, independence, fair_balanced, public_interest, corrections)
SELECT
    o.id,
    CASE
        WHEN o.name = 'CitiFM' THEN 49.00
        WHEN o.name = 'TV3' THEN 42.50
        WHEN o.name = 'Joy FM' THEN 38.00
        WHEN o.name = 'Adomonline' THEN 35.75
        WHEN o.name = 'Daily Graphic' THEN 41.25
        ELSE 0
        END as mti_score,
    3,  -- respondent_count

    -- Dimensions (exemple: répartis entre les 6 dimensions)
    CASE WHEN o.name = 'CitiFM' THEN 8.2 ELSE 6.5 END,
    CASE WHEN o.name = 'CitiFM' THEN 8.0 ELSE 6.0 END,
    CASE WHEN o.name = 'CitiFM' THEN 7.8 ELSE 5.5 END,
    CASE WHEN o.name = 'CitiFM' THEN 6.5 ELSE 5.0 END,
    CASE WHEN o.name = 'CitiFM' THEN 6.2 ELSE 4.8 END,
    CASE WHEN o.name = 'CitiFM' THEN 4.3 ELSE 3.0 END
FROM outlets o
WHERE NOT EXISTS (SELECT 1 FROM outlet_indices WHERE outlet_id = o.id)
    ON CONFLICT (outlet_id) DO NOTHING;

-- ============================================
-- INDEXES (pour performance)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_outlet_indices_score ON outlet_indices(mti_score DESC);
CREATE INDEX IF NOT EXISTS idx_respondents_outlet ON respondents(outlet_id);
CREATE INDEX IF NOT EXISTS idx_responses_respondent ON responses(respondent_id);