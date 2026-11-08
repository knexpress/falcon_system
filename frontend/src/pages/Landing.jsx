import { Link } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo.jsx';
import { SITE_IMAGES } from '../data/siteImages.js';
import './Landing.css';

const services = [
  {
    title: 'Paintless Dent Repair',
    copy: 'Precision PDR by dent size — from small door dings to large panel work.',
    img: SITE_IMAGES.masking,
  },
  {
    title: 'Body & Paint',
    copy: 'Full body packages for hatchback, sedan, SUV, pickup and van.',
    img: SITE_IMAGES.hero,
  },
  {
    title: 'Panel Painting',
    copy: 'Hood, doors, bumpers, roof, quarter panels — SUV & sedan rates.',
    img: SITE_IMAGES.paintDetail,
  },
  {
    title: 'Plastic, Trim & Rims',
    copy: 'Mirrors, grilles, skirts, rim and caliper repaint finishing.',
    img: SITE_IMAGES.rims,
  },
];

const steps = [
  { n: '01', t: 'Inspect', d: 'Bring the car or send damage photos on WhatsApp.' },
  { n: '02', t: 'Quote', d: 'Panel / dent size pricing from our live price list.' },
  { n: '03', t: 'Dent & Paint', d: 'PDR, bodywork, booth paint and finishing.' },
  { n: '04', t: 'Deliver', d: 'Final polish check and tax invoice ready.' },
];

export default function Landing() {
  return (
    <div className="land">
      <header className="land-nav">
        <div className="land-brand">
          <BrandLogo className="land-mark" decorative />
          <div>
            <strong>Falcon Revive</strong>
            <small>Auto Denting &amp; Painting</small>
          </div>
        </div>
        <nav className="land-links">
          <a href="#services">Services</a>
          <a href="#process">Process</a>
          <a href="#proof">Work</a>
          <a href="#contact">Contact</a>
          <Link className="land-btn ghost" to="/login">
            Staff login
          </Link>
          <a className="land-btn solid" href="#contact">
            Get a quote
          </a>
        </nav>
      </header>

      <section className="land-hero">
        <img
          className="land-hero-img"
          src={SITE_IMAGES.hero.src}
          alt={SITE_IMAGES.hero.alt}
        />
        <div className="land-hero-scrim" />
        <div className="land-hero-copy">
          <p className="land-eyebrow">Umm Ramool · Dubai</p>
          <h1>
            Falcon Revive
            <span> Denting &amp; painting to factory gloss.</span>
          </h1>
          <p className="land-lead">
            Auto Denting &amp; Painting L.L.C. — PDR, body &amp; paint, panel
            refinish, and detailing for every brand we serve.
          </p>
          <div className="land-cta-row">
            <a className="land-btn solid lg" href="#contact">
              Book inspection
            </a>
            <a className="land-btn ghost lg" href="#services">
              View services
            </a>
          </div>
          <ul className="land-trust">
            <li>TRN 105482715700003</li>
            <li>License 1628747</li>
            <li>Denting · Painting · PDR · Detailing</li>
          </ul>
        </div>
      </section>

      <section className="land-section" id="services">
        <div className="land-section-head">
          <h2>Body shop services</h2>
          <p>Built for panels, paint and dents — not a general mechanic garage.</p>
        </div>
        <div className="land-service-grid">
          {services.map((s) => (
            <article className="land-service" key={s.title}>
              <img src={s.img.src} alt={s.img.alt} loading="lazy" />
              <div>
                <h3>{s.title}</h3>
                <p>{s.copy}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="land-split" id="proof">
        <div className="land-split-copy">
          <h2>Booth-grade finish</h2>
          <p>
            Masking, spray, clearcoat and polish — the same craft standard you
            see on our tax invoice artwork and workshop floor.
          </p>
          <ul>
            <li>Paintless dent repair by size band</li>
            <li>Full body &amp; paint packages by vehicle type</li>
            <li>Panel, plastic, rim and caliper refinish</li>
          </ul>
        </div>
        <div className="land-split-media">
          <img src={SITE_IMAGES.masking.src} alt={SITE_IMAGES.masking.alt} />
          <img
            src={SITE_IMAGES.paintDetail.src}
            alt={SITE_IMAGES.paintDetail.alt}
          />
        </div>
      </section>

      <section className="land-section dark" id="process">
        <div className="land-section-head light">
          <h2>How a job moves</h2>
          <p>Simple path from damaged panel to delivered gloss.</p>
        </div>
        <div className="land-steps">
          {steps.map((s) => (
            <div className="land-step" key={s.n}>
              <span>{s.n}</span>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="land-gallery">
        <img src={SITE_IMAGES.polishedCar.src} alt={SITE_IMAGES.polishedCar.alt} />
        <img src={SITE_IMAGES.redCar.src} alt={SITE_IMAGES.redCar.alt} />
        <img src={SITE_IMAGES.detailing.src} alt={SITE_IMAGES.detailing.alt} />
      </section>

      <section className="land-contact" id="contact">
        <div>
          <h2>Get a denting &amp; paint quote</h2>
          <p>
            Warehouse 7, 26A Street, Umm Ramool, Dubai · +971 56 477 8336 ·
            info@falconrevive.ae
          </p>
          <div className="land-cta-row">
            <a className="land-btn solid lg" href="tel:+971564778336">
              Call workshop
            </a>
            <a
              className="land-btn ghost lg"
              href="https://wa.me/971564778336"
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp photos
            </a>
          </div>
        </div>
        <img src={SITE_IMAGES.workshop.src} alt={SITE_IMAGES.workshop.alt} />
      </section>

      <footer className="land-foot">
        <div>
          <strong>Falcon Revive</strong>
          <span>Auto Denting &amp; Painting L.L.C.</span>
        </div>
        <Link to="/login">Staff / ERP login</Link>
        <p>Made with love by Bushra Technologies</p>
      </footer>
    </div>
  );
}
