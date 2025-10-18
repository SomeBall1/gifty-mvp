'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

type Event = {
  id: string
  name: string
  date: string
  scanner_pin: string | null
}

// Deep charcoal + gold color scheme
const colors = {
  bg: '#0f0f0f',
  cardBg: '#1a1a1a',
  text: '#f5f5f0',
  textMuted: '#a0a0a0',
  gold: '#c9a961',
  goldLight: '#d4af6f',
  border: '#2a2a2a'
}

export default function DashboardPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newEventName, setNewEventName] = useState('')
  const [newEventDate, setNewEventDate] = useState('')
  const [newEventPin, setNewEventPin] = useState('')
  const [creating, setCreating] = useState(false)
  const router = useRouter()
  const supabase = createClient()

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
    
    if (!error && data) {
      setEvents(data)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      alert('You must be logged in')
      setCreating(false)
      return
    }

    const { error } = await supabase
      .from('events')
      .insert([
        {
          user_id: user.id,
          name: newEventName,
          date: newEventDate,
          scanner_pin: newEventPin || null
        }
      ])

    if (error) {
      alert('Error creating event: ' + error.message)
    } else {
      setShowCreateModal(false)
      setNewEventName('')
      setNewEventDate('')
      setNewEventPin('')
      fetchEvents()
    }

    setCreating(false)
  }

  const handleDeleteEvent = async (e: React.MouseEvent, eventId: string, eventName: string) => {
    e.preventDefault() // Prevent card click
    e.stopPropagation() // Stop event bubbling
    
    if (!confirm(`Are you sure you want to delete "${eventName}"? This will also delete all guests and cannot be undone.`)) {
      return
    }

    // First delete all guests for this event
    const { error: guestsError } = await supabase
      .from('guests')
      .delete()
      .eq('event_id', eventId)

    if (guestsError) {
      alert('Error deleting guests: ' + guestsError.message)
      return
    }

    // Then delete the event
    const { error: eventError } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)

    if (eventError) {
      alert('Error deleting event: ' + eventError.message)
      return
    }

    // Refresh the events list
    fetchEvents()
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.bg }}>
      {/* Header */}
      <div style={{
        background: colors.cardBg,
        borderBottom: `1px solid ${colors.border}`,
        padding: '16px 24px'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            background: `linear-gradient(135deg, ${colors.text} 0%, ${colors.gold} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Gifty
          </h1>
          <button
            onClick={handleLogout}
            style={{
              color: colors.textMuted,
              background: 'transparent',
              border: 'none',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = colors.text}
            onMouseLeave={(e) => e.currentTarget.style.color = colors.textMuted}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h2 style={{
              fontSize: '32px',
              fontWeight: '700',
              color: colors.text,
              marginBottom: '8px'
            }}>
              Your Events
            </h2>
            <p style={{ color: colors.textMuted, fontSize: '15px' }}>
              Manage your exclusive events and guests
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              background: colors.gold,
              color: colors.bg,
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            + Create Event
          </button>
        </div>

        {/* Events Grid */}
        {events.length === 0 ? (
          <div style={{
            background: colors.cardBg,
            borderRadius: '16px',
            padding: '64px 32px',
            textAlign: 'center',
            border: `1px solid ${colors.border}`
          }}>
            <p style={{ color: colors.textMuted, marginBottom: '24px', fontSize: '15px' }}>
              No events yet. Create your first event to get started!
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                background: colors.gold,
                color: colors.bg,
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Create Your First Event
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px'
          }}>
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/event/${event.id}`}
                style={{
                  background: colors.cardBg,
                  borderRadius: '12px',
                  padding: '24px',
                  border: `1px solid ${colors.border}`,
                  textDecoration: 'none',
                  display: 'block',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = colors.gold
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = colors.border
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                {/* Delete button */}
                <button
                  onClick={(e) => handleDeleteEvent(e, event.id, event.name)}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'transparent',
                    border: 'none',
                    color: colors.textMuted,
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(139, 116, 116, 0.2)'
                    e.currentTarget.style.color = '#8b7474'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = colors.textMuted
                  }}
                >
                  <X size={18} />
                </button>

                {/* Event name */}
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: colors.text,
                  marginBottom: '8px',
                  paddingRight: '32px', // Space for delete button
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `linear-gradient(135deg, ${colors.text} 0%, ${colors.goldLight} 100%)`
                  e.currentTarget.style.webkitBackgroundClip = 'text'
                  e.currentTarget.style.webkitTextFillColor = 'transparent'
                  e.currentTarget.style.backgroundClip = 'text'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none'
                  e.currentTarget.style.webkitTextFillColor = colors.text
                  e.currentTarget.style.color = colors.text
                }}
                >
                  {event.name}
                </h3>

                {/* Event date */}
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

                {/* PIN indicator */}
                {event.scanner_pin && (
                  <div style={{
                    display: 'inline-block',
                    background: `${colors.gold}20`,
                    color: colors.gold,
                    padding: '4px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    marginTop: '8px'
                  }}>
                    🔒 Protected
                  </div>
                )}
              </Link>
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '16px'
        }}>
          <div style={{
            background: colors.cardBg,
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '500px',
            width: '100%',
            border: `1px solid ${colors.border}`
          }}>
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
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: colors.text,
                  marginBottom: '8px'
                }}>
                  Event Name
                </label>
                <input
                  type="text"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    background: colors.bg,
                    color: colors.text,
                    fontSize: '15px',
                    outline: 'none'
                  }}
                  placeholder="e.g., Spring Collection Launch"
                  required
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: colors.text,
                  marginBottom: '8px'
                }}>
                  Event Date
                </label>
                <input
                  type="date"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    background: colors.bg,
                    color: colors.text,
                    fontSize: '15px',
                    outline: 'none'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: colors.text,
                  marginBottom: '8px'
                }}>
                  Scanner PIN (Optional)
                </label>
                <input
                  type="text"
                  value={newEventPin}
                  onChange={(e) => setNewEventPin(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    background: colors.bg,
                    color: colors.text,
                    fontSize: '15px',
                    outline: 'none'
                  }}
                  placeholder="Leave empty for no PIN"
                  maxLength={10}
                />
                <p style={{
                  marginTop: '6px',
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
                    padding: '12px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    background: 'transparent',
                    color: colors.text,
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    flex: 1,
                    background: colors.gold,
                    color: colors.bg,
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: creating ? 'not-allowed' : 'pointer',
                    opacity: creating ? 0.5 : 1
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
