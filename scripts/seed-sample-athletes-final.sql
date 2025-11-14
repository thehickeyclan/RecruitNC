-- Insert 10 sample athletes for Roanoke College (distributed across pipeline stages)
INSERT INTO college_coach_stars (
  id, 
  coach_user_id, 
  athlete_id, 
  pipeline_stage, 
  interest_level, 
  athlete_instagram, 
  athlete_email, 
  athlete_cell, 
  parent_name, 
  parent_email, 
  parent_phone, 
  notes, 
  starred_at, 
  last_contacted
)
VALUES
  -- 2 Prospect stage
  (gen_random_uuid(), NULL, gen_random_uuid(), 'prospect', 'medium', '@mike_johnson_157', 'mjohnson@email.com', '540-555-0101', 'Sarah Johnson', 'sjohnson@email.com', '540-555-0102', 'Mike Johnson - Salem HS, 157 lbs, Class of 2026. 35-8 record. Strong potential, needs follow-up.', NOW(), NOW() - INTERVAL '5 days'),
  (gen_random_uuid(), NULL, gen_random_uuid(), 'prospect', 'low', '@tyler_smith_144', 'tsmith@email.com', '540-555-0103', 'David Smith', 'dsmith@email.com', '540-555-0104', 'Tyler Smith - Cave Spring HS, 144 lbs, Class of 2027. 28-12 record. Early prospect.', NOW(), NOW() - INTERVAL '10 days'),
  
  -- 2 Contacted stage
  (gen_random_uuid(), NULL, gen_random_uuid(), 'contacted', 'high', '@alex_williams_165', 'awilliams@email.com', '540-555-0105', 'Jennifer Williams', 'jwilliams@email.com', '540-555-0106', 'Alex Williams - William Byrd HS, 165 lbs, Class of 2026. 42-5 record. Had initial call, very interested.', NOW(), NOW() - INTERVAL '3 days'),
  (gen_random_uuid(), NULL, gen_random_uuid(), 'contacted', 'medium', '@chris_brown_150', 'cbrown@email.com', '540-555-0107', 'Michael Brown', 'mbrown@email.com', '540-555-0108', 'Chris Brown - Franklin County HS, 150 lbs, Class of 2026. 38-10 record. Sent intro email.', NOW(), NOW() - INTERVAL '7 days'),
  
  -- 2 Evaluating stage
  (gen_random_uuid(), NULL, gen_random_uuid(), 'evaluating', 'high', '@jordan_davis_175', 'jdavis@email.com', '540-555-0109', 'Lisa Davis', 'ldavis@email.com', '540-555-0110', 'Jordan Davis - Patrick Henry HS, 175 lbs, Class of 2026. 45-3 record. Reviewing film, planning visit.', NOW(), NOW() - INTERVAL '2 days'),
  (gen_random_uuid(), NULL, gen_random_uuid(), 'evaluating', 'high', '@ryan_miller_157', 'rmiller@email.com', '540-555-0111', 'Karen Miller', 'kmiller@email.com', '540-555-0112', 'Ryan Miller - Northside HS, 157 lbs, Class of 2026. 40-6 record. Strong academics, evaluating fit.', NOW(), NOW() - INTERVAL '4 days'),
  
  -- 2 Recruiting stage
  (gen_random_uuid(), NULL, gen_random_uuid(), 'recruiting', 'high', '@ethan_wilson_144', 'ewilson@email.com', '540-555-0113', 'Robert Wilson', 'rwilson@email.com', '540-555-0114', 'Ethan Wilson - Hidden Valley HS, 144 lbs, Class of 2026. 47-2 record. Active recruitment, campus visit scheduled.', NOW(), NOW() - INTERVAL '1 day'),
  (gen_random_uuid(), NULL, gen_random_uuid(), 'recruiting', 'high', '@noah_moore_165', 'nmoore@email.com', '540-555-0115', 'Patricia Moore', 'pmoore@email.com', '540-555-0116', 'Noah Moore - Lord Botetourt HS, 165 lbs, Class of 2026. 43-4 record. Multiple visits, strong interest.', NOW(), NOW() - INTERVAL '2 days'),
  
  -- 1 Offered stage
  (gen_random_uuid(), NULL, gen_random_uuid(), 'offered', 'high', '@liam_taylor_150', 'ltaylor@email.com', '540-555-0117', 'James Taylor', 'jtaylor@email.com', '540-555-0118', 'Liam Taylor - Glenvar HS, 150 lbs, Class of 2026. 50-1 record. OFFER EXTENDED! Waiting on decision.', NOW(), NOW() - INTERVAL '5 days'),
  
  -- 1 Committed stage
  (gen_random_uuid(), NULL, gen_random_uuid(), 'committed', 'high', '@mason_anderson_157', 'manderson@email.com', '540-555-0119', 'Susan Anderson', 'sanderson@email.com', '540-555-0120', 'Mason Anderson - Staunton River HS, 157 lbs, Class of 2026. 52-0 record. COMMITTED! Signed NLI.', NOW(), NOW() - INTERVAL '20 days');

-- Insert 10 sample athletes for Emory & Henry College (distributed across pipeline stages)
INSERT INTO college_coach_stars (
  id, 
  coach_user_id, 
  athlete_id, 
  pipeline_stage, 
  interest_level, 
  athlete_instagram, 
  athlete_email, 
  athlete_cell, 
  parent_name, 
  parent_email, 
  parent_phone, 
  notes, 
  starred_at, 
  last_contacted
)
VALUES
  -- 2 Prospect stage
  (gen_random_uuid(), NULL, gen_random_uuid(), 'prospect', 'medium', '@jake_harris_165', 'jharris@email.com', '276-555-0201', 'Mary Harris', 'mharris@email.com', '276-555-0202', 'Jake Harris - Abingdon HS, 165 lbs, Class of 2026. 32-10 record. Local talent, good potential.', NOW(), NOW() - INTERVAL '6 days'),
  (gen_random_uuid(), NULL, gen_random_uuid(), 'prospect', 'low', '@sam_clark_150', 'sclark@email.com', '276-555-0203', 'Tom Clark', 'tclark@email.com', '276-555-0204', 'Sam Clark - Gate City HS, 150 lbs, Class of 2027. 25-15 record. Early stage prospect.', NOW(), NOW() - INTERVAL '12 days'),
  
  -- 2 Contacted stage
  (gen_random_uuid(), NULL, gen_random_uuid(), 'contacted', 'high', '@ben_lewis_157', 'blewis@email.com', '276-555-0205', 'Rachel Lewis', 'rlewis@email.com', '276-555-0206', 'Ben Lewis - Union HS, 157 lbs, Class of 2026. 40-7 record. Initial contact made, positive response.', NOW(), NOW() - INTERVAL '4 days'),
  (gen_random_uuid(), NULL, gen_random_uuid(), 'contacted', 'medium', '@luke_walker_144', 'lwalker@email.com', '276-555-0207', 'Steve Walker', 'swalker@email.com', '276-555-0208', 'Luke Walker - Richlands HS, 144 lbs, Class of 2026. 36-9 record. Sent initial email.', NOW(), NOW() - INTERVAL '8 days'),
  
  -- 2 Evaluating stage
  (gen_random_uuid(), NULL, gen_random_uuid(), 'evaluating', 'high', '@matt_hall_175', 'mhall@email.com', '276-555-0209', 'Nancy Hall', 'nhall@email.com', '276-555-0210', 'Matt Hall - Tazewell HS, 175 lbs, Class of 2026. 44-4 record. Reviewing film, strong interest.', NOW(), NOW() - INTERVAL '3 days'),
  (gen_random_uuid(), NULL, gen_random_uuid(), 'evaluating', 'high', '@josh_young_165', 'jyoung@email.com', '276-555-0211', 'Linda Young', 'lyoung@email.com', '276-555-0212', 'Josh Young - Graham HS, 165 lbs, Class of 2026. 41-5 record. Good academics, evaluating fit.', NOW(), NOW() - INTERVAL '5 days'),
  
  -- 2 Recruiting stage
  (gen_random_uuid(), NULL, gen_random_uuid(), 'recruiting', 'high', '@adam_king_150', 'aking@email.com', '276-555-0213', 'Paul King', 'pking@email.com', '276-555-0214', 'Adam King - Lebanon HS, 150 lbs, Class of 2026. 46-3 record. Active recruitment, visit planned.', NOW(), NOW() - INTERVAL '2 days'),
  (gen_random_uuid(), NULL, gen_random_uuid(), 'recruiting', 'high', '@kyle_wright_157', 'kwright@email.com', '276-555-0215', 'Amy Wright', 'awright@email.com', '276-555-0216', 'Kyle Wright - Honaker HS, 157 lbs, Class of 2026. 42-5 record. Multiple contacts, strong interest.', NOW(), NOW() - INTERVAL '3 days'),
  
  -- 1 Offered stage
  (gen_random_uuid(), NULL, gen_random_uuid(), 'offered', 'high', '@brad_scott_144', 'bscott@email.com', '276-555-0217', 'Mark Scott', 'mscott@email.com', '276-555-0218', 'Brad Scott - Castlewood HS, 144 lbs, Class of 2026. 49-2 record. OFFER EXTENDED! Awaiting decision.', NOW(), NOW() - INTERVAL '6 days'),
  
  -- 1 Committed stage
  (gen_random_uuid(), NULL, gen_random_uuid(), 'committed', 'high', '@noah_garcia_165', 'ngarcia@email.com', '276-555-0219', 'Carlos Garcia', 'cgarcia@email.com', '276-555-0220', 'Noah Garcia - Twin Springs HS, 165 lbs, Class of 2026. 51-1 record. COMMITTED! Signed NLI.', NOW(), NOW() - INTERVAL '18 days');
