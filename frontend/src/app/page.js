'use client'
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [offers, setOffers] = useState([]);
  
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contactInfo, setContactInfo] = useState(''); 
  const [showProfile, setShowProfile] = useState(false);

  // 1. Auth & Session Setup
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  // 2. Fetch Profile Data when user is logged in
  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('*').eq('id', user.id).single()
        .then(({ data }) => {
          if (data) { 
            setFirstName(data.first_name || ''); 
            setLastName(data.last_name || ''); 
            setContactInfo(data.contact_info || ''); 
          }
        });
    }
  }, [user]);

  // 3. Marketplace Logic
  const fetchOffers = () => {
    fetch(`${apiUrl}/offers`).then(res => res.json()).then(data => setOffers(data)).catch(err => console.error(err));
  };

  useEffect(() => { fetchOffers(); }, []);

  // Derived values
  const totalPreview = amount && price ? (parseFloat(amount) * parseFloat(price)).toFixed(2) : null;
  const bestValueId = offers.length > 0 ? offers.reduce((best, o) => o.price_per_point < best.price_per_point ? o : best, offers[0]).id : null;

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({ email });
    setStatusMsg(error ? error.message : 'Check your email for the magic link!');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setStatusMsg('Listing...');
    try {
      const response = await fetch(`${apiUrl}/offers?seller_id=${user.id}&amount=${amount}&price=${price}`, { method: 'POST' });
      if (response.ok) { setAmount(''); setPrice(''); fetchOffers(); setStatusMsg('Live on Market.'); }
    } catch (err) { setStatusMsg('Failed to post.'); }
  };

  const handleDelete = async (offerId) => {
    if (!confirm("Remove this listing?")) return;
    try {
      const response = await fetch(`${apiUrl}/offers/${offerId}?user_id=${user.id}`, { method: 'DELETE' });
      if (response.ok) fetchOffers();
    } catch (err) { console.error(err); }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setStatusMsg('Syncing profile...');
    const { error } = await supabase.from('profiles').upsert({ 
      id: user.id, 
      email: user.email, 
      first_name: firstName, 
      last_name: lastName, 
      contact_info: contactInfo, 
      updated_at: new Date().toISOString()
    });
    if (!error) {
      setStatusMsg('Updated!');
      setTimeout(() => { setShowProfile(false); setStatusMsg(''); }, 1000);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md w-full glass p-12 rounded-[3rem] premium-shadow text-center">
          <h1 className="text-5xl font-light text-[#A51417] italic serif mb-4">Pointswap.</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.4em] mb-12">The Unofficial Marketplace</p>
          <form onSubmit={handleLogin} className="space-y-6">
            <input type="email" placeholder="WUSTL Email" className="w-full bg-white/50 border border-gray-100 rounded-2xl p-4 text-center outline-none focus:ring-2 focus:ring-red-100 transition-all" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <button className="w-full py-4 bg-[#A51417] text-white rounded-full font-bold uppercase tracking-widest text-xs shadow-xl shadow-red-100 hover:bg-black transition-all">Request Magic Link</button>
          </form>
          {statusMsg && <p className="mt-8 text-[10px] text-gray-400 uppercase italic">{statusMsg}</p>}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen pb-32">
      {/* NAV - Glass Header */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-white/40 h-24 flex items-center justify-center">
        <div className="max-w-7xl w-full px-8 md:px-16 flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="text-3xl font-light text-[#A51417] italic serif tracking-tight leading-none">Pointswap.</h1>
            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em] mt-1 ml-1">Danforth Campus</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => setShowProfile(true)} className="w-10 h-10 glass rounded-full flex items-center justify-center premium-shadow hover:scale-110 transition-all">👤</button>
          </div>
        </div>
      </nav>

      {/* ACCOUNT MODAL */}
      {showProfile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/10 backdrop-blur-md p-6">
          <div className="bg-white/90 max-w-sm w-full p-10 rounded-[2.5rem] premium-shadow relative border border-white">
            <button onClick={() => setShowProfile(false)} className="absolute top-6 right-8 text-gray-300 hover:text-black transition-colors">✕</button>
            <h2 className="text-2xl serif italic mb-2">Account</h2>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-8">{user.email}</p>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Profile</p>
              <div className="flex gap-2">
                <input placeholder="First" className="w-1/2 bg-gray-50 p-4 rounded-2xl text-sm outline-none font-sans" value={firstName} onChange={(e) => setFirstName(e.target.value)}/>
                <input placeholder="Last" className="w-1/2 bg-gray-50 p-4 rounded-2xl text-sm outline-none font-sans" value={lastName} onChange={(e) => setLastName(e.target.value)}/>
              </div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest pt-2">Contact info</p>
              <input placeholder="GroupMe, email, or @handle" className="w-full bg-gray-50 p-4 rounded-2xl text-sm outline-none font-sans" value={contactInfo} onChange={(e) => setContactInfo(e.target.value)}/>
              <p className="text-[9px] text-gray-300">Shown to buyers when they tap Contact</p>
              <button type="submit" className="w-full py-4 bg-[#A51417] text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg shadow-red-50 hover:bg-black transition-all">Save changes</button>
              {statusMsg && <p className="text-center text-[10px] font-bold text-red-400 uppercase mt-2">{statusMsg}</p>}
            </form>
            <div className="mt-6 pt-6 border-t border-gray-100">
              <button onClick={() => { if (confirm('Sign out?')) supabase.auth.signOut(); }} className="w-full py-3 text-[9px] font-black text-gray-400 hover:text-red-700 uppercase tracking-widest transition-all">
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 pt-30 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
        
        {/* SELL SIDEBAR */}
        <aside className="lg:col-span-4">
          <section className="glass p-10 rounded-[3rem] premium-shadow sticky top-40">
            <h2 className="text-2xl serif italic mb-8 text-gray-800">List Your Points</h2>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block ml-1">Quantity</label>
                <input type="number" placeholder="500" className="w-full bg-white/50 border border-gray-100 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-red-50 transition-all font-sans text-lg" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block ml-1">Price per point</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 serif">$</span>
                  <input type="number" step="0.01" placeholder="0.70" className="w-full bg-white/50 border border-gray-100 rounded-2xl p-4 pl-8 outline-none focus:ring-2 focus:ring-red-50 transition-all font-sans text-lg" value={price} onChange={(e) => setPrice(e.target.value)} required />
                </div>
              </div>
              {totalPreview && (
                <p className="text-center text-xs text-[#A51417] font-semibold tracking-wide -mt-4">
                  Total listing value: <span className="serif italic">${totalPreview}</span>
                </p>
              )}
              <button type="submit" className="w-full py-5 bg-[#A51417] text-white font-bold rounded-full hover:bg-black transition-all uppercase tracking-widest text-[10px] shadow-xl shadow-red-100/50">Post Offer</button>
              {statusMsg && <p className="text-center text-[10px] font-bold uppercase text-[#A51417] mt-2">{statusMsg}</p>}
            </form>
          </section>
        </aside>

        {/* MARKET GRID */}
        <section className="lg:col-span-8">
          <header className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-6xl serif italic text-gray-900 tracking-tighter">Marketplace</h2>
              <div className="flex items-center gap-3 mt-3">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.3em]">Live Listings</p>
              </div>
            </div>
            <button onClick={fetchOffers} className="text-[10px] font-bold text-gray-400 hover:text-[#A51417] uppercase tracking-widest border-b border-gray-200 pb-1 transition-all">Refresh</button>
          </header>

          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {offers.length === 0 ? (
              <div className="col-span-full py-32 text-center glass rounded-[3rem]">
                <p className="serif italic text-gray-300 text-xl">Market is empty...</p>
              </div>
            ) : (
              offers.map((offer) => (
                <div key={offer.id} className={`glass p-6 md:p-8 rounded-[2.5rem] premium-shadow card-hover flex flex-col justify-between ${offer.id === bestValueId ? 'border border-[#A51417]/20' : 'border border-white/60'}`}>
                  <div className="text-center">
                    {offer.id === bestValueId && (
                      <span className="inline-block bg-red-50 text-[#A51417] text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3">Best Value</span>
                    )}
                    <p className="text-[8px] font-black text-gray-300 uppercase tracking-[0.2em] mb-4">Available Points</p>
                    <h3 className="text-5xl md:text-6xl font-bold tracking-tighter text-[#A51417] point-glow leading-none mb-2">{offer.amount}</h3>
                    <p className="text-[10px] serif italic text-gray-400">points</p>
                  </div>

                  <div className="mt-8 pt-6 border-t border-gray-100/50 text-center">
                    <div className="mb-4">
                      <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-1">Total asking</p>
                      <p className="text-2xl serif text-gray-800 italic font-light">${(offer.amount * offer.price_per_point).toFixed(2)}</p>
                      <p className="text-[9px] text-gray-400 mt-1">${offer.price_per_point.toFixed(2)} <span className="text-gray-300">/ pt</span></p>
                    </div>
                    
                    {user.id === offer.seller_id ? (
                      <button onClick={() => handleDelete(offer.id)} className="w-full py-3 bg-red-50 text-[#A51417] text-[9px] font-black rounded-full hover:bg-red-100 uppercase tracking-widest transition-all">Sold</button>
                    ) : (
                      <a href={offer.profiles?.contact_info?.includes('@') ? `mailto:${offer.profiles.contact_info}` : `tel:${offer.profiles.contact_info}`} 
                         className="w-full py-3 bg-gray-900 text-white text-[9px] font-black rounded-full hover:bg-[#A51417] uppercase tracking-widest text-center block transition-all">
                        Contact
                      </a>
                    )}
                    <p className="mt-4 text-[8px] text-gray-300 font-bold uppercase tracking-widest truncate">by {offer.profiles?.first_name || "A Bear"}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}