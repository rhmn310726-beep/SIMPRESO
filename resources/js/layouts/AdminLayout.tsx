import { Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { SharedProps } from '@/types';

interface NavItem {
    label: string;
    href: string;
    icon: string;
}

const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/admin', icon: 'grid_view' },
    { label: 'Data Obat', href: '/admin/obat', icon: 'medication' },
    { label: 'Stok', href: '/admin/stok', icon: 'inventory_2' },
    { label: 'Data Pasien', href: '/admin/pasien', icon: 'personal_injury' },
    { label: 'Manajemen Pengguna', href: '/admin/akun', icon: 'manage_accounts' },
    { label: 'Aturan Alergi & Interaksi', href: '/admin/aturan', icon: 'warning' },
    { label: 'Laporan', href: '/admin/laporan', icon: 'query_stats' },
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
        <div className="min-h-screen bg-background font-body-md text-on-surface antialiased">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-outline-variant/30 bg-surface-container-lowest px-4 lg:hidden">
                <button
                    type="button"
                    onClick={() => setMenuOpen(true)}
                    aria-label="Buka menu navigasi"
                    className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                >
                    <span className="material-symbols-outlined text-[20px]">menu</span>
                </button>
                <div className="flex items-center gap-space-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container">
                        <span className="material-symbols-outlined text-[24px] text-primary">local_pharmacy</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="font-headline-sm text-headline-sm leading-tight font-bold tracking-tight text-primary">
                            e-Resep
                        </span>
                        <span className="font-label-sm text-label-sm font-semibold text-secondary">Farmasi Admin</span>
                    </div>
                </div>
                <div className="w-10" />
            </header>

            {menuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-inverse-surface/50 backdrop-blur-sm lg:hidden"
                    onClick={() => setMenuOpen(false)}
                />
            )}

            <aside
                className={`fixed top-0 left-0 z-50 flex h-full w-[260px] flex-col justify-between border-r border-outline-variant/30 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-transform duration-200 lg:translate-x-0 ${
                    menuOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex min-h-0 flex-1 flex-col">
                    <div className="flex h-16 flex-shrink-0 items-center gap-space-sm border-b border-outline-variant/20 px-space-md">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container">
                            <span className="material-symbols-outlined text-[24px] text-primary">local_pharmacy</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-headline-sm text-headline-sm leading-tight font-bold tracking-tight text-primary">
                                e-Resep
                            </span>
                            <span className="font-label-sm text-label-sm font-semibold text-secondary">Farmasi Admin</span>
                        </div>
                    </div>

                    <div className="px-space-md pt-space-lg pb-space-xs">
                        <span className="font-label-sm text-label-sm tracking-wider text-outline uppercase">
                            Menu Utama
                        </span>
                    </div>

                    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-space-sm pb-space-md">
                        {navItems.map((item) => {
                            const active = isActive(item.href);

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    aria-current={active ? 'page' : undefined}
                                    className={`flex items-center gap-space-sm rounded-lg px-space-sm py-2.5 font-label-md text-label-md transition-colors ${
                                        active
                                            ? 'bg-primary-container font-semibold text-on-primary shadow-sm'
                                            : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                                    <span className="truncate">{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="border-t border-outline-variant/20 p-space-md">
                    {user && (
                        <div className="mb-3 flex items-center gap-space-sm px-space-sm">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-surface-container font-label-sm text-label-sm font-bold text-primary">
                                {initials(user.name)}
                            </div>
                            <div className="min-w-0">
                                <p className="truncate font-label-md text-label-md font-semibold text-on-surface">
                                    {user.name}
                                </p>
                                <p className="font-body-sm text-body-sm text-on-surface-variant">Administrator</p>
                            </div>
                        </div>
                    )}

                    <Link
                        href="/logout"
                        method="post"
                        as="button"
                        className="flex w-full items-center gap-space-sm rounded-lg px-space-sm py-2.5 font-label-md text-label-md text-error transition-colors hover:bg-error-container hover:text-on-error-container"
                    >
                        <span className="material-symbols-outlined text-[20px]">logout</span>
                        <span>Keluar Sistem</span>
                    </Link>
                </div>
            </aside>

            <div className="lg:pl-[260px]">
                <main className="relative w-full bg-background px-4 py-6 sm:px-margin-sm lg:px-margin lg:py-margin">
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
