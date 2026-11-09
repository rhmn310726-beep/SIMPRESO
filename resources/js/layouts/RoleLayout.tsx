import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import type { Role, SharedProps } from '@/types';

const roleLabels: Record<Role, string> = {
    dokter: 'Dokter',
    farmasi: 'Farmasi',
    admin: 'Admin',
};

export default function RoleLayout({ title, children }: { title: string; children: ReactNode }) {
    const { auth } = usePage<SharedProps>().props;
    const user = auth.user;

    return (
        <div className="min-h-screen bg-pharmacy-bg-light">
            <header className="border-b border-brand-100 bg-white/90 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-brand-200 bg-brand-50">
                            <svg
                                className="h-6 w-6 -rotate-45"
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
                        </div>
                        <div>
                            <p className="text-sm font-extrabold tracking-tight text-[#16417C]">
                                SIMPRESO
                            </p>
                            <p className="text-[10px] font-semibold tracking-wide text-brand-600">
                                {title}
                            </p>
                        </div>
                    </Link>

                    <div className="flex items-center gap-3">
                        {user && (
                            <div className="hidden text-right sm:block">
                                <p className="text-sm font-semibold text-slate-800">
                                    {user.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {roleLabels[user.role]}
                                </p>
                            </div>
                        )}
                        <Link
                            href="/logout"
                            method="post"
                            as="button"
                            className="rounded-full border border-brand-200 px-4 py-2 text-xs font-bold text-brand-600 transition-colors hover:bg-brand-50"
                        >
                            Keluar
                        </Link>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
                <h1 className="mb-6 text-xl font-extrabold text-slate-900">{title}</h1>
                {children}
            </main>
        </div>
    );
}
