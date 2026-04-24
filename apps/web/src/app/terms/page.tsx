import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Terms of Service for NestMatch, the roommate matching platform in Canada.',
}

export default function TermsOfServicePage() {
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
          Terms of Service
        </h1>
        <p className="mt-4 text-sm text-on-surface-variant">
          Last updated: April 2, 2026
        </p>

        <div className="mt-12 space-y-10 text-[15px] leading-relaxed text-on-surface-variant">
          {/* 1 */}
          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using the NestMatch platform at{' '}
              <a
                href="https://www.nestmatch.app"
                className="text-primary underline underline-offset-2"
              >
                www.nestmatch.app
              </a>{' '}
              (the &ldquo;Platform&rdquo;), including any mobile applications,
              APIs, or related services (collectively, the
              &ldquo;Services&rdquo;), you agree to be bound by these Terms of
              Service (&ldquo;Terms&rdquo;). If you do not agree, you must not
              use the Services.
            </p>
            <p className="mt-3">
              NestMatch is operated by GrowYourSB (&ldquo;we&rdquo;,
              &ldquo;us&rdquo;, or &ldquo;our&rdquo;), a company based in
              Canada. These Terms constitute a legally binding agreement between
              you and GrowYourSB.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              2. Eligibility
            </h2>
            <p>
              You must be at least 18 years of age to create an account or use
              the Services. By using NestMatch, you represent and warrant that
              you are at least 18 years old and have the legal capacity to enter
              into these Terms. We reserve the right to request proof of age at
              any time and to suspend or terminate accounts that do not meet this
              requirement.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              3. Account Registration and Responsibilities
            </h2>
            <p>
              To access certain features you must create an account. You agree
              to:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                Provide accurate, current, and complete information during
                registration and keep it up to date.
              </li>
              <li>
                Maintain the confidentiality of your login credentials and be
                fully responsible for all activity under your account.
              </li>
              <li>
                Notify us immediately at{' '}
                <a
                  href="mailto:support@nestmatch.app"
                  className="text-primary underline underline-offset-2"
                >
                  support@nestmatch.app
                </a>{' '}
                if you suspect unauthorized access to your account.
              </li>
              <li>
                Not create more than one account per person or create an account
                on behalf of someone else without their permission.
              </li>
            </ul>
            <p className="mt-3">
              We reserve the right to suspend or terminate any account that
              violates these Terms or that we reasonably believe is being used
              fraudulently.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              4. Description of Services
            </h2>
            <p>
              NestMatch provides a platform that connects individuals seeking
              shared housing in Canada. Our Services include:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                <strong className="text-on-surface">
                  Roommate Matching:
                </strong>{' '}
                Compatibility-based matching using lifestyle preferences and
                profile data.
              </li>
              <li>
                <strong className="text-on-surface">Listing Search:</strong>{' '}
                Browsing and posting housing listings across Canada.
              </li>
              <li>
                <strong className="text-on-surface">
                  Verification Services:
                </strong>{' '}
                Identity verification, background checks, and credit checks
                facilitated through our third-party partner CERTN.
              </li>
              <li>
                <strong className="text-on-surface">Messaging:</strong>{' '}
                In-platform communication between matched users.
              </li>
              <li>
                <strong className="text-on-surface">Payments:</strong>{' '}
                Secure payment processing for verification services and other
                paid features via Stripe.
              </li>
              <li>
                <strong className="text-on-surface">Expense Sharing:</strong>{' '}
                Tools for roommates to track and split shared expenses.
              </li>
            </ul>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              5. Verification Services Disclaimer
            </h2>
            <p>
              NestMatch facilitates identity verification, background checks,
              and credit checks through our third-party provider, CERTN
              (CertnCentric). You acknowledge and agree that:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                NestMatch acts solely as an intermediary and does not itself
                perform verification checks. We do not guarantee the accuracy,
                completeness, or reliability of any verification results.
              </li>
              <li>
                Verification results are provided &ldquo;as-is&rdquo; from CERTN
                and should be used as one factor among many in your
                decision-making process.
              </li>
              <li>
                A successful verification does not constitute an endorsement,
                recommendation, or guarantee of any user&rsquo;s character,
                reliability, or suitability as a roommate.
              </li>
              <li>
                You are solely responsible for your own due diligence when
                choosing a roommate or housing arrangement.
              </li>
            </ul>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              6. Payment Terms
            </h2>
            <p>
              Certain Services require payment, including verification checks
              and premium features. All payments are processed securely through
              Stripe. By making a purchase you agree to the following:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                All prices are displayed in Canadian Dollars (CAD) unless
                otherwise stated and are inclusive of applicable taxes.
              </li>
              <li>
                You authorize us and our payment processor (Stripe) to charge
                your selected payment method for the amounts due.
              </li>
              <li>
                <strong className="text-on-surface">Refund Policy:</strong>{' '}
                Once a CERTN verification check has been initiated, no refunds
                will be issued, as the cost is incurred with our third-party
                provider at the time of initiation. For other paid services,
                refund requests may be considered on a case-by-case basis within
                14 days of purchase by contacting{' '}
                <a
                  href="mailto:support@nestmatch.app"
                  className="text-primary underline underline-offset-2"
                >
                  support@nestmatch.app
                </a>
                .
              </li>
              <li>
                We reserve the right to change our pricing at any time.
                Existing paid subscriptions will be honoured at their current
                rate until the end of the billing period.
              </li>
            </ul>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              7. Prohibited Conduct
            </h2>
            <p>You agree not to:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                Use the Services for any unlawful purpose or in violation of any
                applicable local, provincial, national, or international law.
              </li>
              <li>
                Post false, misleading, or fraudulent information in profiles or
                listings.
              </li>
              <li>
                Harass, threaten, intimidate, or discriminate against any other
                user based on race, gender, sexual orientation, religion,
                disability, or any other protected characteristic.
              </li>
              <li>
                Scrape, crawl, or use automated tools to extract data from the
                Platform without our written consent.
              </li>
              <li>
                Attempt to gain unauthorized access to other user accounts,
                computer systems, or networks connected to the Services.
              </li>
              <li>
                Upload malicious software, viruses, or any code designed to
                disrupt, damage, or limit the functionality of the Platform.
              </li>
              <li>
                Use the Platform for commercial solicitation, advertising, or
                spam unrelated to shared housing.
              </li>
              <li>
                Impersonate any person or entity, or falsely claim an
                affiliation with any person or entity.
              </li>
              <li>
                Circumvent, disable, or otherwise interfere with
                security-related features of the Platform.
              </li>
            </ul>
            <p className="mt-3">
              We reserve the right to investigate violations and take
              appropriate action, including suspending or terminating your
              account and reporting conduct to law enforcement where necessary.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              8. User Content
            </h2>
            <p>
              You retain ownership of content you submit to the Platform
              (profiles, photos, listing descriptions, messages). By posting
              content, you grant NestMatch a non-exclusive, worldwide,
              royalty-free licence to use, display, reproduce, and distribute
              your content solely for the purpose of operating and improving the
              Services.
            </p>
            <p className="mt-3">
              You represent that you own or have the necessary rights to all
              content you post and that your content does not violate any third
              party&rsquo;s intellectual property or privacy rights.
            </p>
            <p className="mt-3">
              We reserve the right to remove any content that violates these
              Terms or that we deem objectionable, without prior notice.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              9. Intellectual Property
            </h2>
            <p>
              The NestMatch name, logo, design system, software, and all related
              materials are the intellectual property of GrowYourSB and are
              protected by Canadian and international intellectual property
              laws. You may not copy, modify, distribute, sell, or lease any
              part of our Services, nor may you reverse-engineer or attempt to
              extract the source code of our software, unless permitted by law
              or with our written consent.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              10. Disclaimers
            </h2>
            <p>
              The Services are provided on an &ldquo;AS IS&rdquo; and &ldquo;AS
              AVAILABLE&rdquo; basis without warranties of any kind, whether
              express or implied, including but not limited to implied warranties
              of merchantability, fitness for a particular purpose, and
              non-infringement.
            </p>
            <p className="mt-3">
              NestMatch does not guarantee that the Platform will be
              uninterrupted, error-free, or secure. We do not warrant the
              accuracy or completeness of any information on the Platform,
              including user profiles, listings, or verification results.
            </p>
            <p className="mt-3">
              NestMatch is not a party to any housing agreement, lease, or
              roommate arrangement between users. We are not responsible for the
              conduct, whether online or offline, of any user of the Services.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              11. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by applicable law, GrowYourSB, its
              directors, employees, agents, and affiliates shall not be liable
              for any indirect, incidental, special, consequential, or punitive
              damages, or any loss of profits, data, use, or goodwill, arising
              out of or related to your use of the Services.
            </p>
            <p className="mt-3">
              Our total aggregate liability for any claims arising from or
              relating to these Terms or the Services shall not exceed the
              greater of (a) the amount you paid to NestMatch in the 12 months
              preceding the claim, or (b) one hundred Canadian dollars (CAD
              $100).
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              12. Indemnification
            </h2>
            <p>
              You agree to indemnify and hold harmless GrowYourSB and its
              officers, directors, employees, and agents from and against any
              claims, liabilities, damages, losses, and expenses (including
              reasonable legal fees) arising out of or in any way connected with
              your access to or use of the Services, your violation of these
              Terms, or your violation of any third-party rights.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              13. Termination
            </h2>
            <p>
              You may terminate your account at any time by contacting us at{' '}
              <a
                href="mailto:support@nestmatch.app"
                className="text-primary underline underline-offset-2"
              >
                support@nestmatch.app
              </a>{' '}
              or through your account settings. We may suspend or terminate your
              account at our discretion, without prior notice, for conduct that
              we determine violates these Terms, is harmful to other users or
              third parties, or is otherwise objectionable.
            </p>
            <p className="mt-3">
              Upon termination, your right to use the Services will immediately
              cease. Sections that by their nature should survive termination
              (including but not limited to intellectual property, disclaimers,
              limitation of liability, and indemnification) will remain in
              effect.
            </p>
          </section>

          {/* 14 */}
          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              14. Governing Law and Dispute Resolution
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with
              the laws of the Province of Ontario and the federal laws of Canada
              applicable therein, without regard to conflict of law principles.
            </p>
            <p className="mt-3">
              Any disputes arising out of or relating to these Terms or the
              Services shall be resolved exclusively in the courts of competent
              jurisdiction located in Ontario, Canada. You consent to the
              personal jurisdiction of such courts and waive any objection to
              the convenience of such forum.
            </p>
          </section>

          {/* 15 */}
          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              15. Changes to These Terms
            </h2>
            <p>
              We may update these Terms from time to time. When we make material
              changes, we will notify you by posting the updated Terms on the
              Platform and updating the &ldquo;Last updated&rdquo; date at the
              top of this page. Your continued use of the Services after any
              such changes constitutes your acceptance of the revised Terms.
            </p>
          </section>

          {/* 16 */}
          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              16. Severability
            </h2>
            <p>
              If any provision of these Terms is found to be unenforceable or
              invalid, that provision shall be limited or eliminated to the
              minimum extent necessary so that the remaining provisions remain
              in full force and effect.
            </p>
          </section>

          {/* 17 */}
          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              17. Contact Us
            </h2>
            <p>
              If you have any questions about these Terms, please contact us:
            </p>
            <ul className="mt-3 space-y-1.5">
              <li>
                <strong className="text-on-surface">Email:</strong>{' '}
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
          </section>
        </div>
      </div>
    </div>
  )
}
