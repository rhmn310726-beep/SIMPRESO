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

type RoleFilter = 'semua' | Role;

type CreateRole = '' | Role;

interface CreateUserForm {
    name: string;
    email: string;
    role: CreateRole;
    password: string;
    password_confirmation: string;
}

const emptyCreateForm: CreateUserForm = {
    name: '',
    email: '',
    role: '',
    password: '',
    password_confirmation: '',
};

interface EditUserForm {
    name: string;
    email: string;
    role: Role;
}

const editFormFrom = (user: AdminUser): EditUserForm => ({
    name: user.name,
    email: user.email,
    role: user.role,
});

interface RoleMeta {
    label: string;
    description: string;
    icon: string;
    badgeClass: string;
    avatarClass: string;
}

const roleMeta: Record<Role, RoleMeta> = {
    dokter: {
        label: 'Dokter',
        description: 'Prescriber resep elektronik',
        icon: 'stethoscope',
        badgeClass: 'bg-primary-fixed text-primary',
        avatarClass: 'bg-primary-fixed text-primary',
    },
    farmasi: {
        label: 'Apoteker / Farmasi',
        description: 'Verifikasi & dispensing resep',
        icon: 'medication',
        badgeClass: 'bg-secondary-fixed text-secondary',
        avatarClass: 'bg-secondary-fixed text-secondary',
    },
    admin: {
        label: 'Admin SIMRS',
        description: 'Konfigurasi sistem, audit, dan hak akses',
        icon: 'security',
        badgeClass: 'bg-tertiary-fixed text-tertiary',
        avatarClass: 'bg-tertiary-fixed text-tertiary',
    },
};

const PAGE_SIZE = 6;

export default function Akun({ users }: AkunProps) {
    const { flash, auth } = usePage<SharedProps>().props;
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<RoleFilter>('semua');
    const [page, setPage] = useState(1);
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [createShowPassword, setCreateShowPassword] = useState(false);
    const [createShowConfirmation, setCreateShowConfirmation] = useState(false);
    const [editTarget, setEditTarget] = useState<AdminUser | null>(null);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        password: '',
        password_confirmation: '',
    });

    const createForm = useForm<CreateUserForm>(emptyCreateForm);
    const editForm = useForm<EditUserForm>(editFormFrom({
        id: 0,
        name: '',
        email: '',
        role: 'dokter',
    }));

    const roleCounts = useMemo(() => {
        const counts: Record<RoleFilter, number> = { semua: users.length, dokter: 0, farmasi: 0, admin: 0 };

        for (const user of users) {
            counts[user.role] += 1;
        }

        return counts;
    }, [users]);

    const filteredUsers = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return users.filter((user) => {
            const matchesRole = roleFilter === 'semua' || user.role === roleFilter;

            if (!matchesRole) {
                return false;
            }

            if (keyword === '') {
                return true;
            }

            return (
                user.name.toLowerCase().includes(keyword) ||
                user.email.toLowerCase().includes(keyword) ||
                roleMeta[user.role].label.toLowerCase().includes(keyword)
            );
        });
    }, [search, roleFilter, users]);

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const pagedUsers = filteredUsers.slice(startIndex, startIndex + PAGE_SIZE);

    const resetFilters = () => {
        setSearch('');
        setRoleFilter('semua');
        setPage(1);
    };

    const openModal = (user: AdminUser) => {
        createForm.reset();
        createForm.clearErrors();
        setCreateOpen(false);
        editForm.reset();
        editForm.clearErrors();
        setEditTarget(null);
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

    const openCreateModal = () => {
        reset();
        clearErrors();
        setSelectedUser(null);
        editForm.reset();
        editForm.clearErrors();
        setEditTarget(null);
        createForm.reset();
        createForm.clearErrors();
        setCreateShowPassword(false);
        setCreateShowConfirmation(false);
        setCreateOpen(true);
    };

    const closeCreateModal = () => {
        if (createForm.processing) {
            return;
        }

        setCreateOpen(false);
        createForm.reset();
        createForm.clearErrors();
    };

    const openEditModal = (user: AdminUser) => {
        reset();
        clearErrors();
        setSelectedUser(null);
        createForm.reset();
        createForm.clearErrors();
        setCreateOpen(false);
        editForm.reset();
        editForm.setData(editFormFrom(user));
        editForm.clearErrors();
        setEditTarget(user);
    };

    const closeEditModal = () => {
        if (editForm.processing) {
            return;
        }

        setEditTarget(null);
        editForm.reset();
        editForm.clearErrors();
    };

    const submitEdit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!editTarget) {
            return;
        }

        editForm.put(`/admin/akun/${editTarget.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setEditTarget(null);
                editForm.reset();
            },
        });
    };

    const submitCreate = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        createForm.post('/admin/akun', {
            preserveScroll: true,
            onSuccess: () => {
                setCreateOpen(false);
                createForm.reset();
                setSearch('');
                setRoleFilter('semua');
                setPage(1);
            },
        });
    };

    useEffect(() => {
        setPage(1);
    }, [search, roleFilter]);

    useEffect(() => {
        if (!selectedUser && !createOpen && !editTarget) {
            return;
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeModal();
                closeCreateModal();
                closeEditModal();
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [selectedUser, createOpen, editTarget, processing, createForm.processing, editForm.processing]);

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
            <Head title="Manajemen Pengguna" />

            <AdminLayout>
                <div className="flex w-full flex-col">
                    <div className="mb-space-md flex flex-wrap items-center justify-between gap-space-sm">
                        <div className="flex items-center gap-space-xs font-label-md text-label-md">
                            <span className="text-on-surface-variant">e-Resep Farmasi</span>
                            <span className="material-symbols-outlined text-[16px] text-outline">chevron_right</span>
                            <span className="font-medium text-on-surface-variant">Sistem Keamanan</span>
                            <span className="material-symbols-outlined text-[16px] text-outline">chevron_right</span>
                            <span className="font-semibold text-on-surface">Manajemen Pengguna</span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-3 py-1 font-label-sm text-label-sm text-primary">
                            <span
                                className="material-symbols-outlined text-[16px]"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                                verified_user
                            </span>
                            <span>Role-Based Access Control (RBAC)</span>
                            <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
                            <span className="text-on-surface-variant">3 Peran Sistem</span>
                        </div>
                    </div>

                    <div className="mb-space-xl flex flex-col gap-space-md lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h1 className="font-headline-lg text-headline-lg tracking-tight text-on-surface">
                                Manajemen Pengguna
                            </h1>
                            <p className="font-body-md text-body-md mt-1 text-on-surface-variant">
                                Kelola akun pengguna dan hak akses role (Dokter, Farmasi, Admin SIMRS) secara
                                terpusat.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-space-sm">
                            <button
                                type="button"
                                className="inline-flex items-center gap-space-xs rounded-xl bg-surface-container-lowest px-space-md py-2.5 font-label-md text-label-md text-on-surface-variant shadow-sm transition-all hover:bg-surface-container hover:text-on-surface"
                            >
                                <span className="material-symbols-outlined text-[18px]">history</span>
                                <span>Log Aktivitas User</span>
                            </button>
                            <button
                                type="button"
                                onClick={openCreateModal}
                                className="inline-flex items-center gap-space-xs rounded-xl bg-primary-container px-space-md py-2.5 font-label-md text-label-md text-on-primary shadow-sm transition-all hover:bg-primary"
                            >
                                <span className="material-symbols-outlined text-[20px]">person_add</span>
                                <span>+ Tambah Pengguna Baru</span>
                            </button>
                        </div>
                    </div>

                    {flash.success && (
                        <div className="mb-space-md flex items-start gap-space-sm rounded-xl bg-secondary-fixed/60 p-space-md font-body-md text-body-md text-secondary">
                            <span className="material-symbols-outlined mt-0.5 text-[18px]">check_circle</span>
                            <p className="leading-relaxed">{flash.success}</p>
                        </div>
                    )}

                    {flash.error && (
                        <div className="mb-space-md flex items-start gap-space-sm rounded-xl bg-error-container p-space-md font-body-md text-body-md text-on-error-container">
                            <span className="material-symbols-outlined mt-0.5 text-[18px]">error</span>
                            <p className="leading-relaxed">{flash.error}</p>
                        </div>
                    )}

                    <div className="mb-space-xl grid grid-cols-1 gap-space-md sm:grid-cols-2 xl:grid-cols-4">
                        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-space-lg shadow-sm transition-shadow hover:shadow-md">
                            <div className="flex items-start justify-between">
                                <div>
                                    <span className="font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
                                        Total Pengguna
                                    </span>
                                    <div className="font-display-lg text-display-lg mt-1 font-bold text-on-surface">
                                        {roleCounts.semua}{' '}
                                        <span className="font-label-md text-label-sm font-normal text-on-surface-variant">
                                            Staf
                                        </span>
                                    </div>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container-low text-primary">
                                    <span className="material-symbols-outlined text-[24px]">group</span>
                                </div>
                            </div>
                            <div className="-mx-space-lg -mb-space-lg mt-space-md bg-surface-container-low/60 px-space-lg pt-space-sm pb-space-xs flex items-center justify-between font-body-sm text-body-sm text-on-surface-variant">
                                <span className="flex items-center gap-1.5 font-medium text-secondary">
                                    <span className="h-2 w-2 rounded-full bg-secondary" />
                                    {roleCounts.semua} Akun Terdaftar
                                </span>
                                <span className="font-medium">RBAC Aktif</span>
                            </div>
                        </div>

                        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-space-lg shadow-sm transition-shadow hover:shadow-md">
                            <div className="flex items-start justify-between">
                                <div>
                                    <span className="font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
                                        Dokter (Prescriber)
                                    </span>
                                    <div className="font-display-lg text-display-lg mt-1 font-bold text-on-surface">
                                        {roleCounts.dokter}{' '}
                                        <span className="font-label-md text-label-sm font-normal text-on-surface-variant">
                                            Dokter
                                        </span>
                                    </div>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-fixed text-primary">
                                    <span className="material-symbols-outlined text-[24px]">stethoscope</span>
                                </div>
                            </div>
                            <div className="-mx-space-lg -mb-space-lg mt-space-md bg-surface-container-low/60 px-space-lg pt-space-sm pb-space-xs flex items-center justify-between font-body-sm text-body-sm text-on-surface-variant">
                                <span className="font-label-sm text-label-sm inline-flex items-center gap-1 text-primary">
                                    <span className="material-symbols-outlined text-[14px]">verified</span>
                                    Buat Resep Elektronik
                                </span>
                                <span className="font-code-sm text-code-sm font-semibold text-on-surface">
                                    Prescriber
                                </span>
                            </div>
                        </div>

                        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-space-lg shadow-sm transition-shadow hover:shadow-md">
                            <div className="flex items-start justify-between">
                                <div>
                                    <span className="font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
                                        Apoteker &amp; TTK
                                    </span>
                                    <div className="font-display-lg text-display-lg mt-1 font-bold text-on-surface">
                                        {roleCounts.farmasi}{' '}
                                        <span className="font-label-md text-label-sm font-normal text-on-surface-variant">
                                            Staf Farmasi
                                        </span>
                                    </div>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary-fixed text-secondary">
                                    <span className="material-symbols-outlined text-[24px]">prescriptions</span>
                                </div>
                            </div>
                            <div className="-mx-space-lg -mb-space-lg mt-space-md bg-surface-container-low/60 px-space-lg pt-space-sm pb-space-xs flex items-center justify-between font-body-sm text-body-sm text-on-surface-variant">
                                <span className="font-label-sm text-label-sm inline-flex items-center gap-1 text-secondary">
                                    <span className="material-symbols-outlined text-[14px]">task_alt</span>
                                    Verifikasi &amp; Dispensing
                                </span>
                                <span className="font-code-sm text-code-sm font-semibold text-on-surface">Farmasi</span>
                            </div>
                        </div>

                        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-space-lg shadow-sm transition-shadow hover:shadow-md">
                            <div className="flex items-start justify-between">
                                <div>
                                    <span className="font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
                                        Administrator SIMRS
                                    </span>
                                    <div className="font-display-lg text-display-lg mt-1 font-bold text-on-surface">
                                        {roleCounts.admin}{' '}
                                        <span className="font-label-md text-label-sm font-normal text-on-surface-variant">
                                            Admin
                                        </span>
                                    </div>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-tertiary-fixed text-tertiary">
                                    <span className="material-symbols-outlined text-[24px]">shield_person</span>
                                </div>
                            </div>
                            <div className="-mx-space-lg -mb-space-lg mt-space-md bg-surface-container-low/60 px-space-lg pt-space-sm pb-space-xs flex items-center justify-between font-body-sm text-body-sm text-on-surface-variant">
                                <span className="font-label-sm text-label-sm inline-flex items-center gap-1 text-tertiary">
                                    <span className="material-symbols-outlined text-[14px]">lock_open</span>
                                    Full Access SIMRS
                                </span>
                                <span className="font-code-sm text-code-sm font-semibold text-on-surface">
                                    Audit Log
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="mb-space-md flex flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
                        <div className="flex flex-col items-stretch gap-space-md lg:flex-row lg:items-center lg:justify-between">
                            <div className="relative max-w-xl flex-1">
                                <span className="material-symbols-outlined absolute top-1/2 left-3 text-[20px] -translate-y-1/2 text-outline">
                                    search
                                </span>
                                <input
                                    id="userSearchInput"
                                    type="text"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Cari nama staf, email, atau role..."
                                    className="w-full rounded-xl bg-surface-container-low py-2 pr-space-md pl-10 font-body-sm text-body-sm text-on-surface transition-all placeholder:text-outline focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                />
                            </div>
                            <div className="flex flex-wrap items-center gap-space-sm">
                                <div className="relative">
                                    <select
                                        value={roleFilter}
                                        onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
                                        className="cursor-pointer appearance-none rounded-xl bg-surface-container-low py-2 pr-8 pl-3 font-label-sm text-label-sm text-on-surface transition-colors hover:bg-surface-container focus:outline-none"
                                    >
                                        <option value="semua">Role: Semua Role</option>
                                        <option value="dokter">Dokter (Prescriber)</option>
                                        <option value="farmasi">Apoteker &amp; Farmasi</option>
                                        <option value="admin">Administrator SIMRS</option>
                                    </select>
                                    <span className="material-symbols-outlined pointer-events-none absolute top-1/2 right-2.5 text-[18px] -translate-y-1/2 text-outline">
                                        expand_more
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    title="Reset Filter"
                                    className="rounded-xl p-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                                >
                                    <span className="material-symbols-outlined text-[20px]">filter_alt_off</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-space-xs overflow-x-auto border-t border-surface-container-high/40 pt-2">
                            <button
                                type="button"
                                onClick={() => setRoleFilter('semua')}
                                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-space-md py-1.5 font-label-sm text-label-sm transition-colors ${
                                    roleFilter === 'semua'
                                        ? 'bg-primary-container font-semibold text-on-primary shadow-sm'
                                        : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                                }`}
                            >
                                <span>Semua Staf</span>
                                <span
                                    className={`rounded-full px-1.5 py-[2px] font-code-sm text-[11px] ${
                                        roleFilter === 'semua' ? 'bg-white/20 text-on-primary' : 'bg-surface-container text-on-surface'
                                    }`}
                                >
                                    {roleCounts.semua}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setRoleFilter('dokter')}
                                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-space-md py-1.5 font-label-sm text-label-sm transition-colors ${
                                    roleFilter === 'dokter'
                                        ? 'bg-primary-container font-semibold text-on-primary shadow-sm'
                                        : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                                }`}
                            >
                                <span>Dokter</span>
                                <span
                                    className={`rounded-full px-1.5 py-[2px] font-code-sm text-[11px] ${
                                        roleFilter === 'dokter' ? 'bg-white/20 text-on-primary' : 'bg-surface-container text-on-surface'
                                    }`}
                                >
                                    {roleCounts.dokter}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setRoleFilter('farmasi')}
                                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-space-md py-1.5 font-label-sm text-label-sm transition-colors ${
                                    roleFilter === 'farmasi'
                                        ? 'bg-primary-container font-semibold text-on-primary shadow-sm'
                                        : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                                }`}
                            >
                                <span>Farmasi / Apoteker</span>
                                <span
                                    className={`rounded-full px-1.5 py-[2px] font-code-sm text-[11px] ${
                                        roleFilter === 'farmasi' ? 'bg-white/20 text-on-primary' : 'bg-surface-container text-on-surface'
                                    }`}
                                >
                                    {roleCounts.farmasi}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setRoleFilter('admin')}
                                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-space-md py-1.5 font-label-sm text-label-sm transition-colors ${
                                    roleFilter === 'admin'
                                        ? 'bg-primary-container font-semibold text-on-primary shadow-sm'
                                        : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                                }`}
                            >
                                <span>Admin SIMRS</span>
                                <span
                                    className={`rounded-full px-1.5 py-[2px] font-code-sm text-[11px] ${
                                        roleFilter === 'admin' ? 'bg-white/20 text-on-primary' : 'bg-surface-container text-on-surface'
                                    }`}
                                >
                                    {roleCounts.admin}
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="mb-space-lg overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px] text-left border-collapse">
                                <thead>
                                    <tr className="bg-surface-container-low/70 font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
                                        <th className="px-space-md py-3.5">Nama &amp; Identitas</th>
                                        <th className="px-space-md py-3.5">Role &amp; Hak Akses</th>
                                        <th className="px-space-md py-3.5">Kontak &amp; Email</th>
                                        <th className="px-space-md py-3.5 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-container-low font-body-sm text-body-sm text-on-surface">
                                    {pagedUsers.map((user) => {
                                        const meta = roleMeta[user.role];

                                        return (
                                            <tr key={user.id} className="group transition-colors hover:bg-surface-container-low/40">
                                                <td className="px-space-md py-3.5">
                                                    <div className="flex items-center gap-space-sm">
                                                        <div
                                                            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl font-headline-sm text-headline-sm font-bold ${meta.avatarClass}`}
                                                        >
                                                            {initials(user.name)}
                                                        </div>
                                                        <div className="flex min-w-0 flex-col">
                                                            <span className="flex items-center gap-1.5 truncate font-label-md text-label-sm font-semibold text-on-surface transition-colors group-hover:text-primary">
                                                                <span className="truncate">{user.name}</span>
                                                                {auth.user?.id === user.id && (
                                                                    <span className="rounded-full bg-primary-fixed px-2 py-0.5 font-code-sm text-[10px] font-bold text-primary">
                                                                        Anda
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-space-md py-3.5">
                                                    <div className="flex flex-col items-start gap-1">
                                                        <span
                                                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-label-sm text-label-sm font-semibold ${meta.badgeClass}`}
                                                        >
                                                            <span className="material-symbols-outlined text-[13px]">
                                                                {meta.icon}
                                                            </span>
                                                            {meta.label}
                                                        </span>
                                                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                                                            {meta.description}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-space-md py-3.5">
                                                    <div className="flex flex-col">
                                                        <a
                                                            href={`mailto:${user.email}`}
                                                            className="font-medium text-on-surface transition-colors hover:text-primary"
                                                        >
                                                            {user.email}
                                                        </a>
                                                    </div>
                                                </td>
                                                <td className="px-space-md py-3.5 text-right">
                                                    <div className="inline-flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditModal(user)}
                                                            title="Edit Data Staf"
                                                            className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">
                                                                edit_note
                                                            </span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => openModal(user)}
                                                            title="Reset Password"
                                                            className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-secondary"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">key</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {pagedUsers.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-space-md py-12 text-center">
                                                <span className="material-symbols-outlined text-[32px] text-outline">
                                                    search_off
                                                </span>
                                                <p className="font-label-md text-label-md font-medium text-on-surface">
                                                    Tidak ada pengguna yang cocok.
                                                </p>
                                                <p className="font-body-sm text-body-sm mt-1 text-on-surface-variant">
                                                    Coba kata kunci atau filter role lain.
                                                </p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-col items-center justify-between gap-space-sm bg-surface-container-low/40 px-space-md py-3.5 sm:flex-row">
                            <div className="font-body-sm text-body-sm text-on-surface-variant">
                                Menampilkan{' '}
                                <span className="font-semibold text-on-surface">
                                    {filteredUsers.length === 0 ? 0 : startIndex + 1} -{' '}
                                    {Math.min(startIndex + PAGE_SIZE, filteredUsers.length)}
                                </span>{' '}
                                dari <span className="font-semibold text-on-surface">{filteredUsers.length}</span>{' '}
                                pengguna sistem
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setPage(1)}
                                    disabled={currentPage === 1}
                                    title="Halaman pertama"
                                    className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-40"
                                >
                                    <span className="material-symbols-outlined text-[18px]">first_page</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                                    disabled={currentPage === 1}
                                    title="Halaman sebelumnya"
                                    className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-40"
                                >
                                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                                </button>
                                {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                                    <button
                                        key={pageNumber}
                                        type="button"
                                        onClick={() => setPage(pageNumber)}
                                        className={`flex h-8 w-8 items-center justify-center rounded-lg font-label-sm text-label-sm transition-colors ${
                                            pageNumber === currentPage
                                                ? 'bg-primary font-semibold text-on-primary shadow-sm'
                                                : 'text-on-surface-variant hover:bg-surface-container'
                                        }`}
                                    >
                                        {pageNumber}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                                    disabled={currentPage === totalPages}
                                    title="Halaman berikutnya"
                                    className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-40"
                                >
                                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                    title="Halaman terakhir"
                                    className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-40"
                                >
                                    <span className="material-symbols-outlined text-[18px]">last_page</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-space-md lg:grid-cols-3">
                        <div className="flex items-start gap-space-md rounded-xl bg-surface-container-lowest p-space-md shadow-sm lg:col-span-2">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary">
                                <span className="material-symbols-outlined text-[24px]">verified</span>
                            </div>
                            <div className="flex flex-col">
                                <h4 className="font-headline-sm text-headline-sm text-on-surface">
                                    Validasi Identitas Digital &amp; e-Sign Kemenkes
                                </h4>
                                <p className="font-body-sm text-body-sm mt-1 text-on-surface-variant">
                                    Setiap resep digital ditandatangani secara elektronik (e-Sign) menggunakan
                                    identitas SIP dokter yang telah terverifikasi Kemenkes SatuSehat. Setiap
                                    perubahan akun dokter wajib melalui proses validasi nomor registrasi aktif
                                    konsil kedokteran (KKI).
                                </p>
                                <div className="font-label-sm text-label-sm mt-3 flex items-center gap-space-md">
                                    <span className="font-label-sm text-label-sm inline-flex items-center gap-1 font-semibold text-secondary">
                                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                        Integrasi SatuSehat Aktif
                                    </span>
                                    <span className="font-label-sm text-label-sm inline-flex items-center gap-1 font-semibold text-primary">
                                        <span className="material-symbols-outlined text-[16px]">shield</span>
                                        Algoritma Enkripsi AES-256
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
                            <span className="font-label-sm text-label-sm tracking-wider text-on-surface-variant uppercase">
                                Matriks Izin Modul (RBAC)
                            </span>
                            <div className="font-body-sm text-body-sm mt-2 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1.5 text-on-surface">
                                        <span className="h-2.5 w-2.5 rounded-full bg-primary-container" />
                                        Dokter:
                                    </span>
                                    <span className="font-medium text-on-surface-variant">
                                        Buat Resep, Telusur Rekam Medis
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1.5 text-on-surface">
                                        <span className="h-2.5 w-2.5 rounded-full bg-secondary" />
                                        Farmasi:
                                    </span>
                                    <span className="font-medium text-on-surface-variant">
                                        Verifikasi, Telaah, Dispensing
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1.5 text-on-surface">
                                        <span className="h-2.5 w-2.5 rounded-full bg-tertiary" />
                                        Admin SIMRS:
                                    </span>
                                    <span className="font-medium text-on-surface-variant">
                                        Audit Log, Konfigurasi Role, Hak Akses
                                    </span>
                                </div>
                            </div>
                            <div className="mt-2 flex justify-end border-t border-surface-container-low pt-2">
                                <button
                                    type="button"
                                    className="font-label-sm text-label-sm inline-flex items-center gap-1 text-primary hover:underline"
                                >
                                    <span>Kelola Skema Matriks Lengkap</span>
                                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </AdminLayout>

            {selectedUser && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/50 p-4 backdrop-blur-sm"
                    onClick={closeModal}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="reset-password-title"
                        className="w-full max-w-md rounded-xl bg-surface-container-lowest shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-space-md border-b border-surface-container-low p-space-md">
                            <div className="flex items-start gap-space-sm">
                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary">
                                    <span className="material-symbols-outlined text-[20px]">key</span>
                                </div>
                                <div>
                                    <h3
                                        id="reset-password-title"
                                        className="font-headline-sm text-headline-sm text-on-surface"
                                    >
                                        Reset Password
                                    </h3>
                                    <p className="font-body-sm text-body-sm mt-0.5 text-on-surface-variant">
                                        {selectedUser.name} · {selectedUser.email}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={closeModal}
                                disabled={processing}
                                aria-label="Tutup"
                                className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>

                        <form onSubmit={submit} className="flex flex-col gap-space-lg p-space-md">
                            <div className="flex items-start gap-space-sm rounded-xl bg-tertiary-fixed/60 p-3.5 font-body-sm text-body-sm text-on-tertiary-fixed-variant">
                                <span className="material-symbols-outlined mt-0.5 text-[16px]">info</span>
                                <p className="leading-relaxed">
                                    Isikan password baru sesuai permintaan user. Sesi login aktif user ini akan
                                    diputus setelah password disimpan.
                                </p>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="new-password" className="font-label-md text-label-md text-on-surface">
                                    Password Baru
                                </label>
                                <div className="relative flex items-center">
                                    <span className="material-symbols-outlined pointer-events-none absolute left-3.5 text-[20px] text-outline">
                                        lock
                                    </span>
                                    <input
                                        id="new-password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        autoFocus
                                        required
                                        value={data.password}
                                        onChange={(event) => setData('password', event.target.value)}
                                        placeholder="Minimal 8 karakter"
                                        className="w-full rounded-xl bg-surface-container-low py-2.5 pr-12 pl-11 font-body-md text-body-md text-on-surface transition-all placeholder:text-outline focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((value) => !value)}
                                        aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                                        className="absolute right-3.5 rounded-md p-0.5 text-outline transition-colors hover:text-on-surface focus:outline-none"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">
                                            {showPassword ? 'visibility_off' : 'visibility'}
                                        </span>
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="font-label-sm text-label-sm font-medium text-error">
                                        {errors.password}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                <label
                                    htmlFor="new-password-confirmation"
                                    className="font-label-md text-label-md text-on-surface"
                                >
                                    Konfirmasi Password Baru
                                </label>
                                <div className="relative flex items-center">
                                    <span className="material-symbols-outlined pointer-events-none absolute left-3.5 text-[20px] text-outline">
                                        lock
                                    </span>
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
                                        className="w-full rounded-xl bg-surface-container-low py-2.5 pr-12 pl-11 font-body-md text-body-md text-on-surface transition-all placeholder:text-outline focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmation((value) => !value)}
                                        aria-label={
                                            showConfirmation
                                                ? 'Sembunyikan konfirmasi password'
                                                : 'Tampilkan konfirmasi password'
                                        }
                                        className="absolute right-3.5 rounded-md p-0.5 text-outline transition-colors hover:text-on-surface focus:outline-none"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">
                                            {showConfirmation ? 'visibility_off' : 'visibility'}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    disabled={processing}
                                    className="rounded-xl border border-outline-variant px-4 py-2.5 font-label-md text-label-md text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-label-md text-label-md text-on-primary shadow-sm transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-75"
                                >
                                    {processing && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
                                    <span>{processing ? 'Menyimpan...' : 'Simpan Password'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {createOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/50 p-4 backdrop-blur-sm"
                    onClick={closeCreateModal}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="create-user-title"
                        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-surface-container-lowest shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-space-md border-b border-surface-container-low p-space-md">
                            <div className="flex items-start gap-space-sm">
                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary">
                                    <span className="material-symbols-outlined text-[20px]">person_add</span>
                                </div>
                                <div>
                                    <h3 id="create-user-title" className="font-headline-sm text-headline-sm text-on-surface">
                                        Tambah Pengguna Baru
                                    </h3>
                                    <p className="font-body-sm text-body-sm mt-0.5 text-on-surface-variant">
                                        Buat akun staf baru beserta role dan hak aksesnya.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={closeCreateModal}
                                disabled={createForm.processing}
                                aria-label="Tutup"
                                className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>

                        <form onSubmit={submitCreate} className="flex flex-col gap-space-lg p-space-md">
                            <div className="flex items-start gap-space-sm rounded-xl bg-tertiary-fixed/60 p-3.5 font-body-sm text-body-sm text-on-tertiary-fixed-variant">
                                <span className="material-symbols-outlined mt-0.5 text-[16px]">info</span>
                                <p className="leading-relaxed">
                                    Tidak ada registrasi publik. Password awal diisi manual oleh Admin dan
                                    wajib diserahkan langsung kepada user terkait.
                                </p>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="create-user-name" className="font-label-md text-label-md text-on-surface">
                                    Nama Lengkap
                                </label>
                                <div className="relative flex items-center">
                                    <span className="material-symbols-outlined pointer-events-none absolute left-3.5 text-[20px] text-outline">
                                        badge
                                    </span>
                                    <input
                                        id="create-user-name"
                                        type="text"
                                        autoComplete="name"
                                        autoFocus
                                        required
                                        value={createForm.data.name}
                                        onChange={(event) => createForm.setData('name', event.target.value)}
                                        placeholder="Contoh: dr. Sinta Maharani"
                                        className="w-full rounded-xl bg-surface-container-low py-2.5 pr-3 pl-11 font-body-md text-body-md text-on-surface transition-all placeholder:text-outline focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                    />
                                </div>
                                {createForm.errors.name && (
                                    <p className="font-label-sm text-label-sm font-medium text-error">
                                        {createForm.errors.name}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="create-user-email" className="font-label-md text-label-md text-on-surface">
                                    Email
                                </label>
                                <div className="relative flex items-center">
                                    <span className="material-symbols-outlined pointer-events-none absolute left-3.5 text-[20px] text-outline">
                                        mail
                                    </span>
                                    <input
                                        id="create-user-email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        value={createForm.data.email}
                                        onChange={(event) => createForm.setData('email', event.target.value)}
                                        placeholder="nama@hospital.id"
                                        className="w-full rounded-xl bg-surface-container-low py-2.5 pr-3 pl-11 font-body-md text-body-md text-on-surface transition-all placeholder:text-outline focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                    />
                                </div>
                                {createForm.errors.email && (
                                    <p className="font-label-sm text-label-sm font-medium text-error">
                                        {createForm.errors.email}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="create-user-role" className="font-label-md text-label-md text-on-surface">
                                    Role &amp; Hak Akses
                                </label>
                                <div className="relative">
                                    <select
                                        id="create-user-role"
                                        value={createForm.data.role}
                                        onChange={(event) =>
                                            createForm.setData('role', event.target.value as CreateRole)
                                        }
                                        required
                                        className="w-full cursor-pointer appearance-none rounded-xl bg-surface-container-low py-2.5 pr-10 pl-3 font-body-md text-body-md text-on-surface transition-colors hover:bg-surface-container focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                    >
                                        <option value="" disabled>
                                            Pilih role pengguna...
                                        </option>
                                        <option value="dokter">Dokter (Prescriber)</option>
                                        <option value="farmasi">Apoteker &amp; Farmasi</option>
                                        <option value="admin">Administrator SIMRS</option>
                                    </select>
                                    <span className="material-symbols-outlined pointer-events-none absolute top-1/2 right-3 text-[20px] -translate-y-1/2 text-outline">
                                        expand_more
                                    </span>
                                </div>
                                {createForm.errors.role && (
                                    <p className="font-label-sm text-label-sm font-medium text-error">
                                        {createForm.errors.role}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="create-user-password" className="font-label-md text-label-md text-on-surface">
                                    Password Awal
                                </label>
                                <div className="relative flex items-center">
                                    <span className="material-symbols-outlined pointer-events-none absolute left-3.5 text-[20px] text-outline">
                                        lock
                                    </span>
                                    <input
                                        id="create-user-password"
                                        type={createShowPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        required
                                        value={createForm.data.password}
                                        onChange={(event) => createForm.setData('password', event.target.value)}
                                        placeholder="Minimal 8 karakter"
                                        className="w-full rounded-xl bg-surface-container-low py-2.5 pr-12 pl-11 font-body-md text-body-md text-on-surface transition-all placeholder:text-outline focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setCreateShowPassword((value) => !value)}
                                        aria-label={createShowPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                                        className="absolute right-3.5 rounded-md p-0.5 text-outline transition-colors hover:text-on-surface focus:outline-none"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">
                                            {createShowPassword ? 'visibility_off' : 'visibility'}
                                        </span>
                                    </button>
                                </div>
                                {createForm.errors.password && (
                                    <p className="font-label-sm text-label-sm font-medium text-error">
                                        {createForm.errors.password}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                <label
                                    htmlFor="create-user-password-confirmation"
                                    className="font-label-md text-label-md text-on-surface"
                                >
                                    Konfirmasi Password
                                </label>
                                <div className="relative flex items-center">
                                    <span className="material-symbols-outlined pointer-events-none absolute left-3.5 text-[20px] text-outline">
                                        lock
                                    </span>
                                    <input
                                        id="create-user-password-confirmation"
                                        type={createShowConfirmation ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        required
                                        value={createForm.data.password_confirmation}
                                        onChange={(event) =>
                                            createForm.setData('password_confirmation', event.target.value)
                                        }
                                        placeholder="Ulangi password awal"
                                        className="w-full rounded-xl bg-surface-container-low py-2.5 pr-12 pl-11 font-body-md text-body-md text-on-surface transition-all placeholder:text-outline focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setCreateShowConfirmation((value) => !value)}
                                        aria-label={
                                            createShowConfirmation
                                                ? 'Sembunyikan konfirmasi password'
                                                : 'Tampilkan konfirmasi password'
                                        }
                                        className="absolute right-3.5 rounded-md p-0.5 text-outline transition-colors hover:text-on-surface focus:outline-none"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">
                                            {createShowConfirmation ? 'visibility_off' : 'visibility'}
                                        </span>
                                    </button>
                                </div>
                                {createForm.errors.password_confirmation && (
                                    <p className="font-label-sm text-label-sm font-medium text-error">
                                        {createForm.errors.password_confirmation}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={closeCreateModal}
                                    disabled={createForm.processing}
                                    className="rounded-xl border border-outline-variant px-4 py-2.5 font-label-md text-label-md text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={createForm.processing}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-label-md text-label-md text-on-primary shadow-sm transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-75"
                                >
                                    {createForm.processing && (
                                        <span className="material-symbols-outlined text-[16px] animate-spin">
                                            progress_activity
                                        </span>
                                    )}
                                    <span>
                                        {createForm.processing ? 'Menyimpan...' : 'Buat Akun Pengguna'}
                                    </span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {editTarget && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/50 p-4 backdrop-blur-sm"
                    onClick={closeEditModal}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="edit-user-title"
                        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-surface-container-lowest shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-space-md border-b border-surface-container-low p-space-md">
                            <div className="flex items-start gap-space-sm">
                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary">
                                    <span className="material-symbols-outlined text-[20px]">edit_note</span>
                                </div>
                                <div>
                                    <h3 id="edit-user-title" className="font-headline-sm text-headline-sm text-on-surface">
                                        Edit Data Staf
                                    </h3>
                                    <p className="font-body-sm text-body-sm mt-0.5 text-on-surface-variant">
                                        Perbarui identitas dan role pengguna.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={closeEditModal}
                                disabled={editForm.processing}
                                aria-label="Tutup"
                                className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>

                        <form onSubmit={submitEdit} className="flex flex-col gap-space-lg p-space-md">
                            <div className="flex flex-col gap-2">
                                <label htmlFor="edit-user-name" className="font-label-md text-label-md text-on-surface">
                                    Nama Lengkap
                                </label>
                                <div className="relative flex items-center">
                                    <span className="material-symbols-outlined pointer-events-none absolute left-3.5 text-[20px] text-outline">
                                        badge
                                    </span>
                                    <input
                                        id="edit-user-name"
                                        type="text"
                                        autoComplete="name"
                                        autoFocus
                                        required
                                        value={editForm.data.name}
                                        onChange={(event) => editForm.setData('name', event.target.value)}
                                        placeholder="Nama lengkap staf"
                                        className="w-full rounded-xl bg-surface-container-low py-2.5 pr-3 pl-11 font-body-md text-body-md text-on-surface transition-all placeholder:text-outline focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                    />
                                </div>
                                {editForm.errors.name && (
                                    <p className="font-label-sm text-label-sm font-medium text-error">
                                        {editForm.errors.name}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="edit-user-email" className="font-label-md text-label-md text-on-surface">
                                    Email
                                </label>
                                <div className="relative flex items-center">
                                    <span className="material-symbols-outlined pointer-events-none absolute left-3.5 text-[20px] text-outline">
                                        mail
                                    </span>
                                    <input
                                        id="edit-user-email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        value={editForm.data.email}
                                        onChange={(event) => editForm.setData('email', event.target.value)}
                                        placeholder="nama@hospital.id"
                                        className="w-full rounded-xl bg-surface-container-low py-2.5 pr-3 pl-11 font-body-md text-body-md text-on-surface transition-all placeholder:text-outline focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                    />
                                </div>
                                {editForm.errors.email && (
                                    <p className="font-label-sm text-label-sm font-medium text-error">
                                        {editForm.errors.email}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="edit-user-role" className="font-label-md text-label-md text-on-surface">
                                    Role &amp; Hak Akses
                                </label>
                                <div className="relative">
                                    <select
                                        id="edit-user-role"
                                        value={editForm.data.role}
                                        onChange={(event) => editForm.setData('role', event.target.value as Role)}
                                        required
                                        className="w-full cursor-pointer appearance-none rounded-xl bg-surface-container-low py-2.5 pr-10 pl-3 font-body-md text-body-md text-on-surface transition-colors hover:bg-surface-container focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                    >
                                        <option value="dokter">Dokter (Prescriber)</option>
                                        <option value="farmasi">Apoteker &amp; Farmasi</option>
                                        <option value="admin">Administrator SIMRS</option>
                                    </select>
                                    <span className="material-symbols-outlined pointer-events-none absolute top-1/2 right-3 text-[20px] -translate-y-1/2 text-outline">
                                        expand_more
                                    </span>
                                </div>
                                {editForm.errors.role && (
                                    <p className="font-label-sm text-label-sm font-medium text-error">
                                        {editForm.errors.role}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={closeEditModal}
                                    disabled={editForm.processing}
                                    className="rounded-xl border border-outline-variant px-4 py-2.5 font-label-md text-label-md text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={editForm.processing}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-label-md text-label-md text-on-primary shadow-sm transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-75"
                                >
                                    {editForm.processing && (
                                        <span className="material-symbols-outlined text-[16px] animate-spin">
                                            progress_activity
                                        </span>
                                    )}
                                    <span>{editForm.processing ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
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
