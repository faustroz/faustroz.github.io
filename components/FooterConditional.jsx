'use client';
import { usePathname } from 'next/navigation';

export default function FooterConditional() {
  const pathname = usePathname();

  // Hide footer on portfolio tracker and any sub-routes
  if (pathname?.startsWith('/portfolio-tracker')) return null;

  return (
    <footer className="bg-black text-white py-8 px-4 border-t border-neutral-900">
      <div className="max-w-6xl mx-auto text-center">
        <p className="text-neutral-500 text-sm">
          © {new Date().getFullYear()} Ferdy Diatmika. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
