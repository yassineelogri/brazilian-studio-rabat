"use client";
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import styles from './Hero.module.css';

export default function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });

  const yBg = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

  // Staggered animation variants
  const badgeVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.1 } }
  };

  const titleVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, delay: 0.3 } }
  };

  const subtitleVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.4 } }
  };

  const descriptionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.5 } }
  };

  const actionsVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.6 } }
  };

  const floatingImageVariants = {
    hidden: { opacity: 0, scale: 0.8, x: 50 },
    visible: { opacity: 1, scale: 1, x: 0, transition: { duration: 0.8, delay: 0.4 } }
  };

  return (
    <section className={styles.hero} ref={ref}>
      <motion.img
        src="/hero_beauty_salon.webp"
        alt="Brazilian Studio Interior"
        className={styles.bgImage}
        style={{ y: yBg }}
        fetchPriority="high"
        decoding="sync"
      />
      <div className={styles.overlay}></div>

      {/* Floating Decorative Badge */}
      <motion.div
        className={styles.badge}
        variants={badgeVariants}
        initial="hidden"
        animate="visible"
      >
        ✦ Rabat-Agdal, Morocco
      </motion.div>

      {/* Floating Circular Image */}
      <motion.div
        className={styles.floatingImage}
        variants={floatingImageVariants}
        initial="hidden"
        animate="visible"
      >
        <img
          src="/salon_interior_luxe.webp"
          alt="Luxury Salon Interior"
        />
      </motion.div>

      {/* Main Content */}
      <motion.div
        className={styles.content}
        initial="hidden"
        animate="visible"
      >
        {/* Badge alternative positioned in content */}
        <motion.div
          className={styles.badgeAlt}
          variants={badgeVariants}
        >
          ✦ Rabat-Agdal, Morocco
        </motion.div>

        <motion.h1
          className={`${styles.title} heading-xl`}
          variants={titleVariants}
        >
          L&apos;Art de la Beauté
        </motion.h1>

        <motion.p
          className={styles.subtitle}
          variants={subtitleVariants}
        >
          Sublimez Votre Beauté Naturelle
        </motion.p>

        <motion.p
          className={styles.description}
          variants={descriptionVariants}
        >
          Découvrez nos soins signature — Manucure Russe, Lissage Brésilien, Extensions de Cils — dans un cadre luxueux au cœur de Rabat-Agdal.
        </motion.p>

        <motion.div
          className={styles.actions}
          variants={actionsVariants}
        >
          <button className="button-primary">Réserver</button>
          <button className="button-outline">Nos Services</button>
        </motion.div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        className={styles.scrollIndicator}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </motion.div>
    </section>
  );
}
