'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, MapPin, Clock, Instagram, MessageCircle } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import styles from './Contact.module.css';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    service: '',
    message: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    alert('Merci pour votre message! Nous vous contacterons bientôt.');
    setFormData({ nom: '', prenom: '', telephone: '', service: '', message: '' });
  };

  const contactCards = [
    {
      icon: Phone,
      label: 'Appelez-nous',
      content: '0661 21 58 00',
      href: 'tel:+212661215800',
    },
    {
      icon: MessageCircle,
      label: 'Écrivez sur WhatsApp',
      content: '0661 21 58 00',
      href: 'https://wa.me/212661215800?text=Bonjour, je souhaite prendre rendez-vous chez Brazilian Studio Rabat.',
    },
    {
      icon: Instagram,
      label: 'Suivez-nous',
      content: '@brazilian_studio_rabat',
      href: 'https://instagram.com/brazilian_studio_rabat',
    },
    {
      icon: MapPin,
      label: 'Adresse',
      content: 'Rabat-Agdal, Morocco',
      href: null,
    },
    {
      icon: Clock,
      label: 'Horaires',
      content: 'Lun - Sam: 10h00 — 20h00 / Dimanche: Fermé',
      href: null,
    },
  ];

  const services = [
    'Manucure Russe',
    'Lissage Brésilien',
    'Extensions de Cils',
    'Soin Visage',
    'Maquillage',
    'Épilation',
    'Autre',
  ];

  return (
    <>
      <Navigation />

      {/* Header Banner */}
      <motion.section
        className={styles.headerBanner}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className={styles.headerContent}>
          <motion.p
            className={styles.subtitle}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            Nous Contacter
          </motion.p>
          <motion.h1
            className={styles.headerTitle}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            Prenez Rendez-vous
          </motion.h1>
        </div>
      </motion.section>

      {/* Contact Section */}
      <section className={styles.contactSection}>
        <div className={styles.container}>
          {/* Left Column - Contact Cards */}
          <motion.div
            className={styles.contactCards}
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            {contactCards.map((card, index) => {
              const IconComponent = card.icon;
              return (
                <motion.div
                  key={index}
                  className={styles.card}
                  whileHover={{ y: -8 }}
                  transition={{ duration: 0.3 }}
                >
                  {card.href ? (
                    <a href={card.href} className={styles.cardLink}>
                      <IconComponent className={styles.cardIcon} />
                      <div>
                        <p className={styles.cardLabel}>{card.label}</p>
                        <p className={styles.cardContent}>{card.content}</p>
                      </div>
                    </a>
                  ) : (
                    <div>
                      <IconComponent className={styles.cardIcon} />
                      <div>
                        <p className={styles.cardLabel}>{card.label}</p>
                        <p className={styles.cardContent}>{card.content}</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>

          {/* Right Column - Booking Form */}
          <motion.div
            className={styles.formContainer}
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className={styles.formTitle}>Envoyer un Message</h2>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formRow}>
                <input
                  type="text"
                  name="prenom"
                  placeholder="Prénom"
                  value={formData.prenom}
                  onChange={handleInputChange}
                  className={styles.input}
                  required
                />
                <input
                  type="text"
                  name="nom"
                  placeholder="Nom"
                  value={formData.nom}
                  onChange={handleInputChange}
                  className={styles.input}
                  required
                />
              </div>

              <input
                type="tel"
                name="telephone"
                placeholder="Téléphone"
                value={formData.telephone}
                onChange={handleInputChange}
                className={styles.input}
                required
              />

              <select
                name="service"
                value={formData.service}
                onChange={handleInputChange}
                className={styles.input}
                required
              >
                <option value="">Choisir un service...</option>
                {services.map((service) => (
                  <option key={service} value={service}>
                    {service}
                  </option>
                ))}
              </select>

              <textarea
                name="message"
                placeholder="Message"
                value={formData.message}
                onChange={handleInputChange}
                className={styles.textarea}
                rows={5}
                required
              />

              <button type="submit" className={styles.submitBtn}>
                Envoyer
              </button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Map Section */}
      <section className={styles.mapSection}>
        {/* Replace with Google Maps embed */}
        <div className={styles.mapPlaceholder}>
          <MapPin className={styles.mapIcon} />
          <h3 className={styles.mapText}>Brazilian Studio Rabat — Agdal, Rabat, Maroc</h3>
        </div>
      </section>

      <Footer />
    </>
  );
}
