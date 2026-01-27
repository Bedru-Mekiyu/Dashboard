import React, { useState, useMemo, useRef } from 'react';
import { AdminUser, CommunityMasterRecord, DeveloperRecord, UserRole } from '../types';
import { addAdmin, updateMasterRegistry } from '../services/firebaseService';
import { Users, Shield, Map, Upload, Search, Trash2, CheckCircle, AlertCircle, Plus, Save, FileSpreadsheet, X, Link, ChevronDown, UserPlus, Loader2, Database } from 'lucide-react';

interface AdminSettingsProps {
  data: DeveloperRecord[];
  admins: AdminUser[];
  masterRegistry: CommunityMasterRecord[];
  onDeleteAdmin: (id: string) => Promise<void>;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ data, admins, masterRegistry, onDeleteAdmin }) => {
  const [activeTab, setActiveTab] = useState<'team' | 'registry'>('team');
  const [showAddUser, setShowAddUser] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  
  // Track deleting state for individual admin IDs
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [newUser, setNewUser] = useState<{name: string, email: string, role: UserRole, codes: string[]}>({
      name: '', email: '', role: UserRole.COMMUNITY_ADMIN, codes: []
  });
  const [partnerSearch, setPartnerSearch] = useState('');
  const registryInputRef = useRef<HTMLInputElement>(null);

  const activePartners = useMemo(() => {
      const set = new Set(data.map(d => d.partnerCode).filter(c => c && c !== 'UNKNOWN'));
      return Array.from(set).sort();
  }, [data]);

  const filteredPartners = useMemo(() => {
      if (!partnerSearch) return activePartners;
      return activePartners.filter(p => p.toLowerCase().includes(partnerSearch.toLowerCase()));
  }, [activePartners, partnerSearch]);

  const handleAddUser = async () => {
      if (!newUser.name || !newUser.email) return;
      
      setIsAdding(true);
      setAddSuccess(null);

      try {
        // 1. Add to Database Directly (No Email)
        const newAdmin: AdminUser = {
            id: `adm_${Date.now()}`,
            name: newUser.name,
            email: newUser.email.trim().toLowerCase(), // SANITIZATION: Strict Lowercase + Trim
            role: newUser.role,
            assignedCodes: newUser.role === UserRole.SUPER_ADMIN ? [] : newUser.codes,
            lastLogin: 'Never',
            status: 'Active' // Direct add implies active
        };
        await addAdmin(newAdmin);

        // Update UI with feedback indicating Dashboard Configuration
        setAddSuccess(`${newUser.role} Added. Dashboard Configured.`);
        
        // Reset form after delay
        setTimeout(() => {
            setShowAddUser(false);
            setNewUser({ name: '', email: '', role: UserRole.COMMUNITY_ADMIN, codes: [] });
            setAddSuccess(null);
            setIsAdding(false);
        }, 2000);

      } catch (error) {
          console.error("Add failed", error);
          setIsAdding(false);
      }
  };

  const handleDeleteUser = async (id: string) => {
      if (confirm('Are you sure you want to remove this team member? They will lose access immediately.')) {
          setDeletingId(id);
          try {
              await onDeleteAdmin(id);
              // Do NOT reset deletingId here, as the row will disappear
          } catch (error) {
              console.error("Failed to delete admin:", error);
              setDeletingId(null);
              alert("Failed to delete administrator. Please try again.");
          }
      }
  };

  const toggleCodeSelection = (code: string) => {
      if (newUser.role === UserRole.COMMUNITY_ADMIN) {
          setNewUser({ ...newUser, codes: [code] });
      } else {
          const exists = newUser.codes.includes(code);
          setNewUser({ ...newUser, codes: exists ? newUser.codes.filter(c => c !== code) : [...newUser.codes, code] });
      }
  };

  const handleRegistryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
          const text = event.target?.result as string;
          if (!text) return;
          const lines = text.split(/\r\n|\n/).filter(l => l.trim().length > 0);
          const records: CommunityMasterRecord[] = [];
          const startIndex = lines[0].toLowerCase().includes('code') ? 1 : 0;
          for (let i = startIndex; i < lines.length; i++) {
              const cols = lines[i].split(/,|;/).map(c => c.trim().replace(/"/g, ''));
              if (cols.length >= 1) {
                  records.push({ code: cols[0], name: cols[1] || cols[0], region: cols[2] || 'Global', managerEmail: cols[3] });
              }
          }
          await updateMasterRegistry(records);
      };
      reader.readAsText(file);
  };

  const registryStats = useMemo(() => {
      if (masterRegistry.length === 0) return null;
      const masterSet = new Set(masterRegistry.map(r => r.code));
      const healthy = masterRegistry.filter(r => activePartners.includes(r.code));
      const inactive = masterRegistry.filter(r => !activePartners.includes(r.code));
      const rogue = activePartners.filter(c => !masterSet.has(c));
      return { healthy, inactive, rogue };
  }, [masterRegistry, activePartners]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin & Settings</h1><p className="text-slate-500 dark:text-slate-400">Manage your team hierarchy and official community registry.</p></div>
      </div>
      <div className="flex border-b border-slate-200 dark:border-white/10 gap-8">
          <button onClick={() => setActiveTab('team')} className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'team' ? 'border-[#2a00ff] text-[#2a00ff]' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-300'}`}>Team Management</button>
          <button onClick={() => setActiveTab('registry')} className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'registry' ? 'border-[#2a00ff] text-[#2a00ff]' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-300'}`}>Community Registry (Active vs Official)</button>
      </div>

      {activeTab === 'team' && (
          <div className="space-y-6">
              <div className="bg-white dark:bg-[#1c1b22] rounded-xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                      <h3 className="font-bold text-slate-800 dark:text-white">Authorized Administrators</h3>
                      <button onClick={() => setShowAddUser(true)} className="px-4 py-2 bg-[#2a00ff] hover:bg-[#2200cc] text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-[#2a00ff]/20 transition-all"><Plus className="w-4 h-4" /> Invite New Admin</button>
                  </div>
                  {showAddUser && (
                      <div className="p-6 bg-blue-50 dark:bg-[#2a00ff]/10 border-b border-blue-100 dark:border-[#2a00ff]/20 animate-fade-in">
                          <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2"><UserPlus className="w-4 h-4" /> Add New Team Member</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
                              <div><label className="block text-xs font-medium mb-1 opacity-70">Name</label><input value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full p-2.5 border border-blue-200 dark:border-blue-800 rounded-lg text-sm bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="John Doe" /></div>
                              <div><label className="block text-xs font-medium mb-1 opacity-70">Email</label><input value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full p-2.5 border border-blue-200 dark:border-blue-800 rounded-lg text-sm bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="john@company.com" /></div>
                              <div>
                                  <label className="block text-xs font-medium mb-1 opacity-70">Role</label>
                                  <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole, codes: []})} className="w-full p-2.5 border border-blue-200 dark:border-blue-800 rounded-lg text-sm bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none">
                                      <option value={UserRole.COMMUNITY_ADMIN}>{UserRole.COMMUNITY_ADMIN}</option>
                                      <option value={UserRole.REGIONAL_ADMIN}>{UserRole.REGIONAL_ADMIN}</option>
                                      <option value={UserRole.SUPER_ADMIN}>{UserRole.SUPER_ADMIN}</option>
                                  </select>
                              </div>
                              <div>
                                  <div className="flex justify-between items-center mb-1"><label className="block text-xs font-medium opacity-70">{newUser.role === UserRole.SUPER_ADMIN ? 'Access' : 'Partner Scope'}</label> {newUser.codes.length > 0 && <span className="text-[10px] font-bold bg-blue-200 dark:bg-blue-800 px-1.5 rounded">{newUser.codes.length}</span>}</div>
                                  {newUser.role === UserRole.SUPER_ADMIN ? <div className="w-full p-2.5 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 rounded-lg text-sm font-bold border border-blue-200 dark:border-blue-800 flex items-center gap-2"><Shield className="w-4 h-4" /> Global Access</div> : (
                                      <div className="relative">
                                          <div className="relative mb-1"><Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-blue-400" /><input value={partnerSearch} onChange={e => setPartnerSearch(e.target.value)} placeholder="Search partners..." className="w-full pl-7 p-1.5 text-xs border border-blue-200 dark:border-blue-800 rounded-t-lg bg-white dark:bg-slate-900 outline-none" /></div>
                                          <div className="w-full p-2.5 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-b-lg text-sm max-h-40 overflow-y-auto grid grid-cols-1 gap-1">
                                              {filteredPartners.map(partner => (
                                                  <label key={partner} className="flex items-center gap-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 p-1.5 rounded transition-colors"><input type={newUser.role === UserRole.COMMUNITY_ADMIN ? 'radio' : 'checkbox'} checked={newUser.codes.includes(partner)} onChange={() => toggleCodeSelection(partner)} className="rounded text-blue-600 focus:ring-0" /><span className="text-xs font-medium">{partner}</span></label>
                                              ))}
                                              {filteredPartners.length === 0 && <div className="text-xs text-slate-400 italic p-2 text-center">No partners found</div>}
                                          </div>
                                      </div>
                                  )}
                              </div>
                          </div>
                          
                          <div className="flex justify-between items-center">
                              <div className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-2">
                                  {addSuccess && <><CheckCircle className="w-4 h-4" /> {addSuccess}</>}
                              </div>
                              <div className="flex justify-end gap-3">
                                  <button onClick={() => setShowAddUser(false)} disabled={isAdding} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium">Cancel</button>
                                  <button onClick={handleAddUser} disabled={isAdding || !newUser.name || !newUser.email || (newUser.role !== UserRole.SUPER_ADMIN && newUser.codes.length === 0)} className="px-6 py-2 bg-[#2a00ff] text-white rounded-lg text-sm font-bold shadow-lg shadow-[#2a00ff]/20 hover:bg-[#2200cc] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all">
                                      {isAdding ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Add User'}
                                  </button>
                              </div>
                          </div>
                      </div>
                  )}
                  <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-white/5">
                          <tr>
                              <th className="px-6 py-4">Admin User</th>
                              <th className="px-6 py-4">Role</th>
                              <th className="px-6 py-4">Assigned Partner Scope</th>
                              <th className="px-6 py-4">Status</th>
                              <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                          {admins.map(admin => (
                              <tr key={admin.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                  <td className="px-6 py-4">
                                      <div className="font-bold text-slate-900 dark:text-white">{admin.name}</div>
                                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{admin.email}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <span className={`px-3 py-1 rounded text-xs font-bold border ${admin.role === UserRole.SUPER_ADMIN ? 'bg-purple-100 dark:bg-[#a522dd]/10 text-purple-700 dark:text-[#a522dd] border-purple-200 dark:border-[#a522dd]/20' : 'bg-blue-100 dark:bg-[#2a00ff]/10 text-blue-700 dark:text-[#2a00ff] border-blue-200 dark:border-[#2a00ff]/20'}`}>
                                          {admin.role === UserRole.SUPER_ADMIN ? 'Super Admin' : (admin.role.split(' ')[0] || 'Admin')}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium italic">
                                          <Shield className="w-3.5 h-3.5" />
                                          {admin.role === UserRole.SUPER_ADMIN ? 'Global Access' : (admin.assignedCodes?.join(', ') || 'No Scope')}
                                      </div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="flex items-center gap-2 text-xs font-bold text-green-600 dark:text-green-400">
                                          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
                                          {admin.status || 'Active'}
                                      </div>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      <button onClick={() => handleDeleteUser(admin.id)} disabled={deletingId === admin.id} className="text-slate-400 hover:text-red-500 p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait" title="Remove Admin">
                                          {deletingId === admin.id ? <Loader2 className="w-4 h-4 animate-spin text-[#2a00ff]" /> : <Trash2 className="w-4 h-4" />}
                                      </button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
                  {admins.length === 0 && (
                      <div className="p-8 text-center text-slate-500 dark:text-slate-400">No administrators found. Invite your first team member.</div>
                  )}
              </div>
          </div>
      )}

      {activeTab === 'registry' && (
          <div className="glass-panel p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                  <div><h3 className="font-bold text-slate-900 dark:text-white">Official Registry</h3><p className="text-slate-500 text-sm">Upload master CSV (Code, Name, Region).</p></div>
                  <button onClick={() => registryInputRef.current?.click()} className="px-4 py-2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"><Upload className="w-4 h-4 inline mr-2" /> Upload</button>
                  <input type="file" ref={registryInputRef} className="hidden" onChange={handleRegistryUpload} accept=".csv" />
              </div>
              {registryStats && (
                  <div className="grid grid-cols-3 gap-6">
                      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800"><h4 className="font-bold text-green-800 dark:text-green-300">Healthy ({registryStats.healthy.length})</h4></div>
                      <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700"><h4 className="font-bold text-slate-700 dark:text-slate-300">Inactive ({registryStats.inactive.length})</h4></div>
                      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800"><h4 className="font-bold text-red-800 dark:text-red-300">Rogue ({registryStats.rogue.length})</h4></div>
                  </div>
              )}
          </div>
      )}
    </div>
  );
};