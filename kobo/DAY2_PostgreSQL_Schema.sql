-- MFWA Media Trust Barometer - Ghana
-- PostgreSQL Schema
-- Version: 2026.05.01

-- =============================================
-- 1. TABLES DE REFERENCE
-- =============================================

-- Régions du Ghana
CREATE TABLE regions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Districts
CREATE TABLE districts (
    id SERIAL PRIMARY KEY,
    region_id INTEGER REFERENCES regions(id),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Outlets (Stations radio, TV, journaux, sites en ligne)
CREATE TABLE outlets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    outlet_type VARCHAR(50), -- 'radio', 'tv', 'print', 'online'
    region_id INTEGER REFERENCES regions(id),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 2. DONNEES DE COLLECTE
-- =============================================

-- Répondants
CREATE TABLE respondents (
    id SERIAL PRIMARY KEY,
    interview_id VARCHAR(50) UNIQUE NOT NULL,
    enumerator_id VARCHAR(50),
    region_id INTEGER REFERENCES regions(id),
    district_id INTEGER REFERENCES districts(id),
    residence_type VARCHAR(20), -- 'urban', 'rural', 'periurban'
    
    -- Profil
    age INTEGER,
    sex VARCHAR(20),
    education VARCHAR(50),
    employment VARCHAR(50),
    internet_access VARCHAR(50),
    news_language VARCHAR(50),
    hh_radio BOOLEAN,
    hh_tv BOOLEAN,
    
    -- Engagement
    news_interest VARCHAR(50),
    news_days_7 INTEGER,
    
    -- Usage média (plateforme)
    use_radio BOOLEAN,
    radio_freq VARCHAR(50),
    use_tv BOOLEAN,
    tv_freq VARCHAR(50),
    use_online BOOLEAN,
    online_freq VARCHAR(50),
    use_social BOOLEAN,
    social_freq VARCHAR(50),
    
    -- Métadonnées
    interview_date DATE,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    is_complete BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ratings d'outlets (une ligne par outlet évalué)
CREATE TABLE outlet_ratings (
    id SERIAL PRIMARY KEY,
    respondent_id INTEGER REFERENCES respondents(id) ON DELETE CASCADE,
    outlet_id INTEGER REFERENCES outlets(id),
    
    -- Trust global
    overall_trust INTEGER, -- 0-10
    
    -- 6 dimensions (Likert 5-point : 1=Strongly disagree, 5=Strongly agree)
    accuracy INTEGER, -- "Gives accurate information"
    verification INTEGER, -- "Verifies information before publication"
    fair_balanced INTEGER, -- "Fair and balanced"
    independence INTEGER, -- "Independent from political influence"
    public_interest INTEGER, -- "Serves public interest"
    corrections INTEGER, -- "Corrects mistakes when they occur"
    
    -- Alignment politique
    political_alignment VARCHAR(50), -- 'ndc', 'npp', 'independent', 'dk'
    political_influence_freq VARCHAR(50), -- 'always', 'often', 'sometimes', 'rarely', 'never', 'dk'
    
    -- Métadonnées
    is_primary_outlet BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(respondent_id, outlet_id)
);

-- =============================================
-- 3. INDICES CALCULES
-- =============================================

-- Media Trust Index (MTI) et autres métriques par outlet
CREATE TABLE outlet_indices (
    id SERIAL PRIMARY KEY,
    outlet_id INTEGER REFERENCES outlets(id),
    
    -- Échantillon
    respondent_count INTEGER, -- Nombre de répondants ayant évalué cet outlet
    
    -- Confiance globale (moyenne)
    avg_overall_trust DECIMAL(5,2), -- Moyenne 0-10
    
    -- Dimensions (moyenne des réponses Likert)
    avg_accuracy DECIMAL(5,2),
    avg_verification DECIMAL(5,2),
    avg_fair_balanced DECIMAL(5,2),
    avg_independence DECIMAL(5,2),
    avg_public_interest DECIMAL(5,2),
    avg_corrections DECIMAL(5,2),
    
    -- Media Trust Index (MTI)
    -- Formule: (accuracy*20% + verification*20% + fair_balanced*15% + 
    --           independence*20% + public_interest*15% + corrections*10%) / 5 * 10
    mti_score DECIMAL(5,2),
    
    -- Perception de partisanerie
    pct_ndc_aligned DECIMAL(5,2),
    pct_npp_aligned DECIMAL(5,2),
    pct_independent DECIMAL(5,2),
    pct_dk_align DECIMAL(5,2),
    
    -- Influence politique perçue
    pct_always_influenced DECIMAL(5,2),
    pct_often_influenced DECIMAL(5,2),
    pct_sometimes_influenced DECIMAL(5,2),
    
    -- Rang
    mti_rank INTEGER,
    
    -- Métadonnées
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 4. INDICES REGIONAUX
-- =============================================

CREATE TABLE regional_indices (
    id SERIAL PRIMARY KEY,
    region_id INTEGER REFERENCES regions(id),
    
    -- Engagement
    avg_news_interest DECIMAL(5,2),
    avg_news_days_7 DECIMAL(5,2),
    
    -- Usage par plateforme
    pct_use_radio DECIMAL(5,2),
    pct_use_tv DECIMAL(5,2),
    pct_use_online DECIMAL(5,2),
    pct_use_social DECIMAL(5,2),
    
    -- Confiance générale
    avg_overall_trust DECIMAL(5,2),
    
    -- Métadonnées
    respondent_count INTEGER,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 5. INDEXES POUR PERFORMANCE
-- =============================================

CREATE INDEX idx_respondents_interview_id ON respondents(interview_id);
CREATE INDEX idx_respondents_region ON respondents(region_id);
CREATE INDEX idx_respondents_district ON respondents(district_id);
CREATE INDEX idx_respondents_completed_at ON respondents(completed_at);

CREATE INDEX idx_outlet_ratings_respondent ON outlet_ratings(respondent_id);
CREATE INDEX idx_outlet_ratings_outlet ON outlet_ratings(outlet_id);
CREATE INDEX idx_outlet_ratings_created_at ON outlet_ratings(created_at);

CREATE INDEX idx_outlets_type ON outlets(outlet_type);
CREATE INDEX idx_outlets_active ON outlets(is_active);

CREATE INDEX idx_outlet_indices_outlet ON outlet_indices(outlet_id);
CREATE INDEX idx_outlet_indices_mti_rank ON outlet_indices(mti_rank);

-- =============================================
-- 6. DONNEES DE SEED (Régions et Districts)
-- =============================================

INSERT INTO regions (name, code) VALUES
('Ashanti', 'AS'),
('Bono', 'BO'),
('Bono East', 'BE'),
('Central', 'CE'),
('Eastern', 'EA'),
('Greater Accra', 'GA'),
('North East', 'NE'),
('Northern', 'NO'),
('Savannah', 'SA'),
('Upper East', 'UE'),
('Upper West', 'UW'),
('Volta', 'VO'),
('Western', 'WE'),
('Western North', 'WN')
ON CONFLICT DO NOTHING;

-- =============================================
-- 7. SAMPLE OUTLETS (à personnaliser)
-- =============================================

INSERT INTO outlets (name, outlet_type, description, is_active) VALUES
('JoyFM', 'radio', 'Independent radio station', true),
('CitiFM', 'radio', 'Commercial radio', true),
('Asaase Radio', 'radio', 'Investigative radio', true),
('Peace FM', 'radio', 'Community radio', true),
('Adom TV', 'tv', 'Entertainment and news TV', true),
('Metro TV', 'tv', 'News-focused TV', true),
('Graphic Online', 'online', 'News portal', true),
('Citi Newsroom', 'online', 'Digital news', true),
('Buzz Ghana', 'online', 'Online news platform', true),
('MyJoyOnline', 'online', 'Online news', true)
ON CONFLICT DO NOTHING;

-- =============================================
-- 8. VUE POUR DASHBOARD
-- =============================================

CREATE VIEW v_outlet_rankings AS
SELECT 
    o.id,
    o.name,
    o.outlet_type,
    oi.mti_score,
    oi.mti_rank,
    oi.respondent_count,
    oi.avg_overall_trust,
    oi.avg_accuracy,
    oi.avg_independence,
    ROUND((oi.pct_ndc_aligned)::numeric, 1) as pct_ndc,
    ROUND((oi.pct_npp_aligned)::numeric, 1) as pct_npp,
    ROUND((oi.pct_independent)::numeric, 1) as pct_independent
FROM outlets o
LEFT JOIN outlet_indices oi ON o.id = oi.outlet_id
WHERE o.is_active = true
ORDER BY oi.mti_rank NULLS LAST;

CREATE VIEW v_respondent_summary AS
SELECT 
    COUNT(*) as total_respondents,
    COUNT(CASE WHEN is_complete THEN 1 END) as completed,
    COUNT(CASE WHEN is_complete = false THEN 1 END) as incomplete,
    AVG(CASE WHEN news_interest IN ('very_interested', 'interested') THEN 1 ELSE 0 END) * 100 as pct_interested,
    AVG(CASE WHEN use_radio THEN 1 ELSE 0 END) * 100 as pct_use_radio,
    AVG(CASE WHEN use_tv THEN 1 ELSE 0 END) * 100 as pct_use_tv,
    AVG(CASE WHEN use_online THEN 1 ELSE 0 END) * 100 as pct_use_online,
    AVG(CASE WHEN use_social THEN 1 ELSE 0 END) * 100 as pct_use_social
FROM respondents;

-- =============================================
-- 9. FONCTION POUR CALCULER MTI
-- =============================================

CREATE OR REPLACE FUNCTION calculate_outlet_indices()
RETURNS TABLE (outlet_id_out INT, mti_out DECIMAL) AS $$
BEGIN
    RETURN QUERY
    WITH outlet_stats AS (
        SELECT
            outlet_id,
            COUNT(DISTINCT respondent_id) as resp_count,
            ROUND(AVG(overall_trust)::numeric, 2) as avg_trust,
            ROUND(AVG(accuracy)::numeric, 2) as avg_acc,
            ROUND(AVG(verification)::numeric, 2) as avg_ver,
            ROUND(AVG(fair_balanced)::numeric, 2) as avg_fair,
            ROUND(AVG(independence)::numeric, 2) as avg_indep,
            ROUND(AVG(public_interest)::numeric, 2) as avg_pub,
            ROUND(AVG(corrections)::numeric, 2) as avg_corr,
            ROUND(SUM(CASE WHEN political_alignment = 'ndc' THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 2) as pct_ndc,
            ROUND(SUM(CASE WHEN political_alignment = 'npp' THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 2) as pct_npp,
            ROUND(SUM(CASE WHEN political_alignment = 'independent' THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 2) as pct_ind,
            ROUND(SUM(CASE WHEN political_influence_freq = 'always' THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 2) as pct_always,
            ROUND(SUM(CASE WHEN political_influence_freq = 'often' THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 2) as pct_often,
            ROUND(SUM(CASE WHEN political_influence_freq = 'sometimes' THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 2) as pct_sometimes
        FROM outlet_ratings
        WHERE outlet_id IS NOT NULL
        GROUP BY outlet_id
    ),
    mti_calc AS (
        SELECT
            outlet_id,
            resp_count,
            avg_trust,
            avg_acc,
            avg_ver,
            avg_fair,
            avg_indep,
            avg_pub,
            avg_corr,
            pct_ndc,
            pct_npp,
            pct_ind,
            pct_always,
            pct_often,
            pct_sometimes,
            -- MTI Formula: (accuracy*20% + verification*20% + fair*15% + independence*20% + public*15% + corrections*10%) / 5 * 10
            ROUND(((avg_acc * 0.20 + avg_ver * 0.20 + avg_fair * 0.15 + avg_indep * 0.20 + avg_pub * 0.15 + avg_corr * 0.10) / 5 * 10)::numeric, 2) as mti_score,
            ROW_NUMBER() OVER (ORDER BY ((avg_acc * 0.20 + avg_ver * 0.20 + avg_fair * 0.15 + avg_indep * 0.20 + avg_pub * 0.15 + avg_corr * 0.10) / 5 * 10) DESC) as rank_pos
        FROM outlet_stats
    )
    INSERT INTO outlet_indices 
    (outlet_id, respondent_count, avg_overall_trust, avg_accuracy, avg_verification, 
     avg_fair_balanced, avg_independence, avg_public_interest, avg_corrections, mti_score,
     pct_ndc_aligned, pct_npp_aligned, pct_independent, pct_dk_align,
     pct_always_influenced, pct_often_influenced, pct_sometimes_influenced, mti_rank)
    SELECT
        outlet_id, resp_count, avg_trust, avg_acc, avg_ver, avg_fair, avg_indep, avg_pub, avg_corr,
        mti_score, pct_ndc, pct_npp, pct_ind, (100 - pct_ndc - pct_npp - pct_ind),
        pct_always, pct_often, pct_sometimes, rank_pos
    FROM mti_calc
    ON CONFLICT (outlet_id) DO UPDATE SET
        respondent_count = EXCLUDED.respondent_count,
        avg_overall_trust = EXCLUDED.avg_overall_trust,
        avg_accuracy = EXCLUDED.avg_accuracy,
        avg_verification = EXCLUDED.avg_verification,
        avg_fair_balanced = EXCLUDED.avg_fair_balanced,
        avg_independence = EXCLUDED.avg_independence,
        avg_public_interest = EXCLUDED.avg_public_interest,
        avg_corrections = EXCLUDED.avg_corrections,
        mti_score = EXCLUDED.mti_score,
        pct_ndc_aligned = EXCLUDED.pct_ndc_aligned,
        pct_npp_aligned = EXCLUDED.pct_npp_aligned,
        pct_independent = EXCLUDED.pct_independent,
        pct_always_influenced = EXCLUDED.pct_always_influenced,
        pct_often_influenced = EXCLUDED.pct_often_influenced,
        pct_sometimes_influenced = EXCLUDED.pct_sometimes_influenced,
        mti_rank = EXCLUDED.mti_rank,
        updated_at = CURRENT_TIMESTAMP;
    
    SELECT outlet_id, mti_score INTO outlet_id_out, mti_out FROM mti_calc;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- DONE
-- =============================================

COMMIT;
