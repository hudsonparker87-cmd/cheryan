
import React, { useState } from 'react';
import { supabase } from './supabase';
import { ViewType, Admin } from './types';
import { AdminPanel } from './components/Admin';
import { DisplayCore } from './components/Display';
import { DonorPortal } from './components/Donor';
import { Spinner } from './components/Shared';

const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('landing');
  const [prevView, setPrevView] = useState<ViewType>('landing');
  const [credentials, setCredentials] = useState({ user: '', pass: '' });
  const [currentUser, setCurrentUser] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('username', credentials.user)
      .eq('password', credentials.pass)
      .maybeSingle();

    if (data) {
      setCurrentUser(data);
      setView('admin');
    } else {
      alert('نام کاربری یا رمز عبور نامعتبر است.');
    }
    setLoading(false);
  };

  const switchView = (newView: ViewType) => {
    setPrevView(view);
    setView(newView);
  };

  if (view === 'landing') {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-6 space-y-8 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
           <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 blur-[120px] rounded-full"></div>
           <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600 blur-[120px] rounded-full"></div>
        </div>

        <div className="relative z-10 text-center space-y-4">
           <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter drop-shadow-2xl">سامانه جامع <span className="text-yellow-500">اکرام</span></h1>
           <p className="text-slate-400 text-sm md:text-lg max-w-lg mx-auto leading-relaxed">سیستم مدیریت مراسم‌های خیریه، ثبت مبالغ پرداخت و نمایش زنده در سالن‌های برگزاری.</p>
        </div>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl px-4">
           <button onClick={()=>switchView('login')} className="group flex flex-col items-center p-8 bg-slate-900 border border-slate-800 rounded-[2.5rem] hover:bg-slate-800 transition-all hover:scale-105 shadow-2xl">
              <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-500 group-hover:text-white transition-all text-blue-500">
                <i className="fas fa-user-shield text-3xl"></i>
              </div>
              <h3 className="text-xl font-black text-white">ورود مدیریت</h3>
              <p className="text-slate-500 text-xs mt-2 text-center">دسترسی به تنظیمات، مراسم‌ها و لیست تراکنش‌های مالی</p>
           </button>

           <button onClick={()=>switchView('display')} className="group flex flex-col items-center p-8 bg-slate-900 border border-slate-800 rounded-[2.5rem] hover:bg-slate-800 transition-all hover:scale-105 shadow-2xl border-t-yellow-500/20">
              <div className="w-16 h-16 bg-yellow-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-yellow-500 group-hover:text-black transition-all text-yellow-500">
                <i className="fas fa-tv text-3xl"></i>
              </div>
              <h3 className="text-xl font-black text-white">نمایشگر سالن</h3>
              <p className="text-slate-500 text-xs mt-2 text-center">اجرای مانیتور زنده جهت نمایش نام خیّرین در مراسم</p>
           </button>

           <button onClick={()=>switchView('donor')} className="group flex flex-col items-center p-8 bg-slate-900 border border-slate-800 rounded-[2.5rem] hover:bg-slate-800 transition-all hover:scale-105 shadow-2xl border-t-green-500/20">
              <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-green-500 group-hover:text-white transition-all text-green-500">
                <i className="fas fa-heart text-3xl"></i>
              </div>
              <h3 className="text-xl font-black text-white">درگاه مشارکت</h3>
              <p className="text-slate-500 text-xs mt-2 text-center">صفحه عمومی جهت ثبت مبالغ پرداخت توسط میهمانان</p>
           </button>
        </div>

        <div className="mt-12 text-slate-600 text-[10px] tracking-widest font-black uppercase">کلیه ی حقوق مادی و معنوی این سامانه متعلق به مرکز نیکوکاری حضرت ابالفضل علیه السلام می باشد</div>
      </div>
    );
  }

  if (view === 'login') {
    return (
      <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center p-6">
         <form onSubmit={handleLogin} className="bg-white p-10 rounded-[2rem] shadow-2xl w-full max-w-sm border border-slate-200 space-y-6">
            <div className="text-center space-y-2">
               <h2 className="text-2xl font-black text-slate-900">احراز هویت</h2>
               <p className="text-xs text-slate-400">لطفاً برای دسترسی به پنل مدیریت وارد شوید</p>
            </div>
            <div className="space-y-4">
               <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 mr-2">نام کاربری</label>
                  <input className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" autoFocus value={credentials.user} onChange={e=>setCredentials({...credentials, user: e.target.value})} />
               </div>
               <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 mr-2">رمز عبور</label>
                  <input type="password" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={credentials.pass} onChange={e=>setCredentials({...credentials, pass: e.target.value})} />
               </div>
            </div>
            <button disabled={loading} className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 rounded-xl shadow-xl transition-all flex items-center justify-center">
               {loading ? <Spinner /> : 'ورود به سامانه'}
            </button>
            <button type="button" onClick={()=>setView('landing')} className="w-full text-xs text-slate-400 font-bold hover:text-slate-600">بازگشت به صفحه اصلی</button>
         </form>
      </div>
    );
  }

  if (view === 'admin' && currentUser) {
    return <AdminPanel currentUser={currentUser} onLogout={()=>{setCurrentUser(null); setView('landing');}} onShowDisplay={()=>switchView('display')} />;
  }

  if (view === 'display') {
    return <DisplayCore onExit={()=>setView(prevView)} />;
  }

  if (view === 'donor') {
    return <DonorPortal onExit={()=>setView('landing')} onShowDisplay={()=>switchView('display')} />;
  }

  return null;
};

export default App;
