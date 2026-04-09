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
  const [showProfile, setShowProfile] = useState(false); // Pop-up State

  const handleDelete = async (offerId) => {
    if (!confirm("Are you sure you want to mark this as sold?")) return;
    try {
      const response = await fetch(`${apiUrl}/offers/${offerId}?user_id=${user.id}`, { method: 'DELETE' });
      if (response.ok) fetchOffers();
    } catch (err) { console.error("Failed to delete:", err); }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setStatusMsg('Saving...');
    const { error } = await supabase.from('profiles').upsert({ 
      id: user.id, email: user.email, first_name: firstName, last_name: lastName, contact_info: contactInfo, updated_at: new Date().toISOString()
    });
    if (!error) {
        setStatusMsg('Profile updated!');
        setTimeout(() => { setShowProfile(false); setStatusMsg(''); }, 1000);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('*').eq('id', user.id).single()
        .then(({ data }) => {
          if (data) { setFirstName(data.first_name || ''); setLastName(data.last_name || ''); setContactInfo(data.contact_info || ''); }
        });
    }
  }, [user]);

  const fetchOffers = () => {
    fetch(`${apiUrl}/offers`).then(res => res.json()).then(data => setOffers(data)).catch(err => console.error(err));
  };

  useEffect(() => { fetchOffers(); }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({ email });
    setStatusMsg(error ? error.message : 'Check your wustl email for the magic link!');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      const response = await fetch(`${apiUrl}/offers?seller_id=${user.id}&amount=${amount}&price=${price}`, { method: 'POST' });
      if (response.ok) { setAmount(''); setPrice(''); fetchOffers(); setStatusMsg('Offer live!'); }
    } catch (err) { setStatusMsg('Error posting.'); }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcfaf7] px-6">
        <div className="max-w-md w-full bg-white/40 backdrop-blur-xl p-12 rounded-[3rem] border border-white/50 shadow-2xl text-center">
          <h1 className="text-5xl font-light text-[#A51417] mb-4 italic serif">Pointswap.</h1>
          <p className="text-gray-400 mb-10 font-medium tracking-widest text-[10px] uppercase tracking-[0.3em]">The Unofficial Bear Marketplace</p>
          <form onSubmit={handleLogin} className="space-y-6">
            <input 
              type="email" placeholder="your_email@wustl.edu"
              className="w-full p-4 bg-transparent border-b border-gray-200 outline-none focus:border-[#A51417] transition-all text-center placeholder:text-gray-300 font-sans"
              value={email} onChange={(e) => setEmail(e.target.value)} required
            />
            <button className="w-full py-4 bg-[#A51417] text-white font-bold rounded-full hover:bg-black transition-all shadow-lg shadow-red-100 uppercase tracking-widest text-xs">
              Request Magic Link
            </button>
          </form>
          {statusMsg && <p className="mt-6 text-[10px] text-gray-400 uppercase font-bold tracking-tighter">{statusMsg}</p>}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen pb-20 bg-[#fcfaf7] font-sans">
      {/* GLASS NAV */}
      <nav className="fixed top-0 w-full z-50 bg-white/30 backdrop-blur-md border-b border-white/20 p-6 px-12 flex justify-between items-center">
        <h1 className="text-2xl font-light text-[#A51417] italic serif">Pointswap.</h1>
        <div className="flex items-center gap-6">
          <button onClick={() => setShowProfile(true)} className="w-10 h-10 bg-white/80 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-all">
            <span className="text-xs">👤</span>
          </button>
          <button onClick={() => supabase.auth.signOut()} className="text-[10px] font-black text-gray-300 hover:text-red-700 transition-all uppercase tracking-[0.3em]">Logout</button>
        </div>
      </nav>

      {/* ACCOUNT SETTINGS POP-UP (MODAL) */}
      {showProfile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/10 backdrop-blur-sm p-6">
          <div className="bg-white max-w-sm w-full p-10 rounded-[3rem] shadow-2xl relative border border-white">
            <button onClick={() => setShowProfile(false)} className="absolute top-6 right-8 text-gray-300 hover:text-black">✕</button>
            <h2 className="text-2xl serif italic mb-8">Profile Settings</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="flex gap-2">
                <input placeholder="First" className="w-1/2 bg-gray-50 p-3 rounded-2xl text-xs outline-none" value={firstName} onChange={(e) => setFirstName(e.target.value)}/>
                <input placeholder="Last" className="w-1/2 bg-gray-50 p-3 rounded-2xl text-xs outline-none" value={lastName} onChange={(e) => setLastName(e.target.value)}/>
              </div>
              <input placeholder="Email or Phone Number" className="w-full bg-gray-50 p-3 rounded-2xl text-xs outline-none mb-4" value={contactInfo} onChange={(e) => setContactInfo(e.target.value)}/>
              <button type="submit" className="w-full py-4 bg-[#A51417] text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg">Save Profile</button>
              {statusMsg && <p className="text-center text-[10px] font-bold text-red-400 mt-2">{statusMsg}</p>}
            </form>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-8 pt-32 grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* SELL SECTION (4 Cols) */}
        <aside className="lg:col-span-4">
          <section className="bg-[#A51417] p-12 rounded-[3.5rem] text-white shadow-2xl sticky top-32">
            <h2 className="text-3xl serif mb-8 italic">List Points</h2>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">Amount</label>
                <input type="number" placeholder="e.g. 500" className="w-full bg-transparent border-b border-white/20 py-2 outline-none focus:border-white transition-all text-xl font-sans" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">Price per point</label>
                <input type="number" step="0.01" placeholder="e.g. 0.70" className="w-full bg-transparent border-b border-white/20 py-2 outline-none focus:border-white transition-all text-xl font-sans" value={price} onChange={(e) => setPrice(e.target.value)} required />
              </div>
              <button type="submit" className="w-full py-5 bg-white text-[#A51417] font-bold rounded-full hover:bg-gray-100 transition-all uppercase tracking-widest text-[10px]">Post Offer</button>
            </form>
          </section>
        </aside>

        {/* FEED (8 Cols) */}
        <section className="lg:col-span-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-5xl serif italic text-gray-800">Marketplace</h2>
              <p className="text-gray-400 text-xs mt-2 uppercase tracking-widest font-bold">Live Feed • St. Louis, MO</p>
            </div>
            <button onClick={fetchOffers} className="text-[10px] font-bold text-gray-300 hover:text-gray-500 transition-all uppercase tracking-widest">Refresh</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {offers.map((offer) => (
              <div key={offer.id} className="group relative bg-white p-10 rounded-[3rem] border border-gray-50 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                <div className="flex justify-between items-start mb-8">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-[#A51417] font-bold text-xl serif italic">
                    {offer.amount.toString()[0]}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Total Price</p>
                    <p className="text-3xl serif text-[#A51417] font-light italic">${(offer.amount * offer.price_per_point).toFixed(2)}</p>
                  </div>
                </div>

                <div className="mb-8">
                  <p className="text-4xl font-bold tracking-tighter text-gray-900">{offer.amount} <span className="text-lg font-light text-gray-400 serif italic">points</span></p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                    Listed by {offer.profiles?.first_name || "A Fellow Bear"}
                  </p>
                </div>

                <div className="pt-6 border-t border-gray-50">
                  {user.id === offer.seller_id ? (
                    <button onClick={() => handleDelete(offer.id)} className="w-full py-3 bg-red-50 text-[#A51417] text-[10px] font-black rounded-full hover:bg-red-100 uppercase tracking-[0.2em] transition-all">Mark as Sold</button>
                  ) : (
                    <a href={offer.profiles?.contact_info?.includes('@') ? `mailto:${offer.profiles.contact_info}` : `tel:${offer.profiles.contact_info}`} className="block w-full py-3 bg-gray-900 text-white text-[10px] font-black rounded-full hover:bg-black uppercase tracking-[0.2em] transition-all text-center">Contact Seller</a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}