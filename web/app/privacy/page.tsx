import type { Metadata } from "next";
import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy | Only Fit",
  description: "Only Fit privacy policy. Learn how we handle your data.",
};

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container-max px-4 sm:px-6 lg:px-8 max-w-3xl">
          <h1 className="text-3xl font-extrabold text-neutral-dark mb-8">
            Privacy Policy
          </h1>
          <div className="prose prose-gray max-w-none space-y-6 text-gray-600 leading-relaxed">
            <p>
              <strong>Effective Date:</strong> January 1, 2025
            </p>

            <h2 className="text-xl font-bold text-neutral-dark mt-8">
              1. Information We Collect
            </h2>
            <p>
              Only Fit stores all workout data locally on your device using
              AsyncStorage and SQLite. We do not collect, transmit, or store
              your workout data on external servers unless you explicitly opt
              into cloud sync features (coming soon).
            </p>

            <h2 className="text-xl font-bold text-neutral-dark mt-8">
              2. Account Information
            </h2>
            <p>
              If you create an account for the web dashboard, we collect your
              email address and display name. This information is used solely
              for authentication and personalization.
            </p>

            <h2 className="text-xl font-bold text-neutral-dark mt-8">
              3. Analytics
            </h2>
            <p>
              We may use anonymized, aggregated analytics to understand app
              usage patterns. No personally identifiable information is shared
              with third parties.
            </p>

            <h2 className="text-xl font-bold text-neutral-dark mt-8">
              4. Data Security
            </h2>
            <p>
              We take reasonable measures to protect your information. All data
              stored locally on your device is protected by your device&apos;s
              built-in security features.
            </p>

            <h2 className="text-xl font-bold text-neutral-dark mt-8">
              5. Your Rights
            </h2>
            <p>
              You have the right to access, modify, or delete your personal
              data at any time. Since data is stored locally, you can clear it
              directly through the app settings.
            </p>

            <h2 className="text-xl font-bold text-neutral-dark mt-8">
              6. Contact Us
            </h2>
            <p>
              If you have questions about this privacy policy, contact us at{" "}
              <a
                href="mailto:privacy@onlyfit.com"
                className="text-primary hover:underline"
              >
                privacy@onlyfit.com
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
