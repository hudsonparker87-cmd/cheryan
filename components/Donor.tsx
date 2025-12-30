
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Spinner, CurrencyInput } from './Shared';

export const DonorPortal: React.FC<{ onExit: () => void; onShowDisplay: () => void }> = ({ onExit, onShowDisplay }) => {
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', father: '', mobile: '', amount: '', desc: '', hide: false, paymentType: 'online' as any, receiptImage: '' });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'no_event'>('idle');
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      const { data } = await supabase.from('events').select('id').eq('isactive', true).maybeSingle();
      if (data) setActiveEventId(data.id);
    };
    fetchEvent();
  }, []);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const scale = 600 / img.width;
        canvas.width = 600;
        canvas.height = img.height * scale;
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setForm(f => ({ ...f, receiptImage: canvas.toDataURL('image/jpeg', 0.5) }));
      };
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEventId) return setStatus('no_event');
    if (form.paymentType === 'card' && !form.receiptImage) return alert('لطفاً تصویر فیش واریزی را پیوست کنید.');
    
    setLoading(true);
    const { error } = await supabase.from('donations').insert([{
      event_id: activeEventId,
      donorName: form.name,
      fatherName: form.father,
      mobile: form.mobile,
      amount: parseInt(form.amount),
      description: form.desc,
      hideName: form.hide,
      paymentType: form.paymentType,
      receiptImage: form.receiptImage,
      status: 'pending'
    }]);

    if (error) setStatus('error');
    else {
      setStatus('success');
      setForm({ name: '', father: '', mobile: '', amount: '', desc: '', hide: false, paymentType: 'online', receiptImage: '' });
    }
    setLoading(false);
  };

  const copyCard = () => {
    navigator.clipboard.writeText("6037997971572103");
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-slate-50 to-indigo-50">
      <button onClick={onExit} className="fixed top-4 left-4 bg-white/80 border border-slate-200 p-2 rounded-full shadow-sm hover:bg-white transition-all">
         <i className="fas fa-arrow-right px-1"></i> بازگشت
      </button>

      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl shadow-blue-900/10 border border-white overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-center text-white">
           <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
              <i className="fas fa-hand-holding-heart text-3xl"></i>
           </div>
           <h2 className="text-2xl font-black mb-2">درگاه پرداخت طرح اکرام</h2>
           <p className="text-xs text-blue-100 opacity-80">مشارکت شما چراغ راهی برای نیازمندان خواهد بود</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
           <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex flex-col items-center gap-3">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">شماره کارت مرکز نیکوکاری</span>
              <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-indigo-200">
                 <span className="font-mono font-black text-indigo-700 tracking-[0.2em]">6037-9979-7157-2103</span>
                 <button type="button" onClick={copyCard} className="text-slate-400 hover:text-indigo-600 transition-all">
                    {copySuccess ? <i className="fas fa-check text-green-500"></i> : <i className="far fa-copy"></i>}
                 </button>
              </div>
              <p className="text-[10px] text-center text-indigo-600 leading-tight">مرکز نیکوکاری حضرت ابوالفضل (ع) منطقه ۴ اصفهان</p>
           </div>

           <div className="space-y-4">
              <div className="relative group">
                 <i className="fas fa-user absolute right-4 top-4 text-slate-300 group-focus-within:text-blue-500 transition-all"></i>
                 <input required className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pr-11 pl-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none" placeholder="نام و نام خانوادگی خیّر *" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} />
              </div>
              <div className="flex gap-4">
                <input className="w-1/2 bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="نام پدر" value={form.father} onChange={e=>setForm({...form, father: e.target.value})} />
                <input required type="tel" className="w-1/2 bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="موبایل *" value={form.mobile} onChange={e=>setForm({...form, mobile: e.target.value})} />
              </div>
              <CurrencyInput required className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-bold" placeholder="مبلغ پرداخت (تومان) *" value={form.amount} onChange={val=>setForm({...form, amount: val})} />
              <textarea className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" rows={2} placeholder="توضیحات (اختیاری)" value={form.desc} onChange={e=>setForm({...form, desc: e.target.value})} />
           </div>

           <div className="space-y-3">
              <label className="text-xs font-black text-slate-500 block">انتخاب روش ثبت پرداخت</label>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={()=>setForm({...form, paymentType: 'online'})} className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${form.paymentType==='online'?'border-blue-600 bg-blue-50 text-blue-700':'border-slate-100 hover:bg-slate-50 text-slate-400'}`}>
                  <i className="fas fa-globe text-xl"></i><span className="text-[10px] font-black uppercase">پرداخت آنلاین</span>
                </button>
                <button type="button" onClick={()=>setForm({...form, paymentType: 'card'})} className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${form.paymentType==='card'?'border-indigo-600 bg-indigo-50 text-indigo-700':'border-slate-100 hover:bg-slate-50 text-slate-400'}`}>
                  <i className="fas fa-receipt text-xl"></i><span className="text-[10px] font-black uppercase">کارت به کارت</span>
                </button>
              </div>
              {form.paymentType === 'online' && <p className="text-[10px] text-red-500 text-center animate-pulse"><i className="fas fa-exclamation-triangle"></i> سرویس پرداخت آنلاین فعلاً از دسترس خارج است.</p>}
              {form.paymentType === 'card' && (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 rounded-2xl p-6 bg-indigo-50/50 cursor-pointer hover:bg-indigo-50 transition-all">
                   <i className="fas fa-cloud-upload-alt text-2xl text-indigo-400 mb-2"></i>
                   <span className="text-xs font-bold text-indigo-600">{form.receiptImage ? 'فیش آپلود شد ✓' : 'تصویر فیش واریزی را آپلود کنید'}</span>
                   <input type="file" className="hidden" accept="image/*" onChange={e=>e.target.files && handleFileUpload(e.target.files[0])} />
                </label>
              )}
           </div>

           <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer group">
              <input type="checkbox" checked={form.hide} onChange={e=>setForm({...form, hide: e.target.checked})} className="w-5 h-5 accent-red-500 rounded-lg" />
              <span className="text-xs text-slate-600 group-hover:text-slate-800 transition-all">نام من در نمایشگر سالن نشان داده <b className="text-red-500">نشود</b>.</span>
           </label>

           {status === 'success' && <div className="p-4 bg-green-100 text-green-700 rounded-xl text-center text-xs font-black animate-bounce">اطلاعات شما با موفقیت ثبت شد. متشکریم.</div>}
           {status === 'error' && <div className="p-4 bg-red-100 text-red-700 rounded-xl text-center text-xs font-black">خطایی رخ داد. لطفاً مجدداً تلاش کنید.</div>}

           <button disabled={loading || form.paymentType === 'online'} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-200 transition-all transform hover:scale-[1.02] active:scale-[0.98]">
              {loading ? <Spinner /> : 'ثبت نهایی پرداخت'}
           </button>
        </form>
      </div>
    </div>
  );
};
