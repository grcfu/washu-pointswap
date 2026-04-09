'use client'
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function Home() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [offers, setOffers] = useState([]);

  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [listingMsg, setListingMsg] = useState('');
  const [profileMsg, setProfileMsg] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [posting, setPosting] = useState(false);
  const [deleting, setDeleting] = useState(null);

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
  const fetchOffers = useCallback(() => {
    setLoadingOffers(true);
    fetch(`${apiUrl}/offers`)
      .then(res => res.json())
      .then(data => setOffers(data))
      .catch(err => console.error(err))
      .finally(() => setLoadingOffers(false));
  }, []);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  // Derived values
  const totalPreview = amount && price ? (parseFloat(amount) * parseFloat(price)).toFixed(2) : null;
  const bestValueId = offers.length > 0 ? offers.reduce((best, o) => o.price_per_point < best.price_per_point ? o : best, offers[0]).id : null;

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({ email });
    setListingMsg(error ? error.message : 'Check your email for the magic link!');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    const parsedAmount = parseInt(amount);
    const parsedPrice = parseFloat(price);
    if (parsedAmount < 150 || parsedAmount > 2000) {
      setListingMsg('Amount must be between 150 and 2000.');
      return;
    }
    if (!parsedPrice || parsedPrice <= 0) {
      setListingMsg('Price must be greater than $0.');
      return;
    }
    setPosting(true);
    setListingMsg('');
    try {
      const response = await fetch(`${apiUrl}/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seller_id: user.id, amount: parsedAmount, price: parsedPrice }),
      });
      if (response.ok) { setAmount(''); setPrice(''); fetchOffers(); setListingMsg('Live on Market.'); }
      else { const data = await response.json(); setListingMsg(data.detail || 'Failed to post.'); }
    } catch (err) { setListingMsg('Failed to post.'); }
    finally { setPosting(false); }
  };

  const handleDelete = async (offerId) => {
    if (!confirm("Remove this listing?")) return;
    setDeleting(offerId);
    try {
      const response = await fetch(`${apiUrl}/offers/${offerId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      if (response.ok) fetchOffers();
    } catch (err) { console.error(err); }
    finally { setDeleting(null); }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileMsg('Syncing profile...');
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      first_name: firstName,
      last_name: lastName,
      contact_info: contactInfo,
      updated_at: new Date().toISOString()
    });
    if (!error) {
      setProfileMsg('Updated!');
      setTimeout(() => { setShowProfile(false); setProfileMsg(''); }, 1000);
    } else {
      setProfileMsg('Failed to update.');
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
          {listingMsg && <p className="mt-8 text-[10px] text-gray-400 uppercase italic">{listingMsg}</p>}
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
              {profileMsg && <p className="text-center text-[10px] font-bold text-red-400 uppercase mt-2">{profileMsg}</p>}
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
              <button type="submit" disabled={posting} className="w-full py-5 bg-[#A51417] text-white font-bold rounded-full hover:bg-black transition-all uppercase tracking-widest text-[10px] shadow-xl shadow-red-100/50 disabled:opacity-50">{posting ? 'Posting...' : 'Post Offer'}</button>
              {listingMsg && <p className="text-center text-[10px] font-bold uppercase text-[#A51417] mt-2">{listingMsg}</p>}
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
            {loadingOffers ? (
              <div className="col-span-full py-32 text-center glass rounded-[3rem]">
                <p className="serif italic text-gray-300 text-xl">Loading...</p>
              </div>
            ) : offers.length === 0 ? (
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
                      <button onClick={() => handleDelete(offer.id)} disabled={deleting === offer.id} className="w-full py-3 bg-red-50 text-[#A51417] text-[9px] font-black rounded-full hover:bg-red-100 uppercase tracking-widest transition-all disabled:opacity-50">{deleting === offer.id ? 'Removing...' : 'Sold'}</button>
                    ) : (
                      offer.profiles?.contact_info ? (
                        <span className="w-full py-3 bg-gray-900 text-white text-[9px] font-black rounded-full uppercase tracking-widest text-center block">{offer.profiles.contact_info}</span>
                      ) : (
                        <span className="w-full py-3 bg-gray-100 text-gray-400 text-[9px] font-black rounded-full uppercase tracking-widest text-center block">No contact</span>
                      )
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