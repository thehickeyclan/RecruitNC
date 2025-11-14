// Function to map athlete data from database to frontend model
export function mapAthleteFromDatabase(dbAthlete: any): any {
  // Handle potential null/undefined input
  if (!dbAthlete) return null

  // Create a mapped athlete object with consistent property names
  const mappedAthlete = {
    id: dbAthlete.id,
    name: dbAthlete.name,
    firstName: dbAthlete.firstName,
    lastName: dbAthlete.lastName,
    email: dbAthlete.email,
    phone: dbAthlete.phone,
    photoUrl: dbAthlete.photoUrl || dbAthlete.photourl,
    photourl: dbAthlete.photourl || dbAthlete.photoUrl,
    commitmentPhotoUrl: dbAthlete.commitmentPhotoUrl,
    imageUrl: dbAthlete.imageUrl || dbAthlete.imageurl,
    imageurl: dbAthlete.imageurl || dbAthlete.imageUrl,
    birthdate: dbAthlete.birthdate,
    gender: dbAthlete.gender,
    weightClass: dbAthlete.weightClass || dbAthlete.weightclass,
    weightclass: dbAthlete.weightclass || dbAthlete.weightClass,
    highSchool: dbAthlete.highSchool || dbAthlete.highschool,
    highschool: dbAthlete.highschool || dbAthlete.highSchool,
    graduationYear: dbAthlete.graduationYear || dbAthlete.graduationyear,
    graduationyear: dbAthlete.graduationyear || dbAthlete.graduationYear,
    gpa: dbAthlete.gpa,
    state: dbAthlete.state,
    city: dbAthlete.city,
    college: dbAthlete.college,
    commitmentDate: dbAthlete.commitmentDate || dbAthlete.commitmentdate,
    commitmentdate: dbAthlete.commitmentdate || dbAthlete.commitmentDate,
    division: dbAthlete.division,
    achievements: dbAthlete.achievements || [],
    bio: dbAthlete.bio,
    wrestlingClub: dbAthlete.wrestlingClub || dbAthlete.wrestlingclub,
    wrestlingclub: dbAthlete.wrestlingclub || dbAthlete.wrestlingClub,
    socialMedia: dbAthlete.socialMedia || {
      twitter: dbAthlete.twitter || dbAthlete.twitter_url,
      instagram: dbAthlete.instagram || dbAthlete.instagram_url,
      facebook: dbAthlete.facebook || dbAthlete.facebook_url,
    },
    ncUnitedTeam: dbAthlete.ncUnitedTeam || dbAthlete.ncunitedteam || "none",
    ncunitedteam: dbAthlete.ncunitedteam || dbAthlete.ncUnitedTeam || "none",
    // Include any additional fields as needed
  }

  return mappedAthlete
}

// Function to map frontend model back to database format
export function mapAthleteToDatabaseFormat(athlete: any): any {
  // Handle potential null/undefined input
  if (!athlete) return null

  // Create a database-formatted athlete object
  const dbAthlete = {
    name: athlete.name,
    firstName: athlete.firstName,
    lastName: athlete.lastName,
    email: athlete.email,
    phone: athlete.phone,
    photourl: athlete.photoUrl || athlete.photourl,
    photoUrl: athlete.photoUrl || athlete.photourl,
    commitmentPhotoUrl: athlete.commitmentPhotoUrl,
    birthdate: athlete.birthdate,
    gender: athlete.gender,
    weightclass: athlete.weightClass || athlete.weightclass,
    weightClass: athlete.weightClass || athlete.weightclass,
    highschool: athlete.highSchool || athlete.highschool,
    highSchool: athlete.highSchool || athlete.highschool,
    graduationyear: athlete.graduationYear || athlete.graduationyear,
    graduationYear: athlete.graduationYear || athlete.graduationyear,
    gpa: athlete.gpa,
    state: athlete.state,
    city: athlete.city,
    college: athlete.college,
    commitmentdate: athlete.commitmentDate || athlete.commitmentdate,
    commitmentDate: athlete.commitmentDate || athlete.commitmentdate,
    division: athlete.division,
    achievements: athlete.achievements,
    bio: athlete.bio,
    wrestlingclub: athlete.wrestlingClub || athlete.wrestlingclub,
    wrestlingClub: athlete.wrestlingClub || athlete.wrestlingclub,
    twitter: athlete.socialMedia?.twitter,
    instagram: athlete.socialMedia?.instagram,
    facebook: athlete.socialMedia?.facebook,
    ncUnitedTeam: athlete.ncUnitedTeam || athlete.ncunitedteam || "none",
    ncunitedteam: athlete.ncunitedteam || athlete.ncUnitedTeam || "none",
    // Include any additional fields as needed
  }

  return dbAthlete
}
