"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { BRAND, NAV_ITEMS } from "@/constants";
import Button from "@/components/ui/Button";
import BrandIcon from "@/components/ui/BrandIcon";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm"
          : "bg-transparent"
      )}
    >
      <div className="container-max flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <BrandIcon size="sm" />
          <span
            className={cn(
              "font-bold text-lg transition-colors",
              scrolled ? "text-neutral-dark" : "text-white"
            )}
          >
            {BRAND.name}
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "text-sm font-medium transition-colors",
                scrolled
                  ? "text-gray-600 hover:text-primary"
                  : "text-white/80 hover:text-white"
              )}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/dashboard">
            <Button
              size="sm"
              className="bg-[#FF6B35] hover:bg-[#F95D2A] text-white rounded-xl shadow-md shadow-primary/20"
            >
              Get Started
            </Button>
          </Link>
        </div>

        <button
          className="md:hidden p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <X size={24} className={scrolled ? "text-neutral-dark" : "text-white"} />
          ) : (
            <Menu size={24} className={scrolled ? "text-neutral-dark" : "text-white"} />
          )}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white border-b border-gray-100 px-4 pb-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="block py-3 text-sm font-medium text-gray-600 hover:text-primary"
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
            <Button size="sm" className="w-full mt-2">
              Get Started
            </Button>
          </Link>
        </div>
      )}
    </nav>
  );
}
