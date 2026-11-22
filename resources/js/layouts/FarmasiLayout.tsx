import { Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { SharedProps } from '@/types';

interface NavItem {
    label: string;
    icon: string;
    href?: string;
}

const navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'grid_view', href: '/farmasi' },
    { label: 'Antrean Resep', icon: 'receipt_long', href: '/farmasi/antrean-resep' },
    { label: 'Stok Obat', icon: 'medication', href: '/farmasi/stok-obat' },
    { label: 'Laporan', icon: 'query_stats', href: '/farmasi/laporan' },
];

export default function FarmasiLayout({ children }: { children: ReactNode }) {
    const { auth, flash } = usePage<SharedProps>().props;
    const { url } = usePage();
    const [menuOpen, setMenuOpen] = useState(false);
    const [showFlash, setShowFlash] = useState(true);
    const user = auth.user;

    useEffect(() => {
        setShowFlash(true);
    }, [flash?.success, flash?.error]);

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

    const activeKey = url.startsWith('/farmasi/antrean-resep')
        ? 'Antrean Resep'
        : url.startsWith('/farmasi/stok-obat')
          ? 'Stok Obat'
          : url.startsWith('/farmasi/laporan')
            ? 'Laporan'
            : url === '/farmasi' || url.startsWith('/farmasi/dashboard')
              ? 'Dashboard'
              : null;

    return (
        <div className="min-h-screen bg-surface font-body-md text-body-md text-on-surface antialiased">
            {menuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-inverse-surface/50 backdrop-blur-sm lg:hidden"
                    onClick={() => setMenuOpen(false)}
                />
            )}

            <aside
                className={`fixed top-0 left-0 z-50 flex h-full w-64 flex-col justify-between bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-transform duration-200 print:hidden lg:translate-x-0 ${
                    menuOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex flex-col">
                    <div className="flex h-16 items-center gap-space-sm px-space-lg">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-high text-primary-container">
                            <span className="material-symbols-outlined text-[24px]">local_pharmacy</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-headline-sm text-headline-sm leading-tight text-on-surface">
                                e-Resep
                            </span>
                            <span className="font-label-sm text-label-sm leading-none text-on-surface-variant">
                                Portal Farmasi
                            </span>
                        </div>
                    </div>

                    <div className="px-space-md pt-space-lg pb-space-xs">
                        <p className="px-space-sm font-label-sm text-label-sm tracking-wider text-outline uppercase">
                            Menu Farmasi
                        </p>
                    </div>

                    <nav className="flex flex-col gap-space-xs px-space-md">
                        {navItems.map((item) => {
                            const active = item.label === activeKey;

                            if (item.href === undefined) {
                                return (
                                    <span
                                        key={item.label}
                                        aria-disabled="true"
                                        title="Segera hadir"
                                        className="flex cursor-not-allowed items-center gap-space-sm rounded-lg px-space-md py-space-sm text-on-surface-variant/40"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">
                                            {item.icon}
                                        </span>
                                        <span className="font-label-md text-label-md">{item.label}</span>
                                    </span>
                                );
                            }

                            return (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    aria-current={active ? 'page' : undefined}
                                    className={`flex items-center gap-space-sm rounded-lg px-space-md py-space-sm transition-colors ${
                                        active
                                            ? 'bg-primary-container font-semibold text-on-primary'
                                            : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[20px]">
                                        {item.icon}
                                    </span>
                                    <span className="font-label-md text-label-md">{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="p-space-md">
                    <Link
                        href="/logout"
                        method="post"
                        as="button"
                        className="flex w-full items-center gap-space-sm rounded-lg px-space-md py-space-sm text-error transition-colors hover:bg-error-container hover:text-on-error-container"
                    >
                        <span className="material-symbols-outlined text-[20px]">logout</span>
                        <span className="font-label-md text-label-md font-medium">Keluar Sistem</span>
                    </Link>
                </div>
            </aside>

            <div className="lg:pl-64">
                <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-space-sm bg-surface-container-lowest/90 px-4 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl print:hidden sm:px-gutter">
                    <div className="flex min-w-0 items-center gap-space-sm">
                        <button
                            type="button"
                            onClick={() => setMenuOpen(true)}
                            aria-label="Buka menu navigasi"
                            className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface lg:hidden"
                        >
                            <span className="material-symbols-outlined text-[20px]">menu</span>
                        </button>
                        <div className="flex min-w-0 items-center gap-space-sm font-body-sm text-body-sm">
                            <span className="hidden truncate text-on-surface-variant sm:inline">
                                Sistem Resep Elektronik
                            </span>
                            <span className="hidden text-outline-variant sm:inline">/</span>
                            <span className="truncate font-label-md text-label-md font-semibold text-on-surface">
                                Instalasi Farmasi
                            </span>
                        </div>
                    </div>

                    {user && (
                        <div className="flex items-center gap-space-sm">
                            <div className="hidden flex-col sm:flex">
                                <span className="font-label-md text-label-md leading-tight font-semibold text-on-surface">
                                    {user.name}
                                </span>
                                <span className="mt-0.5 self-start rounded bg-secondary-fixed px-1.5 py-0.5 font-label-sm text-label-sm leading-none text-on-secondary-fixed">
                                    Petugas Farmasi
                                </span>
                            </div>
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                                <span className="material-symbols-outlined text-[18px] text-on-primary">
                                    person
                                </span>
                            </div>
                        </div>
                    )}
                </header>

                <main className="min-h-[calc(100vh-4rem)] bg-surface px-4 py-4 sm:px-space-lg sm:py-space-lg">
                    {showFlash && flash?.success && (
                        <div className="mb-4 flex items-start justify-between gap-3 rounded-xl bg-secondary-fixed px-4 py-3 text-on-secondary-fixed shadow-sm">
                            <div className="flex items-start gap-2">
                                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                                <p className="font-body-md text-body-md">{flash.success}</p>
                            </div>
                            <button type="button" onClick={() => setShowFlash(false)} className="rounded p-1 hover:bg-surface-container-lowest/40">
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>
                    )}
                    {showFlash && flash?.error && (
                        <div className="mb-4 flex items-start justify-between gap-3 rounded-xl bg-error-container px-4 py-3 text-on-error-container shadow-sm">
                            <div className="flex items-start gap-2">
                                <span className="material-symbols-outlined text-[20px]">error</span>
                                <p className="font-body-md text-body-md">{flash.error}</p>
                            </div>
                            <button type="button" onClick={() => setShowFlash(false)} className="rounded p-1 hover:bg-surface-container-lowest/40">
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>
                    )}
                    {children}
                </main>
            </div>
        </div>
    );
}
