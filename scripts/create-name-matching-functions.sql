-- Function to get canonical name for any given name
CREATE OR REPLACE FUNCTION get_canonical_name(input_name TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(
        (SELECT canonical_name FROM name_aliases WHERE alias_name = input_name LIMIT 1),
        input_name
    );
END;
$$ LANGUAGE plpgsql;

-- Function to normalize names for matching
CREATE OR REPLACE FUNCTION normalize_name_for_matching(input_name TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN get_canonical_name(
        LOWER(TRIM(REGEXP_REPLACE(input_name, '\s+', ' ', 'g')))
    );
END;
$$ LANGUAGE plpgsql;
