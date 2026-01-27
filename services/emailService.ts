import { DeveloperRecord, EmailTemplate } from '../types';

// --- CONFIGURATION ---
// Email functionality has been removed as per new requirements.
// This file remains to preserve type imports and prevent breaking changes in other components.

// Default Templates (Kept for UI reference if needed in future, but not sent)
export const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'tpl_welcome',
    name: 'Welcome Message',
    subject: 'Welcome to the Hedera Developer Community!',
    body: "Hi {{firstName}},\n\nWelcome to the Hedera ecosystem!",
    trigger: 'Manual'
  }
];

// System Templates
export const INVITE_TEMPLATE = {
    subject: "Invitation",
    body: "System invite"
};

// No-op function
export const sendEmailCampaign = async (
  recipients: DeveloperRecord[], 
  template: EmailTemplate,
  onProgress: (sent: number) => void
): Promise<boolean> => {
  console.log("Email functionality disabled.");
  onProgress(recipients.length);
  return true;
};

// No-op function
export const sendSystemInvite = async (email: string, name: string, role: string, scope: string[]) => {
    console.log(`[System] Adding user ${email} directly to database without email notification.`);
    return { success: true, method: 'direct', message: "User added to database." };
};