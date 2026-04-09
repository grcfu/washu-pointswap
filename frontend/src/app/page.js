'use client'

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [offers, setOffers] = useState([]);
  
  // App State
  const [balance, setBalance] = useState('');
  const [burnRate, setBurnRate] = useState(null);
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contactInfo, setContactInfo] = useState(''); 

  //calling delete route
  const handleDelete = async (offerId) => {
  if (!confirm("Are you sure you want to mark this as sold?")) return;

  try {
    const response = await fetch(`http://localhost:8000/offers/${offerId}?user_id=${user.id}`, {
      method: 'DELETE',
    });
    if (response.ok) {
      fetchOffers(); // Refresh the list
    }
  } catch (err) {
    console.error("Failed to delete:", err);
  }
};

  // talking to supabase
  const handleUpdateProfile = async (e) => {
  e.preventDefault();
  setStatusMsg('Saving profile...');

  const { error } = await supabase
    .from('profiles')
    .upsert({ 
      id: user.id, // Supabase uses this to find the right row
      first_name: firstName,
      last_name: lastName,
      contact_info: contactInfo,
      updated_at: new Date().toISOString()
    });

  if (error) {
    setStatusMsg(`Error: ${error.message}`);
  } else {
    setStatusMsg('Profile updated successfully!');
  }
};

  // 1. Auth Logic: Check if student is logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
  if (user) {
    supabase
      .from('profiles')
      .select('first_name, last_name, contact_info')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setFirstName(data.first_name || '');
          setLastName(data.last_name || '');
          setContactInfo(data.contact_info || '');
        }
      });
  }
}, [user]);

  // 2. Fetching the Marketplace (with our new Profile Join)
  const fetchOffers = () => {
    fetch('http://localhost:8000/offers')
      .then(res => res.json())
      .then(data => setOffers(data))
      .catch(err => console.error("Fetch error:", err));
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  // 3. Calculator Logic (Math for the BuCS major)
  useEffect(() => {
    if (balance > 0) {
      const today = new Date('2026-04-08'); 
      const endDate = new Date('2026-05-07');
      const diffDays = Math.ceil(Math.abs(endDate - today) / (1000 * 60 * 60 * 24));
      setBurnRate((balance / diffDays).toFixed(2));
    } else {
      setBurnRate(null);
    }
  }, [balance]);

  // 4. Handlers
  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) setStatusMsg(error.message);
    else setStatusMsg('Check your wustl email for the login link!');
  };

  const handleLogout = () => supabase.auth.signOut();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setStatusMsg('Posting...');

    try {
      const response = await fetch(`http://localhost:8000/offers?seller_id=${user.id}&amount=${amount}&price=${price}`, {
        method: 'POST',
      });
      if (response.ok) {
        setStatusMsg('Success! Offer posted.');
        setAmount(''); setPrice(''); fetchOffers();
      } else {
        const errorData = await response.json();
        setStatusMsg(`Error: ${errorData.detail}`);
      }
    } catch (err) { setStatusMsg('Server connection failed.'); }
  };

  // UI: LOGIN SCREEN
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-xl text-center">
          <h1 className="text-3xl font-black text-[#A51417] mb-2">WashU Pointswap</h1>
          <p className="text-gray-500 mb-8 font-medium italic">The unofficial Bear marketplace.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="email" placeholder="your_email@wustl.edu"
              className="w-full p-4 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-[#A51417] text-center"
              value={email} onChange={(e) => setEmail(e.target.value)} required
            />
            <button className="w-full py-4 bg-[#A51417] text-white font-bold rounded-xl hover:bg-red-800 transition">
              Send Magic Link
            </button>
          </form>
          {statusMsg && <p className="mt-4 text-sm text-[#A51417] font-bold">{statusMsg}</p>}
        </div>
      </div>
    );
  }

  // UI: MAIN DASHBOARD
  return (
    <main className="min-h-screen bg-gray-50 pb-20 font-sans">
      <nav className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10 flex justify-between items-center px-8">
        <h1 className="text-xl font-bold text-[#A51417]">WashU Pointswap</h1>
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-gray-400">{user.email}</span>
          <button onClick={handleLogout} className="text-xs font-black text-gray-400 hover:text-red-700 uppercase tracking-widest">Logout</button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
        
        {/* LEFT COLUMN */}
        <aside className="md:col-span-1 space-y-6">
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold mb-1 text-gray-900">Optimizer</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase mb-4 tracking-widest">29 Days Left</p>
            <input 
              type="number" placeholder="Remaining Points..."
              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none mb-3"
              value={balance} onChange={(e) => setBalance(e.target.value)}
            />
            {burnRate && (
              <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                <p className="text-[10px] text-[#A51417] font-black uppercase mb-1">Daily Burn Goal</p>
                <p className="text-3xl font-black text-[#A51417] tracking-tighter">${burnRate}</p>
              </div>
            )}
          </section>

          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold mb-4 text-gray-900">Sell Points</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input 
                type="number" placeholder="Points to sell"
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none"
                value={amount} onChange={(e) => setAmount(e.target.value)} required
              />
              <input 
                type="number" step="0.01" placeholder="Price per point (e.g. 0.70)"
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none"
                value={price} onChange={(e) => setPrice(e.target.value)} required
              />
              <button type="submit" className="w-full py-3 bg-[#A51417] text-white font-bold rounded-lg hover:bg-red-800 transition">
                Post Offer
              </button>
              {statusMsg && <p className="text-center text-[10px] font-bold text-[#A51417] uppercase mt-2">{statusMsg}</p>}
            </form>
          </section>

          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold mb-4 text-gray-900">Your Info</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-3">
              <div className="flex gap-2">
                <input 
                  placeholder="First Name"
                  className="w-1/2 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none"
                  value={firstName} onChange={(e) => setFirstName(e.target.value)}
                />
                <input 
                  placeholder="Last Name"
                  className="w-1/2 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none"
                  value={lastName} onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              <input 
                placeholder="Email or GroupMe username"
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none"
                value={contactInfo} onChange={(e) => setContactInfo(e.target.value)}
              />
              <button type="submit" className="w-full py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-black transition">
                Save Profile
              </button>
            </form>
          </section>            

        </aside>

        {/* RIGHT COLUMN */}
        <section className="md:col-span-2 space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Active Marketplace</h2>
          {offers.length === 0 ? (
            <p className="text-gray-400 italic">No deals found yet...</p>
          ) : (
            offers.map((offer) => (
              <div key={offer.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center hover:border-red-200 transition">
                <div>
                  <div className="text-4xl font-black text-gray-900 tracking-tighter">{offer.amount}</div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    Sold by {offer.profiles?.first_name || "A Fellow Bear"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-[#A51417]">${(offer.amount * offer.price_per_point).toFixed(2)}</div>
                  
                  <div className="flex flex-col gap-2 mt-3">
                    {/* CONDITIONAL RENDERING: Only show DELETE to the owner */}
                    {user.id === offer.seller_id ? (
                      <button 
                        onClick={() => handleDelete(offer.id)}
                        className="px-6 py-2 bg-red-100 text-[#A51417] text-[10px] font-black rounded-full hover:bg-red-200 transition uppercase tracking-widest"
                      >
                        Mark as Sold
                      </button>
                    ) : (
                      <a 
                        href={offer.profiles?.contact_info ? `mailto:${offer.profiles.contact_info}?subject=Pointswap` : "#"}
                        className="px-6 py-2 bg-gray-900 text-white text-[10px] font-black rounded-full hover:bg-black transition uppercase tracking-widest text-center"
                      >
                        Contact
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}