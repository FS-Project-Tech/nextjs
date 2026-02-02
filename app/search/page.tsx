import Link from "next/link";

export default function SearchPage() {
  return (
    <div className="container mx-auto p-10 text-center">
      <p className="text-gray-600 mb-4">Search is temporarily disabled.</p>
      <Link href="/" className="text-teal-600 hover:underline">
        Return to home
      </Link>
    </div>
  );
}
