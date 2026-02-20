import type { Metadata } from "next";
import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";

export const metadata: Metadata = {
  title: "Terms of Service | Only Fit",
  description: "Only Fit terms of service and conditions of use.",
};

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container-max px-4 sm:px-6 lg:px-8 max-w-3xl">
          <h1 className="text-3xl font-extrabold text-neutral-dark mb-8">
            Terms of Service
          </h1>
          <div className="prose prose-gray max-w-none space-y-6 text-gray-600 leading-relaxed">
            <p>
              <strong>Effective Date:</strong> January 1, 2025
            </p>

            <h2 className="text-xl font-bold text-neutral-dark mt-8">
              1. Acceptance of Terms
            </h2>
            <p>
              By downloading, installing, or using Only Fit, you agree to
              be bound by these Terms of Service. If you do not agree, do not
              use the application.
            </p>

            <h2 className="text-xl font-bold text-neutral-dark mt-8">
              2. Use of Service
            </h2>
            <p>
              Only Fit is a personal fitness tracking application. You may
              use it for personal, non-commercial purposes. You are responsible
              for maintaining the confidentiality of your account.
            </p>

            <h2 className="text-xl font-bold text-neutral-dark mt-8">
              3. User Content
            </h2>
            <p>
              You retain ownership of all workout data, notes, and other content
              you create within the app. We do not claim any rights to your
              personal fitness data.
            </p>

            <h2 className="text-xl font-bold text-neutral-dark mt-8">
              4. Subscriptions
            </h2>
            <p>
              PRO features require a paid subscription. Subscriptions
              automatically renew unless cancelled 24 hours before the end of
              the current billing period. Refunds are handled through the
              respective app store.
            </p>

            <h2 className="text-xl font-bold text-neutral-dark mt-8">
              5. Disclaimer
            </h2>
            <p>
              Only Fit is not a substitute for professional fitness or
              medical advice. Always consult a healthcare professional before
              starting any exercise program. We are not liable for any injuries
              or health issues arising from the use of this app.
            </p>

            <h2 className="text-xl font-bold text-neutral-dark mt-8">
              6. Changes to Terms
            </h2>
            <p>
              We reserve the right to modify these terms at any time. Continued
              use of the app after changes constitutes acceptance of the new
              terms.
            </p>

            <h2 className="text-xl font-bold text-neutral-dark mt-8">
              7. Contact
            </h2>
            <p>
              For questions about these terms, contact us at{" "}
              <a
                href="mailto:legal@onlyfit.com"
                className="text-primary hover:underline"
              >
                legal@onlyfit.com
              </a>
              .
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
