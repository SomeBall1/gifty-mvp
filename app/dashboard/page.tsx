'use client'

import { useState, useEffect } from 'react'
import { createClient  } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  
  const supabase = createClient ()
  const router = useRouter()

  useEffect(() => {
    checkUser()
    fetchEvents()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    }
  }

  const fetchEvents = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching events:', error)
    } else {
      setEvents(data || [])
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('events')
      .insert([
        {
          user_id: user.id,
          name: newEventName,
          date: newEventDate,
          scanner_pin: newEventPin || null,
        },
      ])
      .select()

    if (error) {
      console.error('Error creating event:', error)
      alert('Error creating event. Please try again.')
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
    if (deleteConfirm !== eventId) {
      setDeleteConfirm(eventId)
      return
    }

    setDeleting(true)

    try {
      const response = await fetch('/api/delete-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventId }),
      })

      if (response.ok) {
        setEvents(events.filter(e => e.id !== eventId))
        setDeleteConfirm(null)
      } else {
        const data = await response.json()
        alert(data.error || 'Error deleting event')
      }
    } catch (error) {
      console.error('Error deleting event:', error)
      alert('Error deleting event. Please try again.')
    }

    setDeleting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-600 font-medium">Loading your events...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm backdrop-blur-sm bg-opacity-80 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-gray-900 to-gray-700 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl font-bold">G</span>
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Gifty
              </h1>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-start mb-12">
          <div>
            <h2 className="text-4xl font-bold text-gray-900 mb-2">Your Events</h2>
            <p className="text-gray-600 text-lg">Manage your exclusive events and goodie bags</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-gray-900 to-gray-700 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-2xl hover:scale-105 transition-all active:scale-95 shadow-lg flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Event</span>
          </button>
        </div>

        {/* Events Grid */}
        {events.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-gray-100">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No events yet</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Create your first event to start managing goodie bags with style
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-gray-900 to-gray-700 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-2xl hover:scale-105 transition-all inline-flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create Your First Event</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event, index) => (
              <div
                key={event.id}
                className="group bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-2xl hover:border-gray-200 transition-all duration-300 relative animate-fadeInUp"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    handleDeleteEvent(event.id, event.name)
                  }}
                  disabled={deleting}
                  className={`absolute top-4 right-4 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
                    deleteConfirm === event.id
                      ? 'bg-red-500 text-white hover:bg-red-600 scale-100 opacity-100'
                      : 'bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600 scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100'
                  }`}
                  title={deleteConfirm === event.id ? 'Click again to confirm' : 'Delete event'}
                >
                  {deleting && deleteConfirm === event.id ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>

                <Link href={`/event/${event.id}`} className="block">
                  {/* Event Icon */}
                  <div className="w-14 h-14 bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z" />
                    </svg>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-2 pr-10 group-hover:text-gray-700 transition-colors">
                    {event.name}
                  </h3>
                  
                  <div className="flex items-center text-gray-600 text-sm mb-4">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(event.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>

                  {event.scanner_pin && (
                    <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold mb-4">
                      <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      PIN Protected
                    </div>
                  )}

                  <div className="flex items-center text-gray-900 font-semibold text-sm group-hover:text-gray-700 transition-colors">
                    <span>Manage Event</span>
                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>

                {/* Delete Confirmation Message */}
                {deleteConfirm === event.id && (
                  <div className="mt-4 pt-4 border-t border-red-100 text-xs text-red-600 font-semibold flex items-center animate-fadeIn">
                    <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Click delete again to confirm
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-scaleIn">
            <h3 className="text-3xl font-bold text-gray-900 mb-8">Create New Event</h3>
            <form onSubmit={handleCreateEvent} className="space-y-6">
              <div>
                <label htmlFor="eventName" className="block text-sm font-semibold text-gray-700 mb-2">
                  Event Name
                </label>
                <input
                  id="eventName"
                  type="text"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-gray-900 focus:ring-opacity-10 focus:border-gray-900 outline-none transition-all"
                  placeholder="e.g., Spring Collection Launch"
                  required
                />
              </div>

              <div>
                <label htmlFor="eventDate" className="block text-sm font-semibold text-gray-700 mb-2">
                  Event Date
                </label>
                <input
                  id="eventDate"
                  type="date"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-gray-900 focus:ring-opacity-10 focus:border-gray-900 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label htmlFor="eventPin" className="block text-sm font-semibold text-gray-700 mb-2">
                  Scanner PIN (Optional)
                </label>
                <input
                  id="eventPin"
                  type="text"
                  value={newEventPin}
                  onChange={(e) => setNewEventPin(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-gray-900 focus:ring-opacity-10 focus:border-gray-900 outline-none transition-all"
                  placeholder="Leave empty for no PIN"
                  maxLength={10}
                />
                <p className="mt-2 text-xs text-gray-500">
                  If set, hostesses will need this PIN to access the scanner
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-200 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-gradient-to-r from-gray-900 to-gray-700 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? (
                    <span className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Creating...
                    </span>
                  ) : (
                    'Create Event'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes shake {
          0%, 100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-10px);
          }
          75% {
            transform: translateX(10px);
          }
        }

        @keyframes bounce-once {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.5s ease-out forwards;
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }

        .animate-shake {
          animation: shake 0.5s ease-out;
        }

        .animate-bounce-once {
          animation: bounce-once 0.6s ease-out;
        }
      `}</style>
    </div>
  )
}
