"use client";

import SubscribeForm from "@/components/SubscribeForm";
import Image from "next/image";

export default function NewsletterSection() {
  return (
    <section className="mt-10">
      <div className="container mx-auto">
        <div className="grid md:grid-cols-2 items-center rounded-2xl overflow-hidden bg-[#1f605f]">

          {/* LEFT CONTENT */}
          <div className="p-8 md:p-12 text-left">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Stay Updated
            </h2>

            <p className="text-white/80 mb-6 text-lg max-w-md">
              Subscribe to our newsletter for the latest products, deals, and updates.
            </p>

            <SubscribeForm />
          </div>

          {/* RIGHT IMAGE */}
          <div className="relative h-64 md:h-full w-full">
            <Image
              src="/newsletter.jpg" // 👉 put your image in /public
              alt="Subscribe Newsletter"
              fill
              className="object-cover"
              priority
            />
          </div>

        </div>
      </div>
    </section>
  );
}