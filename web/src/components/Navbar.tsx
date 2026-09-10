import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './Navbar.module.css';

export default function Navbar() {
  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link href="/" className={styles.logoLink}>
          <Image
            src="/icon-192x192.png"
            alt="Onde Assistir Logo"
            width={44}
            height={44}
            className={styles.logoImage}
            unoptimized
          />
          <span className={styles.logoText}>Onde Assistir?</span>
        </Link>
      </div>
    </nav>
  );
}
