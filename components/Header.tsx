"use client";

import PrefetchLink from "@/components/PrefetchLink";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { useWishlist } from "@/contexts/WishlistContext";
import { useToast } from "@/components/ToastProvider";
import { useSession, signOut } from "next-auth/react";
import { apiFetchJson } from "@/lib/api";
import { safeLogoUrl } from "@/lib/api-fallbacks";
import HeaderUser from "@/components/HeaderUser";
import SearchBox from "@/components/search/SearchBox";
import { InstantSearch } from "react-instantsearch";
import ProductHits from "@/components/search/ProductHits";
import { searchClient } from "@/lib/algolia";
import SearchBar from "@/components/SearchBar";

export default function Header() {
	const [open, setOpen] = useState(false);
	const [isMounted, setIsMounted] = useState(false);
	const [userMenuOpen, setUserMenuOpen] = useState(false);

	const userMenuRef = useRef<HTMLDivElement>(null);
	const userMenuButtonRef = useRef<HTMLButtonElement>(null);

	const { open: openCart, items } = useCart();
	const { items: wishlistItems } = useWishlist();
	const { info } = useToast();

	const { data: session, status } = useSession();
	const user = session?.user || null;
	const loading = status === "loading";

	const [logoUrl, setLogoUrl] = useState<string | null>(
		process.env.NEXT_PUBLIC_HEADER_LOGO || null
	);
	const [tagline, setTagline] = useState<string | null>(
		process.env.NEXT_PUBLIC_HEADER_TAGLINE || null
	);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	const cartCount = items.reduce((sum, item) => sum + item.qty, 0);

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
		  if (
			userMenuRef.current &&
			!userMenuRef.current.contains(e.target as Node)
		  ) {
			setUserMenuOpen(false);
		  }
		}
	  
		document.addEventListener("mousedown", handleClickOutside);
	  
		return () => {
		  document.removeEventListener("mousedown", handleClickOutside);
		};
	  }, []);

	useEffect(() => {
		async function loadHeaderData() {
		  try {
			const json = await apiFetchJson<{
			  logo?: string;
			  tagline?: string;
			}>("/api/cms/header");
	  
			if (json.logo) setLogoUrl(safeLogoUrl(json.logo));
			if (json.tagline) setTagline(json.tagline);
		  } catch {
			setLogoUrl(safeLogoUrl(null));
		  }
		}
	  
		loadHeaderData();
	  }, []);

	return (
		<header className="bg-white">

			{/* Top Bar */}
			<div className="bg-teal-600 text-white py-2 px-4">
				<div className="container mx-auto flex items-center justify-between text-xs">

					{tagline && (
						<div className="text-white">{tagline}</div>
					)}

				</div>
			</div>

			<nav className="container mx-auto grid grid-cols-2 lg:grid-cols-12 items-center py-4 gap-3">

				{/* Logo */}
				<div className="lg:col-span-2 flex items-center">
					<PrefetchLink href="/" className="flex items-center gap-2">

						{logoUrl ? (
							<div className="relative w-40 h-16">
								<Image
									src={logoUrl || "/logo-placeholder.png"}
									alt="Logo"
									fill
									className="object-contain"
									priority
								/>
							</div>
						) : (
							<div className="h-8 w-8 rounded bg-blue-600 text-white grid place-items-center font-bold">
								Joya
							</div>
						)}

					</PrefetchLink>
				</div>
				
				{/* Mobile Menu Button */}
				<div className="flex lg:hidden justify-end">
					<button
						onClick={() => setOpen(!open)}
						className="p-2 rounded hover:bg-gray-100"
					>
						☰
					</button>
				</div>

				{/* Center Search */}
				<div className="hidden lg:flex lg:col-span-7 justify-center">
					
				<SearchBar />
					
				</div>

				{/* Right Icons */}
				<div className="hidden lg:flex lg:col-span-3 items-center justify-end gap-3">

					<div className="hidden md:flex items-center gap-2">
						<svg
							viewBox="0 0 24 24"
							className="h-5 w-5 text-gray-500"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						>
							<path d="M3 5a2 2 0 0 1 2-2h3.28l1.5 4.5-2.3 1.1a11 11 0 0 0 5.5 5.5l1.1-2.3 4.5 1.5V19a2 2 0 0 1-2 2h-1C9.7 21 3 14.3 3 6V5z"/>
						</svg>
						<a href="tel:+1234567890" className="text-sm text-gray-700 flex flex-col">
							<span>07 2146 3568</span>
						</a>
					</div>

					{/* Wishlist */}
					<PrefetchLink
						href="/dashboard/wishlist"
						className="relative rounded p-2 text-gray-700 hover:bg-gray-100 wishlist-button" role="link"
					>
						<svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
							</svg>

						{isMounted && wishlistItems.length > 0 && (
							<span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
								{wishlistItems.length > 99 ? "99+" : wishlistItems.length}
							</span>
						)}
					</PrefetchLink>

					{/* Cart */}
					<button
						onClick={() => {
							if (items.length > 0) openCart();
							else info("Please choose product to add to cart");
						}}
						className="relative rounded p-2 text-gray-700 hover:bg-gray-100 mini-cart-button"
						aria-label="Open cart"

					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
								<circle cx="9" cy="21" r="1" />
								<circle cx="20" cy="21" r="1" />
								<path d="M1 1h4l2.68 12.39a2 2 0 0 0 2 1.61h7.72a2 2 0 0 0 2-1.61L23 6H6" />
							</svg>

						{cartCount > 0 && (
							<span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
								{cartCount > 99 ? "99+" : cartCount}
							</span>
						)}
					</button>

					{/* User Menu */}
					{loading ? (
						<div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
					) : user ? (
						<div
							ref={userMenuRef}
							className="relative"
						>
							<button
								ref={userMenuButtonRef}
								onClick={() => setUserMenuOpen(!userMenuOpen)}
								className="h-8 w-8 rounded-full bg-teal-600 text-white font-semibold"
							>
								{user.name?.charAt(0).toUpperCase() || "U"}
							</button>

							{userMenuOpen && (
								<div className="absolute right-0 mt-2 w-48 bg-white border shadow rounded">

									<PrefetchLink
										href="/dashboard"
										className="block px-4 py-2 hover:bg-gray-100"
									>
										Dashboard
									</PrefetchLink>

									<PrefetchLink
										href="/dashboard/orders"
										className="block px-4 py-2 hover:bg-gray-100"
									>
										Orders
									</PrefetchLink>

									<button
										onClick={async () => {
											try {
												await signOut({ callbackUrl: "/login" });
											} finally {
												setUserMenuOpen(false);
											}
										}}
										className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50"
									>
										Log out
									</button>

								</div>
							)}
						</div>
					) : (
						<HeaderUser />
					)}

				</div>

			</nav>

			{/* Mobile Menu */}
			{open && (
				<div className="lg:hidden border-t p-4 space-y-3">

					<a href="tel:+1234567890" className="block text-sm text-gray-700">
						Hotline: +1 234 567 890
					</a>

					<PrefetchLink href="/">Home</PrefetchLink>
					<PrefetchLink href="/shop">Shop</PrefetchLink>
					<PrefetchLink href="/catalogue">Catalogue</PrefetchLink>

					{loading ? (
						<div className="h-5 w-24 bg-gray-200 rounded animate-pulse"></div>
					) : user ? (
						<>
							<PrefetchLink href="/dashboard">Dashboard</PrefetchLink>

							<button
								onClick={async () => {
									await signOut({ callbackUrl: "/login" });
								}}
								className="text-red-600"
							>
								Sign Out
							</button>
						</>
					) : (
						<PrefetchLink href="/login">Login</PrefetchLink>
					)}

				</div>
			)}

		</header>
	);
}