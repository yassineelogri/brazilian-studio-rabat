"use client";
import { motion } from 'framer-motion';
import styles from './BeforeAfter.module.css';

const reveals = [
  {
    image: "/smooth_hair.webp",
    service: "Lissage Brésilien",
    label: "Cheveux",
    desc: "Des mèches transformées en soie — brillance, légèreté, durée jusqu'à 6 mois."
  },
  {
    image: "/russian_manicure.webp",
    service: "Manucure Russe",
    label: "Ongles",
    desc: "Cuticules parfaites, vernis longue durée — la précision russe au bout des doigts."
  },
  {
    image: "/lash_extensions.webp",
    service: "Extensions de Cils",
    label: "Cils",
    desc: "Un regard profond et magnétique — posé cil par cil, personnalisé pour vous."
  }
];

export default function BeforeAfter() {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <motion.span
          className={styles.subtitle}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Résultats
        </motion.span>
        <motion.h2
          className={`${styles.title} heading-lg`}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Nos Révélations
        </motion.h2>
        <motion.p
          className={styles.lead}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Chaque visite est une transformation. Voici quelques-uns de nos résultats.
        </motion.p>
      </div>

      <div className={styles.grid}>
        {reveals.map((item, i) => (
          <motion.div
            key={i}
            className={styles.card}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: i * 0.15 }}
          >
            <div className={styles.imageFrame}>
              <img src={item.image} alt={item.service} className={styles.image} loading="lazy" decoding="async" />
              <div className={styles.imageOverlay} />
              <span className={styles.labelTag}>{item.label}</span>
            </div>
            <div className={styles.cardBody}>
              <h3 className={styles.serviceName}>{item.service}</h3>
              <p className={styles.serviceDesc}>{item.desc}</p>
              <a href="/services" className={styles.reserveLink}>
                Réserver <span>→</span>
              </a>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
