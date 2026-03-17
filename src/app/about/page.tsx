'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Link from 'next/link';
import styles from './About.module.css';

const fadeInUp = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.8, /* ease removed */ },
  viewport: { once: true, amount: 0.3 }
};

export default function AboutPage() {
  return (
    <>
      <Navigation />

      {/* Section 1: Hero Banner */}
      <section className={styles.heroBanner}>
        <div className={styles.heroBannerContent}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <p className={styles.heroSubtitle}>Notre Histoire</p>
          </motion.div>
          <motion.h1
            className={styles.heroHeading}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            À Propos de Nous
          </motion.h1>
        </div>
      </section>

      {/* Section 2: Our Story */}
      <section className={styles.storySection}>
        <div className={`${styles.container} ${styles.storyGrid}`}>
          <motion.div className={styles.storyImages} {...fadeInUp}>
            <div className={styles.imageBadge}>Depuis 2019</div>
            <div className={styles.imageStack}>
              <div className={styles.imageFrame}>
                <img
                  src="/salon_interior_luxe.webp"
                  alt="Intérieur Luxe du Salon"
                  className={styles.storyImage}
                />
              </div>
              <div className={styles.imageFrame}>
                <img
                  src="/stylist_tools_macro.webp"
                  alt="Outils de Styliste Macro"
                  className={styles.storyImage}
                />
              </div>
            </div>
          </motion.div>

          <motion.div className={styles.storyText} {...fadeInUp}>
            <p className={styles.storySubtitle}>Notre Identité</p>
            <h2 className={styles.storyHeading}>
              Un Sanctuaire Dédié à la Beauté Féminine
            </h2>

            <div className={styles.storyContent}>
              <p>
                Fondé en 2019 au cœur de Rabat-Agdal, Brazilian Studio est bien plus qu'un simple salon de beauté. C'est un refuge d'excellence et de transformation où chaque cliente est célèbrée pour sa beauté unique. Nous avons créé un espace où la luxe rencontre l'authenticité, où la technique rencontre la passion.
              </p>

              <p>
                Nous sommes fières de proposer des techniques internationales à la pointe de l'innovation : la manucure russe ultra-précise, le lissage brésilien révolutionnaire, et les extensions de cils artistiques. Chaque service est adapté avec soin à la beauté naturelle marocaine, créant une symphonie harmonieuse entre tradition et modernité.
              </p>

              <p>
                Notre promesse est simple mais profonde : chaque femme qui franchit nos portes repart plus belle, plus confiante, et infiniment plus heureuse. Nous ne vendons pas des services ; nous offrons une expérience transformatrice et un moment de détente absolue.
              </p>
            </div>

            <div className={styles.quoteBlock}>
              <p className={styles.quoteText}>
                "Chaque femme mérite de se sentir extraordinaire."
              </p>
              <p className={styles.quoteAuthor}>— L'Équipe Brazilian Studio</p>
            </div>

            <Link href="/services" className={styles.servicesLink}>
              En savoir plus sur nos services
              <span className={styles.linkArrow}>→</span>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Section 3: Values */}
      <section className={styles.valuesSection}>
        <div className={styles.container}>
          <motion.div
            className={styles.valuesHeader}
            {...fadeInUp}
          >
            <p className={styles.valuesSubtitle}>Nos Valeurs</p>
            <h2 className={styles.valuesHeading}>Nos Valeurs</h2>
          </motion.div>

          <div className={styles.valuesGrid}>
            {[
              {
                number: '01',
                title: 'Excellence',
                description: 'Chaque geste est précis, chaque résultat est impeccable.'
              },
              {
                number: '02',
                title: 'Authenticité',
                description: 'Des techniques internationales adaptées à la beauté marocaine.'
              },
              {
                number: '03',
                title: 'Bien-être',
                description: 'Un espace de détente où vous êtes la priorité absolue.'
              }
            ].map((value, index) => (
              <motion.div
                key={index}
                className={styles.valueCard}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                viewport={{ once: true, amount: 0.3 }}
              >
                <div className={styles.valueNumber}>{value.number}</div>
                <h3 className={styles.valueTitle}>{value.title}</h3>
                <p className={styles.valueDescription}>{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: Team Teaser */}
      <section className={styles.teamSection}>
        <div className={styles.container}>
          <motion.div
            className={styles.teamContent}
            {...fadeInUp}
          >
            <p className={styles.teamSubtitle}>Notre Équipe</p>
            <h2 className={styles.teamHeading}>Des Expertes Passionnées</h2>
            <p className={styles.teamDescription}>
              Notre équipe est composée de professionnelles hautement qualifiées, certifiées internationalement et passionnées par leur métier. Elles apportent expertise, créativité et une écoute attentive à chaque cliente.
            </p>
            <Link href="/contact" className="button-primary">
              Contacter Nous
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </>
  );
}
