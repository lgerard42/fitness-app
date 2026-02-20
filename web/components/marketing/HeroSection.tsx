"use client";

import Link from "next/link";
import PhoneMockup from "./PhoneMockup";
import AppleWatchMockup from "./AppleWatchMockup";
import TabletMockup from "./TabletMockup";
import BackgroundWave from "./BackgroundWave";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden min-h-screen flex items-center bg-neutral-light">
      <BackgroundWave />

      <div className="container-max px-4 sm:px-6 lg:px-8 relative z-10 pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* ——— LEFT: Text Content ——— */}
          <div className="max-w-xl animate-fade-in">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem] font-extrabold leading-[0.95] tracking-tight">
              <span className="text-white drop-shadow-sm block">
                Track Your Fitness.
              </span>
              <span className="text-white drop-shadow-sm">Achieve Your </span>
              <span className="text-amber-300 drop-shadow-sm">Goals.</span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-white/[0.87] leading-relaxed max-w-md">
              Get stronger, stay motivated, and reach your personal best with
              our powerful workout tracker.
            </p>

            <div className="mt-7">
              <Link href="/dashboard">
                <button className="inline-flex items-center justify-center font-semibold text-lg text-white bg-[#10B981] hover:bg-[#059669] rounded-xl px-10 py-4 shadow-lg shadow-black/10 hover:-translate-y-[1px] hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-400">
                  Get Started
                </button>
              </Link>
            </div>

            {/* App Store badges */}
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#"
                className="inline-block group"
                aria-label="Download on the App Store"
              >
                <div className="bg-black/80 group-hover:bg-black rounded-xl px-5 py-3 flex items-center gap-3 transition-all duration-200 shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-[10px] text-white/50 leading-none">Download on the</p>
                    <p className="text-sm font-semibold text-white leading-tight mt-0.5">App Store</p>
                  </div>
                </div>
              </a>
              <a
                href="#"
                className="inline-block group"
                aria-label="Get it on Google Play"
              >
                <div className="bg-black/80 group-hover:bg-black rounded-xl px-5 py-3 flex items-center gap-3 transition-all duration-200 shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.11L13.69,12L3.84,21.89C3.34,21.61 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-[10px] text-white/50 leading-none">GET IT ON</p>
                    <p className="text-sm font-semibold text-white leading-tight mt-0.5">Google Play</p>
                  </div>
                </div>
              </a>
            </div>
          </div>

          {/* ——— RIGHT: Device Mockups ——— */}
          <div className="flex justify-center lg:justify-end animate-fade-in-up">
            <div className="relative w-[340px] h-[520px] sm:w-[420px] sm:h-[580px] lg:w-[480px] lg:h-[620px]">
              {/* Radial glow behind devices for separation from background */}
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] sm:w-[440px] sm:h-[440px] rounded-full pointer-events-none"
                style={{
                  background: "radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 70%)",
                }}
              />

              {/* Analytics tablet — back layer, behind phone on the right */}
              <div className="hidden md:block absolute right-0 top-6 z-[1] scale-[0.95]">
                <div className="shadow-xl/20 rounded-2xl">
                  <TabletMockup />
                </div>
              </div>

              {/* iPhone — main hero device, center */}
              <div className="absolute left-[15%] sm:left-[18%] top-0 z-[3] animate-float">
                <div className="shadow-2xl rounded-[2.5rem]">
                  <PhoneMockup variant="workout" size="lg" />
                </div>
              </div>

              {/* Smartwatch — top layer, front-bottom-left overlapping phone */}
              <div className="hidden sm:block absolute left-0 bottom-[50px] z-[4]">
                <div className="shadow-xl rounded-[1.5rem]">
                  <AppleWatchMockup />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
