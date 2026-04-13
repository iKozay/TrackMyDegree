import React, { useEffect } from "react";
import { ChevronUp } from "react-feather";
import "../styles/EulaPage.css";

type LinkableHeadingProps = {
  level: 3 | 4;
  id: string;
  children: React.ReactNode;
};

const LinkableHeading: React.FC<LinkableHeadingProps> = ({ level, id, children }) => {
  const HeadingTag = level === 3 ? "h3" : "h4";

  return (
    <HeadingTag id={id}>
      <a className="eula-heading-link" href={`#${id}`}>
        {children}
      </a>
    </HeadingTag>
  );
};

const EulaPage: React.FC = () => {
  const handleBackToTop = () => {
    globalThis.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    if (document.location.hash) {
      return;
    }

    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  return (
    <main className="eula-page">
      <section className="eula-container" aria-labelledby="eula-title">
        <h1 id="eula-title">User Consent and End-User License Agreement (EULA)</h1>
        <p className="eula-effective-date">
          <strong>Effective Date:</strong> 2025-10-10
        </p>
        <p className="eula-last-updated">
          <strong>Last Updated:</strong> 2026-04-12
        </p>

        <div className="eula-content">
          <LinkableHeading level={3} id="section-1-introduction">
            1. Introduction
          </LinkableHeading>
          <p>
            Welcome to <strong>TrackMyDegree</strong>, an application designed to help students track and
            plan their academic progress. By accessing or using this application, you agree to this
            User Consent and EULA. If you do not agree, you must not use the application.
          </p>

          <LinkableHeading level={3} id="section-2-user-consent">
            2. User Consent
          </LinkableHeading>
          <p>
            By using TrackMyDegree, you acknowledge and consent to the limited collection and use of
            data as described in this agreement.
          </p>
          <p>
            TrackMyDegree is designed to minimize data collection. Use of the application does not
            require account creation, and most features are available without providing personal
            information.
          </p>

          <LinkableHeading level={3} id="section-3-data-collection-and-storage">
            3. Data Collection and Storage
          </LinkableHeading>

          <LinkableHeading level={4} id="subsection-3-1-personal-information">
            3.1 Personal Information
          </LinkableHeading>
          <p>We collect only the following personal information, and only if you choose to create an account:</p>
          <ul>
            <li>Full name or username</li>
            <li>Email address</li>
          </ul>
          <p>We do not collect sensitive personal data such as student ID or government identifiers.</p>

          <LinkableHeading level={4} id="subsection-3-2-academic-information">
            3.2 Academic Information
          </LinkableHeading>
          <p>Academic data (such as courses, grades, and degree progress) is:</p>
          <ul>
            <li>Only stored if you explicitly choose to save it</li>
            <li>Typically entered or imported by you (for example, transcript data)</li>
          </ul>
          <p>You may use the application without saving any academic data.</p>

          <LinkableHeading level={4} id="subsection-3-3-temporary-document-processing-and-caching">
            3.3 Temporary Document Processing and Caching
          </LinkableHeading>
          <p>
            When you upload a document (such as a transcript or acceptance letter), the file is
            processed temporarily for the sole purpose of extracting academic information.
          </p>
          <ul>
            <li>
              The uploaded document is automatically deleted from our system immediately after
              processing is complete (that is, once the timeline page finishes loading)
            </li>
            <li>We do not retain the original document after this step</li>
            <li>Only the parsed output (courses and associated grades) is temporarily stored</li>
          </ul>
          <p>This parsed data is:</p>
          <ul>
            <li>Stored in a temporary cache</li>
            <li>Retained for up to 24 hours since the last update to the timeline</li>
            <li>Automatically deleted after the cache expires</li>
          </ul>
          <p>
            This temporary storage exists solely to improve performance and user experience during
            active use.
          </p>

          <LinkableHeading level={4} id="subsection-3-4-optional-account-usage">
            3.4 Optional Account Usage
          </LinkableHeading>
          <p>Creating an account is completely optional. It is only required if you want to:</p>
          <ul>
            <li>Save your academic timeline</li>
            <li>Access your data across sessions or devices</li>
          </ul>

          <LinkableHeading level={4} id="subsection-3-5-device-and-usage-data">
            3.5 Device and Usage Data
          </LinkableHeading>
          <p>
            We do not intentionally collect identifiable device-level analytics. Basic technical data
            (for example, logs) may be generated for system operation and debugging but is not used
            to identify users.
          </p>

          <LinkableHeading level={4} id="subsection-3-6-data-sharing">
            3.6 Data Sharing
          </LinkableHeading>
          <p>We do not sell, rent, or share your data with third parties. Data may only be disclosed:</p>
          <ul>
            <li>If required by law</li>
            <li>To protect the integrity and security of the application</li>
          </ul>

          <LinkableHeading level={3} id="section-4-license-and-open-source-notice">
            4. License and Open Source Notice
          </LinkableHeading>
          <p>
            TrackMyDegree is released under the <strong>MIT License</strong>.
          </p>
          <p>This means:</p>
          <ul>
            <li>
              You are free to use, copy, modify, and distribute the software in accordance with the
              MIT License terms
            </li>
            <li>The software is provided "as is", without warranty of any kind</li>
          </ul>
          <p>
            This EULA does not override the MIT License but provides additional terms regarding
            acceptable use of the hosted application.
          </p>

          <LinkableHeading level={3} id="section-5-acceptable-use">
            5. Acceptable Use
          </LinkableHeading>
          <p>You agree not to:</p>
          <ul>
            <li>Use the application for unlawful or harmful purposes</li>
            <li>Attempt to disrupt, exploit, or compromise the system</li>
            <li>Access data that does not belong to you</li>
          </ul>

          <LinkableHeading level={3} id="section-6-user-responsibilities">
            6. User Responsibilities
          </LinkableHeading>
          <p>You are responsible for:</p>
          <ul>
            <li>Ensuring the accuracy of any data you enter</li>
            <li>Maintaining the confidentiality of your account credentials (if applicable)</li>
          </ul>

          <LinkableHeading level={3} id="section-7-privacy-and-security">
            7. Privacy and Security
          </LinkableHeading>
          <p>
            We take reasonable measures to protect your data. However, no system is completely
            secure. By using TrackMyDegree, you acknowledge and accept this risk.
          </p>

          <LinkableHeading level={3} id="section-8-termination">
            8. Termination
          </LinkableHeading>
          <p>We reserve the right to suspend or terminate access to the application if:</p>
          <ul>
            <li>You violate this agreement</li>
            <li>The service is discontinued</li>
          </ul>
          <p>You may stop using the application at any time.</p>

          <LinkableHeading level={3} id="section-9-limitation-of-liability">
            9. Limitation of Liability
          </LinkableHeading>
          <p>
            TrackMyDegree is provided "as is". To the fullest extent permitted by law, the
            developers are not liable for:
          </p>
          <ul>
            <li>Loss of academic data</li>
            <li>Errors in degree tracking or calculations</li>
            <li>Any indirect or consequential damages arising from use of the application</li>
          </ul>

          <LinkableHeading level={3} id="section-10-amendments">
            10. Amendments
          </LinkableHeading>
          <p>
            We may update this agreement from time to time. Continued use of the application after
            changes are posted constitutes acceptance of the updated terms.
          </p>

          <LinkableHeading level={3} id="section-11-contact">
            11. Contact
          </LinkableHeading>
          <p>For questions about this EULA or data practices, contact:</p>
          <p>
            <strong>Email:</strong>{" "}
            <a href="mailto:admin@trackmydegree.ca">admin@trackmydegree.ca</a>
          </p>

          <hr />

          <p className="eula-acknowledgement">
            <strong>
              By using TrackMyDegree, you acknowledge that you have read, understood, and agreed to
              this User Consent and End-User License Agreement.
            </strong>
          </p>
          <p className="eula-copyright">Copyright 2025 TrackMyDegree</p>
        </div>
      </section>

      <div className="eula-back-to-top-wrap">
        <button className="eula-back-to-top" type="button" onClick={handleBackToTop}>
          <span className="eula-back-to-top-icon" aria-hidden="true">
            <ChevronUp size={14} />
          </span>
          <span>Go back to top</span>
        </button>
      </div>
    </main>
  );
};

export default EulaPage;