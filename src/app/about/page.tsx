
import React from 'react';
import Link from 'next/link';
import './about.css';

export default function AboutPage() {
  return (
    <>
      
      

  {/* section */}
  <div className="bg-blob blob-1"></div>
  <div className="bg-blob blob-2"></div>
  <div className="bg-blob blob-3"></div>

  <div className="container">

    {/* section */}
    <div className="floating-shape shape-1"></div>
    <div className="floating-shape shape-2"></div>
    <div className="floating-shape shape-3"></div>

    {/* section */}
    <section className="hero anim-fade-up d1">
      <div className="hero-badge">Salon de Beauté Premium</div>
      <h1>Un refuge d'excellence<br />au cœur de Rabat-Agdal</h1>
      <p>Depuis 2019, Brazilian Studio redéfinit l'art de la beauté en mariant standards internationaux et authenticité marocaine. Chaque femme qui franchit nos portes repart plus belle, plus confiante, et infiniment plus heureuse.</p>
      <div className="hero-line"></div>
    </section>

    {/* section */}
    <section className="stats-section">
      <div className="stat-card anim-scale d2">
        <span className="icon">✦</span>
        <div className="num" style={{ animationDelay: '0.4s' }}>5+</div>
        <div className="label">Années d'excellence</div>
      </div>
      <div className="stat-card anim-scale d3">
        <span className="icon">★</span>
        <div className="num" style={{ animationDelay: '0.5s' }}>5.0</div>
        <div className="label">Note Google</div>
      </div>
      <div className="stat-card anim-scale d4">
        <span className="icon">◆</span>
        <div className="num" style={{ animationDelay: '0.6s' }}>10+</div>
        <div className="label">Soins proposés</div>
      </div>
      <div className="stat-card anim-scale d5">
        <span className="icon">∞</span>
        <div className="num" style={{ animationDelay: '0.7s' }}>∞</div>
        <div className="label">Sourires créés</div>
      </div>
    </section>

    {/* section */}
    <div className="section-header anim-fade-up d3">
      <div className="overline">Notre histoire</div>
      <h2>De la vision à la communauté</h2>
    </div>
    <section className="timeline">
      <div className="timeline-item anim-fade-left d4">
        <div className="content">
          <div className="date">2019 — La fondation</div>
          <div className="title">Un rêve prend forme</div>
          <div className="desc">Ouverture au cœur de Rabat-Agdal avec une vision claire : créer un salon où luxe rime avec authenticité. Un espace pensé pour que chaque cliente se sente célébrée.</div>
        </div>
        <div className="dot"></div>
      </div>
      <div className="timeline-item anim-fade-right d5">
        <div className="content">
          <div className="date">2020-2023 — L'excellence</div>
          <div className="title">Maîtrise des techniques russes</div>
          <div className="desc">Formation aux techniques de pointe : manucure de précision chirurgicale, extensions artistiques cil par cil, et soins innovants adaptés à la beauté naturelle marocaine.</div>
        </div>
        <div className="dot"></div>
      </div>
      <div className="timeline-item anim-fade-left d6">
        <div className="content">
          <div className="date">Aujourd'hui — La communauté</div>
          <div className="title">Des milliers de sourires</div>
          <div className="desc">Un programme de fidélité actif, des clientes satisfaites, et une réputation bâtie sur la confiance, la qualité, et des résultats qui parlent d'eux-mêmes.</div>
        </div>
        <div className="dot"></div>
      </div>
    </section>

    {/* section */}
    <div className="section-header anim-fade-up d5">
      <div className="overline">Notre philosophie</div>
      <h2>Ce qui nous définit</h2>
    </div>
    <section className="philosophy-grid">
      <div className="phil-card anim-scale d6">
        <div className="icon-wrap">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m16 12-4-4-4 4"/><path d="M12 16V8"/></svg>
        </div>
        <h3>Technique internationale, âme marocaine</h3>
        <p>Nous importons les méthodes russes les plus pointues et les adaptons avec soin à la beauté naturelle de chaque cliente. Tradition et modernité en symphonie.</p>
      </div>
      <div className="phil-card anim-scale d6">
        <div className="icon-wrap">
          <svg viewBox="0 0 24 24"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
        </div>
        <h3>Une expérience, pas un service</h3>
        <p>Chaque visite est un moment de détente absolue. Nous ne vendons pas des prestations — nous offrons une transformation et un refuge de bien-être.</p>
      </div>
      <div className="phil-card anim-scale d7">
        <div className="icon-wrap">
          <svg viewBox="0 0 24 24"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
        </div>
        <h3>Précision chirurgicale</h3>
        <p>Manucure russe, extensions cil par cil, lissage brésilien : chaque geste est millimétré, chaque résultat durable. La perfection dans les détails.</p>
      </div>
      <div className="phil-card anim-scale d7">
        <div className="icon-wrap">
          <svg viewBox="0 0 24 24"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
        </div>
        <h3>Fidélité récompensée</h3>
        <p>Le Brazilian Club célèbre chaque visite. Points, réductions, attentions anniversaire — votre confiance mérite d'être choyée à sa juste valeur.</p>
      </div>
    </section>

    {/* section */}
    <div className="section-header anim-fade-up d6">
      <div className="overline">Nos signatures</div>
      <h2>L'art de sublimer</h2>
    </div>
    <section className="services-section">
      <a href="#manucure" className="service-card anim-fade-up d7">
        <div className="service-icon">💅</div>
        <div className="service-info">
          <h3>Manucure Russe</h3>
          <p>Cuticules parfaites, vernis longue durée, précision chirurgicale</p>
        </div>
        <div className="service-arrow">
          <svg viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </div>
      </a>
      <a href="#lissage" className="service-card anim-fade-up d7">
        <div className="service-icon">✨</div>
        <div className="service-info">
          <h3>Lissage Brésilien</h3>
          <p>Cheveux soyeux, brillants, transformation durable jusqu'à 6 mois</p>
        </div>
        <div className="service-arrow">
          <svg viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </div>
      </a>
      <a href="#cils" className="service-card anim-fade-up d8">
        <div className="service-icon">👁</div>
        <div className="service-info">
          <h3>Extensions de Cils</h3>
          <p>Pose cil par cil, regard profond et magnétique, technique russe exclusive</p>
        </div>
        <div className="service-arrow">
          <svg viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </div>
      </a>
    </section>

    {/* section */}
    <section className="testimonial-section anim-scale d8">
      <div className="quote-mark">"</div>
      <div className="quote-text">Je n'ai jamais vu une telle attention aux détails. La Manucure Russe a complètement transformé mes ongles, le résultat a duré des semaines sans une seule écaille.</div>
      <div className="quote-author">— Une cliente fidèle <span>• Brazilian Club</span></div>
    </section>

    {/* section */}
    <section className="cta-section anim-fade-up d9">
      <div className="cta-buttons">
        <Link href="/booking" className="btn btn-primary">Réserver maintenant</Link>
        <Link href="/#services" className="btn btn-secondary">Explorer les services</Link>
      </div>
    </section>

  </div>


    </>
  );
}
