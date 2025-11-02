-- Seed sample athlete data for recruiting portal
-- This creates sample prospects in college_coach_stars table without looking up user IDs

DO $$
DECLARE
  roanoke_school_id UUID;
  emory_school_id UUID;
BEGIN
  -- Get school IDs
  SELECT id INTO roanoke_school_id FROM schools WHERE name = 'Roanoke College';
  SELECT id INTO emory_school_id FROM schools WHERE name = 'Emory & Henry College';

  -- Insert sample recruiting prospects for Roanoke College
  -- Using gen_random_uuid() for IDs and NULL for coach_user_id (can be updated later)
  INSERT INTO college_coach_stars (
    id, coach_user_id, athlete_id, pipeline_stage, interest_level,
    athlete_instagram, athlete_email, athlete_cell,
    parent_name, parent_email, parent_phone,
    notes, last_contacted, starred_at
  ) VALUES
  -- Prospect Stage (2 athletes)
  (gen_random_uuid(), NULL, gen_random_uuid(), 'prospect', 'high', '@marcus_johnson_wrestling', 'mjohnson@email.com', '540-555-0101', 'Robert Johnson', 'rjohnson@email.com', '540-555-0100', 'Marcus Johnson - Salem HS, 157 lbs, Class of 2026. 35-8 record, 20 pins. Strong wrestler from local school.', NOW() - INTERVAL '5 days', NOW() - INTERVAL '10 days'),
  (gen_random_uuid(), NULL, gen_random_uuid(), 'prospect', 'medium', '@tyler_williams_157', 'twilliams@email.com', '540-555-0102', 'Sarah Williams', 'swilliams@email.com', '540-555-0103', 'Tyler Williams - Patrick Henry HS, 165 lbs, Class of 2027. 28-12 record. Good potential.', NOW() - INTERVAL '10 days', NOW() - INTERVAL '15 days'),
  
  -- Contacted Stage (2 athletes)
  (gen_random_uuid(), NULL, gen_random_uuid(), 'contacted', 'high', '@chris_martinez_149', 'cmartinez@email.com', '540-555-0104', 'Maria Martinez', 'mmartinez@email.com', '540-555-0105', 'Chris Martinez - William Byrd HS, 149 lbs, Class of 2026. 40-5 record, 25 pins. Had great phone call.', NOW() - INTERVAL '3 days', NOW() - INTERVAL '8 days'),
  (gen_random_uuid(), NULL, gen_random_uuid(), 'contacted', 'medium', '@brandon_lee_141', 'blee@email.com', '540-555-0105', 'David Lee', 'dlee@email.com', '540-555-0106', 'Brandon Lee - Northside HS, 141 lbs, Class of 2027. 32-10 record.', NOW() - INTERVAL '7 days', NOW() - INTERVAL '12 days'),
  
  -- Evaluating Stage (2 athletes)
  (gen_random_uuid(), NULL, gen_random_uuid(), 'evaluating', 'high', '@ryan_thompson_184', 'rthompson@email.com', '540-555-0106', 'Jennifer Thompson', 'jthompson@email.com', '540-555-0107', 'Ryan Thompson - Franklin County HS, 184 lbs, Class of 2026. 38-7 record. Visited campus last week.', NOW() - INTERVAL '2 days', NOW() - INTERVAL '7 days'),
  (gen_random_uuid(), NULL, gen_random_uuid(), 'evaluating', 'medium', '@austin_davis_133', 'adavis@email.com', '540-555-0107', 'Michael Davis', 'mdavis@email.com', '540-555-0108', 'Austin Davis - Lord Botetourt HS, 133 lbs, Class of 2026. 30-11 record.', NOW() - INTERVAL '4 days', NOW() - INTERVAL '9 days'),
  
  -- Recruiting Stage (2 athletes)
  (gen_random_uuid(), NULL, gen_random_uuid(), 'recruiting', 'high', '@jordan_wilson_197', 'jwilson@email.com', '540-555-0108', 'Lisa Wilson', 'lwilson@email.com', '540-555-0109', 'Jordan Wilson - Glenvar HS, 197 lbs, Class of 2026. 42-4 record. Top priority recruit.', NOW() - INTERVAL '1 day', NOW() - INTERVAL '5 days'),
  (gen_random_uuid(), NULL, gen_random_uuid(), 'recruiting', 'high', '@alex_anderson_174', 'aanderson@email.com', '540-555-0111', 'Nancy Anderson', 'nanderson@email.com', '540-555-0112', 'Alex Anderson - Cave Spring HS, 174 lbs, Class of 2026. 36-6 record. Strong interest.', NOW() - INTERVAL '2 days', NOW() - INTERVAL '6 days'),
  
  -- Offered Stage (1 athlete)
  (gen_random_uuid(), NULL, gen_random_uuid(), 'offered', 'high', '@ethan_brown_125', 'ebrown@email.com', '540-555-0109', 'Karen Brown', 'kbrown@email.com', '540-555-0110', 'Ethan Brown - Hidden Valley HS, 125 lbs, Class of 2026. 45-2 record. Offer extended last week.', NOW() - INTERVAL '6 days', NOW() - INTERVAL '10 days'),
  
  -- Committed Stage (1 athlete)
  (gen_random_uuid(), NULL, gen_random_uuid(), 'committed', 'high', '@noah_garcia_165', 'ngarcia@email.com', '540-555-0110', 'Carlos Garcia', 'cgarcia@email.com', '540-555-0111', 'Noah Garcia - Staunton River HS, 165 lbs, Class of 2026. 48-3 record. COMMITTED! Signed NLI.', NOW(), NOW() - INTERVAL '15 days'));

  -- Insert sample recruiting prospects for Emory & Henry College
  INSERT INTO college_coach_stars (
    id, coach_user_id, athlete_id, pipeline_stage, interest_level,
    athlete_instagram, athlete_email, athlete_cell,
    parent_name, parent_email, parent_phone,
    notes, last_contacted, starred_at
  ) VALUES
  -- Prospect Stage (2 athletes)
  (gen_random_uuid(), NULL, gen_random_uuid(), 'prospect', 'high', '@caleb_mitchell_149', 'cmitchell@email.com', '276-555-0201', 'Thomas Mitchell', 'tmitchell@email.com', '276-555-0200', 'Caleb Mitchell - Abingdon HS, 149 lbs, Class of 2027. 30-9 record. Local talent.', NOW() - INTERVAL '8 days', NOW() - INTERVAL '12 days'),
  (gen_random_uuid(), NULL, gen_random_uuid(), 'prospect', 'medium', '@dylan_roberts_157', 'droberts@email.com', '276-555-0202', 'Amanda Roberts', 'aroberts@email.com', '276-555-0203', 'Dylan Roberts - Gate City HS, 157 lbs, Class of 2026. 25-13 record.', NOW() - INTERVAL '12 days', NOW() - INTERVAL '18 days'),
  
  -- Contacted Stage (2 athletes)
  (gen_random_uuid(), NULL, gen_random_uuid(), 'contacted', 'high', '@mason_taylor_174', 'mtaylor@email.com', '276-555-0203', 'Patricia Taylor', 'ptaylor@email.com', '276-555-0204', 'Mason Taylor - Union HS, 174 lbs, Class of 2026. 35-7 record. Great conversation with family.', NOW() - INTERVAL '4 days', NOW() - INTERVAL '9 days'),
  (gen_random_uuid(), NULL, gen_random_uuid(), 'contacted', 'medium', '@logan_moore_141', 'lmoore@email.com', '276-555-0204', 'James Moore', 'jmoore@email.com', '276-555-0205', 'Logan Moore - Virginia HS, 141 lbs, Class of 2027. 28-10 record.', NOW() - INTERVAL '6 days', NOW() - INTERVAL '11 days'),
  
  -- Evaluating Stage (2 athletes)
  (gen_random_uuid(), NULL, gen_random_uuid(), 'evaluating', 'high', '@hunter_jackson_165', 'hjackson@email.com', '276-555-0205', 'Rebecca Jackson', 'rjackson@email.com', '276-555-0206', 'Hunter Jackson - Richlands HS, 165 lbs, Class of 2026. 38-6 record. Campus visit scheduled.', NOW() - INTERVAL '3 days', NOW() - INTERVAL '8 days'),
  (gen_random_uuid(), NULL, gen_random_uuid(), 'evaluating', 'medium', '@jacob_king_157', 'jking@email.com', '276-555-0210', 'Laura King', 'lking@email.com', '276-555-0211', 'Jacob King - Honaker HS, 157 lbs, Class of 2027. 29-11 record.', NOW() - INTERVAL '5 days', NOW() - INTERVAL '10 days'),
  
  -- Recruiting Stage (2 athletes)
  (gen_random_uuid(), NULL, gen_random_uuid(), 'recruiting', 'high', '@connor_white_184', 'cwhite@email.com', '276-555-0206', 'Susan White', 'swhite@email.com', '276-555-0207', 'Connor White - John Battle HS, 184 lbs, Class of 2026. 40-5 record. Strong interest.', NOW() - INTERVAL '2 days', NOW() - INTERVAL '6 days'),
  (gen_random_uuid(), NULL, gen_random_uuid(), 'recruiting', 'high', '@liam_harris_133', 'lharris@email.com', '276-555-0207', 'Michelle Harris', 'mharris@email.com', '276-555-0208', 'Liam Harris - Lebanon HS, 133 lbs, Class of 2026. 42-4 record. Top recruit.', NOW() - INTERVAL '1 day', NOW() - INTERVAL '5 days'),
  
  -- Offered Stage (1 athlete)
  (gen_random_uuid(), NULL, gen_random_uuid(), 'offered', 'high', '@owen_martin_197', 'omartin@email.com', '276-555-0208', 'Daniel Martin', 'dmartin@email.com', '276-555-0209', 'Owen Martin - Tazewell HS, 197 lbs, Class of 2026. 36-8 record. Offer made.', NOW() - INTERVAL '5 days', NOW() - INTERVAL '10 days'),
  
  -- Committed Stage (1 athlete)
  (gen_random_uuid(), NULL, gen_random_uuid(), 'committed', 'high', '@aiden_clark_125', 'aclark@email.com', '276-555-0209', 'Emily Clark', 'eclark@email.com', '276-555-0210', 'Aiden Clark - Patrick Henry HS, 125 lbs, Class of 2026. 50-2 record. COMMITTED! Signed and ready!', NOW(), NOW() - INTERVAL '20 days'));

END $$;
