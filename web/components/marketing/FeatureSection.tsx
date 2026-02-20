import {
  Dumbbell,
  Library,
  BarChart3,
  Users,
  Timer,
  Layers,
  TrendingUp,
  Target,
} from "lucide-react";
import { FEATURES } from "@/constants";
import PhoneMockup from "./PhoneMockup";

const featureIcons = [
  [Dumbbell, Timer, Layers, Dumbbell],
  [Library, Library, Library, Library],
  [BarChart3, TrendingUp, BarChart3, Target],
  [Users, Users, Users, Target],
];

const phoneVariants: Array<"workout" | "timer" | "library" | "workout"> = [
  "workout",
  "library",
  "timer",
  "workout",
];

export default function FeatureSection() {
  return (
    <section id="features" className="section-padding bg-neutral-light">
      <div className="container-max">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-neutral-dark">
            Everything you need to{" "}
            <span className="text-primary">train smarter</span>
          </h2>
          <p className="mt-4 text-gray-600 text-lg">
            Built by lifters, for lifters. Every feature designed to get out of
            your way and let you focus on what matters.
          </p>
        </div>

        <div className="space-y-24">
          {FEATURES.map((feature, idx) => (
            <div
              key={feature.title}
              className={`grid lg:grid-cols-2 gap-12 lg:gap-16 items-center ${
                idx % 2 === 1 ? "lg:flex-row-reverse" : ""
              }`}
            >
              <div className={idx % 2 === 1 ? "lg:order-2" : ""}>
                <h3 className="text-2xl md:text-3xl font-bold text-neutral-dark">
                  {feature.title}
                </h3>
                <p className="mt-4 text-gray-600 text-lg leading-relaxed">
                  {feature.description}
                </p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {feature.items.map((item, i) => {
                    const Icon = featureIcons[idx]?.[i] || Dumbbell;
                    return (
                      <div
                        key={item}
                        className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm"
                      >
                        <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Icon size={16} className="text-primary" />
                        </div>
                        <span className="text-sm font-medium text-neutral-dark">
                          {item}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div
                className={`flex justify-center ${
                  idx % 2 === 1 ? "lg:order-1" : ""
                }`}
              >
                <PhoneMockup variant={phoneVariants[idx]} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
