
import React from 'react';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
      
  :root {
    --rose: #e91e8c;
    --rose-light: #fce4f1;
    --rose-dark: #c2187a;
    --gold: #d4a574;
    --gold-light: #f5e6d3;
    --cream: #fff8f5;
    --white: #ffffff;
    --text-dark: #2d1f2f;
    --text-body: #5a4a5a;
    --text-muted: #9a8a9a;
    --shadow-soft: 0 4px 20px rgba(233, 30, 140, 0.08);
    --shadow-medium: 0 8px 32px rgba(233, 30, 140, 0.12);
    --shadow-gold: 0 4px 24px rgba(212, 165, 116, 0.25);
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', sans-serif;
    background: linear-gradient(135deg, var(--cream) 0%, #fff0f5 50%, var(--white) 100%);
    color: var(--text-dark);
    line-height: 1.7;
    overflow-x: hidden;
  }

  /* ===== ANIMATIONS ===== */
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(40px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeInLeft {
    from { opacity: 0; transform: translateX(-30px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes fadeInRight {
    from { opacity: 0; transform: translateX(30px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.8); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }
  @keyframes shimmer {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(233, 30, 140, 0.3); }
    50% { box-shadow: 0 0 0 12px rgba(233, 30, 140, 0); }
  }
  @keyframes rotate-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes countUp {
    from { opacity: 0; transform: translateY(20px) scale(0.9); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes slideReveal {
    from { width: 0; }
    to { width: 60px; }
  }
  @keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  .anim-fade-up {
    opacity: 0;
    animation: fadeInUp 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }
  .anim-fade-left {
    opacity: 0;
    animation: fadeInLeft 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }
  .anim-fade-right {
    opacity: 0;
    animation: fadeInRight 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }
  .anim-scale {
    opacity: 0;
    animation: scaleIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }

  .d1 { animation-delay: 0.1s; }
  .d2 { animation-delay: 0.2s; }
  .d3 { animation-delay: 0.35s; }
  .d4 { animation-delay: 0.5s; }
  .d5 { animation-delay: 0.65s; }
  .d6 { animation-delay: 0.8s; }
  .d7 { animation-delay: 0.95s; }
  .d8 { animation-delay: 1.1s; }
  .d9 { animation-delay: 1.25s; }
  .d10 { animation-delay: 1.4s; }

  /* ===== CONTAINER ===== */
  .container {
    max-width: 900px;
    margin: 0 auto;
    padding: 60px 24px;
    position: relative;
  }

  /* Decorative background elements */
  .bg-blob {
    position: fixed;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.15;
    pointer-events: none;
    z-index: 0;
  }
  .blob-1 {
    width: 400px; height: 400px;
    background: var(--rose);
    top: -100px; right: -100px;
    animation: float 8s ease-in-out infinite;
  }
  .blob-2 {
    width: 300px; height: 300px;
    background: var(--gold);
    bottom: 200px; left: -100px;
    animation: float 10s ease-in-out infinite reverse;
  }
  .blob-3 {
    width: 250px; height: 250px;
    background: var(--rose-light);
    top: 50%; right: 10%;
    animation: float 12s ease-in-out infinite 2s;
  }

  /* ===== HERO ===== */
  .hero {
    text-align: center;
    margin-bottom: 60px;
    position: relative;
    z-index: 1;
  }
  .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, var(--rose-light), var(--gold-light));
    color: var(--rose-dark);
    padding: 8px 20px;
    border-radius: 50px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 24px;
    border: 1px solid rgba(233, 30, 140, 0.15);
  }
  .hero-badge::before {
    content: "";
    width: 6px; height: 6px;
    background: var(--rose);
    border-radius: 50%;
    animation: pulse-glow 2s infinite;
  }
  .hero h1 {
    font-family: 'Playfair Display', serif;
    font-size: 48px;
    font-weight: 600;
    line-height: 1.15;
    margin-bottom: 20px;
    background: linear-gradient(135deg, var(--text-dark) 0%, var(--rose-dark) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .hero p {
    font-size: 18px;
    color: var(--text-body);
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.7;
  }
  .hero-line {
    width: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--rose), var(--gold));
    margin: 30px auto 0;
    border-radius: 2px;
    animation: slideReveal 1s cubic-bezier(0.22, 1, 0.36, 1) 0.8s forwards;
  }

  /* ===== STATS ===== */
  .stats-section {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 70px;
    position: relative;
    z-index: 1;
  }
  .stat-card {
    background: var(--white);
    border-radius: 20px;
    padding: 28px 16px;
    text-align: center;
    border: 1px solid rgba(233, 30, 140, 0.1);
    box-shadow: var(--shadow-soft);
    transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
    position: relative;
    overflow: hidden;
  }
  .stat-card::before {
    content: "";
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--rose), var(--gold));
    transform: scaleX(0);
    transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .stat-card:hover {
    transform: translateY(-8px);
    box-shadow: var(--shadow-medium);
    border-color: rgba(233, 30, 140, 0.25);
  }
  .stat-card:hover::before {
    transform: scaleX(1);
  }
  .stat-card .num {
    font-family: 'Playfair Display', serif;
    font-size: 38px;
    font-weight: 600;
    color: var(--rose);
    margin-bottom: 8px;
    animation: countUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .stat-card .label {
    font-size: 12px;
    color: var(--text-muted);
    font-weight: 500;
    letter-spacing: 0.03em;
  }
  .stat-card .icon {
    font-size: 24px;
    margin-bottom: 10px;
    display: block;
  }

  /* ===== SECTION HEADERS ===== */
  .section-header {
    text-align: center;
    margin-bottom: 40px;
    position: relative;
    z-index: 1;
  }
  .section-header .overline {
    display: inline-block;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--rose);
    margin-bottom: 12px;
    position: relative;
  }
  .section-header .overline::after {
    content: "";
    display: block;
    width: 40px;
    height: 2px;
    background: linear-gradient(90deg, var(--rose), var(--gold));
    margin: 10px auto 0;
    border-radius: 1px;
  }
  .section-header h2 {
    font-family: 'Playfair Display', serif;
    font-size: 32px;
    font-weight: 600;
    color: var(--text-dark);
  }

  /* ===== TIMELINE ===== */
  .timeline {
    position: relative;
    margin-bottom: 70px;
    z-index: 1;
  }
  .timeline::before {
    content: "";
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 2px;
    height: 100%;
    background: linear-gradient(180deg, var(--rose), var(--gold), var(--rose-light));
    border-radius: 1px;
  }
  .timeline-item {
    display: flex;
    align-items: center;
    margin-bottom: 50px;
    position: relative;
  }
  .timeline-item:nth-child(even) {
    flex-direction: row-reverse;
  }
  .timeline-item .content {
    width: 45%;
    background: var(--white);
    padding: 28px;
    border-radius: 16px;
    box-shadow: var(--shadow-soft);
    border: 1px solid rgba(233, 30, 140, 0.08);
    transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .timeline-item .content:hover {
    transform: scale(1.02);
    box-shadow: var(--shadow-medium);
    border-color: rgba(233, 30, 140, 0.2);
  }
  .timeline-item .date {
    font-size: 13px;
    font-weight: 600;
    color: var(--rose);
    letter-spacing: 0.05em;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .timeline-item .date::before {
    content: "";
    width: 8px; height: 8px;
    background: var(--rose);
    border-radius: 50%;
  }
  .timeline-item .title {
    font-family: 'Playfair Display', serif;
    font-size: 20px;
    font-weight: 600;
    color: var(--text-dark);
    margin-bottom: 10px;
  }
  .timeline-item .desc {
    font-size: 14px;
    color: var(--text-body);
    line-height: 1.7;
  }
  .timeline-item .dot {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 20px;
    height: 20px;
    background: var(--white);
    border: 3px solid var(--rose);
    border-radius: 50%;
    box-shadow: 0 0 0 6px rgba(233, 30, 140, 0.15);
    z-index: 2;
    animation: pulse-glow 2.5s infinite;
  }
  .timeline-item .dot::after {
    content: "";
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 8px; height: 8px;
    background: var(--rose);
    border-radius: 50%;
  }

  /* ===== PHILOSOPHY CARDS ===== */
  .philosophy-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    margin-bottom: 70px;
    position: relative;
    z-index: 1;
  }
  .phil-card {
    background: var(--white);
    border-radius: 20px;
    padding: 32px;
    border: 1px solid rgba(233, 30, 140, 0.08);
    box-shadow: var(--shadow-soft);
    transition: all 0.5s cubic-bezier(0.22, 1, 0.36, 1);
    position: relative;
    overflow: hidden;
  }
  .phil-card::after {
    content: "";
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 0;
    background: linear-gradient(180deg, transparent, var(--rose-light));
    transition: height 0.4s cubic-bezier(0.22, 1, 0.36, 1);
    border-radius: 0 0 20px 20px;
  }
  .phil-card:hover {
    transform: translateY(-6px) scale(1.01);
    box-shadow: var(--shadow-medium);
    border-color: rgba(233, 30, 140, 0.2);
  }
  .phil-card:hover::after {
    height: 40%;
  }
  .phil-card .icon-wrap {
    width: 52px;
    height: 52px;
    background: linear-gradient(135deg, var(--rose-light), var(--gold-light));
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 18px;
    position: relative;
    z-index: 1;
  }
  .phil-card .icon-wrap svg {
    width: 24px;
    height: 24px;
    stroke: var(--rose);
    strokeWidth: 1.8;
    fill: none;
    strokeLinecap: round;
    strokeLinejoin: round;
  }
  .phil-card h3 {
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-dark);
    margin-bottom: 10px;
    position: relative;
    z-index: 1;
  }
  .phil-card p {
    font-size: 14px;
    color: var(--text-body);
    line-height: 1.7;
    position: relative;
    z-index: 1;
  }

  /* ===== SERVICES ===== */
  .services-section {
    margin-bottom: 70px;
    position: relative;
    z-index: 1;
  }
  .service-card {
    display: flex;
    align-items: center;
    gap: 24px;
    background: var(--white);
    border-radius: 20px;
    padding: 24px 28px;
    margin-bottom: 16px;
    border: 1px solid rgba(233, 30, 140, 0.08);
    box-shadow: var(--shadow-soft);
    transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
    cursor: pointer;
    text-decoration: none;
    color: inherit;
    position: relative;
    overflow: hidden;
  }
  .service-card::before {
    content: "";
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 4px;
    background: linear-gradient(180deg, var(--rose), var(--gold));
    transform: scaleY(0);
    transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
    border-radius: 20px 0 0 20px;
  }
  .service-card:hover {
    transform: translateX(8px);
    box-shadow: var(--shadow-medium);
    border-color: rgba(233, 30, 140, 0.2);
  }
  .service-card:hover::before {
    transform: scaleY(1);
  }
  .service-card .service-icon {
    width: 56px;
    height: 56px;
    background: linear-gradient(135deg, var(--rose-light), var(--gold-light));
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    flex-shrink: 0;
    transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .service-card:hover .service-icon {
    transform: scale(1.1) rotate(-5deg);
  }
  .service-card .service-info {
    flex: 1;
  }
  .service-card .service-info h3 {
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-dark);
    margin-bottom: 4px;
  }
  .service-card .service-info p {
    font-size: 13px;
    color: var(--text-muted);
  }
  .service-card .service-arrow {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, var(--rose-light), var(--gold-light));
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
    flex-shrink: 0;
  }
  .service-card .service-arrow svg {
    width: 18px;
    height: 18px;
    stroke: var(--rose);
    strokeWidth: 2;
    fill: none;
    strokeLinecap: round;
    strokeLinejoin: round;
    transition: transform 0.3s;
  }
  .service-card:hover .service-arrow {
    background: linear-gradient(135deg, var(--rose), var(--gold));
  }
  .service-card:hover .service-arrow svg {
    stroke: var(--white);
    transform: translateX(3px);
  }

  /* ===== TESTIMONIAL ===== */
  .testimonial-section {
    background: linear-gradient(135deg, var(--white), var(--rose-light));
    border-radius: 24px;
    padding: 48px;
    margin-bottom: 60px;
    position: relative;
    z-index: 1;
    border: 1px solid rgba(233, 30, 140, 0.1);
    box-shadow: var(--shadow-soft);
    text-align: center;
    overflow: hidden;
  }
  .testimonial-section::before {
    content: "";
    position: absolute;
    top: -20px; right: -20px;
    width: 100px; height: 100px;
    background: var(--gold-light);
    border-radius: 50%;
    opacity: 0.5;
  }
  .testimonial-section .quote-mark {
    font-family: 'Playfair Display', serif;
    font-size: 80px;
    color: var(--rose);
    opacity: 0.15;
    line-height: 1;
    margin-bottom: -20px;
    position: relative;
    z-index: 1;
  }
  .testimonial-section .quote-text {
    font-family: 'Playfair Display', serif;
    font-size: 22px;
    font-weight: 500;
    font-style: italic;
    color: var(--text-dark);
    line-height: 1.6;
    margin-bottom: 24px;
    position: relative;
    z-index: 1;
  }
  .testimonial-section .quote-author {
    font-size: 14px;
    font-weight: 600;
    color: var(--rose);
    position: relative;
    z-index: 1;
  }
  .testimonial-section .quote-author span {
    color: var(--text-muted);
    font-weight: 400;
  }

  /* ===== CTA ===== */
  .cta-section {
    text-align: center;
    position: relative;
    z-index: 1;
  }
  .cta-buttons {
    display: flex;
    gap: 16px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .btn {
    padding: 16px 36px;
    border-radius: 50px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    letter-spacing: 0.02em;
    border: none;
    transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
    position: relative;
    overflow: hidden;
  }
  .btn::after {
    content: "";
    position: absolute;
    top: 0; left: -100%;
    width: 100%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
    transition: left 0.6s;
  }
  .btn:hover::after {
    left: 100%;
  }
  .btn-primary {
    background: linear-gradient(135deg, var(--rose), var(--rose-dark));
    color: var(--white);
    box-shadow: 0 8px 24px rgba(233, 30, 140, 0.3);
  }
  .btn-primary:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 32px rgba(233, 30, 140, 0.4);
  }
  .btn-secondary {
    background: var(--white);
    color: var(--rose);
    border: 2px solid var(--rose);
    box-shadow: var(--shadow-soft);
  }
  .btn-secondary:hover {
    background: var(--rose);
    color: var(--white);
    transform: translateY(-3px);
    box-shadow: var(--shadow-medium);
  }

  /* ===== FLOATING SHAPES ===== */
  .floating-shape {
    position: absolute;
    border-radius: 50%;
    opacity: 0.08;
    pointer-events: none;
  }
  .shape-1 {
    width: 80px; height: 80px;
    background: var(--rose);
    top: 10%; right: 5%;
    animation: float 7s ease-in-out infinite;
  }
  .shape-2 {
    width: 60px; height: 60px;
    background: var(--gold);
    bottom: 15%; left: 8%;
    animation: float 9s ease-in-out infinite 1s;
  }
  .shape-3 {
    width: 40px; height: 40px;
    background: var(--rose);
    top: 40%; left: 3%;
    animation: float 6s ease-in-out infinite 0.5s;
  }

  /* ===== RESPONSIVE ===== */
  @media (max-width: 768px) {
    .hero h1 { font-size: 32px; }
    .stats-section { grid-template-columns: repeat(2, 1fr); }
    .timeline::before { left: 20px; }
    .timeline-item { flex-direction: row !important; }
    .timeline-item .content { width: calc(100% - 60px); margin-left: 40px; }
    .timeline-item .dot { left: 20px; transform: translateX(-50%); }
    .philosophy-grid { grid-template-columns: 1fr; }
    .testimonial-section { padding: 32px 24px; }
    .testimonial-section .quote-text { font-size: 18px; }
    .container { padding: 40px 16px; }
  }

      ` }} />
      

  {/**/}
  <div className="bg-blob blob-1"></div>
  <div className="bg-blob blob-2"></div>
  <div className="bg-blob blob-3"></div>

  <div className="container">

    {/**/}
    <div className="floating-shape shape-1"></div>
    <div className="floating-shape shape-2"></div>
    <div className="floating-shape shape-3"></div>

    {/**/}
    <section className="hero anim-fade-up d1">
      <div className="hero-badge">Salon de Beauté Premium</div>
      <h1>Un refuge d'excellence<br />au cœur de Rabat-Agdal</h1>
      <p>Depuis 2019, Brazilian Studio redéfinit l'art de la beauté en mariant standards internationaux et authenticité marocaine. Chaque femme qui franchit nos portes repart plus belle, plus confiante, et infiniment plus heureuse.</p>
      <div className="hero-line"></div>
    </section>

    {/**/}
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

    {/**/}
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

    {/**/}
    <div className="section-header anim-fade-up d5">
      <div className="overline">Notre philosophie</div>
      <h2>Ce qui nous définit</h2>
    </div>
    <section className="philosophy-grid">
      <div className="phil-card anim-scale d6">
        <div className="icon-wrap">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m16 12-4-4-4 4"/><path d="M12 16V8"/></svg />
        </div>
        <h3>Technique internationale, âme marocaine</h3>
        <p>Nous importons les méthodes russes les plus pointues et les adaptons avec soin à la beauté naturelle de chaque cliente. Tradition et modernité en symphonie.</p>
      </div>
      <div className="phil-card anim-scale d6">
        <div className="icon-wrap">
          <svg viewBox="0 0 24 24"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg />
        </div>
        <h3>Une expérience, pas un service</h3>
        <p>Chaque visite est un moment de détente absolue. Nous ne vendons pas des prestations — nous offrons une transformation et un refuge de bien-être.</p>
      </div>
      <div className="phil-card anim-scale d7">
        <div className="icon-wrap">
          <svg viewBox="0 0 24 24"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg />
        </div>
        <h3>Précision chirurgicale</h3>
        <p>Manucure russe, extensions cil par cil, lissage brésilien : chaque geste est millimétré, chaque résultat durable. La perfection dans les détails.</p>
      </div>
      <div className="phil-card anim-scale d7">
        <div className="icon-wrap">
          <svg viewBox="0 0 24 24"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg />
        </div>
        <h3>Fidélité récompensée</h3>
        <p>Le Brazilian Club célèbre chaque visite. Points, réductions, attentions anniversaire — votre confiance mérite d'être choyée à sa juste valeur.</p>
      </div>
    </section>

    {/**/}
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
          <svg viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg />
        </div>
      </a>
      <a href="#lissage" className="service-card anim-fade-up d7">
        <div className="service-icon">✨</div>
        <div className="service-info">
          <h3>Lissage Brésilien</h3>
          <p>Cheveux soyeux, brillants, transformation durable jusqu'à 6 mois</p>
        </div>
        <div className="service-arrow">
          <svg viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg />
        </div>
      </a>
      <a href="#cils" className="service-card anim-fade-up d8">
        <div className="service-icon">👁</div>
        <div className="service-info">
          <h3>Extensions de Cils</h3>
          <p>Pose cil par cil, regard profond et magnétique, technique russe exclusive</p>
        </div>
        <div className="service-arrow">
          <svg viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg />
        </div>
      </a>
    </section>

    {/**/}
    <section className="testimonial-section anim-scale d8">
      <div className="quote-mark">"</div>
      <div className="quote-text">Je n'ai jamais vu une telle attention aux détails. La Manucure Russe a complètement transformé mes ongles, le résultat a duré des semaines sans une seule écaille.</div>
      <div className="quote-author">— Une cliente fidèle <span>• Brazilian Club</span></div>
    </section>

    {/**/}
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
