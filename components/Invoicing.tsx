
import React, { useState, useMemo } from 'react';
import { Invoice, InvoiceStatus, DeveloperRecord, CommunityAgreement, PaymentModel, BillingCycle, Currency, PaymentMethod, InvoiceLineItem, AdminUser, UserRole } from '../types';
import { addInvoice, updateInvoice, saveAgreement } from '../services/firebaseService';
import { Plus, Edit3, Trash2, Wallet, CreditCard, FileText, Check, AlertCircle, Save, Users, Award, TrendingUp, DollarSign, Calendar, Upload, File, X, Shield, Search, ChevronDown, Send } from 'lucide-react';

interface InvoicingProps {
    data: DeveloperRecord[];
    admins: AdminUser[];
    invoices: Invoice[];
    agreements: CommunityAgreement[];
    // Removed setInvoices/setAgreements, as App.tsx now handles sync via listeners
}

export const Invoicing: React.FC<InvoicingProps> = ({ data, admins, invoices, agreements }) => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'partners'>('invoices');
  const [isEditingInvoice, setIsEditingInvoice] = useState<string | null>(null);
  const [filterCommunity, setFilterCommunity] = useState('');
  const [billingMonth, setBillingMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  const [selectedPartnerCode, setSelectedPartnerCode] = useState<string | null>(null);
  const [editingAgreement, setEditingAgreement] = useState<string | null>(null);
  const [tempAgreement, setTempAgreement] = useState<Partial<CommunityAgreement>>({});
  const [tempDoc, setTempDoc] = useState('');
  
  const [adminSearch, setAdminSearch] = useState('');
  const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(false);

  const partners = useMemo(() => {
      const unique = new Set(data.map(d => d.partnerCode).filter(p => p && p !== 'UNKNOWN'));
      return Array.from(unique).sort();
  }, [data]);

  const getActiveAgreement = (code: string) => agreements.find(a => a.partnerCode === code && a.isActive);

  const handleGenerateDraft = async () => {
      if (!filterCommunity) return;
      const agr = getActiveAgreement(filterCommunity);
      const certsInMonth = data.filter(d => d.partnerCode === filterCommunity && d.finalGrade === 'Pass' && d.completedAt && d.completedAt.startsWith(billingMonth)).length;

      const items: InvoiceLineItem[] = [];
      if (agr && agr.paymentModel === 'Fixed_Recurring') {
           items.push({ id: `i_${Date.now()}`, description: `Fixed Fee (${billingMonth})`, quantity: 1, unitPrice: agr.unitPrice, total: agr.unitPrice });
      } else {
           items.push({ id: `i_${Date.now()}`, description: `Certifications (${billingMonth})`, quantity: certsInMonth, unitPrice: agr?.unitPrice || 100, total: certsInMonth * (agr?.unitPrice || 100) });
      }

      const subtotal = items.reduce((acc, item) => acc + item.total, 0);
      const newInvoice: Invoice = {
          id: `INV-${Date.now()}`,
          invoiceNumber: `INV-${filterCommunity.substring(0,3)}-${billingMonth.replace('-','')}`,
          partnerCode: filterCommunity,
          billingPeriod: billingMonth,
          issueDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
          currency: agr?.currency || 'USD',
          items, subtotal, taxRate: 0, taxAmount: 0, totalAmount: subtotal,
          status: InvoiceStatus.DRAFT, notes: '', publicMemo: `Services for ${billingMonth}`,
      };
      
      await addInvoice(newInvoice);
      setIsEditingInvoice(newInvoice.id);
  };

  const handleSaveAgreement = async () => {
      if (!tempAgreement.partnerCode) return;
      const newAgr: CommunityAgreement = {
          id: tempAgreement.id || `agr_${Date.now()}`,
          partnerCode: tempAgreement.partnerCode,
          partnerName: tempAgreement.partnerName || tempAgreement.partnerCode,
          contactName: tempAgreement.contactName || '',
          contactEmail: tempAgreement.contactEmail || '',
          assignedAdminId: tempAgreement.assignedAdminId,
          billingAddress: tempAgreement.billingAddress || '',
          startDate: tempAgreement.startDate || new Date().toISOString().split('T')[0],
          endDate: tempAgreement.endDate || '',
          isActive: tempAgreement.isActive !== undefined ? tempAgreement.isActive : true,
          paymentModel: tempAgreement.paymentModel || 'Per_Certification',
          unitPrice: Number(tempAgreement.unitPrice) || 0,
          currency: tempAgreement.currency || 'USD',
          billingCycle: tempAgreement.billingCycle || 'Monthly',
          preferredMethod: tempAgreement.preferredMethod || 'Bank_Transfer',
          paymentTerms: tempAgreement.paymentTerms || 'Net 30',
          description: tempAgreement.description || '',
          documents: tempAgreement.documents || [],
          lastUpdated: new Date().toISOString()
      };
      
      await saveAgreement(newAgr);
      setEditingAgreement(null);
      setTempAgreement({});
  };

  const startEditAgreement = (agr?: CommunityAgreement, code?: string) => {
      if (agr) {
          setEditingAgreement(agr.id);
          setTempAgreement({ ...agr });
      } else {
          setEditingAgreement('new');
          setTempAgreement({ 
            partnerCode: code || partners[0], 
            partnerName: code || partners[0],
            currency: 'USD', 
            paymentModel: 'Per_Certification', 
            unitPrice: 0,
            isActive: true,
            documents: []
          });
      }
      setAdminSearch('');
      setIsAdminDropdownOpen(false);
  };

  const InvoiceEditor = ({ invoiceId }: { invoiceId: string }) => {
      const inv = invoices.find(i => i.id === invoiceId);
      if (!inv) return null;

      const handleUpdate = async (updates: Partial<Invoice>) => {
          const items = updates.items || inv.items;
          const taxRate = updates.taxRate !== undefined ? updates.taxRate : inv.taxRate;
          const subtotal = items.reduce((acc, i) => acc + i.total, 0);
          const taxAmount = subtotal * (taxRate / 100);
          await updateInvoice(inv.id, { ...updates, items, subtotal, taxAmount, totalAmount: subtotal + taxAmount });
      };

      const updateLineItem = (id: string, field: keyof InvoiceLineItem, val: any) => {
          const newItems = inv.items.map(i => i.id === id ? { ...i, [field]: val, total: field === 'quantity' || field === 'unitPrice' ? (field === 'quantity' ? Number(val) : i.quantity) * (field === 'unitPrice' ? Number(val) : i.unitPrice) : i.total } : i);
          handleUpdate({ items: newItems });
      };

      return (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto">
                  <div className="px-8 py-6 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10 backdrop-blur-md">
                      <div><h2 className="text-2xl font-bold text-slate-900 dark:text-white">Invoice {inv.invoiceNumber}</h2></div>
                      <div className="flex gap-3">
                           <button onClick={() => setIsEditingInvoice(null)} className="px-5 py-2 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium">Close</button>
                           <button onClick={() => { handleUpdate({ status: InvoiceStatus.SENT }); setIsEditingInvoice(null); }} className="px-6 py-2 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-500 shadow-lg">Save & Send</button>
                      </div>
                  </div>
                  <div className="p-8 space-y-8">
                      {/* Form Details Omitted for brevity - same structure as before but calling handleUpdate */}
                      <div className="grid grid-cols-3 gap-6 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-white/5">
                          {['issueDate', 'dueDate'].map(f => (
                              <div key={f}>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{f}</label>
                                  <input type="date" value={(inv as any)[f]} onChange={e => handleUpdate({ [f]: e.target.value })} className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white" />
                              </div>
                          ))}
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Currency</label>
                              <select value={inv.currency} onChange={e => handleUpdate({ currency: e.target.value as Currency })} className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white"><option>USD</option><option>HBAR</option><option>USDC</option><option>EUR</option></select>
                          </div>
                      </div>
                      
                      {/* Items Table - Using handleUpdate */}
                      <div>
                          <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Line Items</h4>
                          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                              <table className="w-full text-sm text-left">
                                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700"><tr><th className="px-4 py-3">Description</th><th className="px-4 py-3 w-24">Qty</th><th className="px-4 py-3 w-32 text-right">Price</th><th className="px-4 py-3 w-32 text-right">Total</th><th className="w-10"></th></tr></thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">{inv.items.map(item => (
                                      <tr key={item.id} className="bg-white dark:bg-slate-900">
                                          <td className="p-3"><input value={item.description} onChange={e => updateLineItem(item.id, 'description', e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-slate-900 dark:text-white outline-none" /></td>
                                          <td className="p-3"><input type="number" value={item.quantity} onChange={e => updateLineItem(item.id, 'quantity', e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-center text-slate-900 dark:text-white outline-none" /></td>
                                          <td className="p-3"><input type="number" value={item.unitPrice} onChange={e => updateLineItem(item.id, 'unitPrice', e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-right text-slate-900 dark:text-white outline-none" /></td>
                                          <td className="p-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300">{item.total.toLocaleString()}</td>
                                          <td className="p-3 text-center"><button onClick={() => handleUpdate({ items: inv.items.filter(i => i.id !== item.id) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></td>
                                      </tr>
                                  ))}</tbody>
                              </table>
                              <button onClick={() => handleUpdate({ items: [...inv.items, { id: `i_${Date.now()}`, description: '', quantity: 1, unitPrice: 0, total: 0 }] })} className="w-full py-3 text-center text-sm font-bold text-cyan-600 dark:text-cyan-400 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-t border-slate-200 dark:border-slate-700">+ Add Line Item</button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-8 fade-in-up">
      <div className="glass-panel p-6 rounded-2xl flex flex-wrap gap-4 items-center bg-white dark:bg-[#1c1b22]">
         <div className="flex border-r border-slate-200 dark:border-white/10 pr-4 gap-2">
            <button onClick={() => setActiveTab('invoices')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'invoices' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>Invoices</button>
            <button onClick={() => { setActiveTab('partners'); setSelectedPartnerCode(null); }} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'partners' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>Partners</button>
         </div>
         {activeTab === 'invoices' && (
             <>
                 <input type="month" value={billingMonth} onChange={e => setBillingMonth(e.target.value)} className="p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500 shadow-sm" />
                 <select value={filterCommunity} onChange={e => setFilterCommunity(e.target.value)} className="p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500 min-w-[200px] shadow-sm">
                     <option value="">Filter by Partner...</option>
                     {partners.map(p => <option key={p} value={p}>{p}</option>)}
                 </select>
                 <button onClick={handleGenerateDraft} disabled={!filterCommunity} className="ml-auto px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-500 shadow-lg flex items-center gap-2"><Plus className="w-4 h-4" /> New Invoice</button>
             </>
         )}
      </div>

      {activeTab === 'invoices' && (
          <div className="glass-card rounded-2xl overflow-hidden bg-white dark:bg-transparent border border-slate-200 dark:border-white/5">
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-white/5"><tr><th className="px-6 py-4">Invoice #</th><th className="px-6 py-4">Partner</th><th className="px-6 py-4">Date</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Edit</th></tr></thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">{invoices.length === 0 ? <tr><td colSpan={6} className="p-12 text-center text-slate-500">No invoices found. Generate a draft above.</td></tr> : invoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"><td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-400">{inv.invoiceNumber}</td><td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{inv.partnerCode}</td><td className="px-6 py-4 text-slate-500 dark:text-slate-400">{inv.issueDate}</td><td className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-400">{inv.totalAmount.toLocaleString()} {inv.currency}</td><td className="px-6 py-4"><span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-600 dark:text-slate-300">{inv.status}</span></td><td className="px-6 py-4 text-right"><button onClick={() => setIsEditingInvoice(inv.id)} className="p-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded hover:border-cyan-500 text-slate-400 hover:text-cyan-500 transition-colors"><Edit3 className="w-4 h-4" /></button></td></tr>
                  ))}</tbody>
              </table>
          </div>
      )}

      {activeTab === 'partners' && (
          <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-220px)]">
              <div className="w-full lg:w-1/3 glass-card rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden flex flex-col">
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-white/5 font-bold text-slate-700 dark:text-slate-200">Active Communities ({partners.length})</div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                      {partners.map(code => (
                          <button key={code} onClick={() => setSelectedPartnerCode(code)} className={`w-full text-left p-3 rounded-lg transition-all border ${selectedPartnerCode === code ? 'bg-indigo-50 dark:bg-[#2a00ff]/10 border-indigo-200 dark:border-[#2a00ff]/30' : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                              <div className="font-bold text-sm text-slate-900 dark:text-white">{code}</div>
                          </button>
                      ))}
                  </div>
              </div>
              <div className="w-full lg:w-2/3 space-y-6 overflow-y-auto pr-1">
                  {selectedPartnerCode ? (
                      <div className="glass-card p-6 rounded-xl border border-slate-200 dark:border-white/5">
                          <div className="flex justify-between items-center mb-6">
                              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Agreements</h3>
                              <button onClick={() => startEditAgreement(undefined, selectedPartnerCode)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-500 flex items-center gap-2"><Plus className="w-3 h-3" /> Add Agreement</button>
                          </div>
                          <div className="space-y-4">
                              {agreements.filter(a => a.partnerCode === selectedPartnerCode).map(agr => (
                                  <div key={agr.id} className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700">
                                      <div className="flex justify-between">
                                          <h4 className="font-bold text-slate-800 dark:text-slate-200">{agr.description}</h4>
                                          <button onClick={() => startEditAgreement(agr)} className="text-slate-400 hover:text-indigo-500"><Edit3 className="w-4 h-4" /></button>
                                      </div>
                                      <div className="text-sm text-slate-500 mt-2">{agr.unitPrice} {agr.currency} - {agr.paymentModel}</div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  ) : <div className="h-full flex items-center justify-center text-slate-400 text-sm">Select a community</div>}
              </div>
          </div>
      )}

      {editingAgreement && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl p-6">
                  <div className="flex justify-between mb-6"><h3 className="text-xl font-bold text-slate-900 dark:text-white">Edit Agreement</h3><button onClick={() => setEditingAgreement(null)}><X className="w-5 h-5 text-slate-400" /></button></div>
                  <div className="space-y-4">
                      <input placeholder="Description" value={tempAgreement.description || ''} onChange={e => setTempAgreement({...tempAgreement, description: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white outline-none" />
                      <div className="grid grid-cols-2 gap-4">
                          <input type="number" placeholder="Amount" value={tempAgreement.unitPrice} onChange={e => setTempAgreement({...tempAgreement, unitPrice: Number(e.target.value)})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white outline-none" />
                          <select value={tempAgreement.currency} onChange={e => setTempAgreement({...tempAgreement, currency: e.target.value as any})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white outline-none"><option>USD</option><option>HBAR</option></select>
                      </div>
                      <button onClick={handleSaveAgreement} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-500">Save Agreement</button>
                  </div>
              </div>
          </div>
      )}
      {isEditingInvoice && <InvoiceEditor invoiceId={isEditingInvoice} />}
    </div>
  );
};
