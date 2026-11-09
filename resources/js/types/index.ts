export type Role = 'dokter' | 'farmasi' | 'admin';

export interface AuthUser {
    id: number;
    name: string;
    email: string;
    role: Role;
}

export interface SharedProps {
    auth: {
        user: AuthUser | null;
    };
    flash: {
        success?: string | null;
        error?: string | null;
    };
    [key: string]: unknown;
}
