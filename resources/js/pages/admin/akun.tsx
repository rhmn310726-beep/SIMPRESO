import { Head, useForm, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import type { Role, SharedProps } from '@/types';

interface AdminUser {
    id: number;
    name: string;
    email: string;
    role: Role;
}

interface AkunProps {
    users: AdminUser[];
}

const roleLabels: Record<Role, string> = {
    dokter: 'Dokter',
    farmasi: 'Farmasi',
    admin: 'Admin',
};

const roleBadgeClasses: Record<Role, string> = {
    dokter: 'bg-blue-50 text-blue-700 ring-blue-100',
    farmasi: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    admin: 'bg-violet-50 text-violet-700 ring-violet-100',
};

export default function Akun({ users }: AkunProps) {
    const { flash, auth } = usePage<SharedProps>().props;
    const [search, setSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        password: '',
        password_confirmation: '',
    });

    const filteredUsers = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        if (keyword === '') {
            return users;
        }

        return users.filter((user) => {
            return (
                user.name.toLowerCase().includes(keyword) ||
                user.email.toLowerCase().includes(keyword) ||
                roleLabels[user.role].toLowerCase().includes(keyword)
            );
        });
    }, [search, users]);

    const openModal = (user: AdminUser) => {
        reset();
        clearErrors();
        setShowPassword(false);
        setShowConfirmation(false);
        setSelectedUser(user);
    };

    const closeModal = () => {
        if (processing) {
            return;
        }

        setSelectedUser(null);
        reset();
        clearErrors();
    };

    useEffect(() => {
        if (!selectedUser) {
            return;
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeModal();
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [selectedUser, processing]);

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!selectedUser) {
            return;
        }

        post(`/admin/akun/${selectedUser.id}/reset-password`, {
            preserveScroll: true,
            onSuccess: () => {
                setSelectedUser(null);
                reset();
            },
        });
    };

    return (
        <>
            <Head title="Kelola Akun" />

            <AdminLayout>
                <div className="mb-6 flex flex-col gap-1">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[32px] sm:leading-10">
                        Kelola Akun
                    </h1>
                    <p className="text-sm text-slate-500">
                        Daftar akun dokter, farmasi, dan admin. Reset password manual bila user lupa.
                    </p>
                </div>

                {flash.success && (
                    <div className="mb-5 flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
                        <CheckCircleIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
                        <p className="leading-relaxed">{flash.success}</p>
                    </div>
                )}

                {flash.error && (
                    <div className="mb-5 flex items-start gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                        <AlertIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
                        <p className="leading-relaxed">{flash.error}</p>
                    </div>
                )}

                <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-brand-100 bg-white p-5 shadow-soft-card sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                            <UsersIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-900">
                                Manajemen kredensial akun
                            </p>
                            <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                                Jika user lupa password, minta password baru yang diinginkan lalu
                                isikan di sini. Sesi login user tersebut akan diputus otomatis.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2.5">
                        <span className="text-xs font-medium text-slate-500">Total akun</span>
                        <span className="text-lg leading-none font-bold text-brand-600">
                            {users.length}
                        </span>
                    </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-soft-card">
                    <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Daftar Akun</h2>
                            <p className="text-xs text-slate-500">
                                Dokter, farmasi, dan admin sistem.
                            </p>
                        </div>
                        <div className="relative w-full sm:max-w-xs">
                            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Cari nama, email, atau role..."
                                className="w-full rounded-lg bg-slate-50 py-2.5 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-100 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-left">
                            <thead>
                                <tr className="bg-slate-50/70 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                                    <th className="px-5 py-3">Pengguna</th>
                                    <th className="px-5 py-3">Role</th>
                                    <th className="px-5 py-3 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="transition-colors hover:bg-slate-50/70">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-600">
                                                    {initials(user.name)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                                        <span className="truncate">{user.name}</span>
                                                        {auth.user?.id === user.id && (
                                                            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-600">
                                                                Anda
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="truncate text-xs text-slate-500">
                                                        {user.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${roleBadgeClasses[user.role]}`}
                                            >
                                                {roleLabels[user.role]}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <button
                                                type="button"
                                                onClick={() => openModal(user)}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-3 py-2 text-xs font-bold text-brand-600 transition-colors hover:bg-brand-50"
                                            >
                                                <KeyIcon className="h-4 w-4" />
                                                <span>Reset Password</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}

                                {filteredUsers.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-5 py-12 text-center">
                                            <p className="text-sm font-medium text-slate-600">
                                                Tidak ada akun yang cocok.
                                            </p>
                                            <p className="mt-1 text-xs text-slate-400">
                                                Coba kata kunci lain.
                                            </p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </AdminLayout>

            {selectedUser && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
                    onClick={closeModal}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="reset-password-title"
                        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                                    <KeyIcon className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3
                                        id="reset-password-title"
                                        className="text-base font-bold text-slate-900"
                                    >
                                        Reset Password
                                    </h3>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        {selectedUser.name} · {selectedUser.email}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={closeModal}
                                disabled={processing}
                                aria-label="Tutup"
                                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 disabled:opacity-50"
                            >
                                <XIcon className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={submit} className="space-y-5 p-5">
                            <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-3.5 text-xs text-amber-700">
                                <AlertIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                <p className="leading-relaxed">
                                    Isikan password baru sesuai permintaan user. Sesi login aktif
                                    user ini akan diputus setelah password disimpan.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor="new-password"
                                    className="block text-sm font-medium text-slate-800"
                                >
                                    Password Baru
                                </label>
                                <div className="relative flex items-center">
                                    <LockIcon className="pointer-events-none absolute left-3.5 h-5 w-5 text-slate-400" />
                                    <input
                                        id="new-password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        autoFocus
                                        required
                                        value={data.password}
                                        onChange={(event) => setData('password', event.target.value)}
                                        placeholder="Minimal 8 karakter"
                                        className="w-full rounded-lg bg-slate-50 py-3 pr-12 pl-11 text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:bg-white focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((value) => !value)}
                                        aria-label={
                                            showPassword ? 'Sembunyikan password' : 'Tampilkan password'
                                        }
                                        className="absolute right-3.5 rounded-md p-0.5 text-slate-400 transition-colors hover:text-slate-600 focus:outline-none"
                                    >
                                        {showPassword ? (
                                            <EyeOffIcon className="h-5 w-5" />
                                        ) : (
                                            <EyeIcon className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="text-xs font-medium text-red-600">{errors.password}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor="new-password-confirmation"
                                    className="block text-sm font-medium text-slate-800"
                                >
                                    Konfirmasi Password Baru
                                </label>
                                <div className="relative flex items-center">
                                    <LockIcon className="pointer-events-none absolute left-3.5 h-5 w-5 text-slate-400" />
                                    <input
                                        id="new-password-confirmation"
                                        type={showConfirmation ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        required
                                        value={data.password_confirmation}
                                        onChange={(event) =>
                                            setData('password_confirmation', event.target.value)
                                        }
                                        placeholder="Ulangi password baru"
                                        className="w-full rounded-lg bg-slate-50 py-3 pr-12 pl-11 text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:bg-white focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmation((value) => !value)}
                                        aria-label={
                                            showConfirmation
                                                ? 'Sembunyikan konfirmasi password'
                                                : 'Tampilkan konfirmasi password'
                                        }
                                        className="absolute right-3.5 rounded-md p-0.5 text-slate-400 transition-colors hover:text-slate-600 focus:outline-none"
                                    >
                                        {showConfirmation ? (
                                            <EyeOffIcon className="h-5 w-5" />
                                        ) : (
                                            <EyeIcon className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    disabled={processing}
                                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-brand-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-75"
                                >
                                    {processing ? (
                                        <SpinnerIcon className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <KeyIcon className="h-4 w-4" />
                                    )}
                                    <span>{processing ? 'Menyimpan...' : 'Simpan Password'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
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

function SearchIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
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

function KeyIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="8" cy="15" r="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10.8 12.2L20 3m-4 4l3 3m-6 0l3 3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function LockIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function EyeIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function EyeOffIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path
                d="M3 3l18 18M10.6 6.1A9.9 9.9 0 0112 6c6 0 9.5 6 9.5 6a17 17 0 01-3.2 3.9M6.6 6.7A17 17 0 002.5 12S6 18 12 18c1.4 0 2.7-.3 3.8-.9"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M9.9 9.9a3 3 0 004.2 4.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function XIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function AlertIcon({ className }: { className?: string }) {
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

function CheckCircleIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 12l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function SpinnerIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
            <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
        </svg>
    );
}
