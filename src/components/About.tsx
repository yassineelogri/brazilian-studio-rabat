"use client";
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import styles from './About.module.css';

interface CounterState {
  yearsExperience: number;
  clientsSatisfied: number;
  servicesOffered: number;
  googleRating: number;
}

function AnimatedCounter({ target, decimals = 0 }: { target: number; decimals?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isInView) {
          setIsInView(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [isInView]);

  useEffect(() => {
    if (!isInView) return;

    let isMounted = true;
    const duration = 2000; // 2 seconds
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentValue = target * progress;

      if (isMounted) {
        setCount(decimals > 0 ? parseFloat(currentValue.toFixed(decimals)) : Math.floor(currentValue));
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);

    return () => {
      isMounted = false;
    };
  }, [isInView, target, decimals]);

  return <div ref={ref}>{count.toFixed(decimals)}</div>;
}

export default function About() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, 100]);

  return (
    <section id="about" className={styles.about} ref={containerRef}>
      <div className={styles.container}>

        <div className={styles.imageGrid}>
          <div className={styles.decorativeCircle}></div>

          <div className={styles.imageGridInner}>
            <motion.div className={styles.imageWrapper} style={{ y: y1 }}>
              <img src="/salon_interior_luxe.webp" alt="Luxurious Salon Interior" className={styles.image} loading="lazy" decoding="async" />
            </motion.div>
            <motion.div className={styles.imageWrapper} style={{ y: y2 }}>
              <img src="/stylist_tools_macro.webp" alt="Professional Russian Technique Tools" className={styles.image} loading="lazy" decoding="async" />
            </motion.div>
          </div>

          <motion.div
            className={styles.experienceBadge}
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            5+ Ans d'Excellence
          </motion.div>
        </div>

        <motion.div
          className={styles.textContent}
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <span className={styles.subtitle}>Notre Histoire</span>
          <h2 className={`${styles.title} heading-lg`}>L&apos;Excellence au Service de Votre Beauté</h2>
          <p className={styles.paragraph}>
            Chez Brazilian Studio Rabat, nous marions les standards internationaux avec un savoir-faire exceptionnel. Nos techniques russes renommées pour la beauté des ongles et des cils garantissent une précision sans égal, livrant une perfection durable à vos mains et à votre regard.
          </p>
          <p className={styles.paragraph}>
            Découvrez notre sanctuaire à Rabat-Agdal, où chaque soin est une expérience sur mesure, conçue pour sublimer votre beauté naturelle dans un environnement d'absolue luxe et de relaxation.
          </p>

          <div className={styles.statsGrid}>
            <div className={styles.statCounter}>
              <div className={styles.statNumber}>
                <AnimatedCounter target={5} decimals={0} />
                <span>+</span>
              </div>
              <div className={styles.statLabel}>Années d'Expérience</div>
            </div>

            <div className={styles.statCounter}>
              <div className={styles.statNumber}>
                <AnimatedCounter target={3000} decimals={0} />
                <span>+</span>
              </div>
              <div className={styles.statLabel}>Clientes Satisfaites</div>
            </div>

            <div className={styles.statCounter}>
              <div className={styles.statNumber}>
                <AnimatedCounter target={15} decimals={0} />
                <span>+</span>
              </div>
              <div className={styles.statLabel}>Soins Proposés</div>
            </div>

            <div className={styles.statCounter}>
              <div className={styles.statNumber}>
                <AnimatedCounter target={4.9} decimals={1} />
              </div>
              <div className={styles.statLabel}>Note Google</div>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
