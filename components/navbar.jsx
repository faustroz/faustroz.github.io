"use client";

import Link from "next/link";
import { ModeToggle } from "@/components/mode-toggle";

export default function Navbar() {
  return (
    <header className="fixed bottom-5 left-1/2 transform -translate-x-1/2 z-50 bg-white dark:bg-gray-900 p-3 rounded-full shadow-lg border border-gray-200 dark:border-gray-800 flex items-center space-x-4 backdrop-blur-md">
      <Link
        href="/"
        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        🏠
      </Link>
      <span className="w-px h-6 bg-gray-300 dark:bg-gray-700"></span>
      <Link
        href="#skills"
        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        🖥️
      </Link>
      <Link
        href="https://github.com"
        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        🐙
      </Link>
      <Link
        href="https://linkedin.com"
        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        🔗
      </Link>
      <Link
        href="https://youtube.com"
        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        ▶️
      </Link>
      <ModeToggle />
    </header>
  );
}
