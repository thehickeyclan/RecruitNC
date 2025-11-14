-- Smart Matching RPC Function for accurate wrestler identification
CREATE OR REPLACE FUNCTION find_potential_matches(
    target_name TEXT,
    target_school TEXT DEFAULT NULL,
    target_year INTEGER DEFAULT NULL,
    target_weight TEXT DEFAULT NULL,
    min_confidence FLOAT DEFAULT 0.6
) RETURNS TABLE (
    wrestler_name TEXT,
    school TEXT,
    year INTEGER,
    weight_class TEXT,
    place INTEGER,
    classification TEXT,
    confidence_score FLOAT,
    match_factors JSONB,
    source_table TEXT
) AS $$
BEGIN
    -- Return matches from NCHSAA results with confidence scoring
    RETURN QUERY
    WITH nchsaa_matches AS (
        SELECT 
            n.wrestler_name,
            n.school,
            n.year,
            n.weight_class,
            n.place,
            n.classification,
            -- Calculate confidence score based on multiple factors
            CASE 
                WHEN normalize_name_for_matching(n.wrestler_name) = normalize_name_for_matching(target_name) THEN 1.0
                WHEN n.wrestler_name ILIKE '%' || target_name || '%' THEN 0.8
                ELSE 0.6
            END +
            CASE 
                WHEN target_school IS NULL THEN 0.0
                WHEN n.school ILIKE '%' || target_school || '%' THEN 0.2
                ELSE 0.0
            END +
            CASE 
                WHEN target_year IS NULL THEN 0.0
                WHEN n.year = target_year THEN 0.1
                ELSE 0.0
            END +
            CASE 
                WHEN target_weight IS NULL THEN 0.0
                WHEN n.weight_class = target_weight THEN 0.1
                ELSE 0.0
            END AS confidence_score,
            jsonb_build_object(
                'name_match', normalize_name_for_matching(n.wrestler_name) = normalize_name_for_matching(target_name),
                'school_match', CASE WHEN target_school IS NULL THEN null ELSE n.school ILIKE '%' || target_school || '%' END,
                'year_match', CASE WHEN target_year IS NULL THEN null ELSE n.year = target_year END,
                'weight_match', CASE WHEN target_weight IS NULL THEN null ELSE n.weight_class = target_weight END
            ) AS match_factors,
            'nchsaa' AS source_table
        FROM wrestling_nchsaa_results n
        WHERE n.wrestler_name ILIKE '%' || target_name || '%'
           OR normalize_name_for_matching(n.wrestler_name) = normalize_name_for_matching(target_name)
    ),
    nhsca_matches AS (
        SELECT 
            n.athlete_name AS wrestler_name,
            n.high_school AS school,
            n.year,
            n.weight AS weight_class,
            n.placement AS place,
            'NHSCA' AS classification,
            -- Calculate confidence score based on multiple factors
            CASE 
                WHEN normalize_name_for_matching(n.athlete_name) = normalize_name_for_matching(target_name) THEN 1.0
                WHEN n.athlete_name ILIKE '%' || target_name || '%' THEN 0.8
                ELSE 0.6
            END +
            CASE 
                WHEN target_school IS NULL THEN 0.0
                WHEN n.high_school ILIKE '%' || target_school || '%' THEN 0.2
                ELSE 0.0
            END +
            CASE 
                WHEN target_year IS NULL THEN 0.0
                WHEN n.year = target_year THEN 0.1
                ELSE 0.0
            END +
            CASE 
                WHEN target_weight IS NULL THEN 0.0
                WHEN n.weight = target_weight THEN 0.1
                ELSE 0.0
            END AS confidence_score,
            jsonb_build_object(
                'name_match', normalize_name_for_matching(n.athlete_name) = normalize_name_for_matching(target_name),
                'school_match', CASE WHEN target_school IS NULL THEN null ELSE n.high_school ILIKE '%' || target_school || '%' END,
                'year_match', CASE WHEN target_year IS NULL THEN null ELSE n.year = target_year END,
                'weight_match', CASE WHEN target_weight IS NULL THEN null ELSE n.weight = target_weight END
            ) AS match_factors,
            'nhsca' AS source_table
        FROM wrestling_nhsca_results n
        WHERE n.athlete_name ILIKE '%' || target_name || '%'
           OR normalize_name_for_matching(n.athlete_name) = normalize_name_for_matching(target_name)
    )
    SELECT * FROM nchsaa_matches WHERE confidence_score >= min_confidence
    UNION ALL
    SELECT * FROM nhsca_matches WHERE confidence_score >= min_confidence
    ORDER BY confidence_score DESC, year DESC;
END;
$$ LANGUAGE plpgsql;
