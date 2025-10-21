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
  start_time: string | null
  location: string | null
  scanner_pin: string | null
  total_guests?: number
  claimed_guests?: number
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

// Helper function to calculate countdown text
function getCountdownText(eventDate: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const event = new Date(eventDate)
  event.setHours(0, 0, 0, 0)

  const diffTime = event.getTime() - today.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return 'Today!'
  } else if (diffDays === 1) {
    return 'Tomorrow'
  } else if (diffDays === -1) {
    return 'Yesterday'
  } else if (diffDays > 0) {
    return `In ${diffDays} days`
  } else {
    return `${Math.abs(diffDays)} days ago`
  }
}

export default function DashboardPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newEventName, setNewEventName] = useState('')
  const [newEventDate, setNewEventDate] = useState('')
  const [newEventTime, setNewEventTime] = useState('')
  const [newEventLocation, setNewEventLocation] = useState('')
  const [newEventPin, setNewEventPin] = useState('')
  const [creating, setCreating] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [eventToDelete, setEventToDelete] = useState<{ id: string; name: string } | null>(null)
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
      .select(`
        *,
        guests (
          id,
          status
        )
      `)
      .order('date', { ascending: true })

    if (!error && data) {
      // Calculate guest counts and sort by date proximity to today
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const eventsWithCounts = data.map((event: any) => {
        const guests = event.guests || []
        const total_guests = guests.length
        const claimed_guests = guests.filter((g: any) => g.status === 'Claimed').length

        // Remove the guests array and add our counts
        const { guests: _, ...eventWithoutGuests } = event

        return {
          ...eventWithoutGuests,
          total_guests,
          claimed_guests
        }
      })

      // Sort by date: upcoming events first (soonest to latest), then past events (most recent to oldest)
      eventsWithCounts.sort((a, b) => {
        const dateA = new Date(a.date)
        const dateB = new Date(b.date)
        dateA.setHours(0, 0, 0, 0)
        dateB.setHours(0, 0, 0, 0)

        const diffA = dateA.getTime() - today.getTime()
        const diffB = dateB.getTime() - today.getTime()

        // Both future or both past: sort by date
        if ((diffA >= 0 && diffB >= 0) || (diffA < 0 && diffB < 0)) {
          return diffA - diffB
        }

        // One future, one past: future comes first
        return diffB - diffA
      })

      setEvents(eventsWithCounts)
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
          start_time: newEventTime || null,
          location: newEventLocation || null,
          scanner_pin: newEventPin || null
        }
      ])

    if (error) {
      alert('Error creating event: ' + error.message)
    } else {
      setShowCreateModal(false)
      setNewEventName('')
      setNewEventDate('')
      setNewEventTime('')
      setNewEventLocation('')
      setNewEventPin('')
      fetchEvents()
    }

    setCreating(false)
  }

  const handleDeleteEvent = (e: React.MouseEvent, eventId: string, eventName: string) => {
    e.preventDefault() // Prevent card click
    e.stopPropagation() // Stop event bubbling

    setEventToDelete({ id: eventId, name: eventName })
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!eventToDelete) return

    // First delete all guests for this event
    const { error: guestsError } = await supabase
      .from('guests')
      .delete()
      .eq('event_id', eventToDelete.id)

    if (guestsError) {
      alert('Error deleting guests: ' + guestsError.message)
      setShowDeleteModal(false)
      setEventToDelete(null)
      return
    }

    // Then delete the event
    const { error: eventError } = await supabase
      .from('events')
      .delete()
      .eq('id', eventToDelete.id)

    if (eventError) {
      alert('Error deleting event: ' + eventError.message)
      setShowDeleteModal(false)
      setEventToDelete(null)
      return
    }

    // Refresh the events list
    setShowDeleteModal(false)
    setEventToDelete(null)
    fetchEvents()
  }

  const cancelDelete = () => {
    setShowDeleteModal(false)
    setEventToDelete(null)
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

                {/* Countdown */}
                <div style={{
                  fontSize: '15px',
                  fontWeight: '600',
                  color: colors.gold,
                  marginBottom: '8px'
                }}>
                  {getCountdownText(event.date)}
                </div>

                {/* Event date */}
                <p style={{
                  color: colors.textMuted,
                  fontSize: '14px',
                  marginBottom: '4px'
                }}>
                  {new Date(event.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>

                {/* Start time and location */}
                <div style={{
                  fontSize: '14px',
                  color: colors.textMuted,
                  marginBottom: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}>
                  {event.start_time && (
                    <div>
                      <span style={{ color: colors.gold }}>⏰</span> {event.start_time}
                    </div>
                  )}
                  {event.location && (
                    <div>
                      <span style={{ color: colors.gold }}>📍</span> {event.location}
                    </div>
                  )}
                </div>

                {/* Guest stats */}
                <div style={{
                  display: 'flex',
                  gap: '16px',
                  marginBottom: '12px',
                  flexWrap: 'wrap'
                }}>
                  {event.total_guests !== undefined && event.total_guests > 0 ? (
                    <>
                      <div style={{
                        fontSize: '14px',
                        color: colors.textMuted
                      }}>
                        <span style={{ fontWeight: '600', color: colors.text }}>
                          {event.total_guests}
                        </span>
                        {' '}guest{event.total_guests !== 1 ? 's' : ''}
                      </div>
                      <div style={{
                        fontSize: '14px',
                        color: colors.textMuted
                      }}>
                        <span style={{ fontWeight: '600', color: colors.gold }}>
                          {event.claimed_guests || 0}/{event.total_guests}
                        </span>
                        {' '}claimed
                      </div>
                    </>
                  ) : (
                    <div style={{
                      fontSize: '14px',
                      color: colors.textMuted,
                      fontStyle: 'italic'
                    }}>
                      No guests yet
                    </div>
                  )}
                </div>

                {/* PIN indicator */}
                {event.scanner_pin && (
                  <div style={{
                    display: 'inline-block',
                    background: `${colors.gold}20`,
                    color: colors.gold,
                    padding: '4px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600'
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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
                    Start Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
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
                  />
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: colors.text,
                  marginBottom: '8px'
                }}>
                  Location (Optional)
                </label>
                <input
                  type="text"
                  value={newEventLocation}
                  onChange={(e) => setNewEventLocation(e.target.value)}
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
                  placeholder="e.g., Grand Ballroom, Hotel Luxe"
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && eventToDelete && (
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
            maxWidth: '450px',
            width: '100%',
            border: `1px solid ${colors.border}`
          }}>
            <h3 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: colors.text,
              marginBottom: '16px'
            }}>
              Delete Event?
            </h3>
            <p style={{
              color: colors.textMuted,
              fontSize: '15px',
              marginBottom: '8px',
              lineHeight: '1.6'
            }}>
              Are you sure you want to delete <span style={{ color: colors.text, fontWeight: '600' }}>"{eventToDelete.name}"</span>?
            </p>
            <p style={{
              color: colors.textMuted,
              fontSize: '15px',
              marginBottom: '24px',
              lineHeight: '1.6'
            }}>
              This will also delete all guests and cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={cancelDelete}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  background: 'transparent',
                  color: colors.text,
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.bg
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  flex: 1,
                  background: '#8b7474',
                  color: colors.text,
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#9d8585'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#8b7474'
                }}
              >
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
