import { DeveloperRecord, UserRole, AdminUser } from './types';

export const CURRENT_USER_ROLE = UserRole.SUPER_ADMIN;

// No mock data for developers. The app relies on CSV upload.
export const GENERATE_MOCK_DEVELOPERS = (): DeveloperRecord[] => [];

// Hardcoded Team Members (Pre-seeded for development/fallback)
// This list acts as both the "God Mode" access list and the default table data.
export const MOCK_ADMIN_TEAM: AdminUser[] = [
    {
        id: 'god_mode_youssef_1',
        name: 'Youssef Seghaier',
        email: 'youssef@darblockchain.io',
        role: UserRole.SUPER_ADMIN,
        assignedCodes: [], 
        lastLogin: new Date().toISOString(),
        status: 'Active'
    },
    {
        id: 'god_mode_youssef_2',
        name: 'Youssef Seghaier',
        email: 'youssef.seghaier@gmail.com',
        role: UserRole.SUPER_ADMIN,
        assignedCodes: [], 
        lastLogin: new Date().toISOString(),
        status: 'Active'
    },
    {
        id: 'god_mode_talel',
        name: 'Talel Ben Ghorbel',
        email: 'talel@darblockchain.io',
        role: UserRole.SUPER_ADMIN,
        assignedCodes: [], 
        lastLogin: new Date().toISOString(),
        status: 'Active'
    },
    {
        id: 'god_mode_talel_gmail',
        name: 'Talel Ben Ghorbel',
        email: 'talelbenghorbel@gmail.com',
        role: UserRole.SUPER_ADMIN,
        assignedCodes: [],
        lastLogin: new Date().toISOString(),
        status: 'Active'
    },
    {
        id: 'god_mode_admin_dar',
        name: 'Dar Blockchain Admin',
        email: 'admin@darblockchain.io',
        role: UserRole.SUPER_ADMIN,
        assignedCodes: [], 
        lastLogin: new Date().toISOString(),
        status: 'Active'
    },
    {
        id: 'community_admin_john',
        name: 'John Ojelola',
        email: 'johnojelola2@gmail.com',
        role: UserRole.COMMUNITY_ADMIN,
        assignedCodes: ['JTConnect'],
        lastLogin: '2024-02-20T14:30:00Z',
        status: 'Active'
    }
];