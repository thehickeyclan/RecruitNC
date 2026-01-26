import React from 'react';
import styles from './recruit-profile.module.css';

export interface RecruitProfileProps {
  /**
   * The recruit's name
   */
  name?: string;
  /**
   * The recruit's position
   */
  position?: string;
  /**
   * The recruit's school
   */
  school?: string;
  /**
   * The recruit's graduation year
   */
  graduationYear?: number;
  /**
   * The recruit's photo URL (photourl or headshot_url)
   */
  photoUrl?: string;
  /**
   * Additional className for styling
   */
  className?: string;
}

/**
 * RecruitProfile component displays information about a recruit
 */
export const RecruitProfile: React.FC<RecruitProfileProps> = ({
  name,
  position,
  school,
  graduationYear,
  photoUrl,
  className,
}) => {
  return (
    <div className={`${styles.container} ${className || ''}`}>
      {photoUrl && (
        <div className={styles.imageContainer}>
          <img 
            src={photoUrl} 
            alt={name ? `${name}'s photo` : 'Recruit photo'} 
            className={styles.photo}
            onError={(e) => {
              // Hide image on error
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
      <div className={styles.header}>
        {name && <h2 className={styles.name}>{name}</h2>}
        {position && <p className={styles.position}>{position}</p>}
      </div>
      <div className={styles.details}>
        {school && (
          <div className={styles.detailItem}>
            <span className={styles.label}>School:</span>
            <span className={styles.value}>{school}</span>
          </div>
        )}
        {graduationYear && (
          <div className={styles.detailItem}>
            <span className={styles.label}>Graduation Year:</span>
            <span className={styles.value}>{graduationYear}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecruitProfile;
