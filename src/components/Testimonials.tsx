"use client";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import styles from './Testimonials.module.css';

const testimonials = [
  {
    text: "Je n'ai jamais vu une telle attention aux détails. La Manucure Russe a complètement transformé mes ongles, le résultat a duré des semaines sans une seule écaille.",
    author: "Sophia R.",
    service: "Manucure Russe",
    rating: 5
  },
  {
    text: "Le Lissage Brésilien ici est magique. Mes cheveux n'ont jamais été aussi soyeux et faciles à coiffer. Le salon lui-même est un rêve absolu.",
    author: "Amira B.",
    service: "Lissage Brésilien",
    rating: 5
  },
  {
    text: "Les meilleures artistes de cils à Rabat. Elles ont personnalisé le volume parfaitement. Le résultat est si naturel et glamour.",
    author: "Leila M.",
    service: "Extensions de Cils",
    rating: 5
  },
  {
    text: "Mon Hydrafacial chez Brazilian Studio m'a donné une peau éclatante instantanément. Je reviens chaque mois, c'est devenu mon rituel beauté.",
    author: "Yasmine K.",
    service: "Soin Hydrafacial",
    rating: 5
  }
];

export default function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const easeOutQuint = [0.22, 1, 0.36, 1] as const;

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 60 : -60,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      transition: { duration: 0.5, ease: easeOutQuint }
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 60 : -60,
      opacity: 0,
      transition: { duration: 0.35, ease: easeOutQuint }
    })
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setCurrentIndex((prevIndex) => {
      let nextIndex = prevIndex + newDirection;
      if (nextIndex < 0) nextIndex = testimonials.length - 1;
      if (nextIndex >= testimonials.length) nextIndex = 0;
      return nextIndex;
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: rating }).map((_, i) => (
      <Star key={i} size={16} className={styles.star} fill="currentColor" />
    ));
  };

  return (
    <section className={styles.testimonials}>
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.subtitle}>Témoignages</span>
          <h2 className="heading-lg">Ce Que Disent Nos Clientes</h2>
        </div>

        <div className={styles.carousel}>
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className={styles.card}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, { offset, velocity }) => {
                const swipe = swipePower(offset.x, velocity.x);
                if (swipe < -swipeConfidenceThreshold) {
                  paginate(1);
                } else if (swipe > swipeConfidenceThreshold) {
                  paginate(-1);
                }
              }}
            >
              <div className={styles.starsRow}>
                {renderStars(testimonials[currentIndex].rating)}
              </div>
              <Quote size={48} className={styles.quoteIcon} />
              <p className={styles.quoteText}>&quot;{testimonials[currentIndex].text}&quot;</p>
              <div className={styles.authorInfo}>
                <div className={styles.authorMonogram} aria-hidden="true">
                  {testimonials[currentIndex].author.charAt(0)}
                </div>
                <div className={styles.authorDetails}>
                  <span className={styles.authorName}>{testimonials[currentIndex].author}</span>
                  <span className={styles.authorService}>{testimonials[currentIndex].service}</span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className={styles.dots}>
          {testimonials.map((_, index) => (
            <button
              key={index}
              className={`${styles.dot} ${index === currentIndex ? styles.dotActive : ''}`}
              onClick={() => {
                setDirection(index > currentIndex ? 1 : -1);
                setCurrentIndex(index);
              }}
              aria-label={`Aller au témoignage ${index + 1}`}
            />
          ))}
        </div>

        <div className={styles.controls}>
          <button className={styles.controlBtn} onClick={() => paginate(-1)} aria-label="Témoignage précédent">
            <ChevronLeft size={24} />
          </button>
          <button className={styles.controlBtn} onClick={() => paginate(1)} aria-label="Témoignage suivant">
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
    </section>
  );
}
