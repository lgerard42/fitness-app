import type { Metadata } from "next";
import Navbar from "@/components/marketing/Navbar";
import PricingTable from "@/components/marketing/PricingTable";
import Footer from "@/components/marketing/Footer";

export const metadata: Metadata = {
  title: "Pricing | Only Fit",
  description:
    "Simple, transparent pricing. Start free, upgrade to PRO when you're ready for advanced analytics, goal tracking, and more.",
  openGraph: {
    title: "Pricing | Only Fit",
    description:
      "Simple, transparent pricing. Start free, upgrade to PRO when you're ready.",
  },
};

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <PricingTable />
      </main>
      <Footer />
    </>
  );
}
