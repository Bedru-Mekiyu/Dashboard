import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { Loader2, AlertCircle, ArrowRight, UserPlus, LogIn } from 'lucide-react';

export const Login: React.FC = () => {
  // Fields initialized to empty for security and better UX
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // SANITIZATION: Trim and lowercase email
    const cleanEmail = email.trim().toLowerCase();

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, cleanEmail, password);
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      }
      // Auth state change is handled in App.tsx via onAuthStateChanged
    } catch (err: any) {
      console.error("Auth failed", err);
      
      // Smart Error Handling
      if (err.code === 'auth/email-already-in-use') {
        setIsSignUp(false); // Auto-switch to Login mode
        setError("Account already exists. Switched to Login mode. Please sign in.");
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        // Removed God Mode auto-switch specific logic since we removed the default email
        setError("Invalid email or password. If you are new, please switch to 'Create Account' below.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password must be at least 6 characters.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Too many failed attempts. Please reset your password or try later.");
      } else {
        setError(err.message || "Authentication failed. Please check connection.");
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#141319] flex items-center justify-center p-4 relative overflow-hidden font-sans text-slate-200 selection:bg-[#2a00ff] selection:text-white">
      {/* Ambient Background Glows */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#791cf5]/20 blur-[120px] pointer-events-none rounded-full animate-float"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#2a00ff]/20 blur-[120px] pointer-events-none rounded-full animate-float" style={{ animationDelay: '2s' }}></div>

      <div className="w-full max-w-md relative z-10">
        
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8">
            <div className="relative group mb-4">
                <div className="absolute inset-0 bg-[#2a00ff] blur-2xl opacity-20 rounded-full group-hover:opacity-40 transition-opacity duration-500"></div>
                <svg width="64" height="64" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10 drop-shadow-2xl">
                    <path d="M10 25H0V45C0 47.7614 2.23858 50 5 50H15V25C15 19.4772 19.4772 15 25 15C30.5228 15 35 19.4772 35 25V50H45C47.7614 50 50 47.7614 50 45V25C50 11.1929 38.8071 0 25 0H15V10C15 12.7614 12.7614 15 10 15V25Z" fill="#2a00ff"/>
                </svg>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Dar Blockchain<span className="align-top text-[10px] text-slate-500 ml-1">TM</span></h1>
            <p className="text-slate-400 text-sm font-medium mt-2 uppercase tracking-widest">Hedera Certification Platform</p>
        </div>

        {/* Login Card */}
        <div className="bg-[#1c1b22]/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#2a00ff] to-[#a522dd]"></div>
            
            <form onSubmit={handleAuth} className="space-y-6">
                
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white transition-all duration-300">
                        {isSignUp ? 'Create Account' : 'Admin Login'}
                    </h2>
                </div>

                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400 text-sm font-medium animate-fade-in-up">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                    </div>
                )}

                <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
                    <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-[#0f0e13] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-[#2a00ff]/50 focus:ring-1 focus:ring-[#2a00ff]/50 transition-all shadow-inner"
                        placeholder="admin@darblockchain.io"
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Password</label>
                    <input 
                        type="password" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[#0f0e13] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-[#2a00ff]/50 focus:ring-1 focus:ring-[#2a00ff]/50 transition-all shadow-inner"
                        placeholder="••••••••••••"
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-[#2a00ff] to-[#791cf5] hover:to-[#a522dd] text-white font-bold py-3.5 rounded-xl shadow-[0_0_20px_rgba(42,0,255,0.3)] hover:shadow-[0_0_30px_rgba(42,0,255,0.5)] transition-all transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" /> {isSignUp ? 'Creating Account...' : 'Authenticating...'}
                        </>
                    ) : (
                        <>
                            {isSignUp ? (
                                <>Create Account <UserPlus className="w-4 h-4" /></>
                            ) : (
                                <>Access Platform <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                            )}
                        </>
                    )}
                </button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/5 text-center">
                <button 
                    onClick={() => { 
                        setIsSignUp(!isSignUp); 
                        setError(null);
                        setEmail('');
                        setPassword('');
                    }}
                    className="text-sm font-medium text-slate-400 hover:text-[#2a00ff] transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                    {isSignUp ? (
                        <>Already have an account? <span className="text-white underline decoration-[#2a00ff]">Log In</span></>
                    ) : (
                        <>New Admin? <span className="text-white underline decoration-[#2a00ff]">Create Account</span></>
                    )}
                </button>
            </div>
        </div>
        
        <div className="mt-8 text-center text-[10px] text-slate-600 font-mono">
            SECURE SYSTEM • AUTHORIZED ACCESS ONLY • v2025.1
        </div>
      </div>
    </div>
  );
};