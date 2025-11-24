import Link from 'next/link';
import { Activity } from 'lucide-react';

export default function Header() {
    return (
        <header className="flex items-center justify-between mb-8">
            <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-indigo-500 hover:text-indigo-400 transition">
                <Activity className="w-8 h-8" />
                AI Coach
            </Link>
            <nav className="flex gap-4">
                {/* Add navigation items here if needed */}
            </nav>
        </header>
    );
}
