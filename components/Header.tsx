"use client";

import PrefetchLink from "@/components/PrefetchLink";
import Image from "next/image";
import { useEffect, useRef, useState, useCallback } from "react";
import { useCart } from "@/components/CartProvider";
import { useWishlist } from "@/contexts/WishlistContext";
import { useRouter } from "next/navigation";
import SearchBar from "@/components/SearchBar";
import { useToast } from "@/components/ToastProvider";
import { useAuth } from "@/components/AuthProvider";

export default function Header() {
	const [open, setOpen] = useState(false);
	const [isMounted, setIsMounted] = useState(false);
	const [userMenuOpen, setUserMenuOpen] = useState(false);
	const { open: openCart, items } = useCart();
	const { items: wishlistItems } = useWishlist();
	const { info } = useToast();
	const { user, loading, logout } = useAuth();
	const router = useRouter();
	const userMenuRef = useRef<HTMLDivElement>(null);
	const userMenuButtonRef = useRef<HTMLButtonElement>(null);
	
	// Ensure component is mounted before accessing cart
	useEffect(() => {
		setIsMounted(true);
	}, []);
	
	// Calculate total items in cart (sum of quantities) - use 0 during SSR
	const cartCount = isMounted ? items.reduce((sum, item) => sum + item.qty, 0) : 0;

	// Handle keyboard navigation for user menu
	const handleUserMenuKeyDown = useCallback((e: React.KeyboardEvent) => {
		if (e.key === 'Escape') {
			setUserMenuOpen(false);
			userMenuButtonRef.current?.focus();
		} else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			const menu = userMenuRef.current;
			if (!menu) return;
			
			const items = menu.querySelectorAll<HTMLElement>('a, button');
			const currentIndex = Array.from(items).findIndex(el => el === document.activeElement);
			
			if (e.key === 'ArrowDown') {
				const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
				items[nextIndex]?.focus();
			} else {
				const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
				items[prevIndex]?.focus();
			}
		}
	}, []);

	// Close menu on outside click
	useEffect(() => {
		if (!userMenuOpen) return;
		
		const handleClickOutside = (e: MouseEvent) => {
			if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
				setUserMenuOpen(false);
			}
		};
		
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [userMenuOpen]);

	// Handle mobile menu escape key
	useEffect(() => {
		if (!open) return;
		
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setOpen(false);
		};
		
		document.addEventListener('keydown', handleEscape);
		return () => document.removeEventListener('keydown', handleEscape);
	}, [open]);

	// Dynamic logo + tagline with fallback
	const [logoUrl, setLogoUrl] = useState<string | null>(process.env.NEXT_PUBLIC_HEADER_LOGO || null);
	const [tagline, setTagline] = useState<string | null>(process.env.NEXT_PUBLIC_HEADER_TAGLINE || null);
	
	useEffect(() => {
		// Load header data after initial render to avoid blocking
		// Use a small delay to not block critical rendering
		const timer = setTimeout(async () => {
			try {
				const { apiFetchJson } = await import('@/lib/api');
				const { safeLogoUrl } = await import('@/lib/api-fallbacks');
				
				const json = await apiFetchJson<{
					logo?: string;
					tagline?: string;
					siteName?: string;
				}>('/api/cms/header', {
					timeout: 5000,
					retries: 2,
					fallback: {
						logo: process.env.NEXT_PUBLIC_HEADER_LOGO || null,
						tagline: process.env.NEXT_PUBLIC_HEADER_TAGLINE || null,
					},
					enableLogging: true,
				});
				
				if (json.logo) {
					setLogoUrl(safeLogoUrl(json.logo));
				}
				if (json.tagline) {
					setTagline(json.tagline);
				}
			} catch (error) {
				// Error already logged by apiFetch, use fallback
				const { safeLogoUrl } = await import('@/lib/api-fallbacks');
				setLogoUrl(safeLogoUrl(process.env.NEXT_PUBLIC_HEADER_LOGO || null));
			}
		}, 100); // Small delay to not block initial render
		
		return () => clearTimeout(timer);
	}, []);


	return (
		<header className="bg-white" role="banner" suppressHydrationWarning>
			{/* Top tagline bar */}
			
			{/* Secondary tagline bar above searchbar */}
			<div className="head-section bg-teal-600 text-white py-2 px-4" role="region" aria-label="Tagline bar" suppressHydrationWarning>
				<div className="mx-auto w-full sm:w-[85vw] flex items-center justify-between text-sm">
					<div className="flex items-center tagline-section">
					{tagline ? (
						<div className="bg-teal-600 text-center text-sm text-white py-1 px-2" role="heading" aria-level={2} aria-live="polite" suppressHydrationWarning>{tagline}</div>
					) : null}
					</div>
					<div className="hidden lg:flex items-center gap-4 nav-section" role="navigation" aria-label="Secondary navigation">
						<PrefetchLink href="/ndis" critical className="hover:underline">NDIS</PrefetchLink>
						<span aria-hidden="true">|</span>
						<PrefetchLink href="/health-professional" critical className="hover:underline">Health Professional</PrefetchLink>
						<span aria-hidden="true">|</span>
						<PrefetchLink href="/nursing" critical className="hover:underline">Nursing</PrefetchLink>
						<span aria-hidden="true">|</span>
						<PrefetchLink href="/catalogue" critical className="hover:underline">Catalogue</PrefetchLink>
					</div>
				</div>
			</div>
				<nav className="mx-auto w-full sm:w-[85vw] grid grid-cols-2 items-center gap-3 border-y border-gray-200 p-4 sm:px-6 lg:grid-cols-12 lg:px-8 navbar-section" aria-label="Primary Navigation" suppressHydrationWarning>
                <div className="flex items-center gap-3 lg:col-span-2" suppressHydrationWarning>
					<PrefetchLink href="/" critical className="-m-1.5 p-1.5 flex items-center gap-2" role="link" aria-label="Home">
						<span className="sr-only">Joya Medical Supplies</span>
						{logoUrl && logoUrl.trim() !== '' ? (
							<div className="relative w-40 h-16 overflow-hidden rounded" role="img" aria-label="Logo" suppressHydrationWarning>
								<Image 
									src={logoUrl} 
									alt={"Logo"} 
									fill 
									sizes="32px" 
									className="object-contain"
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
							<div className="h-8 w-8 rounded bg-blue-600 text-white grid place-items-center font-bold" suppressHydrationWarning>Joya</div>
						)} 
						
					</PrefetchLink>
				</div>
                <div className="flex lg:hidden justify-end" suppressHydrationWarning>
					<button 
						onClick={() => setOpen(!open)} 
						className="inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2" 
						aria-label={open ? "Close menu" : "Open menu"}
						aria-expanded={open}
						aria-controls="mobile-menu"
					>
						<svg className="h-6 w-6 text-[#333333] transition-transform duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							{open ? (
								<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
							) : (
								<path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
							)}
						</svg>
					</button>
				</div>
                {/* Center: Search + Hotline */}
                <div className="hidden lg:col-span-7 lg:flex lg:items-center lg:gap-6" suppressHydrationWarning>
					<SearchBar className="w-full max-w-xl" />
					
                </div>
                {/* Right: Icons */}
					<div className="hidden lg:col-span-3 lg:flex lg:items-center lg:justify-end lg:gap-3 hotline-section" suppressHydrationWarning>
					
					
					<div className="hidden items-center gap-2 md:flex phone" suppressHydrationWarning>
						<svg viewBox="0 0 24 24" className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<path d="M3 5a2 2 0 0 1 2-2h3.28a1 1 0 0 1 .948.684l1.498 4.493a1 1 0 0 1-.502 1.21l-2.257 1.13a11.042 11.042 0 0 0 5.516 5.516l1.13-2.257a1 1 0 0 1 1.21-.502l4.493 1.498a1 1 0 0 1 .684.949V19a2 2 0 0 1-2 2h-1C9.716 21 3 14.284 3 6V5z" />
						</svg>
						<a href="tel:+1234567890" className="text-sm text-[#333333] flex flex-col">
							<span className="font-medium">Need Help ?</span>
							<span>07 2146 3568</span>
						</a>
					</div>
						{/* Wishlist */}
						<PrefetchLink 
							href="/dashboard/wishlist" 
							aria-label="Wishlist" 
							className="relative rounded p-2 text-gray-700 hover:bg-gray-100 wishlist-button" role="link"
						>
							<svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
							</svg>
							{isMounted && wishlistItems.length > 0 && (
								<span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
									{wishlistItems.length > 99 ? '99+' : wishlistItems.length}
								</span>
							)}
						</PrefetchLink>
						
						{/* Cart */}
						<button 
							onClick={() => {
								// Only open cart if there are items
								if (items.length > 0) {
									openCart();
								} else {
									// Show toast notification if cart is empty
									info("Please choose product to add to cart");
								}
							}} 
							aria-label="Open cart" 
							className="relative rounded p-2 text-gray-700 hover:bg-gray-100 mini-cart-button"
							suppressHydrationWarning
						>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
								<circle cx="9" cy="21" r="1" />
								<circle cx="20" cy="21" r="1" />
								<path d="M1 1h4l2.68 12.39a2 2 0 0 0 2 1.61h7.72a2 2 0 0 0 2-1.61L23 6H6" />
							</svg>
							{cartCount > 0 && (
								<span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white" suppressHydrationWarning>
									{cartCount > 99 ? '99+' : cartCount}
								</span>
							)}
						</button>
				{/* Login/User Menu */}
				{loading ? (
					// Loading skeleton while checking auth state
					<div className="flex items-center space-x-2 rounded p-2" suppressHydrationWarning>
						<div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
					</div>
				) : user ? (
					<div 
						ref={userMenuRef}
						className="relative"
						onMouseEnter={() => setUserMenuOpen(true)}
						onMouseLeave={() => setUserMenuOpen(false)}
						onKeyDown={handleUserMenuKeyDown}
					>
						<button
							ref={userMenuButtonRef}
							onClick={() => setUserMenuOpen(!userMenuOpen)}
							className="flex items-center space-x-2 rounded p-2 text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
							aria-label="User menu"
							aria-expanded={userMenuOpen}
							aria-haspopup="true"
						>
							<div className="h-8 w-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-semibold text-sm">
								{user.name?.charAt(0).toUpperCase() || 'U'}
							</div>
						</button>
						{userMenuOpen && (
							<div 
								className="absolute right-0 top-full w-48 z-20"
								onMouseEnter={() => setUserMenuOpen(true)}
								role="menu"
								aria-orientation="vertical"
								aria-labelledby="user-menu-button"
							>
								{/* Invisible bridge to prevent gap */}
								<div className="h-1 -mb-1"></div>
								<div className="bg-white rounded-md shadow-lg py-1 border border-gray-200">
									<PrefetchLink
										href="/dashboard"
										critical
										className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
										role="menuitem"
									>
										Dashboard
									</PrefetchLink>
									<PrefetchLink
										href="/dashboard/orders"
										critical
										className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
										role="menuitem"
									>
										Orders
									</PrefetchLink>
									<button
										onClick={async () => {
											try {
												await fetch('/api/auth/logout', { method: 'POST' });
											} catch (error) {
												console.error('Logout error:', error);
											} finally {
												await logout();
												setUserMenuOpen(false);
												router.push('/login');
											}
										}}
										className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 focus:bg-red-50 focus:outline-none"
										role="menuitem"
									>
										Log out
									</button>
								</div>
							</div>
						)}
					</div>
				) : (
					<PrefetchLink
						href="/login"
						critical
						className="flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
							<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
							<circle cx="12" cy="7" r="4" />
						</svg>
						<span>Login</span>
					</PrefetchLink>
				)}
			</div>
			</nav>
            {/* Mobile Menu - Animated */}
			<div 
				id="mobile-menu"
				className={`lg:hidden border-t overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
				aria-hidden={!open}
			>
                <div className="space-y-4 p-4">
						<SearchBar />
                        <a href="tel:+1234567890" className="block text-sm text-gray-700">Hotline: +1 234 567 890</a>
                        <div className="flex flex-wrap gap-2 text-sm text-gray-700 border-b pb-3">
                            <PrefetchLink href="/ndis" critical className="hover:underline">NDIS</PrefetchLink>
                            <span>|</span>
                            <PrefetchLink href="/health-professional" critical className="hover:underline">Health Professional</PrefetchLink>
                            <span>|</span>
                            <PrefetchLink href="/nursing" critical className="hover:underline">Nursing</PrefetchLink>
                        </div>
                        <div className="space-y-1">
                            <PrefetchLink href="/" critical className="block rounded px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50">Home</PrefetchLink>
                            <PrefetchLink href="/shop" critical className="block rounded px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50">Shop</PrefetchLink>
                            <PrefetchLink href="/catalogue" critical className="block rounded px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50">Catalogue</PrefetchLink>
                            {loading ? (
                                <div className="px-3 py-2">
                                    <div className="h-5 w-24 bg-gray-200 rounded animate-pulse"></div>
                                </div>
                            ) : user ? (
                                <>
                                    <PrefetchLink href="/dashboard" critical className="block rounded px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50">Dashboard</PrefetchLink>
                                    <button
                                        onClick={async () => {
                                            try {
                                                await fetch('/api/auth/logout', { method: 'POST' });
                                            } catch (error) {
                                                console.error('Logout error:', error);
                                            } finally {
                                                await logout();
                                                router.push('/login');
                                            }
                                        }}
                                        className="block w-full text-left rounded px-3 py-2 text-base font-medium text-red-600 hover:bg-red-50"
                                    >
                                        Sign Out
                                    </button>
                                </>
                            ) : (
                                <PrefetchLink href="/login" critical className="block rounded px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50">Login</PrefetchLink>
                            )}
                        </div>
                </div>
            </div>
		</header>
	);
}
