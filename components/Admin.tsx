
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Donation, Event, Admin, DisplaySettings } from '../types';
import { Spinner, CurrencyInput } from './Shared';

export const AdminPanel: React.FC<{ 
  currentUser: Admin; 
  onLogout: () => void; 
  onShowDisplay: () => void;
}> = ({ currentUser, onLogout, onShowDisplay }) => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [activeTab, setActiveTab] = useState<'donations' | 'settings' | 'events' | 'admins'>('donations');
  const [loading, setLoading] = useState(false);
  const [actionIds, setActionIds] = useState<Record<string, boolean>>({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Forms
  const [donationForm, setDonationForm] = useState({ name: '', father: '', mobile: '', amount: '', desc: '', type: 'pos' as any, hide: false });
  const [settings, setSettings] = useState<DisplaySettings | null>(null);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '' });
  const [viewReceipt, setViewReceipt] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
    loadSettings();
    if (currentUser.role === 'superadmin') loadAdmins();
  }, []);

  useEffect(() => {
    if (activeEventId) {
      loadDonations(activeEventId);
      const sub = supabase.channel(`admin_donations`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'donations', filter: `event_id=eq.${activeEventId}` }, () => loadDonations(activeEventId))
        .subscribe();
      return () => { supabase.removeChannel(sub); };
    }
  }, [activeEventId]);

  const loadEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('created_at', { ascending: false });
    if (data) {
      setEvents(data);
      const active = data.find(e => e.isactive);
      if (active) setActiveEventId(active.id);
    }
  };

  const loadDonations = async (id: string) => {
    const { data } = await supabase.from('donations').select('*').eq('event_id', id).order('createdAt', { ascending: false });
    if (data) setDonations(data);
  };

  const loadSettings = async () => {
    const { data } = await supabase.from('config').select('value').eq('key', 'displaySettings').maybeSingle();
    if (data?.value) setSettings(data.value);
  };

  const loadAdmins = async () => {
    const { data } = await supabase.from('admins').select('*');
    if (data) setAdmins(data);
  };

  const handleUpdateSettings = async (updates: Partial<DisplaySettings>) => {
    if (!settings) return;
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    await supabase.from('config').upsert({ key: 'displaySettings', value: newSettings });
  };

  const handleCreateEvent = async () => {
    if (!newEventTitle) return;
    setLoading(true);
    await supabase.from('events').update({ isactive: false }).eq('isactive', true);
    const { data } = await supabase.from('events').insert([{ title: newEventTitle, isactive: true }]).select().single();
    if (data) {
      setNewEventTitle('');
      loadEvents();
      setActiveEventId(data.id);
      handleUpdateSettings({ eventTitle: data.title });
    }
    setLoading(false);
  };

  const handleDeleteEvent = async (id: string, title: string) => {
    if (!confirm(`آیا مراسم «${title}» حذف شود؟ تمام تراکنش‌ها نیز حذف می‌شوند.`)) return;
    setActionIds(p => ({ ...p, [id]: true }));
    await supabase.from('donations').delete().eq('event_id', id);
    await supabase.from('events').delete().eq('id', id);
    loadEvents();
    setActionIds(p => ({ ...p, [id]: false }));
  };

  const handleAddDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEventId || !donationForm.name || !donationForm.amount) return;
    setLoading(true);
    const { error } = await supabase.from('donations').insert([{
      event_id: activeEventId,
      donorName: donationForm.name,
      fatherName: donationForm.father,
      mobile: donationForm.mobile,
      amount: parseInt(donationForm.amount),
      description: donationForm.desc,
      paymentType: donationForm.type,
      hideName: donationForm.hide,
      status: 'approved'
    }]);
    if (!error) {
        setDonationForm({ name: '', father: '', mobile: '', amount: '', desc: '', type: 'pos', hide: false });
        // Close menu on mobile after successful add
        if (window.innerWidth < 768) setMobileMenuOpen(false);
    }
    setLoading(false);
  };

  const handleToggleDonationStatus = async (id: string, current: string) => {
    const next = current === 'approved' ? 'pending' : 'approved';
    setActionIds(p => ({ ...p, [`status_${id}`]: true }));
    await supabase.from('donations').update({ status: next }).eq('id', id);
    setActionIds(p => ({ ...p, [`status_${id}`]: false }));
  };

  const handleDeleteDonation = async (id: string) => {
    if (!confirm('تراکنش حذف شود؟')) return;
    setActionIds(p => ({ ...p, [`del_${id}`]: true }));
    await supabase.from('donations').delete().eq('id', id);
    setActionIds(p => ({ ...p, [`del_${id}`]: false }));
  };

  const handleFileUpload = (file: File, field: keyof DisplaySettings) => {
    setActionIds(prev => ({ ...prev, [`upload_${field}`]: true }));
    const reader = new FileReader();
    reader.onload = (e) => {
      // For fonts, we use dataURL directly. For images, we compress.
      if (field === 'customFontData') {
        handleUpdateSettings({ [field]: e.target?.result as string });
        setActionIds(prev => ({ ...prev, [`upload_${field}`]: false }));
        return;
      }

      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const scale = 800 / img.width;
        canvas.width = 800;
        canvas.height = img.height * scale;
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        handleUpdateSettings({ [field]: dataUrl });
        setActionIds(prev => ({ ...prev, [`upload_${field}`]: false }));
      };
    };
    reader.readAsDataURL(file);
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await supabase.from('admins').insert([{ ...newAdmin, role: 'admin' }]);
    setNewAdmin({ username: '', password: '' });
    loadAdmins();
    setLoading(false);
  };

  const handlePrint = (showAmount: boolean) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    let tableHeader = '', tableBody = '';
    if (showAmount) {
        tableHeader = `<tr><th style="width:5%">ردیف</th><th style="width:20%">نام خیِّر</th><th style="width:15%">نام پدر</th><th style="width:15%">موبایل</th><th style="width:15%">مبلغ (تومان)</th><th style="width:10%">نوع</th><th>توضیحات</th></tr>`;
        tableBody = donations.map((d, i) => `<tr><td>${i + 1}</td><td>${d.donorName||'-'}</td><td>${d.fatherName||'-'}</td><td>${d.mobile||'-'}</td><td>${(d.amount||0).toLocaleString()}</td><td>${d.paymentType==='online'?'آنلاین':(d.paymentType==='card'?'کارت':(d.paymentType==='cash'?'نقد':'پوز'))}</td><td>${d.description||'-'}</td></tr>`).join('');
    } else {
        tableHeader = `<tr><th style="width:10%">ردیف</th><th style="width:50%">نام خیِّر</th><th style="width:40%">نام پدر</th></tr>`;
        tableBody = donations.map((d, i) => `<tr><td>${i + 1}</td><td>${d.donorName||'-'}</td><td>${d.fatherName||'-'}</td></tr>`).join('');
    }
    
    const html = `
      <html dir="rtl">
      <head>
        <title>لیست پرداخت‌ها</title>
        <style>
          body{font-family:Tahoma;padding:20px}
          table{width:100%;border-collapse:collapse;margin-top:20px;font-size:14px}
          th,td{border:1px solid #ccc;padding:8px;text-align:right}
          th{background:#eee}
          .header{text-align:center;margin-bottom:30px}
          @media print{.no-print{display:none}}
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${settings?.eventTitle||'لیست پرداخت‌های مردمی'}</h2>
          <p>تاریخ چاپ: ${new Date().toLocaleDateString('fa-IR')}</p>
        </div>
        <table><thead>${tableHeader}</thead><tbody>${tableBody}</tbody></table>
        ${showAmount ? `<div style="margin-top:20px;font-weight:bold;">جمع کل: ${donations.reduce((a,b)=>a+(b.amount||0),0).toLocaleString()} تومان</div>` : ''}
        <script>window.onload=function(){window.print();window.close()}<\/script>
      </body>
      </html>`;
      
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const activeEventTitle = events.find(e => e.id === activeEventId)?.title || 'نامشخص';

  const fonts = ['Vazirmatn', 'Lalezar', 'Noto Nastaliq Urdu', 'CustomUploaded'];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 font-sans relative">
      
      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar / Drawer */}
      <div className={`
        fixed inset-y-0 right-0 z-50 w-72 bg-slate-900 text-white flex flex-col border-l border-slate-700
        transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none
        md:relative md:translate-x-0 md:flex
        ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div>
             <h2 className="text-xl font-black text-yellow-500">پنل مدیریت اکرام</h2>
             <p className="text-xs text-slate-400 mt-1">خوش آمدید، {currentUser.username}</p>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="md:hidden text-slate-400 hover:text-white transition-all">
             <i className="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <div className="p-4 flex-1 space-y-2 overflow-y-auto custom-scroll">
          <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 mb-4">
            <span className="text-[10px] uppercase text-slate-500 font-bold block mb-1">مراسم فعال</span>
            <span className="text-sm font-bold text-slate-200">{activeEventTitle}</span>
          </div>

          <form onSubmit={handleAddDonation} className="space-y-3">
            <input placeholder="نام پرداخت کننده *" required className="w-full bg-slate-800 border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-yellow-500" value={donationForm.name} onChange={e=>setDonationForm({...donationForm, name: e.target.value})} />
            <div className="flex gap-2">
              <input placeholder="نام پدر" className="w-1/2 bg-slate-800 border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-yellow-500" value={donationForm.father} onChange={e=>setDonationForm({...donationForm, father: e.target.value})} />
              <input placeholder="موبایل" className="w-1/2 bg-slate-800 border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-yellow-500" value={donationForm.mobile} onChange={e=>setDonationForm({...donationForm, mobile: e.target.value})} />
            </div>
            <CurrencyInput placeholder="مبلغ *" required className="w-full bg-slate-800 border-none rounded-lg p-3 text-sm" value={donationForm.amount} onChange={val=>setDonationForm({...donationForm, amount: val})} />
            <select className="w-full bg-slate-800 border-none rounded-lg p-3 text-sm" value={donationForm.type} onChange={e=>setDonationForm({...donationForm, type: e.target.value as any})}>
              <option value="pos">کارتخوان</option>
              <option value="cash">نقد</option>
              <option value="card">کارت به کارت</option>
            </select>
            <textarea placeholder="توضیحات" className="w-full bg-slate-800 border-none rounded-lg p-3 text-sm h-20" value={donationForm.desc} onChange={e=>setDonationForm({...donationForm, desc: e.target.value})} />
            <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-800 rounded transition-all">
              <input type="checkbox" checked={donationForm.hide} onChange={e=>setDonationForm({...donationForm, hide: e.target.checked})} className="accent-yellow-500" />
              <span className="text-xs text-slate-300">مخفی سازی نام در نمایشگر</span>
            </label>
            <button type="submit" disabled={loading} className="w-full bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-black py-3 rounded-lg flex items-center justify-center gap-2 transition-all">
              {loading ? <Spinner color="border-slate-900" /> : <><i className="fas fa-plus"></i> ثبت تراکنش</>}
            </button>
          </form>
        </div>

        <div className="p-4 border-t border-slate-800 flex flex-col gap-2">
           <button onClick={onLogout} className="text-sm text-red-400 hover:bg-red-950 p-2 rounded transition-all flex items-center gap-2">
             <i className="fas fa-sign-out-alt"></i> خروج از سیستم
           </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <div className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between shadow-sm gap-4">
          <div className="flex items-center gap-2 overflow-hidden flex-1">
            <button onClick={()=>setMobileMenuOpen(true)} className="md:hidden text-slate-700 p-2 rounded-lg hover:bg-slate-100 flex-shrink-0">
               <i className="fas fa-bars text-xl"></i>
            </button>

            <div className="flex gap-1 overflow-x-auto flex-1 no-scrollbar pb-1">
                <button onClick={()=>setActiveTab('donations')} className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${activeTab==='donations'?'bg-blue-50 text-blue-600':'text-slate-500 hover:bg-slate-50'}`}>تراکنش‌ها</button>
                <button onClick={()=>setActiveTab('settings')} className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${activeTab==='settings'?'bg-blue-50 text-blue-600':'text-slate-500 hover:bg-slate-50'}`}>تنظیمات</button>
                <button onClick={()=>setActiveTab('events')} className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${activeTab==='events'?'bg-blue-50 text-blue-600':'text-slate-500 hover:bg-slate-50'}`}>مراسم</button>
                {currentUser.role === 'superadmin' && (
                <button onClick={()=>setActiveTab('admins')} className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${activeTab==='admins'?'bg-blue-50 text-blue-600':'text-slate-500 hover:bg-slate-50'}`}>ادمین</button>
                )}
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
             <div className="hidden lg:flex items-center gap-2 px-4 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-100 font-black text-sm">
                <span>جمع کل:</span>
                <span>{donations.reduce((a, b) => a + (b.amount || 0), 0).toLocaleString()} تومان</span>
             </div>
             <button onClick={onShowDisplay} className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 md:px-4 rounded-lg text-sm font-black shadow-lg shadow-red-200 transition-all flex items-center gap-2">
               <i className="fas fa-desktop"></i> <span className="hidden md:inline">نمایشگر</span>
             </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scroll">
          {activeTab === 'donations' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
              <div className="p-3 border-b bg-gray-50 flex gap-2 justify-end overflow-x-auto">
                <button onClick={()=>handlePrint(true)} className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-600 flex items-center gap-2 transition-all shadow-sm whitespace-nowrap"><i className="fas fa-print"></i> چاپ با مبلغ</button>
                <button onClick={()=>handlePrint(false)} className="bg-slate-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-600 flex items-center gap-2 transition-all shadow-sm whitespace-nowrap"><i className="fas fa-print"></i> چاپ بدون مبلغ</button>
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-right border-collapse min-w-[800px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-bold uppercase sticky top-0">
                    <tr>
                      <th className="p-4">خیر</th>
                      <th className="p-4">پدر</th>
                      <th className="p-4">مبلغ (تومان)</th>
                      <th className="p-4">نوع</th>
                      <th className="p-4">توضیحات</th>
                      <th className="p-4">وضعیت</th>
                      <th className="p-4">پیوست</th>
                      <th className="p-4">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {donations.length === 0 ? (
                      <tr><td colSpan={8} className="p-10 text-center text-slate-400 italic">تراکنشی یافت نشد.</td></tr>
                    ) : donations.map(d => (
                      <tr key={d.id} className={`hover:bg-slate-50/50 transition-all ${d.status==='pending'?'bg-orange-50/30':''}`}>
                        <td className="p-4 font-bold text-slate-800">{d.donorName} {d.hideName && <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded">مخفی</span>}</td>
                        <td className="p-4 text-slate-500">{d.fatherName || '-'}</td>
                        <td className="p-4 font-mono font-bold text-blue-700">{d.amount.toLocaleString()}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${d.paymentType==='online'?'bg-purple-100 text-purple-600':'bg-slate-100 text-slate-600'}`}>
                            {d.paymentType === 'pos' ? 'کارتخوان' : d.paymentType === 'online' ? 'آنلاین' : d.paymentType === 'card' ? 'کارت به کارت' : 'نقدی'}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-slate-500 max-w-[150px] truncate" title={d.description}>{d.description || '-'}</td>
                        <td className="p-4">
                          <button onClick={()=>handleToggleDonationStatus(d.id, d.status)} disabled={actionIds[`status_${d.id}`]} className={`px-3 py-1 rounded-full text-[10px] font-black transition-all ${d.status==='approved'?'bg-green-100 text-green-700 hover:bg-green-200':'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}>
                            {actionIds[`status_${d.id}`] ? <Spinner size="w-3 h-3" color="border-current" /> : (d.status === 'approved' ? 'در حال نمایش' : 'تایید برای نمایش')}
                          </button>
                        </td>
                        <td className="p-4">
                          {d.receiptImage ? (
                            <button onClick={()=>setViewReceipt(d.receiptImage || null)} className="text-blue-500 hover:scale-110 transition-all"><i className="fas fa-file-invoice text-xl"></i></button>
                          ) : '-'}
                        </td>
                        <td className="p-4">
                           <button onClick={()=>handleDeleteDonation(d.id)} disabled={actionIds[`del_${d.id}`]} className="text-red-400 hover:text-red-600 transition-all"><i className="fas fa-trash-alt"></i></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'settings' && settings && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto pb-20">
              
              {/* 1. General Settings */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                <h3 className="font-black text-slate-800 border-b border-slate-100 pb-3 mb-4">۱. تنظیمات عمومی</h3>
                <div className="space-y-4">
                   <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">عنوان مراسم</label>
                      <input className="w-full border rounded-lg p-2.5" value={settings.eventTitle} onChange={e=>handleUpdateSettings({eventTitle: e.target.value})} />
                   </div>
                   <div className="flex gap-4 items-center bg-slate-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                         <label className="text-xs font-bold text-slate-500">رنگ عنوان:</label>
                         <input type="color" value={settings.titleColor || '#ffffff'} onChange={e=>handleUpdateSettings({titleColor: e.target.value})} />
                      </div>
                      <div className="flex items-center gap-2">
                         <label className="text-xs font-bold text-slate-500">سایز عنوان:</label>
                         <input type="number" step="0.1" className="w-16 border rounded p-1 text-center" value={settings.titleSize || 3.5} onChange={e=>handleUpdateSettings({titleSize: parseFloat(e.target.value)})} />
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-xs font-bold text-slate-500 block mb-1">سایز قلم لیست</label><input type="range" min="20" max="100" className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" value={settings.fontSize} onChange={e=>handleUpdateSettings({fontSize: parseInt(e.target.value)})} /></div>
                      <div><label className="text-xs font-bold text-slate-500 block mb-1">سرعت حرکت</label><input type="range" min="5" max="100" className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" style={{direction: 'ltr'}} value={settings.scrollSpeed} onChange={e=>handleUpdateSettings({scrollSpeed: parseInt(e.target.value)})} /></div>
                   </div>
                </div>
              </div>

              {/* 2. Fonts */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                <h3 className="font-black text-slate-800 border-b border-slate-100 pb-3 mb-4">۲. مدیریت فونت</h3>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
                    <label className="text-xs font-bold text-blue-700 block mb-2">آپلود فونت سفارشی (.ttf, .woff)</label>
                    <div className="flex gap-2 items-center">
                        <input type="file" accept=".ttf,.woff,.woff2" onChange={(e)=>e.target.files && handleFileUpload(e.target.files[0], 'customFontData')} className="text-xs w-full bg-white rounded border border-blue-200 p-1" />
                        {actionIds['upload_customFontData'] && <Spinner size="w-4 h-4" color="border-blue-600" />}
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                   <div>
                       <label className="text-[10px] font-bold text-slate-500 block mb-1">سطح بالا</label>
                       <select className="w-full text-xs border rounded p-2" value={settings.fontHigh} onChange={e=>handleUpdateSettings({fontHigh: e.target.value})}>{fonts.map(f=><option key={f}>{f}</option>)}</select>
                   </div>
                   <div>
                       <label className="text-[10px] font-bold text-slate-500 block mb-1">سطح متوسط</label>
                       <select className="w-full text-xs border rounded p-2" value={settings.fontMid} onChange={e=>handleUpdateSettings({fontMid: e.target.value})}>{fonts.map(f=><option key={f}>{f}</option>)}</select>
                   </div>
                   <div>
                       <label className="text-[10px] font-bold text-slate-500 block mb-1">سطح پایین</label>
                       <select className="w-full text-xs border rounded p-2" value={settings.fontLow} onChange={e=>handleUpdateSettings({fontLow: e.target.value})}>{fonts.map(f=><option key={f}>{f}</option>)}</select>
                   </div>
                </div>
              </div>

              {/* 3. Text Customization */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                 <h3 className="font-black text-slate-800 border-b border-slate-100 pb-3 mb-4">۳. تنظیمات متن‌ها</h3>
                 <div className="space-y-4">
                     <div className="bg-slate-50 p-3 rounded-lg">
                        <label className="text-xs font-bold text-slate-500 block mb-1">متن زیر عکس (مثال: شادروان)</label>
                        <input className="w-full border rounded p-2 mb-2 text-sm" value={settings.deceasedLabel} onChange={e=>handleUpdateSettings({deceasedLabel: e.target.value})} />
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2"><span className="text-xs">رنگ:</span><input type="color" value={settings.deceasedLabelColor || '#fef3c7'} onChange={e=>handleUpdateSettings({deceasedLabelColor: e.target.value})} /></div>
                            <div className="flex items-center gap-2"><span className="text-xs">سایز:</span><input type="number" className="w-16 border rounded p-1 text-center" value={settings.deceasedLabelSize || 12} onChange={e=>handleUpdateSettings({deceasedLabelSize: parseInt(e.target.value)})} /></div>
                        </div>
                     </div>
                     <div className="bg-slate-50 p-3 rounded-lg">
                        <label className="text-xs font-bold text-slate-500 block mb-1">متن فوتر (مثال: صلوات)</label>
                        <input className="w-full border rounded p-2 mb-2 text-sm" value={settings.footerText} onChange={e=>handleUpdateSettings({footerText: e.target.value})} />
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2"><span className="text-xs">رنگ:</span><input type="color" value={settings.footerColor || '#ffffff'} onChange={e=>handleUpdateSettings({footerColor: e.target.value})} /></div>
                            <div className="flex items-center gap-2"><span className="text-xs">سایز:</span><input type="number" className="w-16 border rounded p-1 text-center" value={settings.footerSize || 14} onChange={e=>handleUpdateSettings({footerSize: parseInt(e.target.value)})} /></div>
                        </div>
                     </div>
                 </div>
              </div>

              {/* 4. Thresholds */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                <h3 className="font-black text-slate-800 border-b border-slate-100 pb-3 mb-4">۴. مرزبندی مبالغ</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                    <label className="text-xs font-bold text-green-700 block mb-1">مرز سطح ویژه (High)</label>
                    <CurrencyInput className="w-full border-none bg-transparent font-black" value={settings.highThreshold} onChange={val=>handleUpdateSettings({highThreshold: parseInt(val)})} />
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <label className="text-xs font-bold text-blue-700 block mb-1">مرز سطح متوسط (Mid)</label>
                    <CurrencyInput className="w-full border-none bg-transparent font-black" value={settings.midThreshold} onChange={val=>handleUpdateSettings({midThreshold: parseInt(val)})} />
                  </div>
                </div>
              </div>

              {/* 5. Images */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 md:col-span-2">
                 <h3 className="font-black text-slate-800 border-b border-slate-100 pb-3 mb-4">۵. تصاویر و گرافیک</h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500">عکس مرحوم</label>
                      <div className="h-32 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer hover:bg-slate-50 transition-all">
                        {settings.deceasedImage ? <img src={settings.deceasedImage} className="w-full h-full object-cover" /> : <i className="fas fa-camera text-slate-300 text-2xl"></i>}
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e=>e.target.files && handleFileUpload(e.target.files[0], 'deceasedImage')} />
                        {settings.deceasedImage && <button onClick={()=>handleUpdateSettings({deceasedImage: ''})} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all"><i className="fas fa-times text-xs"></i></button>}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500">تصویر پس‌زمینه</label>
                      <div className="h-32 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer hover:bg-slate-50 transition-all">
                        {settings.bgImage ? <img src={settings.bgImage} className="w-full h-full object-cover" /> : <i className="fas fa-image text-slate-300 text-2xl"></i>}
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e=>e.target.files && handleFileUpload(e.target.files[0], 'bgImage')} />
                        {settings.bgImage && <button onClick={()=>handleUpdateSettings({bgImage: ''})} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all"><i className="fas fa-times text-xs"></i></button>}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500">تصویر اطلاعیه (Full Screen)</label>
                      <div className="h-32 border-2 border-dashed border-orange-200 rounded-xl flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer hover:bg-orange-50 transition-all">
                        {settings.announcementImage ? <img src={settings.announcementImage} className="w-full h-full object-cover" /> : <i className="fas fa-scroll text-orange-300 text-2xl"></i>}
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e=>e.target.files && handleFileUpload(e.target.files[0], 'announcementImage')} />
                        {settings.announcementImage && <button onClick={()=>handleUpdateSettings({announcementImage: ''})} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all"><i className="fas fa-times text-xs"></i></button>}
                        <div className="absolute bottom-1 right-1">
                          <input type="checkbox" checked={settings.showAnnouncement} onChange={(e)=>{e.stopPropagation(); handleUpdateSettings({showAnnouncement: e.target.checked})}} className="w-4 h-4 accent-orange-600" title="فعال سازی" />
                        </div>
                      </div>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'events' && (
             <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                   <h3 className="font-black text-slate-800 mb-4">ایجاد مراسم جدید</h3>
                   <div className="flex gap-4">
                      <input className="flex-1 border rounded-xl p-3 focus:ring-2 focus:ring-blue-500" placeholder="عنوان مراسم (مثلاً: یادبود شادروان ...)" value={newEventTitle} onChange={e=>setNewEventTitle(e.target.value)} />
                      <button onClick={handleCreateEvent} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-black px-8 py-3 rounded-xl shadow-lg shadow-blue-200 flex items-center gap-2 transition-all">
                        {loading ? <Spinner /> : 'ایجاد مراسم فعال'}
                      </button>
                   </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                   <div className="p-4 bg-slate-50 border-b border-slate-200 font-black text-slate-700">لیست مراسم‌ها</div>
                   <div className="divide-y divide-slate-100">
                      {events.map(ev => (
                        <div key={ev.id} className={`p-5 flex items-center justify-between transition-all ${ev.isactive?'bg-green-50/50 border-r-4 border-green-500':''}`}>
                           <div>
                              <div className="font-black text-slate-800">{ev.title}</div>
                              <div className="text-xs text-slate-400 mt-1">{new Date(ev.created_at).toLocaleDateString('fa-IR')}</div>
                           </div>
                           <div className="flex gap-2">
                              {ev.isactive ? (
                                <span className="text-[10px] bg-green-600 text-white font-black px-3 py-1 rounded-full uppercase tracking-widest">فعال</span>
                              ) : (
                                <button onClick={async ()=>{
                                  await supabase.from('events').update({ isactive: false }).eq('isactive', true);
                                  await supabase.from('events').update({ isactive: true }).eq('id', ev.id);
                                  loadEvents();
                                  handleUpdateSettings({ eventTitle: ev.title });
                                }} className="text-blue-600 hover:bg-blue-100 px-3 py-1 rounded-lg text-xs font-bold transition-all">فعال‌سازی</button>
                              )}
                              {!ev.isactive && (
                                <button onClick={()=>handleDeleteEvent(ev.id, ev.title)} disabled={actionIds[ev.id]} className="text-red-400 hover:text-red-600 transition-all p-2">
                                  {actionIds[ev.id] ? <Spinner size="w-3 h-3" color="border-red-500" /> : <i className="fas fa-trash-alt"></i>}
                                </button>
                              )}
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          )}

          {activeTab === 'admins' && (
            <div className="max-w-4xl mx-auto space-y-6">
               <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="font-black text-slate-800 mb-4">تعریف مدیر جدید</h3>
                  <form onSubmit={handleAddAdmin} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <input required className="border rounded-xl p-3" placeholder="نام کاربری" value={newAdmin.username} onChange={e=>setNewAdmin({...newAdmin, username: e.target.value})} />
                     <input required className="border rounded-xl p-3" placeholder="رمز عبور" value={newAdmin.password} onChange={e=>setNewAdmin({...newAdmin, password: e.target.value})} />
                     <button type="submit" disabled={loading} className="bg-slate-900 text-white font-black rounded-xl hover:bg-black transition-all">
                       {loading ? <Spinner /> : 'افزودن مدیر'}
                     </button>
                  </form>
               </div>
               
               <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-right">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                      <tr><th className="p-4">نام کاربری</th><th className="p-4">نقش</th><th className="p-4">عملیات</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {admins.map(admin => (
                        <tr key={admin.id} className="hover:bg-slate-50/50">
                           <td className="p-4 font-bold">{admin.username}</td>
                           <td className="p-4"><span className="text-[10px] font-black bg-slate-200 px-2 py-0.5 rounded uppercase">{admin.role}</span></td>
                           <td className="p-4">
                             {admin.username !== 'admin' && (
                               <button onClick={async ()=>{
                                 if(!confirm('مدیر حذف شود؟')) return;
                                 await supabase.from('admins').delete().eq('id', admin.id);
                                 loadAdmins();
                               }} className="text-red-400 hover:text-red-600"><i className="fas fa-trash"></i></button>
                             )}
                           </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Receipt Modal */}
      {viewReceipt && (
        <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm" onClick={()=>setViewReceipt(null)}>
           <button className="absolute top-6 left-6 text-white text-4xl hover:scale-125 transition-all"><i className="fas fa-times"></i></button>
           <img src={viewReceipt} className="max-w-full max-h-full rounded-2xl shadow-2xl border-4 border-white/10" />
        </div>
      )}
    </div>
  );
};
