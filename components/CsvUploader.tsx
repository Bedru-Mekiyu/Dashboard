import React, { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, Loader2, AlertTriangle, History, Trash2, Database, Cloud } from 'lucide-react';
import { DeveloperRecord, DatasetVersion } from '../types';
import { processIngestedData } from '../services/dataProcessing';
import { uploadDeveloperBatch } from '../services/firebaseService';

interface CsvUploaderProps {
  // Updated signature to include batchId
  onDataLoaded: (data: DeveloperRecord[], fileName: string, batchId?: string) => void;
  versions?: DatasetVersion[];
  activeVersionId?: string;
  onVersionSelect?: (id: string) => void;
  onDeleteVersion?: (id: string) => void;
  currentUserEmail: string;
}

export const CsvUploader: React.FC<CsvUploaderProps> = ({ 
    onDataLoaded, 
    versions = [], 
    activeVersionId, 
    onVersionSelect, 
    onDeleteVersion,
    currentUserEmail
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [loadedCount, setLoadedCount] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Parse logic (Kept same as before, simplified for brevity in this response but robust in practice)
  const parseCSV = (text: string, onProgress: (pct: number) => void): Promise<DeveloperRecord[]> => {
      return new Promise((resolve, reject) => {
          setTimeout(() => {
              try {
                  // 1. Handle BOM
                  let content = text;
                  if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
                  const lines = content.split(/\r\n|\n|\r/).filter(l => l.trim().length > 0);
                  if (lines.length < 2) throw new Error("File is empty or missing data rows.");

                  // 2. Detect Delimiter
                  const firstLine = lines[0];
                  const commaCount = (firstLine.match(/,/g) || []).length;
                  const semiCount = (firstLine.match(/;/g) || []).length;
                  const tabCount = (firstLine.match(/\t/g) || []).length;
                  let delimiter = ',';
                  if (semiCount > commaCount && semiCount > tabCount) delimiter = ';';
                  if (tabCount > commaCount && tabCount > semiCount) delimiter = '\t';

                  // 3. Split
                  const splitLine = (line: string): string[] => {
                      const result: string[] = [];
                      let current = '';
                      let inQuotes = false;
                      for (let i = 0; i < line.length; i++) {
                          const char = line[i];
                          if (char === '"' && line[i+1] === '"') { current += '"'; i++; continue; }
                          if (char === '"') { inQuotes = !inQuotes; }
                          else if (char === delimiter && !inQuotes) { result.push(current.trim()); current = ''; }
                          else { current += char; }
                      }
                      result.push(current.trim());
                      return result.map(val => val.startsWith('"') && val.endsWith('"') ? val.slice(1, -1) : val);
                  };

                  const headers = splitLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, ' ').trim());
                  const findIndex = (candidates: string[]) => {
                      const norm = candidates.map(c => c.toLowerCase());
                      let idx = headers.findIndex(h => norm.includes(h));
                      if (idx === -1) idx = headers.findIndex(h => norm.some(c => h.includes(c) || c.includes(h)));
                      return idx;
                  };

                  const map = {
                      email: findIndex(['email']),
                      firstName: findIndex(['first name', 'firstname']),
                      lastName: findIndex(['last name', 'lastname']),
                      phone: findIndex(['phone number', 'phone']),
                      country: findIndex(['country']),
                      membership: findIndex(['accepted membership', 'membership', 'is member']),
                      marketing: findIndex(['accepted marketing', 'marketing']),
                      wallet: findIndex(['wallet address', 'wallet']),
                      partnerCode: findIndex(['code', 'partner code']), 
                      partnerName: findIndex(['partner', 'community']),
                      percentage: findIndex(['percentage completed', 'percentage']),
                      createdAt: findIndex(['created at', 'start date']),
                      completedAt: findIndex(['completed at', 'completion date']),
                      finalScore: findIndex(['final score']),
                      finalGrade: findIndex(['final grade', 'grade']),
                      caStatus: findIndex(['ca status'])
                  };

                  if (map.partnerCode === -1 && map.partnerName !== -1) map.partnerCode = map.partnerName;
                  if (map.partnerName === -1 && map.partnerCode !== -1) map.partnerName = map.partnerCode;
                  if (map.email === -1) throw new Error("Column 'Email' not found.");

                  const parsedData: DeveloperRecord[] = [];
                  const totalRows = lines.length - 1;
                  
                  // Simple sync parsing for speed in this context
                  for (let i = 1; i < lines.length; i++) {
                      const cols = splitLine(lines[i]);
                      if (cols.length < 2) continue;
                      const getVal = (idx: number) => (idx !== -1 && cols[idx] !== undefined ? cols[idx] : '');
                      const parseBool = (str: string) => ['true', 'yes', '1', 'y', 'on', 'active', 'vrai', 'oui'].includes(str.trim().toLowerCase());
                      
                      const parseDate = (str: string) => {
                          if (!str) return '';
                          if (str.includes('/')) {
                              const parts = str.split(/[\/\s]/);
                              if (parseInt(parts[0]) > 12) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).toISOString();
                          }
                          const d = new Date(str);
                          return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
                      };

                      parsedData.push({
                          id: `row_${i}_${Date.now()}`, // Temporary ID
                          email: getVal(map.email) || `unknown_${i}@noemail.com`,
                          firstName: getVal(map.firstName),
                          lastName: getVal(map.lastName),
                          phone: getVal(map.phone),
                          country: getVal(map.country) || 'Unknown',
                          acceptedMembership: parseBool(getVal(map.membership)),
                          acceptedMarketing: parseBool(getVal(map.marketing)),
                          walletAddress: getVal(map.wallet),
                          partnerCode: getVal(map.partnerCode) || 'UNKNOWN',
                          partnerName: getVal(map.partnerName) || 'UNKNOWN',
                          percentageCompleted: parseFloat(getVal(map.percentage).replace(/[^0-9.]/g, '')) || 0,
                          createdAt: parseDate(getVal(map.createdAt)),
                          completedAt: getVal(map.completedAt) ? parseDate(getVal(map.completedAt)) : null,
                          finalScore: parseFloat(getVal(map.finalScore)) || 0,
                          finalGrade: getVal(map.finalGrade).toLowerCase().includes('pass') ? 'Pass' : 'Fail',
                          caStatus: getVal(map.caStatus),
                          computed_riskFlags: []
                      });
                  }
                  resolve(parsedData);
              } catch (e: any) { reject(e); }
          }, 100);
      });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fName = file.name;
    setFileName(fName);
    setIsProcessing(true);
    setProgress(0);
    setErrorMsg(null);
    setStatusMessage('Reading file...');

    const reader = new FileReader();
    
    reader.onload = async (event) => {
        const text = event.target?.result as string;
        try {
            setStatusMessage('Parsing CSV...');
            const rawData = await parseCSV(text, (pct) => setProgress(pct / 2));
            
            setStatusMessage('Analyzing Data...');
            const processed = processIngestedData(rawData);
            setLoadedCount(processed.length);

            setStatusMessage('Syncing to Cloud Database...');
            
            let batchId: string | undefined;
            try {
                // Upload to Firestore using service
                batchId = await uploadDeveloperBatch(processed, fName, currentUserEmail, (pct) => {
                    setProgress(50 + (pct / 2));
                });
            } catch (uploadErr) {
                console.warn('Cloud upload failed (likely permissions), proceeding with local data only.');
                setErrorMsg("Warning: Cloud sync failed. Data is local-only and will be lost on refresh.");
            }

            // Pass the batchId back to parent
            onDataLoaded(processed, fName, batchId); 
            setIsProcessing(false);
            setStatusMessage('Complete');
        } catch (err: any) {
            console.error(err);
            setErrorMsg(err.message || "Unknown error");
            setIsProcessing(false);
        }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
        {/* Upload Card */}
        <div className="w-full bg-white dark:bg-[#1c1b22] rounded-xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
            <div className="p-6 flex flex-col items-center justify-center text-center space-y-4">
                <div className={`p-4 rounded-full transition-colors ${isProcessing ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : errorMsg ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400'}`}>
                    {isProcessing ? <Loader2 className="w-8 h-8 animate-spin" /> : errorMsg ? <AlertTriangle className="w-8 h-8" /> : <Cloud className="w-8 h-8" />}
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{isProcessing ? 'Analyzing Data...' : 'Ingest Developer Data'}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-md mx-auto">{errorMsg ? <span className="text-red-500 font-bold">{errorMsg}</span> : isProcessing ? statusMessage : "Upload CSV to analyze. (Local analysis enabled if cloud sync fails)"}</p>
                </div>
                {isProcessing && (
                    <div className="w-full max-w-md space-y-2">
                        <div className="flex justify-between text-xs text-slate-500"><span>Progress</span><span>{Math.round(progress)}%</span></div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5"><div className="bg-[#2a00ff] h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div></div>
                    </div>
                )}
                {!isProcessing && (
                    <button onClick={() => fileInputRef.current?.click()} className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-slate-200 flex items-center gap-2 shadow-lg hover:scale-105 transition-all">
                        <Upload className="w-4 h-4" /> {fileName ? 'Upload Different File' : 'Select CSV File'}
                    </button>
                )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileChange} />
        </div>

        {/* Version History */}
        {versions.length > 0 && (
             <div className="bg-white dark:bg-[#1c1b22] rounded-xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden animate-fade-in">
                 <div className="px-6 py-4 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex items-center gap-2">
                     <History className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                     <h3 className="font-bold text-slate-800 dark:text-white">Dataset Version History</h3>
                 </div>
                 <table className="w-full text-sm text-left">
                     <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium"><tr><th className="px-6 py-3">File</th><th className="px-6 py-3">Date</th><th className="px-6 py-3">Records</th><th className="px-6 py-3 text-right">Actions</th></tr></thead>
                     <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                         {versions.map(v => (
                             <tr key={v.id} className={v.id === activeVersionId ? 'bg-blue-50 dark:bg-[#2a00ff]/10' : 'hover:bg-slate-50 dark:hover:bg-white/5'}>
                                 <td className="px-6 py-4 font-medium text-slate-900 dark:text-white flex items-center gap-2">{v.id === activeVersionId && <CheckCircle className="w-4 h-4 text-[#2a00ff]" />}{v.fileName}</td>
                                 <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{new Date(v.uploadDate).toLocaleString()}</td>
                                 <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300">{v.recordCount.toLocaleString()}</td>
                                 <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                                     {v.id !== activeVersionId && onVersionSelect && <button onClick={() => onVersionSelect(v.id)} className="text-[#2a00ff] hover:text-blue-500 font-bold text-xs flex items-center gap-1 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-900 px-3 py-1.5 rounded-lg"><Database className="w-3 h-3" /> Switch</button>}
                                     {onDeleteVersion && <button onClick={() => onDeleteVersion(v.id)} className="text-slate-400 hover:text-red-500 p-1.5"><Trash2 className="w-4 h-4" /></button>}
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
        )}
    </div>
  );
};