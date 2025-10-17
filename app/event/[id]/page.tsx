'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Crown, CheckCircle2, Circle, Camera, Search, ArrowLeft } from 'lucide-react';

export default function EventDashboard() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id;

  const [event, setEvent] = useState<any>(null);
  const [guests, setGuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Color palette
  const colors = {
    bg: '#0f0f0f',
    cardBg: '#1a1a1a',
    gold: '#c9a961',
    goldLight: '#d4af37',
    text: '#f5f5f0',
    textMuted: '#a8a8a0',
    success: '#4a7c59',
    successGlow: 'rgba(201, 169, 97, 0.15)',
    border: '#2a2a2a',
    purple: '#2d2640'
  };

  useEffect(() => {
    fetchEventData();
    // Set up auto-refresh every 3 seconds for live updates
    const interval = setInterval(fetchEventData, 3000);
    return () => clearInterval(interval);
  }, [eventId]);

  const fetchEventData = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}`);
      const data = await res.json();
      setEvent(data.event);
      setGuests(data.guests || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching event:', error);
      setLoading(false);
    }
  };

  const filteredGuests = guests.filter((guest: any) => {
    const matchesSearch = guest.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         guest.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'claimed') return matchesSearch && guest.claimed;
    if (activeTab === 'pending') return matchesSearch && !guest.claimed;
    
    return matchesSearch;
  });

  const claimedCount = guests.filter((g: any) => g.claimed).length;
  const totalGuests = guests.length;

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.gold,
        fontSize: '18px'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: colors.bg,
      color: colors.text,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      paddingBottom: '100px'
    }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${colors.cardBg} 0%, ${colors.purple} 100%)`,
        padding: '20px',
        borderBottom: `1px solid ${colors.border}`,
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              background: 'transparent',
              border: 'none',
              color: colors.gold,
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <ArrowLeft size={24} />
          </button>
          <h1 style={{ 
            margin: 0, 
            fontSize: '18px', 
            fontWeight: '600',
            letterSpacing: '1px',
            color: colors.gold
          }}>GIFTY</h1>
          <div style={{ width: '24px' }} />
        </div>
        
        <h2 style={{ 
          margin: '0 0 8px 0', 
          fontSize: '24px',
          fontWeight: '300',
          color: colors.text
        }}>{event?.name}</h2>
        
        <div style={{ 
          display: 'flex', 
          gap: '16px',
          fontSize: '14px',
          color: colors.textMuted,
          marginTop: '12px'
        }}>
          <span style={{ color: colors.gold, fontWeight: '500' }}>{claimedCount}</span>
          <span>of</span>
          <span>{totalGuests}</span>
          <span style={{ color: colors.gold }}>•</span>
          <span style={{ color: colors.textMuted }}>{totalGuests - claimedCount} pending</span>
        </div>

        {/* Search Bar */}
        <div style={{
          marginTop: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          padding: '10px 14px'
        }}>
          <Search size={18} color={colors.textMuted} />
          <input
            type="text"
            placeholder="Search guests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: colors.text,
              fontSize: '15px'
            }}
          />
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginTop: '16px'
        }}>
          {['all', 'claimed', 'pending'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '10px',
                background: activeTab === tab ? colors.gold : 'transparent',
                color: activeTab === tab ? colors.bg : colors.textMuted,
                border: activeTab === tab ? 'none' : `1px solid ${colors.border}`,
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.2s ease'
              }}
            >
              {tab}
              {tab !== 'all' && (
                <span style={{ marginLeft: '6px', opacity: 0.7 }}>
                  ({tab === 'claimed' ? claimedCount : totalGuests - claimedCount})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Guest List */}
      <div style={{ padding: '16px' }}>
        {filteredGuests.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px 24px',
            color: colors.textMuted
          }}>
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>No guests found</p>
            <p style={{ fontSize: '14px' }}>Try adjusting your search or filter</p>
          </div>
        ) : (
          filteredGuests.map((guest: any) => (
            <div 
              key={guest.id}
              style={{
                background: guest.claimed ? colors.successGlow : colors.cardBg,
                border: `1px solid ${guest.claimed ? colors.success : colors.border}`,
                borderLeft: guest.tier === 'VIP' ? `3px solid ${colors.gold}` : `3px solid ${colors.border}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '12px',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                {/* Status Icon */}
                <div style={{ 
                  marginTop: '2px',
                  color: guest.claimed ? colors.gold : colors.textMuted 
                }}>
                  {guest.claimed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                </div>
                
                {/* Guest Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    marginBottom: '4px',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{ 
                      fontSize: '16px',
                      fontWeight: '500',
                      color: colors.text
                    }}>{guest.name}</span>
                    
                    {guest.tier === 'VIP' && (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: `${colors.gold}15`,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: colors.gold,
                        letterSpacing: '0.5px'
                      }}>
                        <Crown size={12} />
                        VIP
                      </div>
                    )}
                  </div>
                  
                  <div style={{ 
                    fontSize: '13px',
                    color: colors.textMuted,
                    marginBottom: '4px'
                  }}>
                    {guest.email}
                  </div>
                  
                  {guest.claimed && guest.claimed_at && (
                    <div style={{ 
                      fontSize: '12px',
                      color: colors.gold,
                      marginTop: '6px'
                    }}>
                      Claimed {new Date(guest.claimed_at).toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true 
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Action Button - Scanner */}
      <button
        onClick={() => router.push(`/scan/${eventId}`)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${colors.gold} 0%, ${colors.goldLight} 100%)`,
          border: 'none',
          boxShadow: `0 8px 24px ${colors.gold}40`,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
          zIndex: 100
        }}
      >
        <Camera size={28} color={colors.bg} />
      </button>
    </div>
  );
}
