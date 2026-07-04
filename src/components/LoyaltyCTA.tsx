"use client";
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Sparkles, Gift, CalendarCheck, ShieldCheck } from 'lucide-react';
import styles from './LoyaltyCTA.module.css';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function LoyaltyCTA() {
  return (
    <section className={styles.section} id="club">
      <div className={styles.inner}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <span className={styles.kicker}>Brazilian Club</span>
          <h2 className={styles.title}>Votre fidélité mérite d&apos;être récompensée</h2>
          <p className={styles.lead}>
            Créez votre compte gratuit et cumulez des points à chaque visite. Vos récompenses vous attendent au salon.
          </p>

          <ul className={styles.benefits}>
            <li className={styles.benefit}>
              <Sparkles size={18} />
              <span><strong>Des points à chaque prestation</strong> : 50 points par visite, plus 1 point par 10 MAD.</span>
            </li>
            <li className={styles.benefit}>
              <Gift size={18} />
              <span><strong>Des récompenses réelles</strong> : -10% dès le statut Rose Gold, -15% et une attention anniversaire en Diamant.</span>
            </li>
            <li className={styles.benefit}>
              <CalendarCheck size={18} />
              <span><strong>Votre espace personnel</strong> : rendez-vous, devis et factures, accessibles à tout moment.</span>
            </li>
          </ul>

          <div className={styles.ctaRow}>
            <Link href="/espace-client" className={styles.ctaButton}>
              Créer mon compte gratuitement
            </Link>
          </div>

          <p className={styles.securityNote}>
            <ShieldCheck size={16} />
            Connexion sécurisée par lien magique envoyé par email. Aucun mot de passe à retenir, rien à pirater.
          </p>
        </motion.div>

        <motion.div
          className={styles.cardWrap}
          initial={{ opacity: 0, y: 40, rotate: -1 }}
          whileInView={{ opacity: 1, y: 0, rotate: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
        >
          <div className={styles.card} aria-hidden="true">
            <div className={styles.cardTop}>
              <span className={styles.cardBrand}>Brazilian Club</span>
              <span className={styles.cardTier}><Sparkles size={10} /> Rose Gold</span>
            </div>
            <div>
              <p className={styles.cardPoints}>720<span>points</span></p>
            </div>
            <div>
              <div className={styles.cardBarTrack}><div className={styles.cardBarFill} /></div>
              <p className={styles.cardCaption}>Encore 780 points avant le statut Diamant</p>
            </div>
            <p className={styles.cardName}>Salma B.</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
