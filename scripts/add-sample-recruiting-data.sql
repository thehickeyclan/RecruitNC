-- Add sample recruiting pipeline data for testing
-- This creates standalone prospect records without referencing other tables

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
) VALUES
-- Roanoke College prospects (10 total)
(gen_random_uuid(), NULL, NULL, 'prospect', 'high', '@mike_johnson_157', 'mjohnson@email.com', '540-555-0101', 'Robert Johnson', 'rjohnson@email.com', '540-555-0102', 'Mike Johnson - Patrick Henry HS, 157 lbs, Class of 2026. 35-8 record. Strong technique.', NOW(), NOW() - INTERVAL '3 days'),
(gen_random_uuid(), NULL, NULL, 'prospect', 'medium', '@tyler_smith_165', 'tsmith@email.com', '540-555-0103', 'Sarah Smith', 'ssmith@email.com', '540-555-0104', 'Tyler Smith - Salem HS, 165 lbs, Class of 2027. 28-12 record. Good potential.', NOW(), NOW() - INTERVAL '5 days'),
(gen_random_uuid(), NULL, NULL, 'contacted', 'high', '@chris_williams_174', 'cwilliams@email.com', '540-555-0105', 'David Williams', 'dwilliams@email.com', '540-555-0106', 'Chris Williams - Cave Spring HS, 174 lbs, Class of 2026. 42-5 record. Very interested in Roanoke.', NOW(), NOW() - INTERVAL '2 days'),
(gen_random_uuid(), NULL, NULL, 'contacted', 'medium', '@alex_brown_149', 'abrown@email.com', '540-555-0107', 'Jennifer Brown', 'jbrown@email.com', '540-555-0108', 'Alex Brown - Hidden Valley HS, 149 lbs, Class of 2027. 31-10 record. Contacted via email.', NOW(), NOW() - INTERVAL '4 days'),
(gen_random_uuid(), NULL, NULL, 'evaluating', 'high', '@jordan_davis_184', 'jdavis@email.com', '540-555-0109', 'Michael Davis', 'mdavis@email.com', '540-555-0110', 'Jordan Davis - William Byrd HS, 184 lbs, Class of 2026. 38-6 record. Visiting campus next month.', NOW(), NOW() - INTERVAL '7 days'),
(gen_random_uuid(), NULL, NULL, 'evaluating', 'medium', '@ryan_miller_133', 'rmiller@email.com', '540-555-0111', 'Lisa Miller', 'lmiller@email.com', '540-555-0112', 'Ryan Miller - Northside HS, 133 lbs, Class of 2027. 29-14 record. Evaluating multiple schools.', NOW(), NOW() - INTERVAL '10 days'),
(gen_random_uuid(), NULL, NULL, 'recruiting', 'high', '@brandon_wilson_157', 'bwilson@email.com', '540-555-0113', 'Thomas Wilson', 'twilson@email.com', '540-555-0114', 'Brandon Wilson - Lord Botetourt HS, 157 lbs, Class of 2026. 44-3 record. Top recruit!', NOW(), NOW() - INTERVAL '1 day'),
(gen_random_uuid(), NULL, NULL, 'recruiting', 'high', '@kevin_moore_165', 'kmoore@email.com', '540-555-0115', 'Patricia Moore', 'pmoore@email.com', '540-555-0116', 'Kevin Moore - Franklin County HS, 165 lbs, Class of 2026. 40-5 record. Very strong interest.', NOW(), NOW() - INTERVAL '2 days'),
(gen_random_uuid(), NULL, NULL, 'offered', 'high', '@justin_taylor_174', 'jtaylor@email.com', '540-555-0117', 'James Taylor', 'jtaylor@email.com', '540-555-0118', 'Justin Taylor - Glenvar HS, 174 lbs, Class of 2026. 46-2 record. Offer extended!', NOW(), NOW() - INTERVAL '5 days'),
(gen_random_uuid(), NULL, NULL, 'committed', 'high', '@noah_garcia_165', 'ngarcia@email.com', '540-555-0119', 'Carlos Garcia', 'cgarcia@email.com', '540-555-0120', 'Noah Garcia - Staunton River HS, 165 lbs, Class of 2026. 48-3 record. COMMITTED!', NOW(), NOW() - INTERVAL '15 days'),

-- Emory & Henry College prospects (10 total)
(gen_random_uuid(), NULL, NULL, 'prospect', 'medium', '@ethan_anderson_141', 'eanderson@email.com', '276-555-0201', 'Mark Anderson', 'manderson@email.com', '276-555-0202', 'Ethan Anderson - Abingdon HS, 141 lbs, Class of 2027. 32-11 record. Solid prospect.', NOW(), NOW() - INTERVAL '4 days'),
(gen_random_uuid(), NULL, NULL, 'prospect', 'high', '@jacob_thomas_157', 'jthomas@email.com', '276-555-0203', 'Susan Thomas', 'sthomas@email.com', '276-555-0204', 'Jacob Thomas - Gate City HS, 157 lbs, Class of 2026. 37-7 record. Strong interest.', NOW(), NOW() - INTERVAL '6 days'),
(gen_random_uuid(), NULL, NULL, 'contacted', 'high', '@mason_jackson_165', 'mjackson@email.com', '276-555-0205', 'Richard Jackson', 'rjackson@email.com', '276-555-0206', 'Mason Jackson - Union HS, 165 lbs, Class of 2026. 41-6 record. Responded to outreach.', NOW(), NOW() - INTERVAL '3 days'),
(gen_random_uuid(), NULL, NULL, 'contacted', 'medium', '@logan_white_149', 'lwhite@email.com', '276-555-0207', 'Nancy White', 'nwhite@email.com', '276-555-0208', 'Logan White - Richlands HS, 149 lbs, Class of 2027. 30-13 record. Initial contact made.', NOW(), NOW() - INTERVAL '5 days'),
(gen_random_uuid(), NULL, NULL, 'evaluating', 'high', '@connor_harris_174', 'charris@email.com', '276-555-0209', 'William Harris', 'wharris@email.com', '276-555-0210', 'Connor Harris - Virginia High, 174 lbs, Class of 2026. 39-5 record. Campus visit scheduled.', NOW(), NOW() - INTERVAL '8 days'),
(gen_random_uuid(), NULL, NULL, 'evaluating', 'medium', '@luke_martin_133', 'lmartin@email.com', '276-555-0211', 'Karen Martin', 'kmartin@email.com', '276-555-0212', 'Luke Martin - John Battle HS, 133 lbs, Class of 2027. 27-15 record. Considering options.', NOW(), NOW() - INTERVAL '9 days'),
(gen_random_uuid(), NULL, NULL, 'recruiting', 'high', '@caleb_thompson_157', 'cthompson@email.com', '276-555-0213', 'Daniel Thompson', 'dthompson@email.com', '276-555-0214', 'Caleb Thompson - Tazewell HS, 157 lbs, Class of 2026. 43-4 record. Top target!', NOW(), NOW() - INTERVAL '2 days'),
(gen_random_uuid(), NULL, NULL, 'recruiting', 'high', '@andrew_garcia_165', 'agarcia@email.com', '276-555-0215', 'Maria Garcia', 'mgarcia@email.com', '276-555-0216', 'Andrew Garcia - Graham HS, 165 lbs, Class of 2026. 41-4 record. Active recruitment.', NOW(), NOW() - INTERVAL '1 day'),
(gen_random_uuid(), NULL, NULL, 'offered', 'high', '@nathan_martinez_174', 'nmartinez@email.com', '276-555-0217', 'Jose Martinez', 'jmartinez@email.com', '276-555-0218', 'Nathan Martinez - Lebanon HS, 174 lbs, Class of 2026. 45-3 record. Offer made!', NOW(), NOW() - INTERVAL '6 days'),
(gen_random_uuid(), NULL, NULL, 'committed', 'high', '@isaac_rodriguez_165', 'irodriguez@email.com', '276-555-0219', 'Ana Rodriguez', 'arodriguez@email.com', '276-555-0220', 'Isaac Rodriguez - Honaker HS, 165 lbs, Class of 2026. 47-2 record. COMMITTED!', NOW(), NOW() - INTERVAL '20 days')

ON CONFLICT DO NOTHING;
