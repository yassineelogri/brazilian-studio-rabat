"use client";
import { motion } from 'framer-motion';
import { Phone, MessageCircle } from 'lucide-react';
import styles from './ServicesPage.module.css';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const pricingData = [
  {
    category: "Hair & Coloration",
    image: "/hair_coloration.webp",
    items: [
      { name: "Brushing", price: "50DH" },
      { name: "Shampoing + Brushing", price: "70DH" },
      { name: "Brushing Wavy", price: "70DH" },
      { name: "Coupe + Brushing", price: "150DH" },
      { name: "Égalisation Pointes", price: "50DH" },
      { name: "Coloration", price: "300DH" },
      { name: "Balayage", price: "800DH" },
      { name: "Les Mèches", price: "700DH" }
    ]
  },
  {
    category: "Lissage & Soin Capillaire",
    image: "/smooth_hair.webp",
    items: [
      { name: "Lissage Goldery & More", price: "1500DH" },
      { name: "Lissage Cadiveu", price: "1300DH" },
      { name: "Lissage Brazilian", price: "500DH" },
      { name: "Soins (Inovatis, Nashi, Olaplex...)", price: "200DH" }
    ]
  },
  {
    category: "Nail Services",
    image: "/russian_manicure.webp",
    items: [
      { name: "Pose Permanente", price: "50DH" },
      { name: "BIAB", price: "100DH" },
      { name: "Manicure Russe", price: "200DH" },
      { name: "Dépose", price: "50DH" },
      { name: "Manicure Classique", price: "30DH" },
      { name: "Manicure Spa", price: "50DH" },
      { name: "Pedicure Russe", price: "250DH" },
      { name: "Pedicure Classique", price: "80DH" },
      { name: "Pedicure Spa", price: "100DH" },
      { name: "Faux Ongles + Permanente", price: "200DH" },
      { name: "Gel Extension", price: "250DH" },
      { name: "Remplissage", price: "350DH" },
      { name: "Nail Art", price: "20DH" }
    ]
  },
  {
    category: "Lashes & Soin de Visage",
    image: "/lash_extensions.webp",
    items: [
      { name: "Cils Classique", price: "70DH" },
      { name: "Cils 1D", price: "400DH" },
      { name: "Cils 2D", price: "500DH" },
      { name: "Cils 3D", price: "600DH" },
      { name: "Méga Volume", price: "300DH" },
      { name: "Effet", price: "100DH" },
      { name: "Soin de Visage Express", price: "100DH" },
      { name: "Soin de Visage Profond", price: "200DH" },
      { name: "Soin Hydrafacial", price: "400DH" },
      { name: "Micro-Needling", price: "800DH" },
      { name: "Brow Lift", price: "200DH" },
      { name: "Lash Lift", price: "250DH" }
    ]
  },
  {
    category: "Makeup",
    image: "/makeup_artistry.webp",
    items: [
      { name: "Makeup Invitee", price: "300DH" },
      { name: "Makeup du Jour", price: "200DH" },
      { name: "Pack Makeup Mariee", price: "1600DH" }
    ]
  },
  {
    category: "Epilation",
    image: "/epilation_waxing.webp",
    items: [
      { name: "Duvet", price: "15DH" },
      { name: "Sourcil", price: "30DH" },
      { name: "Visage", price: "50DH" },
      { name: "Aisselle", price: "30DH" },
      { name: "Demi Bras / Bras Entier", price: "30/50DH" },
      { name: "Demi Jambes / Jambes Entières", price: "40/70DH" },
      { name: "Bord Maillot / Maillot", price: "50DH" },
      { name: "Corps Complet", price: "100DH" }
    ]
  }
];

export default function ServicesPage() {
  return (
    <>
      <Navigation />
      <main className={styles.page}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className={styles.heroContent}
          >
            <h1 className={styles.heroTitle}>Services & Tarifs</h1>
            <p className={styles.heroSubtitle}>La Beauté à Son Juste Prix</p>
          </motion.div>
        </section>

        {/* Intro Paragraph */}
        <motion.p
          className={styles.intro}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Découvrez notre gamme complète de soins, chacun conçu pour sublimer votre beauté naturelle.
        </motion.p>

        {/* Menu Container */}
        <div className={styles.menuContainer}>
          {pricingData.map((category, index) => (
            <motion.section
              key={category.category}
              className={styles.categorySection}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: index * 0.08 }}
            >
              <div className={styles.categoryHeader}>
                <img src={category.image} alt={category.category} className={styles.categoryCircle} loading="lazy" decoding="async" />
                <div>
                  <div className={styles.categoryRule} />
                  <h2 className={styles.categoryTitle}>{category.category}</h2>
                </div>
              </div>
              <div className={styles.priceGrid}>
                {category.items.map((item, itemIndex) => (
                  <motion.div
                    key={item.name}
                    className={styles.priceRow}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: itemIndex * 0.02 }}
                  >
                    <span className={styles.itemName}>{item.name}</span>
                    <div className={styles.dots} />
                    <span className={styles.itemPrice}>{item.price}</span>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          ))}
        </div>

        {/* CTA Section */}
        <section className={styles.ctaSection}>
          <motion.h2
            className={styles.ctaTitle}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Prête à Vous Faire Chouchouter ?
          </motion.h2>
          <motion.div
            className={styles.ctaButtons}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <a href="tel:+212661215800" className={`${styles.ctaBtn} ${styles.ctaBtnPrimary}`}>
              <Phone size={18} style={{ marginRight: '0.5rem' }} />
              Appeler
            </a>
            <a href="https://wa.me/212661215800" target="_blank" rel="noreferrer" className={`${styles.ctaBtn} ${styles.ctaBtnOutline}`}>
              <MessageCircle size={18} style={{ marginRight: '0.5rem' }} />
              WhatsApp
            </a>
          </motion.div>
        </section>
      </main>
      <Footer />
    </>
  );
}
