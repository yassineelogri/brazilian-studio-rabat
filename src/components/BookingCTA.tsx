"use client";

import { motion } from "framer-motion";
import { Phone, Instagram } from "lucide-react";
import styles from "./BookingCTA.module.css";

export default function BookingCTA() {
  return (
    <motion.section
      className={styles.section}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      viewport={{ once: true, amount: 0.3 }}
    >
      <img
        src="/cta_salon_ambiance.webp"
        alt="Brazilian Studio Rabat - Ambiance du salon"
        className={styles.backgroundImage}
      />
      <div className={styles.overlay}></div>

      <div className={styles.content}>
        <div className={styles.decorativeLine}></div>

        <p className={styles.subtitle}>Prête à Briller ?</p>

        <h2 className={styles.heading}>Réservez Votre Moment de Beauté</h2>

        <p className={styles.paragraph}>
          Offrez-vous une expérience unique dans notre salon au cœur de
          Rabat-Agdal. Appelez-nous ou visitez notre Instagram pour prendre
          rendez-vous.
        </p>

        <div className={styles.buttonsContainer}>
          <a
            href="tel:0661215800"
            className={`${styles.button} ${styles.buttonPrimary}`}
          >
            <Phone size={20} />
            Appeler: 0661215800
          </a>

          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.button} ${styles.buttonOutline}`}
          >
            <Instagram size={20} />
            Voir sur Instagram
          </a>
        </div>
      </div>
    </motion.section>
  );
}
