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
    { label: 'Dashboard', icon: 'dashboard', href: '/farmasi' },
    { label: 'Antrean Resep', icon: 'queue', href: '/farmasi/antrean-resep' },
    { label: 'Stok Obat', icon: 'inventory_2' },
    { label: 'Laporan', icon: 'bar_chart' },
];

export default function FarmasiLayout({ children }: { children: ReactNode }) {
    const { auth } = usePage<SharedProps>().props;
    const { url } = usePage();
    const [menuOpen, setMenuOpen] = useState(false);
    const user = auth.user;

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
        : url === '/farmasi' || url.startsWith('/farmasi/dashboard')
          ? 'Dashboard'
          : null;

    return (
        <div className="min-h-screen bg-surface-container-low font-body-md text-on-surface antialiased">
            {menuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-inverse-surface/50 backdrop-blur-sm lg:hidden"
                    onClick={() => setMenuOpen(false)}
                />
            )}

            <aside
                className={`fixed top-0 left-0 z-50 flex h-full w-60 flex-col justify-between bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-transform duration-200 print:hidden lg:translate-x-0 ${
                    menuOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex flex-col">
                    <div className="flex h-16 items-center gap-space-sm px-space-lg">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-container text-on-primary shadow-sm">
                            <span className="material-symbols-outlined text-[20px]">local_pharmacy</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-headline-sm text-headline-sm tracking-tight text-primary">
                                e-Resep
                            </span>
                            <span className="-mt-0.5 font-label-sm text-label-sm font-semibold text-secondary">
                                Portal Farmasi
                            </span>
                        </div>
                    </div>

                    <div className="px-space-md pt-space-lg pb-space-xs">
                        <p className="px-space-sm font-label-sm text-label-sm font-semibold tracking-wider text-outline uppercase">
                            Menu Farmasi
                        </p>
                    </div>

                    <nav className="flex flex-col gap-1 px-space-md">
                        {navItems.map((item) => {
                            const active = item.label === activeKey;

                            if (item.href === undefined) {
                                return (
                                    <span
                                        key={item.label}
                                        aria-disabled="true"
                                        title="Segera hadir"
                                        className="flex cursor-not-allowed items-center gap-space-sm rounded-lg px-space-sm py-2.5 text-on-surface-variant/50"
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
                                    className={`flex items-center gap-space-sm rounded-lg px-space-sm py-2.5 transition-colors ${
                                        active
                                            ? 'bg-primary-container font-semibold text-on-primary'
                                            : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
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
                        className="flex w-full items-center gap-space-sm rounded-lg px-space-sm py-2.5 text-on-surface-variant transition-colors hover:bg-error-container hover:text-on-error-container"
                    >
                        <span className="material-symbols-outlined text-[20px]">logout</span>
                        <span className="font-label-md text-label-md font-medium">Keluar Sistem</span>
                    </Link>
                </div>
            </aside>

            <div className="lg:pl-60">
                <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-space-sm bg-surface-container-lowest/95 px-4 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl print:hidden sm:px-space-lg">
                    <div className="flex min-w-0 items-center gap-space-sm">
                        <button
                            type="button"
                            onClick={() => setMenuOpen(true)}
                            aria-label="Buka menu navigasi"
                            className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface lg:hidden"
                        >
                            <span className="material-symbols-outlined text-[20px]">menu</span>
                        </button>
                        <span className="material-symbols-outlined hidden text-[20px] text-outline sm:inline">
                            medication
                        </span>
                        <div className="hidden min-w-0 items-center gap-1.5 font-label-md text-label-md sm:flex">
                            <span className="truncate text-outline">Sistem Resep Elektronik</span>
                            <span className="text-outline-variant">/</span>
                            <span className="truncate font-semibold text-on-surface">Instalasi Farmasi</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-space-md">
                        <button
                            type="button"
                            aria-label="Notifikasi"
                            className="relative rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                        >
                            <span className="material-symbols-outlined text-[20px]">notifications</span>
                            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-error ring-2 ring-surface-container-lowest" />
                        </button>

                        <div className="h-6 w-px bg-outline-variant" />

                        {user && (
                            <div className="flex items-center gap-space-sm">
                                <div className="hidden flex-col items-end sm:flex">
                                    <span className="font-label-md text-label-md leading-tight font-semibold text-on-surface">
                                        {user.name}
                                    </span>
                                    <span className="inline-flex items-center rounded-full bg-primary-fixed px-2 py-0.5 font-label-sm text-label-sm font-semibold text-on-primary-fixed-variant">
                                        Petugas Farmasi
                                    </span>
                                </div>
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                                    <span className="material-symbols-outlined text-[18px] text-on-primary">
                                        local_pharmacy
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                <main className="min-h-[calc(100vh-4rem)] bg-surface-container-low px-4 py-4 sm:px-space-lg sm:py-space-md">
                    {children}
                </main>
            </div>
        </div>
    );
}
