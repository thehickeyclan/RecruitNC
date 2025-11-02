-- Seed sample recruiting data for Roanoke College and Emory & Henry College
-- This creates sample entries in college_coach_stars table for testing the branded recruiting portal

-- Get school IDs
DO $$
DECLARE
  roanoke_school_id UUID;
  emory_school_id UUID;
BEGIN
  -- Get Roanoke College school ID
  SELECT id INTO roanoke_school_id FROM schools WHERE name = 'Roanoke College';
  
  -- Get Emory & Henry College school ID
  SELECT id INTO emory_school_id FROM schools WHERE name = 'Emory & Henry College';

  -- Insert sample prospects for Roanoke College (10 total)
  -- 2 Prospect stage
  INSERT INTO college_coach_stars (id, coach_user_id, athlete_id, pipeline_stage, interest_level, athlete_instagram, athlete_email, athlete_cell, parent_name, parent_email, parent_phone, notes, starred_at, last_contacted)
  VALUES
  (gen_random_uuid(), NULL, gen_random_uuid(), 'prospect', 'medium', '@mike_johnson_157', 'mjohnson@email.com', '919-555-0101', 'Sarah Johnson', 'sjohnson@email.com', '919-555-0102', 'Mike Johnson - Chapel Hill HS, 157 lbs, Class of 2026. 35-8 record. Strong potential, needs follow-up.', NOW(), NOW() - INTERVAL '5 days'),
  (gen_random_uuid(), NULL, gen_random_uuid(), 'prospect', 'low', '@tyler_smith_144', 'tsmith@email.com', '704-555-0103', 'David Smith', 'dsmith@email.com', '704-555-0104', 'Tyler Smith - Myers Park HS, 144 lbs, Class of 2027. 28-12 record. Early prospect.', NOW(), NOW() - INTERVAL '10 days'),
  
  -- 2 Contacted stage
  (gen_random_uuid(), NULL, gen_random_uuid(), 'contacted', 'high', '@alex_williams_165', 'awilliams@email.com', '336-555-0105', 'Jennifer Williams', 'jwilliams@email.com', '336-555-0106', 'Alex Williams - Grimsley HS, 165 lbs, Class of 2026. 42-5 record. Had initial call, very interested.', NOW(), NOW() - INTERVAL '3 days'),
  (gen_random_uuid(), NULL, gen_random_uuid(), 'contacted', 'medium', '@chris_brown_150', 'cbrown@email.com', '828-555-0107', 'Michael Brown', 'mbrown@email.com', '828-555-0108', 'Chris Brown - Asheville HS, 150 lbs, Class of 2026. 38-10 record. Sent intro email.', NOW(), NOW() - INTERVAL '7 days'),
  
  -- 2 Evaluating stage
  (gen_random_uuid(), NULL, gen_random_uuid(), 'evaluating', 'high', '@jordan_davis_175', 'jdavis@email.com', '252-555-0109', 'Lisa Davis', 'ldavis@email.com', '252-555-0110', 'Jordan Davis - New Bern HS, 175 lbs, Class of 2026. 45-3 record. Reviewing film, planning visit.', NOW(), NOW() - INTERVAL '2 days'),
  (gen_random_uuid(), NULL, gen_random_uuid(), 'evaluating', 'high', '@ryan_miller_157', 'rmiller@email.com', '910-555-0111', 'Karen Miller', 'kmiller@email.com', '910-555-0112', 'Ryan Miller - Pinecrest HS, 157 lbs, Class of 2026. 40-6 record. Strong academics, evaluating fit.', NOW(), NOW() - INTERVAL '4 days'),
  
  -- 2 Recruiting stage
  (gen_random_uuid(), NULL, gen_random_uuid(), 'recruiting', 'high', '@ethan_wilson_144', 'ewilson@email.com', '919-555-0113', 'Robert Wilson', 'rwilson@email.com', '919-555-0114', 'Ethan Wilson - Green Hope HS, 144 lbs, Class of 2026. 47-2 record. Active recruitment, campus visit scheduled.', NOW(), NOW() - INTERVAL '1 day'),
  (gen_random_uuid(), NULL, gen_random_uuid(), 'recruiting', 'high', '@noah_moore_165', 'nmoore@email.com', '704-555-0115', 'Patricia Moore', 'pmoore@email.com', '704-555-0116', 'Noah Moore - Ardrey Kell HS, 165 lbs, Class of 2026. 43-4 record. Multiple visits, strong interest.', NOW(), NOW() - INTERVAL '2 days'),
  
  -- 1 Offered stage
  (gen_random_uuid(), NULL, gen_random_uuid(), 'offered', 'high', '@liam_taylor_150', 'ltaylor@email.com', '336-555-0117', 'James Taylor', 'jtaylor@email.com', '336-555-0118', 'Liam Taylor - Page HS, 150 lbs, Class of 2026. 50-1 record. OFFER EXTENDED! Waiting on decision.', NOW(), NOW() - INTERVAL '5 days'),
  
  -- 1 Committed stage
  (gen_random_uuid(), NULL, gen_random_uuid(), 'committed', 'high', '@mason_anderson_157', 'manderson@email.com', '919-555-0119', 'Susan Anderson', 'sanderson@email.com', '919-555-0120', 'Mason Anderson - Leesville Road HS, 157 lbs, Class of 2026. 52-0 record. COMMITTED! Signed NLI.', NOW(), NOW() - INTERVAL '20 days');

  -- Insert sample prospects for Emory & Henry College (10 total)
  -- 2 Prospect stage
  INSERT INTO college_coach_stars (id, coach_user_id, athlete_id, pipeline_stage, interest_level, athlete_instagram, athlete_email, athlete_cell, parent_name, parent_email, parent_phone, notes, starred_at, last_contacted)
  VALUES
  (gen_random_uuid(), NULL, gen_random_uuid(), 'prospect', 'medium', '@jake_thomas_165', 'jthomas@email.com', '276-555-0201', 'Mary Thomas', 'mthomas@email.com', '276-555-0202', 'Jake Thomas - Abingdon HS, 165 lbs, Class of 2026. 32-10 record. Local prospect, needs evaluation.', NOW(), NOW() - INTERVAL '6 days'),
  (gen_random_uuid(), NULL, gen_random_uuid(), 'prospect', 'low', '@ben_jackson_150', 'bjackson@email.com', '540-555-0203', 'Tom Jackson', 'tjackson@email.com', '540-555-0204', 'Ben Jackson - Christiansburg HS, 150 lbs, Class of 2027. 25-15 record. Early prospect.', NOW(), NOW() - INTERVAL '12 days'),
  
  -- 2 Contacted stage
  (gen_random_uuid(), NULL, gen_random_uuid(), 'contacted', 'high', '@sam_white_157', 'swhite@email.com', '276-555-0205', 'Linda White', 'lwhite@email.com', '276-555-0206', 'Sam White - Gate City HS, 157 lbs, Class of 2026. 40-7 record. Initial contact made, positive response.', NOW(), NOW() - INTERVAL '4 days'),
  (gen_random_uuid(), NULL, gen_random_uuid(), 'contacted', 'medium', '@luke_harris_144', 'lharris@email.com', '540-555-0207', 'Nancy Harris', 'nharris@email.com', '540-555-0208', 'Luke Harris - Blacksburg HS, 144 lbs, Class of 2026. 36-9 record. Sent recruiting packet.', NOW(), NOW() - INTERVAL '8 days'),
  
  -- 2 Evaluating stage
  (gen_random_uuid(), NULL, gen_random_uuid(), 'evaluating', 'high', '@owen_martin_175', 'omartin@email.com', '276-555-0209', 'Paul Martin', 'pmartin@email.com', '276-555-0210', 'Owen Martin - Union HS, 175 lbs, Class of 2026. 44-4 record. Reviewing tape, strong candidate.', NOW(), NOW() - INTERVAL '3 days'),
  (gen_random_uuid(), NULL, gen_random_uuid(), 'evaluating', 'high', '@caleb_thompson_165', 'cthompson@email.com', '540-555-0211', 'Rachel Thompson', 'rthompson@email.com', '540-555-0212', 'Caleb Thompson - Salem HS, 165 lbs, Class of 2026. 41-5 record. Good academics, evaluating fit.', NOW(), NOW() - INTERVAL '5 days'),
  
  -- 2 Recruiting stage
  (gen_random_uuid(), NULL, gen_random_uuid(), 'recruiting', 'high', '@isaac_garcia_150', 'igarcia@email.com', '276-555-0213', 'Maria Garcia', 'mgarcia@email.com', '276-555-0214', 'Isaac Garcia - Marion HS, 150 lbs, Class of 2026. 46-3 record. Active recruitment, family visit planned.', NOW(), NOW() - INTERVAL '2 days'),
  (gen_random_uuid(), NULL, gen_random_uuid(), 'recruiting', 'high', '@logan_martinez_157', 'lmartinez@email.com', '540-555-0215', 'Carlos Martinez', 'cmartinez@email.com', '540-555-0216', 'Logan Martinez - Hidden Valley HS, 157 lbs, Class of 2026. 42-6 record. Multiple contacts, high interest.', NOW(), NOW() - INTERVAL '1 day'),
  
  -- 1 Offered stage
  (gen_random_uuid(), NULL, gen_random_uuid(), 'offered', 'high', '@aiden_robinson_144', 'arobinson@email.com', '276-555-0217', 'Angela Robinson', 'arobinson@email.com', '276-555-0218', 'Aiden Robinson - Richlands HS, 144 lbs, Class of 2026. 49-2 record. OFFER EXTENDED! Decision pending.', NOW(), NOW() - INTERVAL '7 days'),
  
  -- 1 Committed stage
  (gen_random_uuid(), NULL, gen_random_uuid(), 'committed', 'high', '@noah_garcia_165', 'ngarcia@email.com', '540-555-0219', 'Carlos Garcia', 'cgarcia@email.com', '540-555-0220', 'Noah Garcia - Staunton River HS, 165 lbs, Class of 2026. 48-3 record. COMMITTED! Signed NLI.', NOW(), NOW() - INTERVAL '15 days');

END $$;
