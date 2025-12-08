"use client";

import PrefetchLink from "@/components/PrefetchLink";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function Footer() {
	// Year is consistent between server and client during the same request
	const currentYear = new Date().getFullYear();
	
	// Dynamic logo + site name with fallback
	const [logoUrl, setLogoUrl] = useState<string | null>(process.env.NEXT_PUBLIC_FOOTER_LOGO || null);
	const [siteName, setSiteName] = useState<string | null>(null);
	const [isMounted, setIsMounted] = useState(false);
	
	useEffect(() => {
		setIsMounted(true);
		// Load footer data after initial render to avoid blocking
		let isMounted = true;
		
		const timer = setTimeout(async () => {
			try {
				const { apiFetchJson } = await import('@/lib/api');
				const { safeLogoUrl } = await import('@/lib/api-fallbacks');
				
				const json = await apiFetchJson<{
					footerLogo?: string;
					logo?: string;
					siteName?: string;
				}>('/api/cms/header', {
					timeout: 5000,
					retries: 2,
					fallback: {
						footerLogo: process.env.NEXT_PUBLIC_FOOTER_LOGO || process.env.NEXT_PUBLIC_HEADER_LOGO || null,
						logo: process.env.NEXT_PUBLIC_HEADER_LOGO || null,
						siteName: 'WooCommerce Store',
					},
					enableLogging: true,
				});
				
				// Use footer logo specifically, fallback to header logo if not set
				if (isMounted) {
					const footerLogo = json.footerLogo || json.logo;
					if (footerLogo) {
						setLogoUrl(safeLogoUrl(footerLogo));
					}
					setSiteName(json.siteName || 'WooCommerce Store');
				}
			} catch (error) {
				// Error already logged by apiFetch, use fallback
				if (isMounted) {
					const { safeLogoUrl } = await import('@/lib/api-fallbacks');
					setLogoUrl(safeLogoUrl(process.env.NEXT_PUBLIC_FOOTER_LOGO || process.env.NEXT_PUBLIC_HEADER_LOGO || null));
					setSiteName('WooCommerce Store');
				}
			}
		}, 100); // Small delay to not block initial render
		
		return () => {
			isMounted = false;
			clearTimeout(timer);
		};
	}, []);

	return (
		<footer className="text-white border-t border-teal-600" style={{ backgroundColor: '#1f605f' }} suppressHydrationWarning>
			<div className="mx-auto w-[85vw] px-4 sm:px-6 lg:px-8 py-16" suppressHydrationWarning>
				{/* 4 Column Layout */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-12" suppressHydrationWarning>
					{/* Column 1: Image/Logo */}
					<div className="space-y-4" suppressHydrationWarning>
						<div className="flex items-center" suppressHydrationWarning>
							{isMounted && logoUrl ? (
								<div className="relative w-full">
									<Image 
										src={logoUrl} 
										alt={siteName || "Logo"} 
										width={800}
										height={200}
										className="w-full h-auto object-contain"
										onError={(e) => {
											// Fallback to default logo on image load error
											const { safeLogoUrl } = require('@/lib/api-fallbacks');
											const target = e.target as HTMLImageElement;
											if (target.src !== safeLogoUrl(null)) {
												target.src = safeLogoUrl(null);
											}
										}}
									/>
								</div>
							) : (
								<div className="h-12 w-12 rounded bg-white/20 text-white grid place-items-center text-xl font-bold">
									W
								</div>
							)}
						</div>
						<p className="text-sm text-white/90 leading-relaxed">
							Your trusted partner for quality medical supplies and healthcare products. 
							Supporting NDIS participants with premium care solutions.
						</p>
					</div>

					{/* Column 2: Menu */}
					<div suppressHydrationWarning>
						<h3 className="text-white font-semibold text-lg mb-4">Menu</h3>
						<ul className="space-y-3">
							<li>
								<PrefetchLink href="/" critical={true} className="text-white/80 hover:text-white transition-colors">
									Home
								</PrefetchLink>
							</li>
							<li>
								<PrefetchLink href="/shop" critical={true} className="text-white/80 hover:text-white transition-colors">
									Shop
								</PrefetchLink>
							</li>
							<li>
								<PrefetchLink href="/catalogue" critical={true} className="text-white/80 hover:text-white transition-colors">
									Catalogue
								</PrefetchLink>
							</li>
							<li>
								<PrefetchLink href="/cart" critical={true} className="text-white/80 hover:text-white transition-colors">
									Cart
								</PrefetchLink>
							</li>
							<li>
								<PrefetchLink href="/dashboard/wishlist" critical={true} className="text-white/80 hover:text-white transition-colors">
									Wishlist
								</PrefetchLink>
							</li>
							<li>
								<PrefetchLink href="/account" critical={true} className="text-white/80 hover:text-white transition-colors">
									My Account
								</PrefetchLink>
							</li>
						</ul>
					</div>

					{/* Column 3: Quick Links */}
					<div suppressHydrationWarning>
						<h3 className="text-white font-semibold text-lg mb-4">Quick Links</h3>
						<ul className="space-y-3">
							<li>
								<PrefetchLink href="/about" className="text-white/80 hover:text-white transition-colors">
									About Us
								</PrefetchLink>
							</li>
							<li>
								<PrefetchLink href="/contact" className="text-white/80 hover:text-white transition-colors">
									Contact Us
								</PrefetchLink>
							</li>
							<li>
								<PrefetchLink href="/shipping" className="text-white/80 hover:text-white transition-colors">
									Shipping & Returns
								</PrefetchLink>
							</li>
							<li>
								<PrefetchLink href="/privacy" className="text-white/80 hover:text-white transition-colors">
									Privacy Policy
								</PrefetchLink>
							</li>
							<li>
								<PrefetchLink href="/terms" className="text-white/80 hover:text-white transition-colors">
									Terms & Conditions
								</PrefetchLink>
							</li>
							<li>
								<PrefetchLink href="/faq" className="text-white/80 hover:text-white transition-colors">
									FAQ
								</PrefetchLink>
							</li>
						</ul>
					</div>

					{/* Column 4: Location & Contact */}
					<div suppressHydrationWarning>
						<h3 className="text-white font-semibold text-lg mb-4">Location</h3>
						<div className="space-y-2.5 text-sm text-white/90" suppressHydrationWarning>
							{/* Address */}
							<div className="flex items-start gap-2.5" suppressHydrationWarning>
								<svg className="w-4 h-4 mt-0.5 shrink-0 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
								</svg>
								<p className="flex-1">6/7 Hansen Court, Coomera, 4209, QLD</p>
							</div>
							
							{/* Phone */}
							<a href="tel:1300005032" className="flex items-center gap-2.5 hover:text-white transition-colors">
								<svg className="w-4 h-4 shrink-0 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
								</svg>
								<span>1300 005 032</span>
							</a>
							
							{/* Phone 2 */}
							<a href="tel:0755646628" className="flex items-center gap-2.5 hover:text-white transition-colors">
								<svg className="w-4 h-4 shrink-0 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
								</svg>
								<span>07 5564 6628</span>
							</a>
							
							{/* Mobile */}
							<a href="tel:0430393124" className="flex items-center gap-2.5 hover:text-white transition-colors">
								<svg className="w-4 h-4 shrink-0 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
								</svg>
								<span>0430 393 124</span>
							</a>
							
							{/* Email */}
							<a href="mailto:info@joyamedicalsupplies.com.au" className="flex items-center gap-2.5 hover:text-white transition-colors break-all">
								<svg className="w-4 h-4 shrink-0 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
								</svg>
								<span>info@joyamedicalsupplies.com.au</span>
							</a>
						</div>

						{/* Follow Us */}
						<div className="mt-6" suppressHydrationWarning>
							<h3 className="text-white font-semibold text-lg mb-4">Follow Us</h3>
							<div className="flex gap-4" suppressHydrationWarning>
								<a
									href="https://facebook.com"
									target="_blank"
									rel="noopener noreferrer"
									className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors text-white"
									aria-label="Facebook"
								>
									<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
										<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
									</svg>
								</a>
								<a
									href="https://twitter.com"
									target="_blank"
									rel="noopener noreferrer"
									className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors text-white"
									aria-label="Twitter"
								>
									<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
										<path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
									</svg>
								</a>
								<a
									href="https://instagram.com"
									target="_blank"
									rel="noopener noreferrer"
									className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors text-white"
									aria-label="Instagram"
								>
									<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
										<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
									</svg>
								</a>
								<a
									href="https://linkedin.com"
									target="_blank"
									rel="noopener noreferrer"
									className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors text-white"
									aria-label="LinkedIn"
								>
									<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
										<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
									</svg>
								</a>
							</div>
						</div>
					</div>
				</div>

				{/* Copyright Section */}
				<div className="border-t border-white/20 pt-8" suppressHydrationWarning>
					<div className="flex flex-col md:flex-row justify-between items-center gap-4" suppressHydrationWarning>
						<p className="text-sm text-white/90">
							© {currentYear} WooCommerce Headless Store. All rights reserved.
						</p>
						<div className="flex gap-6 text-sm text-white/90" suppressHydrationWarning>
							<PrefetchLink href="/privacy" className="hover:text-white transition-colors">
								Privacy Policy
							</PrefetchLink>
							<PrefetchLink href="/terms" className="hover:text-white transition-colors">
								Terms of Service
							</PrefetchLink>
						</div>
					</div>
				</div>
			</div>
		</footer>
	);
}
