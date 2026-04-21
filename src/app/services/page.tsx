"use client";
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, MessageCircle } from 'lucide-react';
import styles from './ServicesPage.module.css';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import type { PricingCategory, PricingItem } from '@/lib/supabase/types';

type CategoryWithItems = PricingCategory & { items: PricingItem[] }

export default function ServicesPage() {
  const [categories, setCategories] = useState<CategoryWithItems[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/pricing/categories').then(r => r.json()),
      fetch('/api/pricing/items').then(r => r.json()),
    ]).then(([cats, items]: [PricingCategory[], PricingItem[]]) => {
      const merged: CategoryWithItems[] = cats
        .filter(c => c.is_active)
        .map(c => ({
          ...c,
          items: items
            .filter(i => i.category_id === c.id && i.is_active)
            .sort((a, b) => a.sort_order - b.sort_order),
        }))
      setCategories(merged)
      setLoading(false)
    })
  }, [])

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
          {loading ? (
            <p style={{ textAlign: 'center', color: 'rgba(0,0,0,0.35)', padding: '40px 0' }}>Chargement...</p>
          ) : categories.map((category, index) => (
            <motion.section
              key={category.id}
              className={styles.categorySection}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: index * 0.08 }}
            >
              <div className={styles.categoryHeader}>
                {category.image_url && (
                  <img src={category.image_url} alt={category.name} className={styles.categoryCircle} loading="lazy" decoding="async" />
                )}
                <div>
                  <div className={styles.categoryRule} />
                  <h2 className={styles.categoryTitle}>{category.name}</h2>
                </div>
              </div>
              <div className={styles.priceGrid}>
                {category.items.map((item, itemIndex) => {
                  const isPromo = item.original_price != null && item.original_price > item.price
                  return (
                    <motion.div
                      key={item.id}
                      className={styles.priceRow}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: itemIndex * 0.02 }}
                    >
                      <span className={styles.itemName}>{item.name}</span>
                      <div className={styles.dots} />
                      {isPromo ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          <span style={{ fontSize: '10px', background: 'rgba(220,38,38,0.1)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '4px', padding: '1px 5px', fontWeight: 700, letterSpacing: '0.05em' }}>PROMO</span>
                          <span style={{ textDecoration: 'line-through', color: 'rgba(0,0,0,0.35)', fontSize: '13px' }}>{item.original_price}DH</span>
                          <span style={{ color: '#DC2626', fontWeight: 700, fontSize: '15px' }}>{item.price}DH</span>
                        </span>
                      ) : (
                        <span className={styles.itemPrice}>{item.price}DH</span>
                      )}
                    </motion.div>
                  )
                })}
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
