import { Link } from '@inertiajs/react';

export default function Footer() {
    return (
        <footer className="mt-12 border-t border-brand-100 bg-white/70 px-4 py-8 text-center text-sm text-slate-500 backdrop-blur-md sm:px-8">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
                <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold text-[#16417C]">SIMPRESO</span>
                    <span className="text-slate-400">|</span>
                    <span className="text-xs font-medium text-slate-500">
                        Sistem Informasi Resep &amp; Stok Obat
                    </span>
                </div>

                <div className="flex items-center gap-6 text-xs font-semibold text-slate-600">
                    <Link href="/" className="transition-colors hover:text-brand-600">
                        Beranda
                    </Link>
                    <a href="#resep" className="transition-colors hover:text-brand-600">
                        Resep Digital
                    </a>
                    <a href="#stok-obat" className="transition-colors hover:text-brand-600">
                        Stok Obat
                    </a>
                    <Link href="/login" className="transition-colors hover:text-brand-600">
                        Login
                    </Link>
                </div>

                <div className="text-xs text-slate-400">
                    © 2025 SIMPRESO. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
