import { MapPin, Phone, Instagram, Clock, Mail } from 'lucide-react';
import styles from './Footer.module.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer id="contact" className={styles.footer}>
      <div className={styles.container}>
        {/* Main Grid */}
        <div className={styles.grid}>
          {/* Column 1: Brand */}
          <div className={styles.brandColumn}>
            <div className={styles.brand}>Brazilian Studio</div>
            <p className={styles.desc}>
              La destination premium pour les soins capillaires et esthétiques à Rabat. Des standards internationaux, une touche marocaine.
            </p>
            <div className={styles.socialLinks}>
              <a
                href="https://www.instagram.com/brazilian_studio_rabat/"
                target="_blank"
                rel="noreferrer"
                className={styles.socialIcon}
                aria-label="Instagram"
              >
                <Instagram size={20} />
              </a>
            </div>
          </div>

          {/* Column 2: Navigation */}
          <div>
            <h4 className={styles.title}>Navigation</h4>
            <ul className={styles.list}>
              <li>
                <a href="#accueil" className={styles.link}>Accueil</a>
              </li>
              <li>
                <a href="#services" className={styles.link}>Services & Prix</a>
              </li>
              <li>
                <a href="#galerie" className={styles.link}>Galerie</a>
              </li>
              <li>
                <a href="#about" className={styles.link}>À Propos</a>
              </li>
            </ul>
          </div>

          {/* Column 3: Services */}
          <div>
            <h4 className={styles.title}>Nos Services</h4>
            <ul className={styles.list}>
              <li>
                <a href="#services" className={styles.link}>Manucure Russe</a>
              </li>
              <li>
                <a href="#services" className={styles.link}>Lissage Brésilien</a>
              </li>
              <li>
                <a href="#services" className={styles.link}>Extensions de Cils</a>
              </li>
              <li>
                <a href="#services" className={styles.link}>Soin Visage</a>
              </li>
              <li>
                <a href="#services" className={styles.link}>Maquillage</a>
              </li>
              <li>
                <a href="#services" className={styles.link}>Épilation</a>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Hours */}
          <div>
            <h4 className={styles.title}>Contact</h4>
            <ul className={styles.contactList}>
              <li className={styles.contactItem}>
                <MapPin size={18} />
                <span>Rabat-Agdal, Morocco</span>
              </li>
              <li className={styles.contactItem}>
                <Phone size={18} />
                <span>0661 21 58 00</span>
              </li>
              <li className={styles.contactItem}>
                <Instagram size={18} />
                <span>@brazilian_studio_rabat</span>
              </li>
              <li className={styles.contactItem}>
                <Clock size={18} />
                <span>Lun - Sam: 10h - 20h</span>
              </li>
              <li className={styles.contactItem}>
                <Clock size={18} />
                <span>Dimanche: Fermé</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Instagram CTA Strip */}
        <div className={styles.ctaStrip}>
          <span>Suivez-nous sur Instagram</span>
          <a href="https://www.instagram.com/brazilian_studio_rabat/" target="_blank" rel="noreferrer" className={styles.instagramLink}>
            <Instagram size={18} />
            <span>@brazilian_studio_rabat</span>
          </a>
        </div>

        {/* Bottom Bar */}
        <div className={styles.bottom}>
          <p>&copy; {currentYear} Brazilian Studio Rabat. Crafted with love in Rabat</p>
        </div>
      </div>
    </footer>
  );
}
