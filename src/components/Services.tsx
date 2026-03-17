"use client";
import { motion } from 'framer-motion';
import Link from 'next/link';
import styles from './Services.module.css';

const services = [
  {
    title: "Manucure Russe",
    description: "La perfection des cuticules et un vernis longue durée appliqué avec une précision chirurgicale.",
    image: "/russian_manicure.webp"
  },
  {
    title: "Lissage Brésilien",
    description: "Transformez vos cheveux avec notre traitement lissant premium. Des cheveux soyeux et brillants pendant des mois.",
    image: "/smooth_hair.webp"
  },
  {
    title: "Extensions de Cils",
    description: "Sublimez votre regard avec des extensions sur-mesure appliquées selon nos techniques exclusives russes.",
    image: "/lash_extensions.webp"
  },
  {
    title: "Coloration & Balayage",
    description: "Des couleurs vibrantes et des reflets naturels réalisés par nos coloristes experts.",
    image: "/hair_coloration.webp"
  },
  {
    title: "Soin Visage",
    description: "Des soins profonds et personnalisés pour une peau éclatante — Hydrafacial, Micro-Needling, et plus.",
    image: "/skincare_facial.webp"
  },
  {
    title: "Maquillage",
    description: "Un maquillage professionnel pour toutes les occasions — mariée, soirée, ou beauté du quotidien.",
    image: "/makeup_artistry.webp"
  }
];

export default function Services() {
  return (
    <section className={`${styles.services} section-padding`} id="services">
      <div className="container">
        <div className={styles.header}>
          <span className={styles.subtitle}>Nos Spécialités</span>
          <h2 className="heading-lg">Soins Signature</h2>
        </div>

        <div className={styles.grid}>
          {services.map((service, index) => (
            <motion.div
              key={index}
              className={styles.card}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
            >
              <div className={styles.imageWrapper}>
                <img src={service.image} alt={service.title} className={styles.image} loading="lazy" decoding="async" />
              </div>
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{service.title}</h3>
                <p className={styles.cardDesc}>{service.description}</p>
                <a href="#" className={styles.discoverLink}>Découvrir →</a>
              </div>
            </motion.div>
          ))}
        </div>

        <div className={styles.buttonContainer}>
          <Link href="/services" className={styles.buttonOutline}>
            Voir Tous les Services
          </Link>
        </div>
      </div>
    </section>
  );
}
