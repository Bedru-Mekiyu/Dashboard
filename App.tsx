import React, { useState, useMemo, useEffect } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { MembershipDashboard } from './components/MembershipDashboard';
import { UserTable } from './components/UserTable';
import { CsvUploader } from './components/CsvUploader';
import { Invoicing } from './components/Invoicing';
import { EventManagement } from './components/EventManagement';
import { SmartOutreach } from './components/SmartOutreach';
import { AdminSettings } from './components/AdminSettings';
import { Reporting } from './components/Reporting';
import { Login } from './components/Login';
import { MOCK_ADMIN_TEAM } from './constants';
import { 
  DeveloperRecord, 
  DatasetVersion, 
  AdminUser, 
  Invoice, 
  CommunityAgreement, 
  CommunityEvent, 
  OutreachCampaign, 
  CommunityMasterRecord,
  TimeframeOption,
  UserRole
} from './types';
import { 
    listenToBatches, 
    listenToDeveloperData,
    deleteBatch, 
    listenToAdmins,
    listenToAdminProfile,
    listenToInvoices,
    listenToAgreements,
    listenToEvents,
    listenToCampaigns,
    listenToRegistryDoc,
    deleteAdmin // Imported deleteAdmin
} from './services/firebaseService';
import { Database, ChevronDown, Layers, Sun, Moon, CheckCircle, LogOut, Loader2, Lock, AlertTriangle } from 'lucide-react';

function App() {
  // --- AUTH STATE ---
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Permissions & Role State
  const [myAdminProfile, setMyAdminProfile] = useState<AdminUser | null>(null);
  // Default to true to prevent premature "Access Pending" rendering
  const [profileLoading, setProfileLoading] = useState(true);
  
  // Initialize with MOCK_ADMIN_TEAM to ensure data appears immediately
  const [admins, setAdmins] = useState<AdminUser[]>(MOCK_ADMIN_TEAM);
  
  // Track deleted mock IDs locally with Persistence
  const [deletedIds, setDeletedIds] = useState<string[]>(() => {
      try {
          const saved = localStorage.getItem('deleted_admin_ids');
          return saved ? JSON.parse(saved) : [];
      } catch (e) { return []; }
  });

  // Persist deleted IDs
  useEffect(() => {
      localStorage.setItem('deleted_admin_ids', JSON.stringify(deletedIds));
  }, [deletedIds]);

  // --- APP STATE ---
  const [currentView, setCurrentView] = useState('dashboard');
  const [versions, setVersions] = useState<DatasetVersion[]>([]);
  
  // Initialize activeVersionId from localStorage to persist across reloads
  const [activeVersionId, setActiveVersionId] = useState<string | null>(() => {
      try {
        return localStorage.getItem('active_version_id');
      } catch (e) { return null; }
  });

  const [developerData, setDeveloperData] = useState<DeveloperRecord[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  
  const [viewParams, setViewParams] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // --- GLOBAL TIME STATE ---
  const [globalTimeframe, setGlobalTimeframe] = useState<TimeframeOption>('All Time');
  const [globalStartDate, setGlobalStartDate] = useState<string>('');
  const [globalEndDate, setGlobalEndDate] = useState<string>('');

  // --- PERSISTENT AI SUMMARY STATE ---
  const [dashboardAiSummary, setDashboardAiSummary] = useState<string>("Waiting for data...");
  const [dashboardAiContext, setDashboardAiContext] = useState<string>("");

  // --- GLOBAL PERSISTENT STATE ---
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [agreements, setAgreements] = useState<CommunityAgreement[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [campaigns, setCampaigns] = useState<OutreachCampaign[]>([]);
  const [masterRegistry, setMasterRegistry] = useState<CommunityMasterRecord[]>([]);

  // Persist activeVersionId to localStorage
  useEffect(() => {
      if (activeVersionId) {
          localStorage.setItem('active_version_id', activeVersionId);
      } else {
          localStorage.removeItem('active_version_id');
      }
  }, [activeVersionId]);

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // CRITICAL FIX: Immediately set profileLoading to true when a user is detected.
      // This prevents the "Access Pending" screen from flashing while the profile is being fetched.
      if (currentUser) {
          setProfileLoading(true);
      }

      setUser(currentUser);
      setAuthLoading(false);
      
      if (!currentUser) {
          setMyAdminProfile(null);
          // Only set profileLoading to false if there is NO user (Access Pending logic doesn't apply here)
          setProfileLoading(false);
          // Reset navigation state on logout so user lands on dashboard upon next login
          setCurrentView('dashboard');
          setViewParams(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Profile Listener (Determine Role)
  useEffect(() => {
      if (!user) return;
      
      // Safety check: ensure loading is true when we start this effect
      setProfileLoading(true);
      
      const email = user.email?.trim().toLowerCase() || '';

      // Hardcoded God Mode for dev fallback
      const GOD_MODE_EMAILS = [
          'talelbenghorbel@gmail.com', 
          'youssef@darblockchain.io', 
          'youssef.seghaier@gmail.com',
          'admin@darblockchain.io'
      ];
      if (GOD_MODE_EMAILS.includes(email)) {
           setMyAdminProfile({
              id: 'god_mode',
              name: 'Super Admin',
              email: email,
              role: UserRole.SUPER_ADMIN,
              assignedCodes: [],
              lastLogin: new Date().toISOString(),
              status: 'Active'
           });
           setProfileLoading(false);
           return;
      }

      const unsub = listenToAdminProfile(email, (profile) => {
          if (profile) {
              setMyAdminProfile(profile);
          } else {
              // Fallback to Mock Data if not found in DB
              // This fixes the "Access Pending" issue for pre-configured mock admins like John Ojelola
              // Also checks if the mock ID has been "deleted" locally
              const mockProfile = MOCK_ADMIN_TEAM.find(m => m.email.toLowerCase() === email && !deletedIds.includes(m.id));
              setMyAdminProfile(mockProfile || null);
          }
          setProfileLoading(false);
      });
      return () => unsub();
  }, [user, deletedIds]);

  // 3. Generic Data Listeners (Always active for syncing)
  useEffect(() => {
      if (!user) return;
      const unsubBatches = listenToBatches(setVersions);
      const unsubInvoices = listenToInvoices(setInvoices);
      const unsubAgreements = listenToAgreements(setAgreements);
      const unsubEvents = listenToEvents(setEvents);
      const unsubCampaigns = listenToCampaigns(setCampaigns);
      const unsubRegistry = listenToRegistryDoc(setMasterRegistry);

      return () => {
          unsubBatches();
          unsubInvoices();
          unsubAgreements();
          unsubEvents();
          unsubCampaigns();
          unsubRegistry();
      };
  }, [user]);

  // 4. Super Admin Specifics (Full Admin List)
  useEffect(() => {
      if (myAdminProfile?.role === UserRole.SUPER_ADMIN) {
          const unsub = listenToAdmins((dbAdmins) => {
              // Robustness: Merge real DB admins with critical Mock admins to ensure list is never empty during dev/setup
              // Priority is given to DB admins, but we ensure MOCK data persists if not found in DB
              const dbEmails = new Set(dbAdmins.map(a => a.email.toLowerCase()));
              const missingMocks = MOCK_ADMIN_TEAM.filter(m => 
                  !dbEmails.has(m.email.toLowerCase()) && 
                  !deletedIds.includes(m.id) // Filter out deleted mocks
              );
              
              setAdmins([...dbAdmins, ...missingMocks]);
          });
          return () => unsub();
      }
  }, [myAdminProfile, deletedIds]);

  // Handle Deletion (Local Mock or DB)
  const handleDeleteAdmin = async (id: string) => {
      // Determine if it is a mock user or real user
      const isMock = MOCK_ADMIN_TEAM.some(m => m.id === id);
      if (isMock) {
          setDeletedIds(prev => [...prev, id]);
      } else {
          await deleteAdmin(id);
      }
  };

  // 5. DATA LOADING & SCOPE FILTERING (CRITICAL)
  useEffect(() => {
      let unsubscribe: (() => void) | undefined;

      // Logic: If version is selected, and profile is loaded...
      if (activeVersionId && !authLoading && !profileLoading) {
          if (!myAdminProfile) {
              setDeveloperData([]);
              return;
          }

          setLoadingData(true);
          
          // Switch to Listener for Persistence, matching Settings/Admin behavior
          unsubscribe = listenToDeveloperData(activeVersionId, (rawData) => {
              // Fallback logic: If persisted ID is stale (returns no data) but we have versions available
              if (rawData.length === 0 && versions.length > 0) {
                  const currentIdValid = versions.some(v => v.id === activeVersionId);
                  if (!currentIdValid) {
                      console.warn("Active version ID invalid or deleted, falling back to latest.");
                      setActiveVersionId(versions[0].id);
                      return; // Effect will re-run with new ID
                  }
              }

              if (myAdminProfile.role === UserRole.SUPER_ADMIN) {
                  // Super Admin: View ALL data
                  setDeveloperData(rawData);
              } else {
                  // Restricted Role: Filter data by assignedCodes (Partner Scopes)
                  const allowedCodes = (myAdminProfile.assignedCodes || []).map(c => c.toLowerCase().trim());
                  
                  // Filter raw CSV data to match the admin's assigned partners
                  const filtered = rawData.filter(record => {
                      const recordCode = (record.partnerCode || '').toLowerCase().trim();
                      return allowedCodes.includes(recordCode);
                  });
                  setDeveloperData(filtered);
              }
              setLoadingData(false);
          });
      } else if (versions.length > 0 && !activeVersionId) {
          // Auto-select most recent version if none selected
          setActiveVersionId(versions[0].id);
      }

      return () => {
          if (unsubscribe) unsubscribe();
      };
  }, [activeVersionId, versions.length, authLoading, profileLoading, myAdminProfile]);

  // --- UI HELPERS ---
  const isSuperAdmin = myAdminProfile?.role === UserRole.SUPER_ADMIN;

  const handleLogout = async () => {
    try { await signOut(auth); } catch (error) { console.error("Logout failed", error); }
  };

  const handleSidebarNavigate = (view: string) => { 
      // RBAC for Navigation: Allow Dashboard AND Reporting for non-super admins
      if (!isSuperAdmin && !['dashboard', 'reporting'].includes(view)) return;
      setViewParams(null); 
      setCurrentView(view); 
  };
  
  const handleNavigate = (view: string, params?: any) => { 
      // RBAC for Navigation: Allow Dashboard AND Reporting for non-super admins
      if (!isSuperAdmin && !['dashboard', 'reporting'].includes(view)) return;
      setViewParams(params || null); 
      setCurrentView(view); 
  };

  // UPLOAD HANDLER - CONNECTS UPLOADER TO APP STATE
  const handleDataLoaded = (newData: DeveloperRecord[], fileName: string, batchId?: string) => {
      // 1. Optimistic Update (Immediate Feedback)
      if (isSuperAdmin) {
          setDeveloperData(newData);
      }
      
      // 2. Switch Context to New Batch (Triggers Effect)
      if (batchId) {
          setActiveVersionId(batchId);
      }
  };

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // --- RENDER ---
  if (authLoading || (profileLoading && user)) {
    return (
      <div className="min-h-screen bg-[#141319] flex items-center justify-center">
        <div className="text-center">
            <Loader2 className="w-8 h-8 text-[#2a00ff] animate-spin mx-auto mb-4" />
            <p className="text-slate-500 text-sm font-medium">Authenticating Secure Access...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Login />;

  // ACCESS PENDING SCREEN
  if (!myAdminProfile) {
        return (
            <div className="min-h-screen bg-[#141319] flex items-center justify-center p-8">
                <div className="max-w-md w-full text-center space-y-6">
                    <div className="inline-flex p-4 bg-red-500/10 text-red-500 rounded-full mb-4 ring-1 ring-red-500/20">
                        <AlertTriangle className="w-12 h-12" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Access Pending</h2>
                    <p className="text-slate-400">
                        Your account <strong>{user.email}</strong> is registered but has not been assigned a role or partner scope yet.
                    </p>
                    <div className="bg-[#1c1b22] p-4 rounded-xl border border-white/5 text-sm text-slate-400">
                        Please contact the Global Super Admin to configure your dashboard access.
                    </div>
                    <button onClick={handleLogout} className="px-8 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-all">
                        Sign Out
                    </button>
                </div>
            </div>
        );
  }

  const userScopeLabel = isSuperAdmin ? 'Global HQ' : myAdminProfile.assignedCodes.join(', ') || 'No Scope';
  const activeVersionName = versions.find(v => v.id === activeVersionId)?.fileName || 'Unknown Version';

  const renderContent = () => {
    // Show spinner if data is actively fetching
    if (loadingData && currentView === 'dashboard') {
        return <div className="p-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-[#2a00ff]" /><p className="mt-4 text-slate-500">Syncing Blockchain Data...</p></div>;
    }

    if (!isSuperAdmin && !['dashboard', 'reporting'].includes(currentView)) {
        return <div className="p-20 text-center text-slate-500">Access Restricted</div>;
    }

    switch (currentView) {
      case 'dashboard': return (
          <div className="space-y-6">
            <Dashboard 
                data={developerData} 
                onNavigate={isSuperAdmin ? handleNavigate : () => {}} 
                timeframe={globalTimeframe}
                setTimeframe={setGlobalTimeframe}
                startDate={globalStartDate}
                setStartDate={setGlobalStartDate}
                endDate={globalEndDate}
                setEndDate={setGlobalEndDate}
                // AI Props
                aiSummary={dashboardAiSummary}
                setAiSummary={setDashboardAiSummary}
                aiContext={dashboardAiContext}
                setAiContext={setDashboardAiContext}
            />
            {/* Initial Setup for Super Admin */}
            {developerData.length === 0 && !loadingData && isSuperAdmin && (
                 <div className="mt-8 fade-in-up p-8 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-[#141319]/50">
                     <h3 className="font-bold text-slate-900 dark:text-white mb-2 text-lg text-center">Initial Data Required</h3>
                     <div className="max-w-2xl mx-auto">
                        <CsvUploader 
                            onDataLoaded={handleDataLoaded} 
                            versions={versions} 
                            activeVersionId={activeVersionId || undefined} 
                            onVersionSelect={setActiveVersionId} 
                            onDeleteVersion={deleteBatch} 
                            currentUserEmail={user?.email || 'unknown'}
                        />
                     </div>
                 </div>
            )}
          </div>
        );
      case 'membership': return (
        <MembershipDashboard 
            data={developerData} 
            onBack={() => handleSidebarNavigate('dashboard')} 
            timeframe={globalTimeframe}
            setTimeframe={setGlobalTimeframe}
            startDate={globalStartDate}
            setStartDate={setGlobalStartDate}
            endDate={globalEndDate}
            setEndDate={setGlobalEndDate}
        />
      );
      case 'developers': return (
          <div className="space-y-6">
            {isSuperAdmin && (
                <CsvUploader 
                    onDataLoaded={handleDataLoaded} 
                    versions={versions} 
                    activeVersionId={activeVersionId || undefined} 
                    onVersionSelect={setActiveVersionId} 
                    onDeleteVersion={deleteBatch}
                    currentUserEmail={user?.email || 'unknown'}
                />
            )}
            <UserTable 
                data={developerData} 
                initialFilters={viewParams} 
                onBack={() => handleSidebarNavigate('dashboard')} 
                startDate={globalTimeframe === 'Custom Range' ? globalStartDate : undefined}
                endDate={globalTimeframe === 'Custom Range' ? globalEndDate : undefined}
              />
          </div>
        );
      case 'outreach': return <SmartOutreach data={developerData} campaigns={campaigns} />;
      case 'invoices': return (
        <Invoicing data={developerData} admins={admins} invoices={invoices} agreements={agreements} />
      );
      case 'reporting': return <Reporting data={developerData} />;
      case 'events': return <EventManagement data={developerData} events={events} />;
      case 'admin': 
        return <AdminSettings 
                    data={developerData} 
                    admins={admins} 
                    masterRegistry={masterRegistry} 
                    onDeleteAdmin={handleDeleteAdmin} 
               />;
      default: return null;
    }
  };

  return (
    <div className="flex bg-slate-50 dark:bg-[#141319] min-h-screen font-sans text-slate-900 dark:text-slate-200 selection:bg-[#2a00ff] selection:text-white transition-colors duration-300">
      <Sidebar 
          currentView={currentView} 
          setCurrentView={handleSidebarNavigate}
          userRole={myAdminProfile.role}
          userScope={userScopeLabel}
      />
      
      <main className="flex-1 h-screen overflow-y-auto relative">
        {/* Background Elements */}
        <div className="hidden dark:block fixed top-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#791cf5]/10 blur-[120px] pointer-events-none rounded-full"></div>
        <div className="hidden dark:block fixed bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#2a00ff]/10 blur-[120px] pointer-events-none rounded-full"></div>

        <header className="bg-white/80 dark:bg-[#141319]/90 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 h-20 px-8 sticky top-0 z-40 flex items-center justify-between shadow-sm dark:shadow-2xl print:hidden transition-all">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-[#2a00ff]/10 border border-[#2a00ff]/30 rounded-lg text-[#2a00ff] shadow-[0_0_10px_rgba(42,0,255,0.2)]"><Layers className="w-5 h-5" /></div>
             <div className="flex flex-col">
                 <span className="text-[10px] font-bold text-[#a522dd] uppercase tracking-widest">Hedera Certification Dashboard</span>
                 <span className="text-base font-bold text-slate-900 dark:text-white capitalize flex items-center gap-2">
                    {currentView.replace('-', ' ')}
                    {!isSuperAdmin && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200 dark:border-blue-800 uppercase tracking-wide flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Scoped: {userScopeLabel}
                        </span>
                    )}
                 </span>
             </div>
          </div>

          <div className="flex items-center gap-6">
             {versions.length > 0 && isSuperAdmin && (
                 <div className="hidden md:block relative group">
                     <button className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-[#141319] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-[#2a00ff]/50 hover:shadow-[0_0_15px_rgba(42,0,255,0.2)] transition-all">
                        <Database className="w-4 h-4 text-[#2a00ff]" />
                        <span className="max-w-[150px] truncate">{activeVersionName}</span>
                        <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-[#2a00ff] transition-colors" />
                     </button>
                     <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-[#141319] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                         <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Select Dataset Version</div>
                         <div className="max-h-64 overflow-y-auto p-1">
                             {versions.map(v => (
                                 <button key={v.id} onClick={() => setActiveVersionId(v.id)} className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between rounded-xl mb-1 transition-colors ${v.id === activeVersionId ? 'bg-[#2a00ff]/10 text-[#2a00ff] font-semibold border border-[#2a00ff]/30' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}`}>
                                     <span>{v.fileName}</span>
                                     {v.id === activeVersionId && <CheckCircle className="w-4 h-4 text-[#2a00ff]" />}
                                 </button>
                             ))}
                         </div>
                     </div>
                 </div>
             )}

             <div className="flex items-center gap-3 pl-6 border-l border-slate-200 dark:border-white/10">
                 <button onClick={toggleTheme} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                     {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                 </button>
                 
                 <div className="relative group">
                    <button className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#2a00ff] to-[#a522dd] flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-[#2a00ff]/20 cursor-pointer hover:scale-105 transition-transform">
                        {user.email?.charAt(0).toUpperCase() || 'U'}
                    </button>
                    <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-[#141319] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.email}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">{myAdminProfile.role}</p>
                        </div>
                        <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2 transition-colors">
                            <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                    </div>
                 </div>
             </div>
          </div>
        </header>

        <div className="p-8">
            {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default App;