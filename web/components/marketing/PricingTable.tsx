import { Check, X } from "lucide-react";
import { PRICING_PLANS } from "@/constants";
import Button from "@/components/ui/Button";

export default function PricingTable() {
  return (
    <section id="pricing" className="section-padding bg-white">
      <div className="container-max">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-neutral-dark">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-gray-600 text-lg">
            Start free, upgrade when you&apos;re ready. No hidden fees.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {PRICING_PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border-2 p-8 ${
                plan.highlighted
                  ? "border-primary bg-white shadow-xl shadow-primary/10"
                  : "border-gray-200 bg-white"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-sm font-semibold px-4 py-1 rounded-full">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold text-neutral-dark">
                  {plan.name}
                </h3>
                <p className="text-gray-500 text-sm mt-1">
                  {plan.description}
                </p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-extrabold text-neutral-dark">
                  {plan.price}
                </span>
                <span className="text-gray-500 text-sm ml-1">
                  {plan.period}
                </span>
              </div>

              <Button
                variant={plan.highlighted ? "primary" : "outline"}
                className="w-full mb-8"
              >
                {plan.cta}
              </Button>

              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature.text} className="flex items-center gap-3">
                    {feature.included ? (
                      <div className="w-5 h-5 rounded-full bg-accent-100 flex items-center justify-center flex-shrink-0">
                        <Check size={12} className="text-accent" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <X size={12} className="text-gray-400" />
                      </div>
                    )}
                    <span
                      className={`text-sm ${
                        feature.included
                          ? "text-neutral-dark"
                          : "text-gray-400"
                      }`}
                    >
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
