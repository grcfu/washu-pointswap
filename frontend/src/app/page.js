'use client'
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import BearMark from '../components/BearMark';
import ThemeToggle from '../components/ThemeToggle';

// Same-origin route handlers in src/app/api — no CORS, no separate backend host.
// Override only to point at the optional FastAPI app in backend/ instead.
const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';

function timeAgo(dateString) {
  if (!dateString) return '';
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function SkeletonCard() {
  return (
    <div className="glass p-6 md:p-8 rounded-[2.5rem] border border-edge flex flex-col justify-between">
      <div className="text-center space-y-4">
        <div className="skeleton h-3 w-24 mx-auto"></div>
        <div className="skeleton h-14 w-32 mx-auto"></div>
        <div className="skeleton h-3 w-12 mx-auto"></div>
      </div>
      <div className="mt-8 pt-6 border-t border-line text-center space-y-3">
        <div className="skeleton h-3 w-20 mx-auto"></div>
        <div className="skeleton h-8 w-28 mx-auto"></div>
        <div className="skeleton h-10 w-full rounded-full"></div>
        <div className="skeleton h-3 w-16 mx-auto"></div>
      </div>
    </div>
  );
}

const isValidContact = (val) => {
  if (!val) return true;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[\d\s\-+().]+$/;
  return emailRegex.test(val) || phoneRegex.test(val);
};

const getContactHref = (info) => {
  if (!info) return null;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info)) return `mailto:${info}`;
  if (/^[\d\s\-+().]+$/.test(info)) return `tel:${info}`;
  return null;
};

export default function Home() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [loginMsg, setLoginMsg] = useState('');
  const [offers, setOffers] = useState([]);

  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [listingMsg, setListingMsg] = useState('');
  const [listingSuccess, setListingSuccess] = useState(false);
  const [formCollapsed, setFormCollapsed] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [posting, setPosting] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [revealedContact, setRevealedContact] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
  const [sortKey, setSortKey] = useState(0);
  const [showMine, setShowMine] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // UX only — the real enforcement lives in getCurrentUser on the server.
  // Lowercased so this agrees with the server check on mixed-case addresses.
  const verifyWustlEmail = async (session) => {
    if (!session?.user) return null;
    if (!session.user.email?.toLowerCase().endsWith('@wustl.edu')) {
      await supabase.auth.signOut();
      setLoginMsg('Only @wustl.edu emails are allowed.');
      setShowLogin(true);
      return null;
    }
    return session.user;
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const verified = await verifyWustlEmail(session);
      setUser(verified);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const verified = await verifyWustlEmail(session);
      setUser(verified);
      if (verified) setShowLogin(false);
    });
    return () => subscription.unsubscribe();
  }, []);

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
      if (!localStorage.getItem('pointswap_seen_help')) {
        setShowHelp(true);
        localStorage.setItem('pointswap_seen_help', 'true');
      }
    }
  }, [user]);

  const fetchOffers = useCallback(() => {
    setLoadingOffers(true);
    setFetchError(null);
    fetch(`${apiUrl}/offers`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load listings');
        return res.json();
      })
      .then(data => setOffers(data))
      .catch(err => {
        // A TypeError here means the request never reached the API at all —
        // server down, wrong NEXT_PUBLIC_API_URL, or a CORS-less error page.
        // Don't show the browser's raw "Failed to fetch" to students.
        const offline = err instanceof TypeError;
        if (offline) console.error(`Could not reach the API at ${apiUrl}:`, err);
        setFetchError(offline ? "Can't reach the marketplace right now." : err.message);
      })
      .finally(() => setLoadingOffers(false));
  }, []);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  const perPointPreview = amount && price && parseFloat(amount) > 0 ? (parseFloat(price) / parseFloat(amount)).toFixed(4) : null;
  const bestValueId = offers.length > 0 ? offers.reduce((best, o) => o.price_per_point < best.price_per_point ? o : best, offers[0]).id : null;
  const formReady = firstName.trim() && contactInfo.trim() && amount && price;

  const filteredOffers = showMine ? offers.filter(o => o.seller_id === user?.id) : offers;
  const sortedOffers = [...filteredOffers].sort((a, b) => {
    switch (sortBy) {
      case 'newest': return (b.id > a.id ? 1 : -1);
      case 'oldest': return (a.id > b.id ? 1 : -1);
      case 'points-high': return b.amount - a.amount;
      case 'points-low': return a.amount - b.amount;
      case 'best-value': return a.price_per_point - b.price_per_point;
      case 'price-low': return (a.amount * a.price_per_point) - (b.amount * b.price_per_point);
      case 'price-high': return (b.amount * b.price_per_point) - (a.amount * a.price_per_point);
      default: return 0;
    }
  });

  /*
    Value scale: tint each listing's price-per-point by how it compares to the
    other listings currently on screen. Cheapest third reads strongest green,
    priciest third stays neutral grey.

    Two deliberate constraints:
    - It is redundant, never the only signal. The number itself is always shown,
      and the one actual claim ("Best Value") is a text badge, so nothing is
      communicated by color alone.
    - Below three listings there is no meaningful spread to compare, so the scale
      switches off rather than implying a ranking that does not exist.
  */
  const visiblePrices = filteredOffers.map(o => o.price_per_point);
  const cheapest = visiblePrices.length ? Math.min(...visiblePrices) : 0;
  const priciest = visiblePrices.length ? Math.max(...visiblePrices) : 0;
  const valueClass = (pricePerPoint) => {
    if (filteredOffers.length < 3 || priciest === cheapest) return 'text-ink-muted';
    const position = (pricePerPoint - cheapest) / (priciest - cheapest);
    if (position <= 1 / 3) return 'text-brand-ink';
    if (position <= 2 / 3) return 'text-brand-ink-soft';
    return 'text-ink-muted';
  };

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
    };
  };

  const requireAuth = () => {
    if (!user) { setShowLogin(true); return false; }
    return true;
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setLoginMsg(error.message);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!requireAuth()) return;
    if (!firstName.trim()) {
      setListingMsg('Enter your name so buyers know who you are.');
      return;
    }
    if (!contactInfo.trim()) {
      setListingMsg('Enter your contact info so buyers can reach you.');
      return;
    }
    if (!isValidContact(contactInfo)) {
      setListingMsg('Contact must be a valid email or phone number.');
      return;
    }
    const parsedAmount = parseInt(amount);
    const parsedPrice = parseFloat(price);
    if (parsedAmount < 100 || parsedAmount > 500) {
      setListingMsg('Amount must be between 100 and 500.');
      return;
    }
    if (!parsedPrice || parsedPrice <= 0) {
      setListingMsg('Price must be greater than $0.');
      return;
    }
    if (parsedPrice / parsedAmount > 3) {
      setListingMsg('Price cannot exceed $3.00 per point.');
      return;
    }
    setPosting(true);
    setListingMsg('');
    setListingSuccess(false);
    try {
      await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        contact_info: contactInfo.trim(),
        updated_at: new Date().toISOString()
      });
      const response = await fetch(`${apiUrl}/offers`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ amount: parsedAmount, price: parsedPrice / parsedAmount }),
      });
      if (response.ok) {
        setAmount('');
        setPrice('');
        fetchOffers();
        setListingSuccess(true);
        setFormCollapsed(true);
        setListingMsg('Live on Market.');
        setTimeout(() => setListingSuccess(false), 3000);
      }
      else { const data = await response.json(); setListingMsg(data.detail || 'Something went wrong — try again.'); }
    } catch (err) { setListingMsg('Could not connect to server — check your internet and try again.'); }
    finally { setPosting(false); }
  };

  const handleDelete = async (offerId) => {
    if (!confirm("Remove this listing?")) return;
    setDeleting(offerId);
    try {
      const response = await fetch(`${apiUrl}/offers/${offerId}/delete`, {
        method: 'POST',
        headers: await getAuthHeaders(),
      });
      if (response.ok) { fetchOffers(); setListingMsg(''); }
      else {
        const errData = await response.json().catch(() => ({}));
        setListingMsg(errData.detail || 'Could not remove listing — try again.');
      }
    } catch (err) {
      setListingMsg('Could not connect to server — check your internet and try again.');
    }
    finally { setDeleting(null); }
  };

  const handleContactClick = (offerId) => {
    if (!requireAuth()) return;
    setRevealedContact(offerId);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 page-transition">
        <div className="flex flex-col items-center text-center">
          <BearMark size={56} className="mb-5" />
          {/* Red period: a small nod to WashU's other official color. */}
          <h1 className="text-5xl font-light text-brand-ink italic serif mb-4">Pointswap<span className="text-accent">.</span></h1>
          <p className="text-[10px] font-bold text-ink-muted uppercase tracking-[0.4em] animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen page-transition flex flex-col">
      <nav className="fixed top-0 w-full z-50 glass border-b border-edge-soft h-24 flex items-center justify-center">
        <div className="max-w-7xl w-full px-8 md:px-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <BearMark size={38} className="shrink-0" title="Pointswap" />
            <div className="flex flex-col">
              <h1 className="text-3xl font-light text-brand-ink italic serif tracking-tight leading-none">Pointswap<span className="text-accent">.</span></h1>
              <span className="text-[8px] font-bold text-ink-muted uppercase tracking-[0.3em] mt-1 ml-1">Washington University in St. Louis</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button onClick={() => setShowHelp(true)} className="px-5 py-2 bg-brand text-white text-[9px] font-black uppercase tracking-widest rounded-full hover:bg-brand-hover transition-all ripple">How it works</button>
            {user ? (
              <button onClick={() => setShowProfile(true)} className="w-10 h-10 glass rounded-full flex items-center justify-center premium-shadow hover:scale-110 transition-all ripple">👤</button>
            ) : (
              <button onClick={() => setShowLogin(true)} className="px-5 py-2 bg-inverse text-on-inverse text-[9px] font-black uppercase tracking-widest rounded-full hover:bg-brand transition-all ripple">Sign in</button>
            )}
          </div>
        </div>
      </nav>

      {/* LOGIN MODAL */}
      {showLogin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-scrim backdrop-blur-md p-6">
          <div className="bg-panel max-w-md w-full p-12 rounded-[2.5rem] premium-shadow relative border border-edge-solid text-center">
            <button onClick={() => { setShowLogin(false); setLoginMsg(''); }} className="absolute top-6 right-8 text-ink-faint hover:text-ink-strong transition-colors">✕</button>
            <h2 className="text-3xl font-light text-brand-ink italic serif mb-2">Sign in</h2>
            <p className="text-sm text-ink-mid font-semibold mb-8">Use your <span className="text-brand-ink font-bold">@wustl.edu</span> Google account</p>
            <button onClick={handleGoogleLogin} className="w-full py-4 bg-panel-solid border border-line-2 rounded-full font-bold text-sm text-ink-soft shadow-md hover:shadow-lg hover:border-line-2 transition-all flex items-center justify-center gap-3 ripple">
              <svg width="18" height="18" viewBox="0 0 18 18"><path d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" fill="#4285F4"/><path d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z" fill="#34A853"/><path d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z" fill="#FBBC05"/><path d="M8.98 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.59A8 8 0 0 0 1.83 5.4L4.5 7.49A4.77 4.77 0 0 1 8.98 3.58z" fill="#EA4335"/></svg>
              Continue with Google
            </button>
            {loginMsg && <p className="mt-8 text-xs font-bold text-danger bg-danger-tint px-4 py-3 rounded-2xl">{loginMsg}</p>}
          </div>
        </div>
      )}

      {/* ACCOUNT MODAL */}
      {showProfile && user && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-scrim backdrop-blur-md p-6">
          <div className="bg-panel max-w-xs w-full p-10 rounded-[2.5rem] premium-shadow relative border border-edge-solid text-center">
            <button onClick={() => setShowProfile(false)} className="absolute top-6 right-8 text-ink-faint hover:text-ink-strong transition-colors">✕</button>
            <h2 className="text-2xl serif italic mb-2">Account</h2>
            <p className="text-[9px] font-bold text-ink-muted uppercase tracking-widest mb-8">{user.email}</p>
            <button onClick={() => { if (confirm('Sign out?')) { supabase.auth.signOut(); setShowProfile(false); } }} className="w-full py-4 bg-subtle text-ink-mid text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-danger-tint hover:text-danger transition-all">
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* HOW IT WORKS MODAL */}
      {showHelp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-scrim backdrop-blur-md p-4 md:p-6">
          <div className="bg-panel-strong max-w-lg w-full p-8 md:p-12 rounded-[2rem] md:rounded-[2.5rem] premium-shadow relative border border-edge-solid max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowHelp(false)} className="absolute top-5 right-6 md:top-6 md:right-8 text-ink-faint hover:text-ink-strong transition-colors text-lg">✕</button>
            <h2 className="text-3xl md:text-4xl serif italic mb-2">How It Works</h2>
            <p className="text-[10px] md:text-xs font-bold text-ink-muted uppercase tracking-widest mb-8 md:mb-10">Buy & sell MarketPoints</p>
            <div className="space-y-8">
              <div className="flex gap-5 items-start">
                <span className="w-10 h-10 md:w-12 md:h-12 bg-brand-tint text-brand-ink rounded-full flex items-center justify-center text-base md:text-lg font-bold shrink-0">1</span>
                <div>
                  <p className="text-base md:text-lg font-bold text-ink-2">Browse</p>
                  <p className="text-sm md:text-base text-ink-muted mt-1 leading-relaxed">Check out listings on the marketplace — no sign-in needed.</p>
                </div>
              </div>
              <div className="flex gap-5 items-start">
                <span className="w-10 h-10 md:w-12 md:h-12 bg-brand-tint text-brand-ink rounded-full flex items-center justify-center text-base md:text-lg font-bold shrink-0">2</span>
                <div>
                  <p className="text-base md:text-lg font-bold text-ink-2">Sell your points</p>
                  <p className="text-sm md:text-base text-ink-muted mt-1 leading-relaxed">Sign in with your WashU Google account, fill in your name, contact info, how many points you have (100–500), and your total asking price. Your listing goes live instantly.</p>
                </div>
              </div>
              <div className="flex gap-5 items-start">
                <span className="w-10 h-10 md:w-12 md:h-12 bg-brand-tint text-brand-ink rounded-full flex items-center justify-center text-base md:text-lg font-bold shrink-0">3</span>
                <div>
                  <p className="text-base md:text-lg font-bold text-ink-2">Buy points</p>
                  <p className="text-sm md:text-base text-ink-muted mt-1 leading-relaxed">Sign in and tap "Contact" on a listing to see the seller's email or phone, then reach out to arrange the swap.</p>
                </div>
              </div>
              <div className="flex gap-5 items-start">
                <span className="w-10 h-10 md:w-12 md:h-12 bg-brand-tint text-brand-ink rounded-full flex items-center justify-center text-base md:text-lg font-bold shrink-0">4</span>
                <div>
                  <p className="text-base md:text-lg font-bold text-ink-2">After you sell</p>
                  <p className="text-sm md:text-base text-ink-muted mt-1 leading-relaxed">Tap "Mark as Sold" on your listing to remove it from the marketplace.</p>
                </div>
              </div>
            </div>
            <button onClick={() => setShowHelp(false)} className="w-full mt-10 py-4 md:py-5 bg-brand text-white text-xs md:text-sm font-bold uppercase tracking-widest rounded-full shadow-lg shadow-brand-tint hover:bg-brand-hover transition-all ripple">Got it</button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 md:px-12 pt-30 pb-32 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 flex-1">

        <aside className="lg:col-span-4">
          <section className="glass p-10 rounded-[3rem] premium-shadow sticky top-40">
            <h2 className="text-2xl serif italic mb-8 text-ink-2">List Your Points</h2>
            {!user ? (
              <div className="text-center py-8">
                <p className="text-sm text-ink-muted mb-6">Sign in to list your points</p>
                <button onClick={() => setShowLogin(true)} className="px-8 py-4 bg-brand text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-brand-hover transition-all ripple">Sign in to sell</button>
              </div>
            ) : formCollapsed ? (
              <div className="text-center py-8">
                <span className="success-check text-3xl">&#10003;</span>
                <p className="text-[10px] font-bold uppercase text-brand-ink mt-3 mb-6">Listed successfully!</p>
                <button onClick={() => { setFormCollapsed(false); setListingMsg(''); }} className="text-[10px] font-bold text-ink-muted hover:text-brand-ink uppercase tracking-widest border-b border-line-2 pb-1 transition-all">Post another?</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-ink-muted uppercase tracking-[0.2em] mb-2 block ml-1">Your name</label>
                  <div className="flex gap-2">
                    <input placeholder="First" className="w-1/2 bg-field border border-line rounded-2xl p-4 outline-none focus:ring-2 focus:ring-brand-ring transition-all font-sans" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                    <input placeholder="Last" className="w-1/2 bg-field border border-line rounded-2xl p-4 outline-none focus:ring-2 focus:ring-brand-ring transition-all font-sans" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-ink-muted uppercase tracking-[0.2em] mb-2 block ml-1">Contact info</label>
                  <input placeholder="Email or phone number" className="w-full bg-field border border-line rounded-2xl p-4 outline-none focus:ring-2 focus:ring-brand-ring transition-all font-sans" value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} required />
                  <p className="text-[8px] text-ink-faint mt-1 ml-1">Shown to buyers so they can reach you</p>
                </div>
                <div className="border-t border-line pt-6">
                  <label className="text-[10px] font-black text-ink-muted uppercase tracking-[0.2em] mb-2 block ml-1">Quantity</label>
                  <input type="number" min="100" max="500" placeholder="500" className="w-full bg-field border border-line rounded-2xl p-4 outline-none focus:ring-2 focus:ring-brand-ring transition-all font-sans text-lg" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                </div>
                <div>
                  <label className="text-[10px] font-black text-ink-muted uppercase tracking-[0.2em] mb-2 block ml-1">Total price</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted serif">$</span>
                    <input type="number" step="0.01" min="0.01" placeholder="350" className="w-full bg-field border border-line rounded-2xl p-4 pl-8 outline-none focus:ring-2 focus:ring-brand-ring transition-all font-sans text-lg" value={price} onChange={(e) => setPrice(e.target.value)} required />
                  </div>
                </div>
                {perPointPreview && (
                  <p className="text-center text-xs text-brand-ink font-semibold tracking-wide -mt-4">
                    Price per point: <span className="serif italic">${perPointPreview}</span>
                  </p>
                )}
                <button type="submit" disabled={posting || !formReady} className="w-full py-5 bg-brand text-white font-bold rounded-full hover:bg-brand-hover transition-all uppercase tracking-widest text-[10px] shadow-xl shadow-brand-tint/50 disabled:opacity-40 disabled:hover:bg-brand ripple">{posting ? 'Posting...' : 'Post Offer'}</button>
                {/* Only ever an error: the success path sets formCollapsed, which unmounts this form. */}
                {listingMsg && <p className="text-center text-[10px] font-bold uppercase text-danger mt-2">{listingMsg}</p>}
              </form>
            )}
          </section>
        </aside>

        <section className="lg:col-span-8">
          <header className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-6xl serif italic text-ink tracking-tighter">Marketplace</h2>
              <div className="flex items-center gap-3 mt-3">
                <span className="w-2 h-2 bg-brand rounded-full animate-pulse"></span>
                <p className="text-[9px] font-bold text-ink-muted uppercase tracking-[0.3em]">{offers.length} {offers.length === 1 ? 'Listing' : 'Listings'} Live</p>
              </div>
            </div>
            <button onClick={fetchOffers} disabled={loadingOffers} className="text-[10px] font-bold text-ink-muted hover:text-brand-ink uppercase tracking-widest border-b border-line-2 pb-1 transition-all flex items-center gap-2 disabled:opacity-50">
              <svg className={`w-3 h-3 ${loadingOffers ? 'animate-spin' : ''}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 8a7 7 0 0 1 13.4-2.8M15 8a7 7 0 0 1-13.4 2.8"/><path d="M14.4 1v4h-4M1.6 15v-4h4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Refresh
            </button>
          </header>

          <div className="flex flex-wrap gap-2 mb-8">
            {user && (
              <>
                <button onClick={() => { setShowMine(true); setSortKey(k => k + 1); }} className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${showMine ? 'bg-inverse text-on-inverse shadow-lg' : 'glass text-ink-muted hover:text-ink border border-edge'}`}>
                  My Listings
                </button>
                <span className="w-px bg-subtle-2 mx-1 self-stretch"></span>
              </>
            )}
            {[
              { key: 'newest', label: 'Newest' },
              { key: 'oldest', label: 'Oldest' },
              { key: 'best-value', label: 'Best Value' },
              { key: 'points-high', label: 'Most Points' },
              { key: 'points-low', label: 'Fewest Points' },
              { key: 'price-low', label: 'Price: Low' },
              { key: 'price-high', label: 'Price: High' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => { setSortBy(key); setShowMine(false); setSortKey(k => k + 1); }} className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${sortBy === key && !showMine ? 'bg-brand text-white shadow-lg shadow-brand-tint/50' : 'glass text-ink-muted hover:text-brand-ink hover:border-brand/20 border border-edge'}`}>
                {label}
              </button>
            ))}
          </div>

          <div key={sortKey} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {loadingOffers ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : fetchError ? (
              <div className="col-span-full py-32 text-center glass rounded-[3rem]">
                <p className="serif italic text-danger text-xl mb-4">{fetchError}</p>
                <button onClick={fetchOffers} className="px-6 py-2 bg-brand text-white text-[9px] font-black uppercase tracking-widest rounded-full hover:bg-brand-hover transition-all ripple">Try Again</button>
              </div>
            ) : sortedOffers.length === 0 ? (
              <div className="col-span-full py-32 text-center glass rounded-[3rem] flex flex-col items-center justify-center">
                <BearMark size={80} className="mb-6 opacity-20" />
                <p className="serif italic text-ink-faint text-xl">{showMine ? "You haven't listed anything yet." : "No listings yet — be the first!"}</p>
              </div>
            ) : (
              sortedOffers.map((offer, index) => (
                <div key={offer.id} className={`card-enter card-flip-container ${offer.id === bestValueId ? '' : ''}`} style={{ animationDelay: `${index * 80}ms` }}>
                  <div className={`card-flip-inner ${revealedContact === offer.id ? 'flipped' : ''}`}>
                    {/* FRONT */}
                    <div className={`card-front glass p-4 md:p-5 rounded-2xl premium-shadow card-hover flex flex-col justify-between ${offer.id === bestValueId ? 'border border-brand/20' : 'border border-edge'}`}>
                      <div className="text-center">
                        <div className="h-5 mb-1">
                          {offer.id === bestValueId && (
                            <span className="inline-block bg-brand-tint text-brand-ink text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full float-badge">Best Value</span>
                          )}
                        </div>
                        <h3 className="text-4xl md:text-5xl font-bold tracking-tighter text-brand-ink point-glow leading-none">{offer.amount}</h3>
                        <p className="text-[15px] serif italic text-ink-muted">points</p>
                      </div>

                      <div className="mt-3 pt-3 border-t border-line text-center">
                        <p className="text-2xl serif text-ink-2 italic font-light">${(offer.amount * offer.price_per_point).toFixed(2)}</p>
                        <p className={`text-[16px] font-semibold ${valueClass(offer.price_per_point)}`}>${offer.price_per_point.toFixed(2)} <span className="text-ink-faint font-normal">/ pt</span></p>

                        <div className="mt-3">
                        {user && user.id === offer.seller_id ? (
                          <button onClick={() => handleDelete(offer.id)} disabled={deleting === offer.id} className="w-full py-2.5 bg-danger-tint text-danger text-[9px] font-black rounded-full hover:bg-danger-ring uppercase tracking-widest transition-all disabled:opacity-50 ripple">{deleting === offer.id ? 'Removing...' : 'Mark as Sold'}</button>
                        ) : (
                          <button onClick={() => handleContactClick(offer.id)} className="w-full py-2.5 bg-inverse text-on-inverse text-[9px] font-black rounded-full hover:bg-brand uppercase tracking-widest text-center block transition-all ripple">Contact</button>
                        )}
                        </div>
                        <div className="mt-2 text-center">
                          <p className="text-[10px] text-ink-muted font-bold uppercase tracking-widest truncate">by {offer.profiles?.first_name || "A Bear"}</p>
                          {offer.created_at && <p className="text-[10px] text-ink-faint uppercase tracking-wide">{timeAgo(offer.created_at)}</p>}
                        </div>
                      </div>
                    </div>

                    {/* BACK */}
                    <div className={`card-back glass p-4 md:p-5 rounded-2xl premium-shadow flex flex-col items-center justify-center text-center ${offer.id === bestValueId ? 'border border-brand/20' : 'border border-edge'}`}>
                      <p className="text-[8px] font-black text-ink-muted uppercase tracking-widest mb-3">Contact {offer.profiles?.first_name || "Seller"}</p>
                      {offer.profiles?.contact_info ? (
                        getContactHref(offer.profiles.contact_info) ? (
                          <a href={getContactHref(offer.profiles.contact_info)} className="text-base font-bold text-brand-ink hover:underline break-all">{offer.profiles.contact_info}</a>
                        ) : (
                          <p className="text-base font-bold text-ink-2 break-all">{offer.profiles.contact_info}</p>
                        )
                      ) : (
                        <p className="text-sm text-ink-muted">No contact info</p>
                      )}
                      <button onClick={() => setRevealedContact(null)} className="mt-4 w-full py-2 bg-subtle text-ink-mid text-[8px] font-black rounded-full hover:bg-subtle-2 uppercase tracking-widest transition-all">Flip back</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <footer className="mt-auto py-6 glass border-t border-edge-soft text-center">
        <p className="text-xs text-ink-muted tracking-wide">Built by a student at WashU</p>
        <p className="text-[10px] text-ink-faint tracking-wide mt-1">Pointswap © {new Date().getFullYear()}</p>
      </footer>
    </main>
  );
}
