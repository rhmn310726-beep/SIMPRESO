import { Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import type { SharedProps } from '@/types';

interface NavItem {
    label: string;
    href: string;
    icon: ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/admin', icon: GridIcon },
    { label: 'Data Obat', href: '/admin/obat', icon: PillIcon },
    { label: 'Stok', href: '/admin/stok', icon: BoxIcon },
    { label: 'Data Pasien', href: '/admin/pasien', icon: PatientIcon },
    { label: 'Manajemen Pengguna', href: '/admin/akun', icon: UsersIcon },
    { label: 'Aturan Alergi & Interaksi', href: '/admin/aturan', icon: WarningIcon },
    { label: 'Laporan', href: '/admin/laporan', icon: ChartIcon },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
    const { auth } = usePage<SharedProps>().props;
    const { url } = usePage();
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        setMenuOpen(false);
    }, [url]);

    useEffect(() => {
        if (!menuOpen) {
            return;
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setMenuOpen(false);
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [menuOpen]);

    const isActive = (href: string): boolean => {
        if (href === '/admin') {
            return url === '/admin';
        }

        return url.startsWith(href);
    };

    const user = auth.user;

    return (
        <div className="min-h-screen bg-pharmacy-bg-light">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/70 bg-white px-4 lg:hidden">
                <button
                    type="button"
                    onClick={() => setMenuOpen(true)}
                    aria-label="Buka menu navigasi"
                    className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100"
                >
                    <MenuIcon className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50">
                        <BrandMark className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm leading-tight font-extrabold tracking-tight text-brand-600">
                            SIMPRESO
                        </p>
                        <p className="text-[10px] font-semibold text-slate-500">Admin Farmasi</p>
                    </div>
                </div>
                <div className="w-9" />
            </header>

            {menuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
                    onClick={() => setMenuOpen(false)}
                />
            )}

            <aside
                className={`fixed top-0 left-0 z-50 flex h-full w-[260px] flex-col justify-between border-r border-slate-200/70 bg-white shadow-xl transition-transform duration-200 lg:translate-x-0 lg:shadow-none ${
                    menuOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex min-h-0 flex-1 flex-col">
                    <div className="flex h-16 items-center gap-3 border-b border-slate-200/60 px-4">
                        <Link
                            href="/admin"
                            className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50"
                        >
                            <BrandMark className="h-7 w-7" />
                        </Link>
                        <div className="flex flex-col">
                            <span className="text-base leading-tight font-extrabold tracking-tight text-brand-600">
                                SIMPRESO
                            </span>
                            <span className="text-[11px] font-semibold text-emerald-600">
                                Admin Farmasi
                            </span>
                        </div>
                    </div>

                    <div className="px-4 pt-6 pb-1">
                        <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                            Menu Utama
                        </span>
                    </div>

                    <nav className="flex flex-col gap-1 overflow-y-auto px-2 pb-4">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                                        active
                                            ? 'bg-brand-500 text-white shadow-sm'
                                            : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700'
                                    }`}
                                >
                                    <Icon
                                        className={`h-5 w-5 ${active ? 'text-white' : 'text-slate-400'}`}
                                    />
                                    <span className="truncate">{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="border-t border-slate-200/60 p-3">
                    {user && (
                        <div className="mb-3 flex items-center gap-3 px-1">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600">
                                {initials(user.name)}
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-800">
                                    {user.name}
                                </p>
                                <p className="text-xs text-slate-500">Administrator</p>
                            </div>
                        </div>
                    )}

                    <Link
                        href="/logout"
                        method="post"
                        as="button"
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                    >
                        <LogoutIcon className="h-5 w-5" />
                        <span>Keluar Sistem</span>
                    </Link>
                </div>
            </aside>

            <div className="lg:pl-[260px]">
                <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                    {children}
                </main>
            </div>
        </div>
    );
}

function initials(name: string): string {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');
}

function BrandMark({ className }: { className?: string }) {
    return (
        <svg
            className={`-rotate-45 ${className ?? ''}`}
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
        </svg>
    );
}

function MenuIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function GridIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
            <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
            <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
            <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
        </svg>
    );
}

function PillIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-45 12 12)" />
            <path d="M8.5 8.5l7 7" strokeLinecap="round" />
        </svg>
    );
}

function BoxIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M21 8l-9-5-9 5m18 0v8l-9 5-9-5V8m18 0l-9 5m0 0L3 8m9 5v8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function PatientIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
            <path
                d="M5.5 21v-1a6.5 6.5 0 0113 0v1M9 12.5l3 3 3-3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function UsersIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm13 10v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function WarningIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M12 9v4m0 4h.01M10.3 4.3L2.7 17.6A1.5 1.5 0 004 20h16a1.5 1.5 0 001.3-2.4L13.7 4.3a2 2 0 00-3.4 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function ChartIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function LogoutIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4m-5-4l4-4-4-4m4 4H3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
