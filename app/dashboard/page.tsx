'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Calendar, Users, Crown, ChevronRight } from 'lucide-react';

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Color palette
  const colors = {
    bg: '#0f0f0f',
    cardBg: '#1a1a1a',
    gold: '#c9a961',
    goldLight: '#d4af37',
    text: '#f5f5f0',
    textMuted: '#a8a8a0',
    border: '#2a2a2a',
    purple: '#2d2640'
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      setEvents(data.events || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching events:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.gold,
        fontSize: '18px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
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
        padding: '24px 20px',
        borderBottom: `1px solid ${colors.border}`
      }}>
        <h1 style={{
          margin: '0 0 8px 0',
          fontSize: '32px',
          fontWeight: '300',
          letterSpacing: '2px',
          color: colors.gold
        }}>GIFTY</h1>
        <p style={{
          margin: 0,
          fontSize: '15px',
          color: colors.textMuted
        }}>Event Management</p>
      </div>

      {/* Events List */}
      <div style={{ padding: '20px' }}>
        {events.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '64px 24px',
            color: colors.textMuted
          }}>
            <Calendar size={64} color={colors.textMuted} style={{ margin: '0 auto 24px' }} />
            <h3 style={{ fontSize: '20px', color: colors.text, marginBottom: '12px' }}>
              No Events Yet
            </h3>
            <p style={{ fontSize: '15px', marginBottom: '32px' }}>
              Create your first event to get started
            </p>
            <button
              onClick={() => router.push('/events/new')}
              style={{
                background: colors.gold,
                border: 'none',
                color: colors.bg,
                padding: '14px 32px',
                borderRadius: '12px',
                fontSize: '15px',
                cursor: 'pointer',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Plus size={20} />
              Create Event
            </button>
          </div>
        ) : (
          <>
            {events.map(event => {
              const totalGuests = event._count?.guests || 0;
              const claimedGuests = event.guests?.filter(g => g.claimed).length || 0;
              
              return (
                <div
                  key={event.id}
                  onClick={() => router.push(`/events/${event.id}`)}
                  style={{
                    background: colors.cardBg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '16px',
                    padding: '20px',
                    marginBottom: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = colors.gold;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = colors.border;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Gold accent line for active events */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: `linear-gradient(90deg, ${colors.gold} 0%, ${colors.goldLight} 100%)`
                  }} />

                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        margin: '0 0 8px 0',
                        fontSize: '20px',
                        fontWeight: '500',
                        color: colors.text
                      }}>
                        {event.name}
                      </h3>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        fontSize: '14px',
                        color: colors.textMuted,
                        marginBottom: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Users size={16} />
                          <span>{totalGuests} guests</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={16} />
                          <span>
                            {new Date(event.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Progress indicator */}
                      {totalGuests > 0 && (
                        <div>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '13px',
                            color: colors.textMuted,
                            marginBottom: '6px'
                          }}>
                            <span>Claimed</span>
                            <span style={{ color: colors.gold, fontWeight: '500' }}>
                              {claimedGuests}/{totalGuests}
                            </span>
                          </div>
                          <div style={{
                            width: '100%',
                            height: '6px',
                            background: colors.bg,
                            borderRadius: '3px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${(claimedGuests / totalGuests) * 100}%`,
                              height: '100%',
                              background: `linear-gradient(90deg, ${colors.gold} 0%, ${colors.goldLight} 100%)`,
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                        </div>
                      )}
                    </div>

                    <ChevronRight size={24} color={colors.textMuted} />
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Floating Action Button */}
      {events.length > 0 && (
        <button
          onClick={() => router.push('/events/new')}
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
          <Plus size={28} color={colors.bg} />
        </button>
      )}
    </div>
  );
}
