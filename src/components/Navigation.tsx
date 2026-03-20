"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import styles from './Navigation.module.css';

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [menuOpen]);

  const navLinks = [
    { href: '/', label: 'Accueil' },
    { href: '/about', label: 'À Propos' },
    { href: '/services', label: 'Services & Prix' },
    { href: '/#gallery', label: 'Galerie' },
    { href: '/contact', label: 'Contact' },
  ];

  const linkVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
      },
    }),
  };

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}
      >
        <Link href="/" className={styles.logo}>Brazilian Studio Rabat</Link>
        <ul className={styles.links}>
          <li className={styles.linkItem}>
            <Link href="/">Accueil</Link>
          </li>
          <li className={styles.linkItem}>
            <Link href="/about">À Propos</Link>
          </li>
          <li className={styles.linkItem}>
            <Link href="/services">Services & Prix</Link>
          </li>
          <li className={styles.linkItem}>
            <Link href="/#gallery">Galerie</Link>
          </li>
          <li className={styles.linkItem}>
            <Link href="/contact">Contact</Link>
          </li>
        </ul>
        <Link href="/booking" className={styles.bookBtn}>Réserver</Link>

        {/* Mobile Hamburger Button */}
        <button
          className={styles.hamburger}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span className={styles.line}></span>
          <span className={styles.line}></span>
          <span className={styles.line}></span>
        </button>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className={styles.mobileMenuOverlay}
            initial={{ clipPath: 'circle(0% at top right)' }}
            animate={{ clipPath: 'circle(150% at top right)' }}
            exit={{ clipPath: 'circle(0% at top right)' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className={styles.mobileMenuContent}>
              <ul className={styles.mobileLinks}>
                {navLinks.map((link, i) => (
                  <motion.li
                    key={link.href}
                    custom={i}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    variants={linkVariants}
                  >
                    <Link
                      href={link.href}
                      className={styles.mobileLink}
                      onClick={() => setMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  </motion.li>
                ))}
              </ul>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <Link
                  href="/booking"
                  className={styles.mobileBookBtn}
                  onClick={() => setMenuOpen(false)}
                >
                  Réserver
                </Link>
              </motion.div>

              <motion.div
                className={styles.mobileContact}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <p>@brazilian_studio_rabat</p>
                <p>Rabat-Agdal</p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
