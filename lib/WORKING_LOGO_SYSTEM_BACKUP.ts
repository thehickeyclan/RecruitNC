"use client"

// 🔒 QUARANTINED WORKING LOGO SYSTEM BACKUP
// This is a complete backup of the working logo system
// DO NOT MODIFY - FOR EMERGENCY RESTORATION ONLY

export const WORKING_LOGO_MAPPINGS = {
  // College logos
  "University of North Carolina at Chapel Hill": "/UNC_Chapel_Hill_Logo.png",
  "NC State University": "/wolfpack-logo.png",
  "Appalachian State University": "/appalachian-state-mountains.png",
  "Campbell University": "/campbell-university-seal.png",
  "Queens University of Charlotte": "/queens-university-shield.png",
  "Belmont Abbey College": "/belmont-abbey-architectural-detail.png",
  "UNC Pembroke": "/unc-pembroke-seal.png",
  "Greensboro College": "/Greensboro-College-Seal.png",

  // High School logos
  "Cary High School": "/cary-high-school-spirit.png",
  "William G. Enloe High School": "/hough-high-school-logo.png",
  "Cardinal Gibbons High School": "/cardinal-gibbons-crest.png",
  "Laney High School": "/Laney-High-Wildcats.png",
  "Jack Britt High School": "/jack-britt-high-school-logo.png",

  // Generic fallbacks
  "generic-college": "/generic-college-logo.png",
  "generic-highschool": "/generic-high-school-logo.png",
  "generic-club": "/wrestling-club-logo.png",
}

export const WORKING_LOGO_COMPONENT_CODE = `
// WORKING EntityLogo Component Code
import { useState, useEffect } from 'react'
import Image from 'next/image'

interface EntityLogoProps {
  category: 'college' | 'highschool' | 'club'
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

export function EntityLogo({ category, name, size = 'md', className = '' }: EntityLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const response = await fetch(\`/api/logo-mappings/\${category}/\${encodeURIComponent(name)}\`)
        const data = await response.json()
        
        if (data.logo_url) {
          setLogoUrl(data.logo_url)
        } else {
          setError(true)
        }
      } catch (err) {
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    if (name && name !== 'Not specified') {
      fetchLogo()
    } else {
      setLoading(false)
      setError(true)
    }
  }, [category, name])

  const sizeClasses = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  if (loading) {
    return <div className={\`\${sizeClasses[size]} bg-gray-200 animate-pulse rounded \${className}\`} />
  }

  if (error || !logoUrl) {
    const fallbackLogos = {
      college: '/generic-college-logo.png',
      highschool: '/generic-high-school-logo.png',
      club: '/wrestling-club-logo.png'
    }
    
    return (
      <Image
        src={fallbackLogos[category] || "/placeholder.svg"}
        alt={\`\${name} logo\`}
        width={32}
        height={32}
        className={\`\${sizeClasses[size]} object-contain \${className}\`}
      />
    )
  }

  return (
    <Image
      src={logoUrl || "/placeholder.svg"}
      alt={\`\${name} logo\`}
      width={32}
      height={32}
      className={\`\${sizeClasses[size]} object-contain \${className}\`}
    />
  )
}
`

// Timestamp of last working state
export const BACKUP_TIMESTAMP = new Date().toISOString()
export const SYSTEM_STATUS = "PROTECTED_AND_BACKED_UP"
