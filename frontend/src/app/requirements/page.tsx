'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';

interface Requirement {
  _id: string;
  eventName?: string;
  title?: string;
  category: string;
  location?: string;
  venue?: string;
  budgetMax?: number;
  budgetMin?: number;
  feeMax?: number;
  feeMin?: number;
  payRate?: number;
  payUnit?: string;
  notes?: string;
  description?: string;
  specialRequirements?: string;
}

export default function RequirementsPage() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeModal, setActiveModal] = useState<Requirement | null>(null);
  const [proposalNotes, setProposalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('http://localhost:5000/api/requirements')
      .then((res) => res.json())
      .then((resData) => {
        const items = resData?.data?.items || resData?.items || resData;
        if (Array.isArray(items)) {
          setRequirements(items);
        } else {
          setRequirements([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching requirements:', err);
        setRequirements([]);
        setLoading(false);
      });
  }, []);

  const filteredRequirements = useMemo(() => {
    return requirements.filter((req) => {
      const name = req.eventName || req.title || '';
      const loc = req.location || '';
      const desc = req.notes || req.description || '';

      const matchesSearch =
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        desc.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'all' ||
        req.category?.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [requirements, searchQuery, selectedCategory]);

  const formatRupees = (val?: number) => {
    if (!val) return '0';
    return val.toLocaleString('en-IN');
  };

  const renderBudget = (req: Requirement) => {
    if (req.budgetMax) return `₹${formatRupees(req.budgetMin)} – ₹${formatRupees(req.budgetMax)}`;
    if (req.feeMax) return `₹${formatRupees(req.feeMin)} – ₹${formatRupees(req.feeMax)}`;
    if (req.payRate) return `₹${formatRupees(req.payRate)}${req.payUnit || '/hr'}`;
    return 'Budget Negotiable';
  };

  const getCategoryImage = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'planner':
        return 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=800';
      case 'performer':
        return 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&q=80&w=800';
      case 'crew':
        return 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&q=80&w=800';
      default:
        return 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800';
    }
  };

  const handleProposalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      alert(`Proposal submitted successfully for "${activeModal?.eventName || 'Event'}"!`);
      setSubmitting(false);
      setActiveModal(null);
      setProposalNotes('');
    }, 600);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAF7F2', color: '#2C2A29', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      
      {/* Dynamic CSS for Hover Effects & Responsiveness */}
      <style dangerouslySetInnerHTML={{__html: `
        .luxury-card {
          background-color: #FFFFFF;
          border: 1px solid #EAE4D9;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .luxury-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 25px 50px rgba(163, 138, 94, 0.15) !important;
          border-color: rgba(163, 138, 94, 0.4) !important;
        }
        .card-img {
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .luxury-card:hover .card-img {
          transform: scale(1.08);
        }
        .submit-btn {
          transition: all 0.3s ease;
        }
        .submit-btn:hover {
          background-color: #A38A5E !important;
          box-shadow: 0 10px 20px rgba(163, 138, 94, 0.3);
          transform: translateY(-2px);
        }
        .filter-btn {
          transition: all 0.3s ease;
        }
        .filter-btn:hover:not(.active-filter) {
          background-color: rgba(163, 138, 94, 0.08) !important;
          border-color: #A38A5E !important;
          color: #A38A5E !important;
        }

        /* Mobile Responsiveness */
        .nav-container { padding: 1.75rem 4rem; }
        .hero-section { padding: 4rem 2rem 2.5rem 2rem; }
        .hero-title { font-size: 3.6rem; }
        .main-container { padding: 2rem 2rem 6rem 2rem; }
        .grid-layout { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 2rem; }

        @media (max-width: 768px) {
          .nav-container { padding: 1.25rem 1.5rem; flex-direction: column; gap: 1rem; text-align: center; }
          .nav-links { width: 100%; justify-content: space-between; }
          .hero-section { padding: 2.5rem 1.5rem 1.5rem 1.5rem; }
          .hero-title { font-size: 2.4rem; }
          .main-container { padding: 1rem 1.5rem 5rem 1.5rem; }
          .grid-layout { grid-template-columns: 1fr; gap: 1.5rem; }
        }
      `}} />

      {/* Navigation Header */}
      <nav className="nav-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #EAE4D9', backgroundColor: 'rgba(250, 247, 242, 0.95)', position: 'sticky', top: 0, zIndex: 50 }}>
        <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#1C1917' }}>
              Event Marketplace
            </span>
            <span style={{ fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#A38A5E', display: 'block', fontWeight: 700 }}>
              Curated Luxury Ecosystem
            </span>
          </div>
        </Link>
        <div className="nav-links" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Link href="/" style={{ color: '#1C1917', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Home
          </Link>
          <Link href="/post-requirement" style={{ backgroundColor: '#1C1917', color: '#FAF7F2', padding: '0.85rem 1.8rem', borderRadius: '40px', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
            + Post Requirement
          </Link>
        </div>
      </nav>

      {/* Hero Banner */}
      <section className="hero-section" style={{ textAlign: 'center', maxWidth: '1000px', margin: '0 auto' }}>
        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: '1.35rem', color: '#A38A5E', display: 'block', marginBottom: '0.5rem' }}>
          For Moments That Deserve Nothing Less Than Extraordinary
        </span>
        <h1 className="hero-title" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, lineHeight: 1.15, margin: '0 0 1.5rem 0', color: '#1C1917' }}>
          Live Event Requirements & Opportunities
        </h1>
        <div style={{ width: '60px', height: '1px', backgroundColor: '#A38A5E', margin: '0 auto 2rem auto' }} />

        {/* Search */}
        <div style={{ maxWidth: '650px', margin: '0 auto' }}>
          <input
            type="text"
            placeholder="Search by event, venue, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '1.1rem 1.5rem', borderRadius: '50px', border: '1px solid #E5DEC9', backgroundColor: '#FFFFFF', color: '#1C1917', fontSize: '0.95rem', outline: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', boxSizing: 'border-box' }}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '2rem', flexWrap: 'wrap' }}>
          {['all', 'planner', 'performer', 'crew'].map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`filter-btn ${active ? 'active-filter' : ''}`}
                style={{
                  padding: '0.65rem 1.5rem',
                  borderRadius: '30px',
                  border: active ? '1px solid #A38A5E' : '1px solid #EAE4D9',
                  backgroundColor: active ? '#A38A5E' : '#FFFFFF',
                  color: active ? '#FFFFFF' : '#686461',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: 'pointer'
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* Requirement Cards Feed - With Imagery & Animations */}
      <main className="main-container" style={{ maxWidth: '1350px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem 0', color: '#A38A5E', fontFamily: "'Cormorant Garamond', serif", fontSize: '1.5rem', fontStyle: 'italic' }}>
            Fetching open requirements...
          </div>
        ) : filteredRequirements.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', backgroundColor: '#FFFFFF', borderRadius: '24px', border: '1px solid #EAE4D9' }}>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.6rem', color: '#686461', margin: 0 }}>No requirements match your current search.</p>
            <button onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }} style={{ marginTop: '1rem', background: 'none', border: 'none', color: '#A38A5E', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem' }}>
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid-layout">
            {filteredRequirements.map((req) => (
              <div
                key={req._id}
                className="luxury-card"
                style={{
                  borderRadius: '24px',
                  overflow: 'hidden',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  {/* Image Header with scale animation */}
                  <div style={{ height: '240px', position: 'relative', overflow: 'hidden' }}>
                    <img
                      className="card-img"
                      src={getCategoryImage(req.category)}
                      alt={req.eventName || 'Requirement Header'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(28,25,23,0.85) 0%, transparent 70%)', pointerEvents: 'none' }} />
                    
                    <span
                      style={{
                        position: 'absolute',
                        top: '1.25rem',
                        left: '1.25rem',
                        backgroundColor: 'rgba(250, 247, 242, 0.95)',
                        backdropFilter: 'blur(8px)',
                        color: '#A38A5E',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        padding: '0.35rem 0.85rem',
                        borderRadius: '20px',
                        border: '1px solid #EAE4D9',
                      }}
                    >
                      {req.category}
                    </span>

                    <span
                      style={{
                        position: 'absolute',
                        bottom: '1.25rem',
                        right: '1.25rem',
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: '1.6rem',
                        fontWeight: 700,
                        color: '#FFFFFF',
                      }}
                    >
                      {renderBudget(req)}
                    </span>
                  </div>

                  {/* Card Details */}
                  <div style={{ padding: '2rem' }}>
                    <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.8rem', fontWeight: 600, color: '#1C1917', margin: '0 0 0.75rem 0', lineHeight: 1.25 }}>
                      {req.eventName || req.title || 'Untitled Event'}
                    </h3>

                    {req.location && (
                      <p style={{ fontSize: '0.85rem', color: '#88827E', margin: '0 0 1.25rem 0', fontWeight: 600 }}>
                        📍 {req.location} {req.venue ? `• ${req.venue}` : ''}
                      </p>
                    )}

                    <div style={{ width: '100%', height: '1px', backgroundColor: '#F4EFE6', margin: '0 0 1.25rem 0' }} />

                    <p style={{ fontSize: '0.95rem', color: '#524F4C', lineHeight: 1.6, margin: '0 0 1rem 0' }}>
                      {req.notes || req.description || req.specialRequirements || 'No additional specifications listed.'}
                    </p>
                  </div>
                </div>

                {/* Animated Submit Button */}
                <div style={{ padding: '0 2rem 2rem 2rem' }}>
                  <button
                    className="submit-btn"
                    onClick={() => setActiveModal(req)}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      borderRadius: '30px',
                      border: 'none',
                      backgroundColor: '#1C1917',
                      color: '#FFFFFF',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      cursor: 'pointer'
                    }}
                  >
                    Submit Proposal
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Interactive Modal */}
      {activeModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(28,25,23,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1.5rem' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', border: '1px solid #EAE4D9', padding: '2.5rem', maxWidth: '550px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#A38A5E' }}>Submit Proposal</span>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '2rem', margin: '0.25rem 0 0 0', color: '#1C1917' }}>{activeModal.eventName || 'Event Requirement'}</h2>
              </div>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#88827E' }}>×</button>
            </div>

            <form onSubmit={handleProposalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: '#1C1917' }}>Your Quotation (₹)</label>
                <input type="text" required placeholder="e.g. ₹75,000" className="form-input" style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #EAE4D9', backgroundColor: '#FAF7F2', color: '#1C1917', fontSize: '0.95rem', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: '#1C1917' }}>Proposal Particulars & Pitch</label>
                <textarea rows={4} required value={proposalNotes} onChange={(e) => setProposalNotes(e.target.value)} placeholder="Introduce your portfolio, past experience with similar venues, and equipment setup..." style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #EAE4D9', backgroundColor: '#FAF7F2', color: '#1C1917', fontSize: '0.95rem', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => setActiveModal(null)} style={{ flex: 1, minWidth: '120px', padding: '0.85rem', borderRadius: '30px', border: '1px solid #EAE4D9', backgroundColor: '#FAF7F2', color: '#686461', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="submit-btn" style={{ flex: 1, minWidth: '150px', padding: '0.85rem', borderRadius: '30px', border: 'none', backgroundColor: '#1C1917', color: '#FAF7F2', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
                  {submitting ? 'Sending...' : 'Send Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}