'use client'

import { useState, useEffect } from 'react';

export default function Home() {
  const [offers, setOffers] = useState([]);
  
  // Calculator State
  const [balance, setBalance] = useState('');
  const [burnRate, setBurnRate] = useState(null);

  // Form State
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  // 1. Fetch Offers
  const fetchOffers = () => {
    fetch('http://localhost:8000/offers')
      .then(res => res.json())
      .then(data => setOffers(data))
      .catch(err => console.error("Error:", err));
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  // 2. Calculator Logic
  useEffect(() => {
    if (balance > 0) {
      const today = new Date('2026-04-08'); // Keeping it pinned to today's date
      const endDate = new Date('2026-05-07');
      const diffTime = Math.abs(endDate - today);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      setBurnRate((balance / diffDays).toFixed(2));
    } else {
      setBurnRate(null);
    }
  }, [balance]);

  // 3. Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg('Posting...');
    const TEST_USER_ID = "e4a92a2d-b447-410f-8ffe-c5308999f14a"; 

    try {
      const response = await fetch(`http://localhost:8000/offers?seller_id=${TEST_USER_ID}&amount=${amount}&price=${price}`, {
        method: 'POST',
      });
      if (response.ok) {
        setStatusMsg('Success! Offer posted.');
        setAmount(''); setPrice(''); fetchOffers();
      } else {
        const errorData = await response.json();
        setStatusMsg(`Error: ${errorData.detail}`);
      }
    } catch (err) {
      setStatusMsg('Failed to connect to server.');
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      <nav className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-[#A51417]">WashU Pointswap</h1>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
        
        {/* LEFT COLUMN: Tools & Sell Form */}
        <aside className="md:col-span-1 space-y-6">
          
          {/* CALCULATOR CARD */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold mb-1 text-gray-900">Burn Rate Optimizer</h2>
            <p className="text-xs text-gray-500 mb-4">Expires May 7 • 29 days left</p>
            
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Current Point Balance</label>
              <input 
                type="number" 
                placeholder="Enter points..."
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#A51417]"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
              />
              
              {burnRate && (
                <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-xs text-[#A51417] font-bold uppercase tracking-widest">Target Spend</p>
                  <p className="text-2xl font-black text-[#A51417]">${burnRate}</p>
                  <p className="text-xs text-red-700 mt-1">per day until finals week.</p>
                </div>
              )}
            </div>
          </section>

          {/* SELL FORM CARD */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold mb-4 text-gray-900">Post an Offer</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input 
                type="number" placeholder="Amount of points"
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none"
                value={amount} onChange={(e) => setAmount(e.target.value)} required
              />
              <input 
                type="number" step="0.01" placeholder="Price per point ($)"
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none"
                value={price} onChange={(e) => setPrice(e.target.value)} required
              />
              <button type="submit" className="w-full py-3 bg-[#A51417] text-white font-bold rounded-lg hover:bg-red-800 transition">
                Create Offer
              </button>
              {statusMsg && <p className="text-center text-xs text-[#A51417] mt-2 font-medium">{statusMsg}</p>}
            </form>
          </section>
        </aside>

        {/* RIGHT COLUMN: The Marketplace */}
        <section className="md:col-span-2 space-y-4">
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Marketplace</h2>
            <span className="text-xs font-bold text-gray-400 uppercase">{offers.length} Active Offers</span>
          </div>
          
          {offers.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-gray-200">
              <p className="text-gray-400">Loading the latest deals...</p>
            </div>
          ) : (
            offers.map((offer) => (
              <div key={offer.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center hover:border-red-200 transition">
                <div>
                  <div className="text-3xl font-black text-gray-900 italic">{offer.amount}</div>
                  <div className="text-xs text-gray-500 font-bold uppercase tracking-tighter">Meal Points Available</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-[#A51417]">${(offer.amount * offer.price_per_point).toFixed(2)}</div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase">Total Cost</div>
                  <button className="mt-3 px-6 py-2 bg-gray-900 text-white text-xs font-black rounded-full hover:bg-black transition">
                    CONTACT
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}