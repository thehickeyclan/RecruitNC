-- First, ensure the college_coach_stars table exists
CREATE TABLE IF NOT EXISTS college_coach_stars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notes TEXT,
  interest_level TEXT,
  athlete_instagram TEXT,
  athlete_email TEXT,
  athlete_cell TEXT,
  parent_email TEXT,
  parent_phone TEXT,
  parent_name TEXT,
  pipeline_stage TEXT,
  last_contacted TIMESTAMP WITH TIME ZONE,
  starred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  athlete_id UUID REFERENCES athletes(id),
  coach_user_id UUID
);

-- Get school IDs
DO $$
DECLARE
  roanoke_id UUID;
  emory_id UUID;
BEGIN
  -- Get Roanoke College ID
  SELECT id INTO roanoke_id FROM schools WHERE name = 'Roanoke College' LIMIT 1;
  
  -- Get Emory & Henry College ID
  SELECT id INTO emory_id FROM schools WHERE name = 'Emory & Henry College' LIMIT 1;
  
  -- Insert sample data for Roanoke College (10 prospects)
  INSERT INTO college_coach_stars (
    notes, interest_level, athlete_instagram, athlete_email, athlete_cell,
    parent_name, parent_email, parent_phone, pipeline_stage, last_contacted
  ) VALUES
  -- Prospect stage (2)
  ('Marcus Johnson - Salem HS, 138 lbs, Class of 2026. 42-5 record. Strong technique, needs to work on conditioning.', 'high', '@marcus_j_138', 'mjohnson@email.com', '540-555-0101', 'David Johnson', 'djohnson@email.com', '540-555-0102', 'prospect', NOW() - INTERVAL '5 days'),
  ('Tyler Williams - Patrick Henry HS, 152 lbs, Class of 2027. 38-8 record. Excellent scrambler, good mat awareness.', 'medium', '@tyler_w_152', 'twilliams@email.com', '540-555-0103', 'Sarah Williams', 'swilliams@email.com', '540-555-0104', 'prospect', NOW() - INTERVAL '10 days'),
  
  -- Contacted stage (2)
  ('Jake Martinez - Hidden Valley HS, 160 lbs, Class of 2026. 45-3 record. Very interested in Roanoke. Strong academics.', 'high', '@jake_m_160', 'jmartinez@email.com', '540-555-0105', 'Maria Martinez', 'mmartinez@email.com', '540-555-0106', 'contacted', NOW() - INTERVAL '3 days'),
  ('Ryan Davis - Cave Spring HS, 170 lbs, Class of 2026. 40-6 record. Visited campus last month, very positive feedback.', 'high', '@ryan_d_170', 'rdavis@email.com', '540-555-0107', 'Tom Davis', 'tdavis@email.com', '540-555-0108', 'contacted', NOW() - INTERVAL '7 days'),
  
  -- Evaluating stage (2)
  ('Connor Brown - Northside HS, 182 lbs, Class of 2026. 43-4 record. Attending summer camp next week.', 'high', '@connor_b_182', 'cbrown@email.com', '540-555-0109', 'Jennifer Brown', 'jbrown@email.com', '540-555-0110', 'evaluating', NOW() - INTERVAL '12 days'),
  ('Ethan Wilson - William Byrd HS, 195 lbs, Class of 2027. 39-7 record. Good potential, needs more film review.', 'medium', '@ethan_w_195', 'ewilson@email.com', '540-555-0111', 'Mike Wilson', 'mwilson@email.com', '540-555-0112', 'evaluating', NOW() - INTERVAL '15 days'),
  
  -- Recruiting stage (2)
  ('Alex Thompson - Lord Botetourt HS, 220 lbs, Class of 2026. 47-2 record. Top target! Scheduled for official visit.', 'high', '@alex_t_220', 'athompson@email.com', '540-555-0113', 'Lisa Thompson', 'lthompson@email.com', '540-555-0114', 'recruiting', NOW() - INTERVAL '2 days'),
  ('Jordan Lee - Franklin County HS, 126 lbs, Class of 2026. 44-3 record. Very interested, waiting on financial aid package.', 'high', '@jordan_l_126', 'jlee@email.com', '540-555-0115', 'Kevin Lee', 'klee@email.com', '540-555-0116', 'recruiting', NOW() - INTERVAL '4 days'),
  
  -- Offered stage (1)
  ('Brandon Clark - Glenvar HS, 145 lbs, Class of 2026. 46-1 record. Offer extended! Deciding between us and Liberty.', 'high', '@brandon_c_145', 'bclark@email.com', '540-555-0117', 'Amy Clark', 'aclark@email.com', '540-555-0118', 'offer_extended', NOW() - INTERVAL '8 days'),
  
  -- Committed stage (1)
  ('Noah Garcia - Staunton River HS, 165 lbs, Class of 2026. 48-3 record. COMMITTED! Signed NLI.', 'high', '@noah_garcia_165', 'ngarcia@email.com', '540-555-0119', 'Carlos Garcia', 'cgarcia@email.com', '540-555-0120', 'committed', NOW() - INTERVAL '20 days');
  
  -- Insert sample data for Emory & Henry College (10 prospects)
  INSERT INTO college_coach_stars (
    notes, interest_level, athlete_instagram, athlete_email, athlete_cell,
    parent_name, parent_email, parent_phone, pipeline_stage, last_contacted
  ) VALUES
  -- Prospect stage (2)
  ('Caleb Anderson - Abingdon HS, 132 lbs, Class of 2026. 41-6 record. Good fundamentals, needs strength training.', 'medium', '@caleb_a_132', 'canderson@email.com', '276-555-0201', 'Robert Anderson', 'randerson@email.com', '276-555-0202', 'prospect', NOW() - INTERVAL '6 days'),
  ('Mason Taylor - Gate City HS, 138 lbs, Class of 2027. 37-9 record. Promising freshman, keep an eye on him.', 'medium', '@mason_t_138', 'mtaylor@email.com', '276-555-0203', 'Emily Taylor', 'etaylor@email.com', '276-555-0204', 'prospect', NOW() - INTERVAL '11 days'),
  
  -- Contacted stage (2)
  ('Logan Moore - Union HS, 152 lbs, Class of 2026. 44-4 record. Interested in our program, sent recruiting packet.', 'high', '@logan_m_152', 'lmoore@email.com', '276-555-0205', 'Patricia Moore', 'pmoore@email.com', '276-555-0206', 'contacted', NOW() - INTERVAL '4 days'),
  ('Dylan White - Richlands HS, 160 lbs, Class of 2026. 42-5 record. Phone call scheduled for next week.', 'high', '@dylan_w_160', 'dwhite@email.com', '276-555-0207', 'James White', 'jwhite@email.com', '276-555-0208', 'contacted', NOW() - INTERVAL '8 days'),
  
  -- Evaluating stage (2)
  ('Austin Harris - Virginia High, 170 lbs, Class of 2026. 40-7 record. Attending our wrestling camp in July.', 'high', '@austin_h_170', 'aharris@email.com', '276-555-0209', 'Michelle Harris', 'mharris@email.com', '276-555-0210', 'evaluating', NOW() - INTERVAL '13 days'),
  ('Cameron Martin - John Battle HS, 182 lbs, Class of 2027. 38-8 record. Good wrestler, reviewing more film.', 'medium', '@cameron_m_182', 'cmartin@email.com', '276-555-0211', 'Steven Martin', 'smartin@email.com', '276-555-0212', 'evaluating', NOW() - INTERVAL '16 days'),
  
  -- Recruiting stage (2)
  ('Hunter Jackson - Tazewell HS, 195 lbs, Class of 2026. 46-3 record. Priority recruit! Campus visit went great.', 'high', '@hunter_j_195', 'hjackson@email.com', '276-555-0213', 'Karen Jackson', 'kjackson@email.com', '276-555-0214', 'recruiting', NOW() - INTERVAL '3 days'),
  ('Gavin Thomas - Graham HS, 220 lbs, Class of 2026. 43-4 record. Very interested, meeting with parents this weekend.', 'high', '@gavin_t_220', 'gthomas@email.com', '276-555-0215', 'Brian Thomas', 'bthomas@email.com', '276-555-0216', 'recruiting', NOW() - INTERVAL '5 days'),
  
  -- Offered stage (1)
  ('Liam Robinson - Lebanon HS, 126 lbs, Class of 2026. 45-2 record. Offer made! Waiting on his decision.', 'high', '@liam_r_126', 'lrobinson@email.com', '276-555-0217', 'Angela Robinson', 'arobinson@email.com', '276-555-0218', 'offer_extended', NOW() - INTERVAL '9 days'),
  
  -- Committed stage (1)
  ('Owen Walker - Honaker HS, 145 lbs, Class of 2026. 47-1 record. COMMITTED! Excited to join the Wasps!', 'high', '@owen_walker_145', 'owalker@email.com', '276-555-0219', 'Rebecca Walker', 'rwalker@email.com', '276-555-0220', 'committed', NOW() - INTERVAL '18 days');
  
END $$;
