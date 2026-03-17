'use client';

import styles from './Marquee.module.css';

export default function Marquee() {
  const items = [
    'Manucure Russe',
    'Lissage Brésilien',
    'Extensions de Cils',
    'Soin Visage',
    'Balayage',
    'Maquillage',
    'Épilation',
    'Nail Art',
    'Hydrafacial',
    'Brow Lift',
  ];

  // Duplicate items for infinite scroll effect
  const duplicatedItems = [...items, ...items];

  return (
    <div className={styles.container}>
      <div className={styles.marqueeTrack}>
        {duplicatedItems.map((item, index) => (
          <div key={index} className={styles.marqueeItem}>
            <span>{item}</span>
            {index < duplicatedItems.length - 1 && (
              <span className={styles.separator}>◆</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
