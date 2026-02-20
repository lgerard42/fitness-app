import Navbar from "@/components/marketing/Navbar";
import HeroSection from "@/components/marketing/HeroSection";
import FeatureSection from "@/components/marketing/FeatureSection";
import PricingTable from "@/components/marketing/PricingTable";
import SocialProof from "@/components/marketing/SocialProof";
import Footer from "@/components/marketing/Footer";
import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <FeatureSection />
        <SocialProof />
        <PricingTable />

        {/* Final CTA */}
        <section className="section-padding bg-gradient-to-br from-primary to-primary-600 text-white">
          <div className="container-max text-center">
            <h2 className="text-3xl md:text-4xl font-extrabold">
              Ready to transform your training?
            </h2>
            <p className="mt-4 text-white/80 text-lg max-w-xl mx-auto">
              Join thousands of athletes who track smarter with Only Fit.
              Start free today.
            </p>
            <div className="mt-8">
              <Link href="/dashboard">
                <button className="inline-flex items-center justify-center font-semibold text-lg rounded-xl px-8 py-4 bg-white text-neutral-dark hover:bg-gray-100 shadow-lg shadow-black/15 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-xl">
                  Get Started Free
                </button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
