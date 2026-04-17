import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Privacy Policy for NestMatch. Learn how we collect, use, and protect your personal information.',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-16 sm:px-8 lg:py-24">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:opacity-80 transition-opacity mb-10"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to home
        </Link>

        <h1 className="font-display text-4xl font-bold tracking-tight text-on-surface sm:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm text-on-surface-variant">
          Last updated: April 2, 2026
        </p>

        <div className="mt-12 space-y-10 text-[15px] leading-relaxed text-on-surface-variant">
          {/* 1 */}
          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              1. Introduction
            </h2>
            <p>
              NestMatch, operated by GrowYourSB (&ldquo;we&rdquo;,
              &ldquo;us&rdquo;, or &ldquo;our&rdquo;), is committed to
              protecting the privacy of individuals who use our platform at{' '}
              <a
                href="https://www.nestmatch.app"
                className="text-primary underline underline-offset-2"
              >
                www.nestmatch.app
              </a>{' '}
              (the &ldquo;Platform&rdquo;) and related services (collectively,
              the &ldquo;Services&rdquo;). This Privacy Policy explains what
              personal information we collect, how we use and share it, and your
              rights under Canadian privacy law.
            </p>
            <p className="mt-3">
              We comply with the Personal Information Protection and Electronic
              Documents Act (PIPEDA) and applicable provincial privacy
              legislation. By using NestMatch, you consent to the practices
              described in this Privacy Policy.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              2. Information We Collect
            </h2>
            <p>
              We collect information that you provide directly, information
              generated through your use of the Services, and information from
              third-party sources.
            </p>

            <h3 className="text-base font-semibold text-on-surface mt-5 mb-2">
              2.1 Information You Provide
            </h3>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong className="text-on-surface">Account Information:</strong>{' '}
                Name, email address, phone number, date of birth, and password
                when you create an account.
              </li>
              <li>
                <strong className="text-on-surface">Profile Information:</strong>{' '}
                Photos, bio, lifestyle preferences (sleep schedule, cleanliness
                habits, pet tolerance, smoking preferences, noise tolerance, and
                similar), location preferences, and budget range.
              </li>
              <li>
                <strong className="text-on-surface">Listing Information:</strong>{' '}
                Property details, photos, address, rent, amenities, and
                availability dates for housing listings you create.
              </li>
              <li>
                <strong className="text-on-surface">
                  Verification Information:
                </strong>{' '}
                Government-issued identification documents, personal details
                required for background and credit checks submitted through our
                verification partner CERTN.
              </li>
              <li>
                <strong className="text-on-surface">Payment Information:</strong>{' '}
                Payment card details and billing address, processed and stored by
                our payment provider Stripe. We do not store full card numbers on
                our servers.
              </li>
              <li>
                <strong className="text-on-surface">Communications:</strong>{' '}
                Messages sent through the Platform, as well as any
                correspondence you send to us (e.g., support requests).
              </li>
            </ul>

            <h3 className="text-base font-semibold text-on-surface mt-5 mb-2">
              2.2 Information Collected Automatically
            </h3>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong className="text-on-surface">Usage Data:</strong> Pages
                visited, features used, search queries, interactions with
                listings and profiles, and timestamps.
              </li>
              <li>
                <strong className="text-on-surface">Device Information:</strong>{' '}
                Browser type, operating system, device identifiers, screen
                resolution, and language preferences.
              </li>
              <li>
                <strong className="text-on-surface">Location Data:</strong>{' '}
                Approximate location derived from your IP address or, with your
                permission, more precise location from your device.
              </li>
              <li>
                <strong className="text-on-surface">
                  Cookies and Similar Technologies:
                </strong>{' '}
                See Section 7 below.
              </li>
            </ul>

            <h3 className="text-base font-semibold text-on-surface mt-5 mb-2">
              2.3 Information from Third Parties
            </h3>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong className="text-on-surface">
                  CERTN (CertnCentric):
                </strong>{' '}
                Verification results, including identity verification status,
                background check results, and credit check summaries.
              </li>
              <li>
                <strong className="text-on-surface">Stripe:</strong> Transaction
                confirmations and payment status.
              </li>
              <li>
                <strong className="text-on-surface">
                  Authentication Providers:
                </strong>{' '}
                If you sign in using a third-party service (e.g., Google), we
                receive basic profile information as permitted by your settings
                with that provider.
              </li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              3. How We Use Your Information
            </h2>
            <p>We use the information we collect to:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                Provide, maintain, and improve the Services, including roommate
                matching, listing search, and expense sharing.
              </li>
              <li>
                Process verification checks through CERTN and display
                verification badges on your profile.
              </li>
              <li>Process payments and manage billing through Stripe.</li>
              <li>
                Send transactional communications such as account confirmations,
                verification updates, and payment receipts.
              </li>
              <li>
                Send promotional communications about new features, tips, or
                offers (you can opt out at any time).
              </li>
              <li>
                Verify your phone number via SMS through our provider Twilio.
              </li>
              <li>
                Display relevant locations and maps through Google Maps
                integration.
              </li>
              <li>
                Detect and prevent fraud, abuse, and security threats to the
                Platform.
              </li>
              <li>
                Analyse usage patterns and trends to improve the user experience
                and develop new features.
              </li>
              <li>
                Comply with legal obligations and respond to lawful requests
                from authorities.
              </li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              4. How We Share Your Information
            </h2>
            <p>
              We do not sell your personal information. We share your data only
              in the following circumstances:
            </p>

            <h3 className="text-base font-semibold text-on-surface mt-5 mb-2">
              4.1 With Other Users
            </h3>
            <p>
              Your profile information, lifestyle preferences, verification
              badges, and listing details are visible to other NestMatch users as
              part of the matching and search functionality. Messages you send
              are visible to their recipients.
            </p>

            <h3 className="text-base font-semibold text-on-surface mt-5 mb-2">
              4.2 With Third-Party Service Providers
            </h3>
            <p>
              We share information with trusted third parties who perform
              services on our behalf:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                <strong className="text-on-surface">Supabase:</strong> Database
                hosting and authentication services. Your account data and
                platform content are stored on Supabase infrastructure.
              </li>
              <li>
                <strong className="text-on-surface">Stripe:</strong> Payment
                processing. Stripe receives your payment details to process
                transactions securely. See{' '}
                <a
                  href="https://stripe.com/privacy"
                  className="text-primary underline underline-offset-2"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Stripe&rsquo;s Privacy Policy
                </a>
                .
              </li>
              <li>
                <strong className="text-on-surface">
                  CERTN (CertnCentric):
                </strong>{' '}
                Verification services. CERTN receives personal details and
                identification documents necessary to perform identity,
                background, and credit checks. See{' '}
                <a
                  href="https://certn.co/privacy-policy/"
                  className="text-primary underline underline-offset-2"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  CERTN&rsquo;s Privacy Policy
                </a>
                .
              </li>
              <li>
                <strong className="text-on-surface">Twilio:</strong> SMS
                delivery for phone number verification. Your phone number is
                shared with Twilio to send verification codes. See{' '}
                <a
                  href="https://www.twilio.com/legal/privacy"
                  className="text-primary underline underline-offset-2"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Twilio&rsquo;s Privacy Policy
                </a>
                .
              </li>
              <li>
                <strong className="text-on-surface">Google Maps:</strong> Map
                and location services. Your location queries and listing
                addresses may be processed by Google. See{' '}
                <a
                  href="https://policies.google.com/privacy"
                  className="text-primary underline underline-offset-2"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google&rsquo;s Privacy Policy
                </a>
                .
              </li>
            </ul>

            <h3 className="text-base font-semibold text-on-surface mt-5 mb-2">
              4.3 For Legal Reasons
            </h3>
            <p>
              We may disclose your information if required by law, regulation,
              legal process, or government request, or if we believe in good
              faith that disclosure is necessary to protect the rights, property,
              or safety of NestMatch, our users, or the public.
            </p>

            <h3 className="text-base font-semibold text-on-surface mt-5 mb-2">
              4.4 Business Transfers
            </h3>
            <p>
              If GrowYourSB is involved in a merger, acquisition, or sale of
              assets, your personal information may be transferred as part of
              that transaction. We will notify you before your information
              becomes subject to a different privacy policy.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              5. Data Retention
            </h2>
            <p>
              We retain your personal information for as long as your account is
              active or as needed to provide you the Services. After account
              deletion, we may retain certain information for a reasonable period
              to comply with legal obligations, resolve disputes, enforce our
              agreements, and for legitimate business purposes such as fraud
              prevention.
            </p>
            <p className="mt-3">Specific retention periods include:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                <strong className="text-on-surface">Account data:</strong>{' '}
                Retained for the duration of your account plus up to 30 days
                following deletion to allow for account recovery.
              </li>
              <li>
                <strong className="text-on-surface">
                  Verification results:
                </strong>{' '}
                Retained for the duration of your account. CERTN may retain data
                independently in accordance with their own privacy policy.
              </li>
              <li>
                <strong className="text-on-surface">Payment records:</strong>{' '}
                Retained for 7 years as required by Canadian tax and financial
                regulations.
              </li>
              <li>
                <strong className="text-on-surface">
                  Messages and communications:
                </strong>{' '}
                Retained for the duration of your account. Deleted upon account
                deletion, except where required for legal or safety purposes.
              </li>
              <li>
                <strong className="text-on-surface">Usage logs:</strong>{' '}
                Anonymised or deleted after 24 months.
              </li>
            </ul>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              6. Your Rights Under PIPEDA
            </h2>
            <p>
              Under the Personal Information Protection and Electronic Documents
              Act (PIPEDA), you have the following rights regarding your personal
              information:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                <strong className="text-on-surface">Right of Access:</strong>{' '}
                You may request access to the personal information we hold about
                you.
              </li>
              <li>
                <strong className="text-on-surface">Right to Correction:</strong>{' '}
                You may request that we correct inaccurate or incomplete personal
                information.
              </li>
              <li>
                <strong className="text-on-surface">
                  Right to Withdraw Consent:
                </strong>{' '}
                You may withdraw your consent for the collection, use, or
                disclosure of your personal information at any time, subject to
                legal or contractual restrictions. Withdrawal of consent may
                limit your ability to use certain features of the Services.
              </li>
              <li>
                <strong className="text-on-surface">
                  Right to Complain:
                </strong>{' '}
                You have the right to file a complaint with the Office of the
                Privacy Commissioner of Canada if you believe your privacy rights
                have been violated.
              </li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, please contact us at{' '}
              <a
                href="mailto:privacy@nestmatch.app"
                className="text-primary underline underline-offset-2"
              >
                privacy@nestmatch.app
              </a>
              . We will respond to your request within 30 days.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              7. Cookies and Tracking Technologies
            </h2>
            <p>
              We use cookies and similar technologies to enhance your experience
              on the Platform. These include:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                <strong className="text-on-surface">Essential Cookies:</strong>{' '}
                Required for the Platform to function properly, including
                authentication session cookies and security tokens. These cannot
                be disabled.
              </li>
              <li>
                <strong className="text-on-surface">
                  Functional Cookies:
                </strong>{' '}
                Remember your preferences (e.g., search filters, language
                settings) to improve your experience.
              </li>
              <li>
                <strong className="text-on-surface">
                  Analytics Cookies:
                </strong>{' '}
                Help us understand how users interact with the Platform so we can
                improve it. These collect anonymised usage data.
              </li>
            </ul>
            <p className="mt-3">
              You can control cookies through your browser settings. Disabling
              certain cookies may affect the functionality of the Services.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              8. Data Security
            </h2>
            <p>
              We implement appropriate technical and organisational measures to
              protect your personal information, including:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                Encryption of data in transit using TLS/SSL and at rest where
                applicable.
              </li>
              <li>
                Secure authentication mechanisms, including row-level security
                policies on our database.
              </li>
              <li>
                Payment information processed exclusively through
                PCI-DSS-compliant Stripe infrastructure.
              </li>
              <li>
                Regular security assessments and monitoring for unauthorized
                access attempts.
              </li>
              <li>
                Access controls limiting employee and contractor access to
                personal information on a need-to-know basis.
              </li>
            </ul>
            <p className="mt-3">
              While we strive to protect your personal information, no method of
              transmission over the Internet or electronic storage is 100%
              secure. We cannot guarantee absolute security.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              9. Children&rsquo;s Privacy
            </h2>
            <p>
              NestMatch is not intended for individuals under the age of 18. We
              do not knowingly collect personal information from anyone under 18.
              If we become aware that we have collected personal information from
              a person under 18, we will take steps to delete that information
              promptly. If you believe a minor has provided us with personal
              information, please contact us at{' '}
              <a
                href="mailto:privacy@nestmatch.app"
                className="text-primary underline underline-offset-2"
              >
                privacy@nestmatch.app
              </a>
              .
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              10. International Data Transfers
            </h2>
            <p>
              Your information may be stored and processed in countries outside
              of Canada where our service providers maintain infrastructure
              (including the United States). When your data is transferred
              outside of Canada, we ensure that appropriate safeguards are in
              place to protect your information in accordance with PIPEDA and
              applicable law.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              11. Changes to This Privacy Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time to reflect
              changes in our practices, technology, legal requirements, or other
              factors. When we make material changes, we will notify you by
              posting the updated policy on the Platform and updating the
              &ldquo;Last updated&rdquo; date. We encourage you to review this
              policy periodically.
            </p>
            <p className="mt-3">
              Your continued use of the Services after any changes to this
              Privacy Policy constitutes your acceptance of the updated policy.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              12. Contact Us
            </h2>
            <p>
              If you have any questions, concerns, or requests regarding this
              Privacy Policy or our handling of your personal information, please
              contact us:
            </p>
            <ul className="mt-3 space-y-1.5">
              <li>
                <strong className="text-on-surface">Privacy Inquiries:</strong>{' '}
                <a
                  href="mailto:privacy@nestmatch.app"
                  className="text-primary underline underline-offset-2"
                >
                  privacy@nestmatch.app
                </a>
              </li>
              <li>
                <strong className="text-on-surface">General Support:</strong>{' '}
                <a
                  href="mailto:support@nestmatch.app"
                  className="text-primary underline underline-offset-2"
                >
                  support@nestmatch.app
                </a>
              </li>
              <li>
                <strong className="text-on-surface">Website:</strong>{' '}
                <a
                  href="https://www.nestmatch.app"
                  className="text-primary underline underline-offset-2"
                >
                  www.nestmatch.app
                </a>
              </li>
              <li>
                <strong className="text-on-surface">Company:</strong>{' '}
                GrowYourSB, Canada
              </li>
            </ul>
            <p className="mt-5">
              You may also contact the Office of the Privacy Commissioner of
              Canada at{' '}
              <a
                href="https://www.priv.gc.ca"
                className="text-primary underline underline-offset-2"
                target="_blank"
                rel="noopener noreferrer"
              >
                www.priv.gc.ca
              </a>{' '}
              if you have concerns about how your personal information is being
              handled.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
