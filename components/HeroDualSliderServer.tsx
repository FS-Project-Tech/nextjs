import { cache } from "react";
import HeroDualSlider from "@/components/HeroDualSlider";
import { getWpBaseUrl } from "@/lib/wp-utils";

async function fetchHeroBanners() {
  const baseUrl = getWpBaseUrl();

  try {
    const res = await fetch(`${baseUrl}/wp-json/acf/v3/options/options`, {
      next: { revalidate: 300 },
    });

    if (!res.ok) throw new Error("ACF fetch failed");

    const data = await res.json();
    const acf = data?.acf || {};

    const left =
      acf.left_side_banner?.map((item: any) => ({
        src: item?.image?.url || "",
        alt: item?.image?.alt || "",
        link: item?.link || "",
      })) || [];

    return { left };
  } catch (e) {
    console.error("Hero banner fetch failed", e);
    return { left: [] };
  }
}

const getHeroBanners = cache(fetchHeroBanners);

export default async function HeroDualSliderServer() {
  const { left } = await getHeroBanners();

  return <HeroDualSlider leftImages={left}/>;
}