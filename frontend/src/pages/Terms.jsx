import { Link } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo.jsx';
import './LegalPage.css';

export default function Terms() {
  return (
    <div className="legal-page">
      <div className="legal-wrap">
        <nav className="legal-nav">
          <Link className="legal-brand" to="/">
            <BrandLogo className="legal-mark" decorative />
            <strong>Falcon Revive</strong>
          </Link>
          <div className="legal-nav-links">
            <Link to="/login">Staff login</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link className="active" to="/terms">
              Terms &amp; Conditions
            </Link>
          </div>
        </nav>

        <article className="legal-card">
          <h1>Terms &amp; Conditions</h1>
          <p className="legal-updated">Last updated: 8 November 2026</p>

          <p>
            These Terms &amp; Conditions (“Terms”) govern use of the Falcon
            Revive website, quote/contact channels, and the staff ERP desk
            operated by Falcon Revive Auto Denting &amp; Painting L.L.C.
            (“Falcon Revive”, “we”, “us”). By using our services you agree to
            these Terms.
          </p>

          <h2>1. About Falcon Revive</h2>
          <p>
            Falcon Revive Auto Denting &amp; Painting L.L.C. provides paintless
            dent repair, body &amp; paint, panel refinish, plastic/trim/rim
            work, and related workshop services from Warehouse 7, 26A Street,
            Umm Ramool, Dubai, UAE (TRN 105482715700003 · License 1628747).
          </p>

          <h2>2. Website &amp; ERP access</h2>
          <ul>
            <li>
              The public website is for information, contact, and service
              overview only. Prices and packages may change without notice.
            </li>
            <li>
              The ERP desk is for authorised Falcon Revive staff and approved
              operators only. You must keep login credentials confidential and
              not share accounts.
            </li>
            <li>
              We may suspend or revoke access if we suspect misuse, security
              risk, or breach of these Terms.
            </li>
          </ul>

          <h2>3. Quotes &amp; bookings</h2>
          <p>
            Estimates provided online, by phone, WhatsApp, or in person are
            indicative until confirmed after physical inspection. Final pricing
            may change if damage scope, parts, paint materials, or labour
            differ from the initial assessment. Booking an inspection does not
            guarantee a repair start date until capacity is confirmed.
          </p>

          <h2>4. Workshop jobs</h2>
          <ul>
            <li>
              Customers must provide accurate vehicle and ownership/contact
              details and disclose known prior damage or aftermarket parts that
              may affect the job.
            </li>
            <li>
              Work proceeds based on the agreed scope. Additional work requires
              customer approval unless needed for safety or to complete the
              authorised job.
            </li>
            <li>
              Completion timelines are estimates and may shift due to parts
              availability, paint matching, or unforeseen bodywork.
            </li>
            <li>
              Vehicles should be collected promptly when notified. Falcon Revive
              is not a long-term storage facility; storage charges may apply for
              unreasonable delay after completion notice.
            </li>
          </ul>

          <h2>5. Invoices &amp; payment</h2>
          <p>
            Tax invoices are issued in AED and include applicable VAT where
            required. Payment is due as stated on the invoice or as otherwise
            agreed. Title to replaced parts/materials remains with Falcon Revive
            until payment is received in full. We may withhold vehicle release
            until outstanding balances for the job are settled, to the extent
            permitted by UAE law.
          </p>

          <h2>6. Customer belongings</h2>
          <p>
            Please remove personal valuables before leaving a vehicle. Falcon
            Revive is not responsible for loss of items left in the cabin, boot,
            or glovebox unless caused by our proven negligence.
          </p>

          <h2>7. Warranty &amp; limitations</h2>
          <ul>
            <li>
              Workmanship on authorised repairs is covered according to the
              warranty communicated at delivery for the specific job type.
            </li>
            <li>
              Warranty does not cover new damage, misuse, accidents after
              delivery, poor maintenance, or work performed by third parties.
            </li>
            <li>
              Colour match and finish depend on existing paint condition, prior
              repairs, and manufacturer variations; we use reasonable workshop
              practice to achieve a close match.
            </li>
            <li>
              To the maximum extent permitted by law, Falcon Revive is not
              liable for indirect or consequential loss (including hire cars or
              business interruption) arising from delay or service outcomes
              beyond our reasonable control.
            </li>
          </ul>

          <h2>8. Acceptable use of the ERP</h2>
          <p>Staff and authorised users must not:</p>
          <ul>
            <li>Access data beyond their role or for personal unrelated use.</li>
            <li>Tamper with invoices, backups, or audit records improperly.</li>
            <li>
              Attempt to disrupt, reverse engineer, or overload the systems.
            </li>
            <li>Upload unlawful, harmful, or infringing content.</li>
          </ul>

          <h2>9. Intellectual property</h2>
          <p>
            Website content, branding, invoice templates, software, and
            documentation remain the property of Falcon Revive or its licensors.
            You may not copy or reuse them commercially without written
            permission.
          </p>

          <h2>10. Privacy</h2>
          <p>
            Personal data is handled as described in our{' '}
            <Link to="/privacy">Privacy Policy</Link>. By using the site or ERP
            you acknowledge that policy.
          </p>

          <h2>11. Third-party services</h2>
          <p>
            Links to WhatsApp, maps, hosting providers, or other tools are
            provided for convenience. Their terms and privacy practices apply
            when you use those services.
          </p>

          <h2>12. Changes to these Terms</h2>
          <p>
            We may update these Terms periodically. The “Last updated” date will
            change when we do. Continued use after updates constitutes
            acceptance of the revised Terms.
          </p>

          <h2>13. Governing law</h2>
          <p>
            These Terms are governed by the laws of the United Arab Emirates as
            applied in the Emirate of Dubai. Courts of Dubai have exclusive
            jurisdiction, without prejudice to any mandatory consumer
            protections that apply.
          </p>

          <h2>14. Contact</h2>
          <p>
            Questions about these Terms:{' '}
            <a href="mailto:info@falconrevive.ae">info@falconrevive.ae</a> ·
            +971 56 477 8336 · Warehouse 7, 26A Street, Umm Ramool, Dubai.
          </p>

          <div className="legal-foot">
            <Link className="btn btn-ghost" to="/privacy">
              Privacy Policy
            </Link>
            <Link className="btn btn-primary" to="/login">
              Back to login
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
