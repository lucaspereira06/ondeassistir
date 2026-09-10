'use client'

import React, { useEffect } from 'react'
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
  height = 'auto',
  isSticky = false,
  className = '',
  hideOnMobile = false,
  hideOnDesktop = false,
}: AdSlotProps) {
  useEffect(() => {
    try {
      // @ts-ignore
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (err) {
      console.error('AdSense error:', err)
    }
  }, [])

  let visibilityClass = ''
  if (hideOnMobile) visibilityClass = styles.hideOnMobile
  if (hideOnDesktop) visibilityClass = styles.hideOnDesktop

  return (
    <div
      className={`${styles.adContainer} ${isSticky ? styles.sticky : ''} ${visibilityClass} ${className}`}
      style={{ width, height, minHeight: '90px', maxHeight: height !== 'auto' ? height : '100px', display: 'flex', justifyContent: 'center', overflow: 'hidden' }}
    >
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%' }}
        data-ad-client="ca-pub-8998304443137528"
        data-ad-slot="1316239608"
        data-ad-format="horizontal"
        data-full-width-responsive="true"
      ></ins>
    </div>
  )
}
