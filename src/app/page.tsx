import Navigation from '@/components/Navigation';
import Hero from '@/components/Hero';
import Marquee from '@/components/Marquee';
import About from '@/components/About';
import Services from '@/components/Services';
import BeforeAfter from '@/components/BeforeAfter';
import Testimonials from '@/components/Testimonials';
import LoyaltyCTA from '@/components/LoyaltyCTA';
import Gallery from '@/components/Gallery';
import BookingCTA from '@/components/BookingCTA';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main>
      <Navigation />
      <Hero />
      <Marquee />
      <About />
      <Services />
      <BeforeAfter />
      <Testimonials />
      <LoyaltyCTA />
      <Gallery />
      <BookingCTA />
      <Footer />
    </main>
  );
}
