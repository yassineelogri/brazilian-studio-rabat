"use client";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Gallery.module.css';

type Category = 'Tout' | 'Cheveux' | 'Ongles' | 'Cils' | 'Visage' | 'Maquillage';

const galleryItems = [
  { src: "/gallery/maquage.webp", title: "Maquillage Traditionnel", category: "Maquillage" as const },
  { src: "/gallery/lashes.webp", title: "Volume Russe", category: "Cils" as const },
  { src: "/gallery/silver_nails.webp", title: "French Chrome", category: "Ongles" as const },
  { src: "/gallery/wavy_hair.webp", title: "Balayage Caramel", category: "Cheveux" as const },
  { src: "/gallery/sleek_hair.webp", title: "Lissage Parfait", category: "Cheveux" as const },
  { src: "/gallery/nails_art.webp", title: "Nail Art Créatif", category: "Ongles" as const },
  { src: "/gallery/facial_glow.webp", title: "Soin Éclat", category: "Visage" as const },
  { src: "/gallery/maquage.jpg", title: "Maquillage Invitée", category: "Maquillage" as const },
];

const categories: Category[] = ['Tout', 'Cheveux', 'Ongles', 'Cils', 'Visage', 'Maquillage'];

export default function Gallery() {
  const [activeCategory, setActiveCategory] = useState<Category>('Tout');
  const [selectedImage, setSelectedImage] = useState<typeof galleryItems[0] | null>(null);

  const filteredItems = activeCategory === 'Tout'
    ? galleryItems
    : galleryItems.filter(item => item.category === activeCategory);

  return (
    <section className={styles.gallerySection} id="gallery">
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.subtitle}>Notre Portfolio</span>
          <h2 className="heading-lg">L&apos;Art dans les Détails</h2>
        </div>

        {/* Filter Buttons */}
        <div className={styles.filterContainer}>
          {categories.map((category) => (
            <button
              key={category}
              className={`${styles.filterButton} ${activeCategory === category ? styles.active : ''}`}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Gallery Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            className={styles.grid}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {filteredItems.map((item, index) => (
              <motion.div
                key={item.src}
                className={styles.imageWrapper}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                onClick={() => setSelectedImage(item)}
              >
                <img src={item.src} alt={item.title} className={styles.image} loading="lazy" decoding="async" />
                <div className={styles.overlay}>
                  <span className={styles.overlayText}>{item.title}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            className={styles.lightbox}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              className={styles.lightboxContent}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedImage.src}
                alt={selectedImage.title}
                className={styles.lightboxImage}
              />
              <p className={styles.lightboxTitle}>{selectedImage.title}</p>
            </motion.div>

            <button
              className={styles.lightboxClose}
              onClick={() => setSelectedImage(null)}
              aria-label="Close"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
