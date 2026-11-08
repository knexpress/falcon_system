import { Link } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo.jsx';
import './LegalPage.css';

export default function PrivacyPolicy() {
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
            <Link className="active" to="/privacy">
              Privacy Policy
            </Link>
            <Link to="/terms">Terms &amp; Conditions</Link>
          </div>
        </nav>

        <article className="legal-card">
          <h1>Privacy Policy</h1>
          <p className="legal-updated">Last updated: 8 November 2026</p>

          <p>
            Falcon Revive Auto Denting &amp; Painting L.L.C. (“Falcon Revive”,
            “we”, “us”) operates the Falcon Revive website and staff ERP desk
            used to manage workshop jobs, invoices, vehicles, customers,
            inventory, and related business records. This Privacy Policy
            explains what information we collect, how we use it, and the
            choices available to you.
          </p>

          <h2>1. Who we are</h2>
          <p>
            Falcon Revive Auto Denting &amp; Painting L.L.C.
            <br />
            Warehouse 7, 26A Street, Umm Ramool, Dubai, UAE
            <br />
            TRN: 105482715700003 · License: 1628747
            <br />
            Email:{' '}
            <a href="mailto:info@falconrevive.ae">info@falconrevive.ae</a> ·
            Phone: +971 56 477 8336
          </p>

          <h2>2. Information we collect</h2>
          <p>Depending on how you interact with us, we may collect:</p>
          <ul>
            <li>
              <strong>Customer &amp; vehicle details</strong> — name, phone,
              email, address, TRN/ID, vehicle make/model/year, plate number,
              VIN, mileage, and job notes needed to quote, repair, and invoice
              work.
            </li>
            <li>
              <strong>Transaction records</strong> — invoices, credit notes,
              payments, sales, expenses, inventory movements, and journal
              entries created in the ERP.
            </li>
            <li>
              <strong>Staff account data</strong> — name, username/login email,
              role, and authentication activity for ERP access.
            </li>
            <li>
              <strong>Technical data</strong> — browser type, device basics,
              IP address, pages visited, and error/diagnostic logs used to keep
              the service secure and reliable.
            </li>
            <li>
              <strong>Communications</strong> — messages you send by phone,
              WhatsApp, email, or through quote/contact requests.
            </li>
          </ul>

          <h2>3. How we use information</h2>
          <ul>
            <li>Provide denting, painting, PDR, and related workshop services.</li>
            <li>Prepare estimates, tax invoices, credit notes, and job records.</li>
            <li>Operate the staff ERP (jobs, stock, customers, vehicles, finance).</li>
            <li>Respond to enquiries and schedule inspections.</li>
            <li>Meet UAE legal, tax, and accounting obligations.</li>
            <li>Secure accounts, prevent misuse, and diagnose system errors.</li>
            <li>Improve our website, ERP reliability, and customer experience.</li>
          </ul>

          <h2>4. Legal bases</h2>
          <p>
            We process personal data where needed to perform a contract (or steps
            before a contract), comply with legal duties, pursue legitimate
            workshop/business interests (such as security and service
            improvement), or where you have given consent for a specific use.
          </p>

          <h2>5. Sharing</h2>
          <p>
            We do not sell personal information. We may share data with:
          </p>
          <ul>
            <li>
              Service providers who host or support our systems (for example
              cloud hosting, database, and email/SMS tools), under appropriate
              safeguards.
            </li>
            <li>
              Professional advisers (accountants, auditors, legal counsel) when
              required.
            </li>
            <li>
              Authorities when disclosure is required by UAE law, court order,
              or tax/regulatory request.
            </li>
          </ul>

          <h2>6. Storage &amp; security</h2>
          <p>
            Records are stored in systems we control or with trusted processors.
            We use access controls, authenticated staff logins, and operational
            safeguards. No method of transmission or storage is fully secure;
            please use strong passwords and keep ERP credentials confidential.
          </p>

          <h2>7. Retention</h2>
          <p>
            We keep customer, invoice, and accounting records for as long as
            needed for the workshop relationship and UAE record-keeping
            requirements, then delete or anonymise them when no longer required,
            unless a longer period is needed for disputes or legal claims.
          </p>

          <h2>8. Your rights</h2>
          <p>
            Subject to UAE law, you may request access to, correction of, or
            deletion of personal data we hold about you, or ask us to limit
            certain processing. Staff users may update profile details through
            authorised administrators. Contact{' '}
            <a href="mailto:info@falconrevive.ae">info@falconrevive.ae</a> to
            make a request. We may need to verify your identity before
            responding.
          </p>

          <h2>9. Cookies &amp; local storage</h2>
          <p>
            The public site uses essential cookies/local storage needed for
            navigation and performance. The ERP may store a staff session token
            on the device so you remain signed in. You can clear browser storage
            at any time; doing so will sign you out of the ERP.
          </p>

          <h2>10. Children</h2>
          <p>
            Our services are intended for vehicle owners and business customers.
            We do not knowingly collect personal data from children.
          </p>

          <h2>11. Changes</h2>
          <p>
            We may update this Privacy Policy from time to time. The “Last
            updated” date above will change when we do. Continued use of the
            site or ERP after an update means you accept the revised policy.
          </p>

          <h2>12. Contact</h2>
          <p>
            For privacy questions, email{' '}
            <a href="mailto:info@falconrevive.ae">info@falconrevive.ae</a> or
            call +971 56 477 8336.
          </p>

          <div className="legal-foot">
            <Link className="btn btn-ghost" to="/terms">
              Terms &amp; Conditions
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
