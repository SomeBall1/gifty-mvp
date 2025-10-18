'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { X } from 'lucide-react'

interface Event {
  id: string
  name: string
  date: string
  scanner_pin: string | null
}

export default function DashboardPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newEventName, setNewEventName] = useState('')
  const [newEventDate, setNewEventDate] = useState('')
  const [newEventPin, setNewEventPin] = useState('')
  const [creating, setCreating] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Deep charcoal + champagne gold color scheme
  const colors = {
    bg: '#0f0f0f',
    cardBg: '#1a1a1a',
    charcoalBlue: '#1e2835',
    gold: '#c9a961',
    goldLight: '#d4af37',
    text: '#f5f5f0',
    textMuted: '#a8a8a0',
    border: '#2a2a2a',
    richGrey: '#3a3a3a'
  }

  useEffect(() => {
    checkAuth()
    fetchEvents()
  }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
    }
  }

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching events:', error)
    } else {
      setEvents(data || [])
    }
    setLoading(false)
  }

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('You must be logged in to create events')
      setCreating(false)
      return
    }

    const { data, error } = await supabase
      .from('events')
      .insert([
        {
          user_id: user.id,
          name: newEventName,
          date: newEventDate,
          scanner_pin: newEventPin || null
        }
      ])
      .select()

    if (error) {
      alert(`Error creating event: ${error.message}`)
    } else {
      setNewEventName('')
      setNewEventDate('')
      setNewEventPin('')
      setShowCreateModal(false)
      fetchEvents()
    }
    setCreating(false)
  }

  const handleDeleteEvent = async (eventId: string, eventName: string) => {
    if (!confirm(`Are you sure you want to delete "${eventName}"? This will also delete all associated guests and cannot be undone.`)) {
      return
    }

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)

    if (error) {
      alert(`Error deleting event: ${error.message}`)
      console.error('Delete error:', error)
    } else {
      fetchEvents()
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: colors.textMuted }}>Loading...</div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bg,
      color: colors.text
    }}>
      {/* Header */}
      <div style={{
        background: colors.cardBg,
        borderBottom: `1px solid ${colors.border}`,
        padding: '20px 0'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            margin: 0,
            background: `linear-gradient(135deg, ${colors.gold} 0%, ${colors.goldLight} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Gifty
          </h1>
          <button
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: `1px solid ${colors.border}`,
              color: colors.textMuted,
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = colors.richGrey
              e.currentTarget.style.color = colors.text
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.border
              e.currentTarget.style.color = colors.textMuted
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '40px 24px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px'
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            margin: 0,
            color: colors.text
          }}>
            Your Events
          </h2>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              background: colors.gold,
              border: 'none',
              color: colors.bg,
              padding: '12px 28px',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: `0 4px 12px rgba(201, 169, 97, 0.2)`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = colors.goldLight
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = `0 6px 16px rgba(201, 169, 97, 0.3)`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = colors.gold
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = `0 4px 12px rgba(201, 169, 97, 0.2)`
            }}
          >
            + Create Event
          </button>
        </div>

        {events.length === 0 ? (
          <div style={{
            background: colors.cardBg,
            border: `1px solid ${colors.border}`,
            borderRadius: '16px',
            padding: '80px 24px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px'
            }}>
              🎁
            </div>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: colors.text,
              marginBottom: '8px'
            }}>
              No Events Yet
            </h3>
            <p style={{
              color: colors.textMuted,
              fontSize: '15px',
              marginBottom: '24px'
            }}>
              Create your first event to start managing guest lists and QR codes
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                background: colors.gold,
                border: 'none',
                color: colors.bg,
                padding: '12px 28px',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Create Your First Event
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '24px'
          }}>
            {events.map((event) => (
              <div
                key={event.id}
                style={{
                  background: colors.cardBg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '16px',
                  padding: '24px',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = colors.richGrey
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = colors.border
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                {/* Delete Button - Subtle X */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteEvent(event.id, event.name)
                  }}
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    background: 'transparent',
                    border: 'none',
                    color: colors.textMuted,
                    padding: '6px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = colors.richGrey
                    e.currentTarget.style.color = colors.text
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = colors.textMuted
                  }}
                  title="Delete event"
                >
                  <X size={18} strokeWidth={2} />
                </button>

                {/* Event Name - subtle gradient on hover */}
                <Link
                  href={`/event/${event.id}`}
                  style={{
                    textDecoration: 'none',
                    color: 'inherit',
                    display: 'block'
                  }}
                >
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    marginBottom: '8px',
                    color: colors.text,
                    marginRight: '32px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `linear-gradient(135deg, ${colors.gold}15 0%, ${colors.goldLight}10 100%)`
                    e.currentTarget.style.webkitBackgroundClip = 'text'
                    e.currentTarget.style.webkitTextFillColor = 'transparent'
                    e.currentTarget.style.backgroundClip = 'text'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none'
                    e.currentTarget.style.webkitTextFillColor = colors.text
                  }}
                  >
                    {event.name}
                  </h3>

                  <p style={{
                    color: colors.textMuted,
                    fontSize: '14px',
                    marginBottom: '16px'
                  }}>
                    {new Date(event.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>

                  {event.scanner_pin && (
                    <div style={{
                      background: colors.bg,
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      padding: '8px 12px',
                      marginBottom: '16px'
                    }}>
                      <span style={{
                        fontSize: '12px',
                        color: colors.textMuted,
                        marginRight: '8px'
                      }}>
                        PIN:
                      </span>
                      <code style={{
                        background: colors.cardBg,
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '14px',
                        fontFamily: 'monospace',
                        color: colors.gold
                      }}>
                        {event.scanner_pin}
                      </code>
                    </div>
                  )}

                  <div style={{
                    display: 'inline-block',
                    background: `${colors.gold}15`,
                    color: colors.gold,
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `${colors.gold}25`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = `${colors.gold}15`
                  }}
                  >
                    Manage Event →
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '16px'
        }}
        onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{
              background: colors.cardBg,
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '480px',
              width: '100%',
              border: `1px solid ${colors.border}`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: colors.text,
              marginBottom: '24px'
            }}>
              Create New Event
            </h3>
            
            <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label
                  htmlFor="eventName"
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: colors.text,
                    marginBottom: '8px'
                  }}
                >
                  Event Name
                </label>
                <input
                  id="eventName"
                  type="text"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '10px',
                    color: colors.text,
                    fontSize: '15px',
                    outline: 'none'
                  }}
                  placeholder="e.g., Spring Collection Launch"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="eventDate"
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: colors.text,
                    marginBottom: '8px'
                  }}
                >
                  Event Date
                </label>
                <input
                  id="eventDate"
                  type="date"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '10px',
                    color: colors.text,
                    fontSize: '15px',
                    outline: 'none'
                  }}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="eventPin"
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: colors.text,
                    marginBottom: '8px'
                  }}
                >
                  Scanner PIN (Optional)
                </label>
                <input
                  id="eventPin"
                  type="text"
                  value={newEventPin}
                  onChange={(e) => setNewEventPin(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '10px',
                    color: colors.text,
                    fontSize: '15px',
                    outline: 'none'
                  }}
                  placeholder="Leave empty for no PIN"
                  maxLength={10}
                />
                <p style={{ 
                  margin: '8px 0 0 0', 
                  fontSize: '12px', 
                  color: colors.textMuted
                }}>
                  If set, hostesses will need this PIN to access the scanner
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    background: 'transparent',
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    background: colors.gold,
                    border: 'none',
                    color: colors.bg,
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: creating ? 'not-allowed' : 'pointer',
                    opacity: creating ? 0.5 : 1,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {creating ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
