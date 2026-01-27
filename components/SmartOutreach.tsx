
import React, { useMemo, useState } from 'react';
import { DeveloperRecord, EmailTemplate, OutreachCampaign } from '../types';
import { DEFAULT_TEMPLATES, sendEmailCampaign } from '../services/emailService';
import { addCampaign } from '../services/firebaseService';
import { Filter, Users, Mail, Send, CheckCircle, Loader2, Edit2, AlertCircle, Download, History } from 'lucide-react';

interface SmartOutreachProps {
  data: DeveloperRecord[];
  campaigns: OutreachCampaign[];
}

export const SmartOutreach: React.FC<SmartOutreachProps> = ({ data, campaigns }) => {
  const [filterCommunity, setFilterCommunity] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCountry, setFilterCountry] = useState('All');
  
  const [selectedTemplateId, setSelectedTemplateId] = useState(DEFAULT_TEMPLATES[0].id);
  const [customSubject, setCustomSubject] = useState(DEFAULT_TEMPLATES[0].subject);
  const [customBody, setCustomBody] = useState(DEFAULT_TEMPLATES[0].body);
  const [isEditing, setIsEditing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);

  const communities = useMemo(() => {
      const unique = new Set(data.map(d => d.partnerCode).filter(c => c && c !== 'UNKNOWN'));
      return ['All', ...Array.from(unique).sort()];
  }, [data]);

  const countries = useMemo(() => {
      const unique = new Set(data.map(d => d.country).filter(c => c && c !== 'Unknown'));
      return ['All', ...Array.from(unique).sort()];
  }, [data]);

  const filteredAudience = useMemo(() => {
      return data.filter(user => {
          if (filterCommunity !== 'All' && user.partnerCode !== filterCommunity) return false;
          if (filterCountry !== 'All' && user.country !== filterCountry) return false;
          if (filterStatus === 'Not Started') {
              if (user.percentageCompleted > 0 || user.finalGrade === 'Pass') return false;
          } else if (filterStatus === 'In Progress') {
              if (user.percentageCompleted === 0 || user.finalGrade === 'Pass') return false;
          } else if (filterStatus === 'Certified') {
              if (user.finalGrade !== 'Pass') return false;
          }
          return true;
      });
  }, [data, filterCommunity, filterStatus, filterCountry]);

  const handleTemplateChange = (id: string) => {
      const tpl = DEFAULT_TEMPLATES.find(t => t.id === id);
      if (tpl) {
          setSelectedTemplateId(id);
          setCustomSubject(tpl.subject);
          setCustomBody(tpl.body);
          setIsEditing(false);
      }
  };

  const handleDownloadAudience = () => {
    if (filteredAudience.length === 0) return;
    const headers = ['Email', 'First Name', 'Last Name', 'Partner Code', 'Country', 'Progress (%)', 'Status'];
    const rows = filteredAudience.map(user => [user.email, user.firstName, user.lastName, user.partnerCode, user.country, user.percentageCompleted, user.finalGrade]);
    const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })); link.download = `audience.csv`; link.click();
  };

  const handleSendCampaign = async () => {
      if (filteredAudience.length === 0) return;
      setIsSending(true); setSendProgress(0);
      const currentTemplate: EmailTemplate = { id: selectedTemplateId, name: 'Custom Campaign', subject: customSubject, body: customBody, trigger: 'Manual' };
      
      await sendEmailCampaign(filteredAudience, currentTemplate, (sent) => setSendProgress(sent));

      const newCampaign: OutreachCampaign = {
          id: `cmp_${Date.now()}`,
          name: `${currentTemplate.subject}`,
          audienceSize: filteredAudience.length,
          sentCount: filteredAudience.length,
          status: 'Completed',
          sentAt: new Date().toISOString(),
          templateId: selectedTemplateId
      };
      await addCampaign(newCampaign);
      setIsSending(false);
  };

  if (data.length === 0) return <div className="p-12 text-center text-slate-500">No data loaded.</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm h-fit">
            <div className="flex items-center gap-2 mb-6"><Filter className="w-5 h-5 text-blue-500" /><h3 className="font-bold text-slate-800 dark:text-white">Define Audience</h3></div>
            <div className="space-y-4">
                <div><label className="block text-xs font-semibold mb-1">Community</label><select value={filterCommunity} onChange={(e) => setFilterCommunity(e.target.value)} className="w-full p-2.5 bg-white dark:bg-slate-900 border rounded-lg text-sm">{communities.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="block text-xs font-semibold mb-1">Status</label><select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full p-2.5 bg-white dark:bg-slate-900 border rounded-lg text-sm"><option value="All">All</option><option value="Not Started">Not Started</option><option value="Certified">Certified</option></select></div>
            </div>
            <div className="mt-8 p-4 bg-slate-900 rounded-xl text-white flex justify-between"><div className="font-bold text-2xl">{filteredAudience.length}</div><Users className="w-5 h-5" /></div>
            <button onClick={handleDownloadAudience} className="mt-3 w-full py-3 bg-white dark:bg-slate-800 border rounded-lg font-bold flex items-center justify-center gap-2"><Download className="w-4 h-4" /> CSV</button>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex justify-between mb-6"><div className="flex gap-2"><Mail className="w-5 h-5 text-purple-500" /><h3 className="font-bold">Compose</h3></div><select className="text-sm bg-transparent border rounded p-1" value={selectedTemplateId} onChange={(e) => handleTemplateChange(e.target.value)}>{DEFAULT_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
              <input value={customSubject} onChange={(e) => { setCustomSubject(e.target.value); setIsEditing(true); }} className="w-full p-3 mb-4 bg-white dark:bg-slate-900 border rounded-lg text-sm font-bold" />
              <textarea rows={8} value={customBody} onChange={(e) => { setCustomBody(e.target.value); setIsEditing(true); }} className="w-full p-4 bg-white dark:bg-slate-900 border rounded-lg text-sm font-mono" />
              <div className="mt-6 flex justify-end"><button onClick={handleSendCampaign} disabled={isSending} className="px-8 py-3 rounded-lg font-bold text-white bg-purple-600 hover:bg-purple-700 flex items-center gap-2">{isSending ? 'Sending...' : 'Send Campaign'}</button></div>
          </div>
          {campaigns.length > 0 && (
            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-xl border shadow-sm">
                <div className="flex gap-2 mb-4"><History className="w-5 h-5" /><h3 className="font-bold">History</h3></div>
                <div className="space-y-3">{campaigns.map(cmp => (<div key={cmp.id} className="p-3 border rounded-lg flex justify-between"><div><div className="font-bold text-sm">{cmp.name}</div><div className="text-xs text-slate-500">{new Date(cmp.sentAt).toLocaleString()}</div></div><div className="text-right text-green-500 font-bold text-xs">Sent {cmp.sentCount}</div></div>))}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
