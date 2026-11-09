import { Link } from '@inertiajs/react';
import { useState } from 'react';

const links = [
    { label: 'Beranda', href: '/', active: true },
    { label: 'Resep', href: '#resep', active: false },
    { label: 'Stok Obat', href: '#stok-obat', active: false },
];

export default function Navbar() {
    const [open, setOpen] = useState(false);

    return (
        <header className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-8 md:pt-6">
            <nav className="flex items-center justify-between rounded-2xl border border-brand-100 bg-white/80 px-4 py-2.5 shadow-sm backdrop-blur-md md:rounded-full md:px-6">
                <Link
                    href="/"
                    aria-label="SIMPRESO Beranda"
                    className="group flex items-center gap-3 focus:outline-none"
                >
                    <div className="relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-brand-200 bg-brand-50 p-1 transition-transform duration-200 group-hover:scale-105">
                        <svg
                            className="h-8 w-8 -rotate-45"
                            fill="none"
                            viewBox="0 0 48 48"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M14 10C8.47715 10 4 14.4772 4 20V28C4 33.5228 8.47715 38 14 38H24V10H14Z"
                                fill="#FFFFFF"
                                stroke="#1D72FE"
                                strokeLinejoin="round"
                                strokeWidth="3.5"
                            />
                            <path
                                d="M24 10H34C39.5228 10 44 14.4772 44 20V28C44 33.5228 39.5228 38 34 38H24V10Z"
                                fill="#1D72FE"
                                stroke="#1D72FE"
                                strokeLinejoin="round"
                                strokeWidth="3.5"
                            />
                            <path
                                d="M9 16C9 14.3431 10.3431 13 12 13H18"
                                stroke="#CBD5E1"
                                strokeLinecap="round"
                                strokeWidth="2.5"
                            />
                        </svg>
                    </div>
                    <div>
                        <div className="flex items-baseline">
                            <span className="text-xl font-extrabold tracking-tight text-[#16417C] md:text-2xl">
                                SIMPRESO
                            </span>
                        </div>
                        <p className="text-[11px] font-semibold tracking-wide text-brand-600">
                            Sehat Lebih Mudah
                        </p>
                    </div>
                </Link>

                <div className="hidden items-center gap-1.5 sm:flex md:gap-2">
                    {links.map((link) =>
                        link.active ? (
                            <Link
                                key={link.label}
                                href={link.href}
                                className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-brand-600"
                            >
                                <HomeIcon className="h-4 w-4 fill-current" />
                                <span>{link.label}</span>
                            </Link>
                        ) : (
                            <a
                                key={link.label}
                                href={link.href}
                                className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:bg-brand-50 hover:text-brand-600"
                            >
                                {link.label === 'Resep' ? (
                                    <PrescriptionIcon className="h-4 w-4 text-slate-500" />
                                ) : (
                                    <StockIcon className="h-4 w-4 text-slate-500" />
                                )}
                                <span>{link.label}</span>
                            </a>
                        ),
                    )}

                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:bg-brand-50 hover:text-brand-600"
                    >
                        <UserIcon className="h-4 w-4 text-slate-500" />
                        <span>Login</span>
                    </Link>
                </div>

                <div className="flex items-center sm:hidden">
                    <button
                        type="button"
                        aria-label="Buka Menu Navigasi"
                        aria-expanded={open}
                        onClick={() => setOpen((value) => !value)}
                        className="rounded-xl p-2 text-slate-600 hover:bg-brand-50"
                    >
                        <svg
                            className="h-6 w-6"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                        >
                            <path
                                d="M4 6h16M4 12h16M4 18h16"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </button>
                </div>
            </nav>

            {open && (
                <div className="mt-2 rounded-2xl border border-brand-100 bg-white/95 p-3 shadow-soft-card backdrop-blur-md sm:hidden">
                    <div className="flex flex-col gap-1">
                        {links.map((link) => (
                            <a
                                key={link.label}
                                href={link.href}
                                onClick={() => setOpen(false)}
                                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-brand-50 hover:text-brand-600"
                            >
                                {link.label}
                            </a>
                        ))}
                        <Link
                            href="/login"
                            onClick={() => setOpen(false)}
                            className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-600"
                        >
                            Login
                        </Link>
                    </div>
                </div>
            )}
        </header>
    );
}

function HomeIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 20 20">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
        </svg>
    );
}

function PrescriptionIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
        >
            <path
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function StockIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
        >
            <path
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function UserIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
        >
            <path
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
