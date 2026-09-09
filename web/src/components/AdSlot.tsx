import React from 'react'
import styles from './AdSlot.module.css'

interface AdSlotProps {
  width?: string
  height?: string
  isSticky?: boolean
  className?: string
  hideOnMobile?: boolean
  hideOnDesktop?: boolean
}

export default function AdSlot({
  width = '100%',
  height = '100%',
  isSticky = false,
  className = '',
  hideOnMobile = false,
  hideOnDesktop = false,
}: AdSlotProps) {
  let visibilityClass = ''
  if (hideOnMobile) visibilityClass = styles.hideOnMobile
  if (hideOnDesktop) visibilityClass = styles.hideOnDesktop

  return (
    <div
      className={`${styles.adContainer} ${isSticky ? styles.sticky : ''} ${visibilityClass} ${className}`}
      style={{ width, height }}
    >
      <div className={styles.adPlaceholder}>
        <span className={styles.adText}>Publicidade</span>
      </div>
    </div>
  )
}
