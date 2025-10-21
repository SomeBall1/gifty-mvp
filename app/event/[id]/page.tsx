'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import QRCode from 'qrcode'
import Link from 'next/link'
import { ArrowLeft, Upload, Download, CheckCircle, Circle, Crown, Clock, MapPin, StickyNote, X, Edit2, UserPlus } from 'lucide-react'

interface Guest {
  id: string
  name: string
  email: string
  tier: string
  status: string
  claimed_at: string | null
  notes: string | null
}

interface Event {
  id: string
  name: string
  date: string
  start_time: string | null
  location: string | null
  scanner_pin: string | null
}

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const [event, setEvent] = useState<Event | null>(null)
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [sendingEmails, setSendingEmails] = useState(false)
  const [downloadingQR, setDownloadingQR] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [uploadMessage, setUploadMessage] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'claimed' | 'not-claimed'>('all')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [isEditingEvent, setIsEditingEvent] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    date: '',
    start_time: '',
    location: '',
    scanner_pin: ''
  })
  const [savingEvent, setSavingEvent] = useState(false)
  const [editMessage, setEditMessage] = useState('')
  const [isAddingGuest, setIsAddingGuest] = useState(false)
  const [addGuestForm, setAddGuestForm] = useState({ name: '', email: '', tier: '' })
  const [addingGuest, setAddingGuest] = useState(false)
  const [addGuestMessage, setAddGuestMessage] = useState('')
  const [newGuestQR, setNewGuestQR] = useState<{ guestId: string; name: string; tier: string; qrDataUrl: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
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
    richGrey: '#3a3a3a',
    success: '#4a7c59',
    successBg: '#1a2f1f'
  }

  useEffect(() => {
    checkAuth()
    fetchEvent()
    fetchGuests()
    
    // Set up real-time subscription for guest updates
    const channel = supabase
      .channel('guests-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'guests',
          filter: `event_id=eq.${params.id}`
        },
        (payload) => {
          setGuests(prevGuests => 
            prevGuests.map(guest => 
              guest.id === payload.new.id ? { ...guest, ...payload.new } as Guest : guest
            )
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'guests',
          filter: `event_id=eq.${params.id}`
        },
        (payload) => {
          setGuests(prevGuests => [...prevGuests, payload.new as Guest])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [params.id])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
    }
  }

  const fetchEvent = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('Error fetching event:', error)
    } else {
      setEvent(data)
    }
    setLoading(false)
  }

  const fetchGuests = async () => {
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('event_id', params.id)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching guests:', error)
    } else {
      setGuests(data || [])
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadMessage('')

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const validGuests = results.data.filter((row: any) => {
          return row.name && row.email && row.tier
        })

        if (validGuests.length === 0) {
          setUploadMessage('No valid guests found. Please check your CSV format.')
          setUploading(false)
          return
        }

        const guestsToInsert = validGuests.map((row: any) => ({
          event_id: params.id,
          name: row.name.trim(),
          email: row.email.trim(),
          tier: row.tier.trim(),
          status: 'Not Claimed'
        }))

        const { data, error } = await supabase
          .from('guests')
          .insert(guestsToInsert)
          .select()

        if (error) {
          setUploadMessage(`Error uploading guests: ${error.message}`)
        } else {
          setUploadMessage(`Successfully imported ${data.length} guests!`)
          fetchGuests()
          setTimeout(() => setUploadMessage(''), 3000)
        }
        setUploading(false)
      },
      error: (error) => {
        setUploadMessage(`Error parsing CSV: ${error.message}`)
        setUploading(false)
      }
    })
  }

  const downloadAllQRCodes = async () => {
    if (guests.length === 0) return
    
    setDownloadingQR(true)
    
    try {
      const zip = await import('jszip')
      const JSZip = zip.default
      const zipFile = new JSZip()

      for (const guest of guests) {
        const qrUrl = `${process.env.NEXT_PUBLIC_APP_URL}/scan/${params.id}?guest_id=${guest.id}`
        const qrDataUrl = await QRCode.toDataURL(qrUrl, {
          width: 600,
          margin: 2,
        })
        
        const base64Data = qrDataUrl.split(',')[1]
        const fileName = `${guest.name.replace(/[^a-z0-9]/gi, '_')}_${guest.tier}.png`
        zipFile.file(fileName, base64Data, { base64: true })
      }

      const content = await zipFile.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(content)
      const link = document.createElement('a')
      link.href = url
      link.download = `${event?.name.replace(/[^a-z0-9]/gi, '_')}_QR_Codes.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error creating ZIP:', error)
      alert('Error downloading QR codes. Please try again.')
    } finally {
      setDownloadingQR(false)
    }
  }

  const downloadSingleQR = async (guest: Guest) => {
    const qrUrl = `${process.env.NEXT_PUBLIC_APP_URL}/scan/${params.id}?guest_id=${guest.id}`
    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 600,
      margin: 2,
    })

    const link = document.createElement('a')
    link.href = qrDataUrl
    link.download = `${guest.name.replace(/[^a-z0-9]/gi, '_')}_${guest.tier}.png`
    link.click()
  }

  const handleEditNote = (guest: Guest) => {
    setEditingNoteId(guest.id)
    setNoteText(guest.notes || '')
  }

  const handleSaveNote = async (guestId: string) => {
    try {
      const { error } = await supabase
        .from('guests')
        .update({ notes: noteText.trim() || null })
        .eq('id', guestId)

      if (error) throw error

      setGuests(prevGuests =>
        prevGuests.map(guest =>
          guest.id === guestId ? { ...guest, notes: noteText.trim() || null } : guest
        )
      )
      setEditingNoteId(null)
      setNoteText('')
    } catch (error) {
      console.error('Error updating note:', error)
      alert('Failed to save note. Please try again.')
    }
  }

  const handleCancelNote = () => {
    setEditingNoteId(null)
    setNoteText('')
  }

  const handleEditEvent = () => {
    if (!event) return
    setEditForm({
      name: event.name,
      date: event.date,
      start_time: event.start_time || '',
      location: event.location || '',
      scanner_pin: event.scanner_pin || ''
    })
    setIsEditingEvent(true)
    setEditMessage('')
  }

  const handleSaveEvent = async () => {
    if (!event) return

    setSavingEvent(true)
    setEditMessage('')

    try {
      const response = await fetch('/api/update-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: event.id,
          name: editForm.name,
          date: editForm.date,
          start_time: editForm.start_time || null,
          location: editForm.location || null,
          scanner_pin: editForm.scanner_pin || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setEditMessage(`Error: ${data.error}`)
        setSavingEvent(false)
        return
      }

      // Update local event state
      setEvent(data.event)
      setIsEditingEvent(false)
      setEditMessage('')
    } catch (error) {
      console.error('Error updating event:', error)
      setEditMessage('Failed to update event. Please try again.')
    } finally {
      setSavingEvent(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditingEvent(false)
    setEditMessage('')
  }

  const handleAddGuest = () => {
    setAddGuestForm({ name: '', email: '', tier: '' })
    setAddGuestMessage('')
    setNewGuestQR(null)
    setIsAddingGuest(true)
  }

  const handleQuickAddGuest = async () => {
    if (!addGuestForm.name || !addGuestForm.email || !addGuestForm.tier) {
      setAddGuestMessage('Please fill in all fields')
      return
    }

    setAddingGuest(true)
    setAddGuestMessage('')

    try {
      // Insert guest into database
      const { data, error } = await supabase
        .from('guests')
        .insert({
          event_id: params.id,
          name: addGuestForm.name.trim(),
          email: addGuestForm.email.trim(),
          tier: addGuestForm.tier.trim(),
          status: 'Not Claimed'
        })
        .select()
        .single()

      if (error) throw error

      // Generate QR code immediately
      const qrUrl = `${process.env.NEXT_PUBLIC_APP_URL}/scan/${params.id}?guest_id=${data.id}`
      const qrDataUrl = await QRCode.toDataURL(qrUrl, {
        width: 600,
        margin: 2,
      })

      // Store QR code data for display
      setNewGuestQR({
        guestId: data.id,
        name: data.name,
        tier: data.tier,
        qrDataUrl
      })

      setAddGuestMessage('Guest added successfully!')
      // Real-time subscription will add guest to list automatically
    } catch (error: any) {
      console.error('Error adding guest:', error)
      setAddGuestMessage(`Error: ${error.message}`)
    } finally {
      setAddingGuest(false)
    }
  }

  const handleWhatsAppShare = () => {
    if (!newGuestQR) return

    // Create WhatsApp message with guest details
    const message = encodeURIComponent(
      `🎁 GIFTY Event Invitation\n\n` +
      `Event: ${event?.name}\n` +
      `Guest: ${newGuestQR.name}\n` +
      `Tier: ${newGuestQR.tier}\n\n` +
      `Please show this QR code at the event to claim your goodie bag!\n\n` +
      `QR Code: ${newGuestQR.qrDataUrl}`
    )

    // Open WhatsApp with pre-filled message
    // On mobile, this opens WhatsApp app; on desktop, WhatsApp Web
    window.open(`https://wa.me/?text=${message}`, '_blank')
  }

  const handleDownloadNewQR = () => {
    if (!newGuestQR) return

    const link = document.createElement('a')
    link.href = newGuestQR.qrDataUrl
    link.download = `${newGuestQR.name.replace(/[^a-z0-9]/gi, '_')}_${newGuestQR.tier}.png`
    link.click()
  }

  const handleCloseAddGuest = () => {
    setIsAddingGuest(false)
    setAddGuestForm({ name: '', email: '', tier: '' })
    setAddGuestMessage('')
    setNewGuestQR(null)
  }

  const filteredGuests = guests.filter(guest => {
    // Filter by status
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'claimed' && guest.status === 'Claimed') ||
      (filterStatus === 'not-claimed' && guest.status === 'Not Claimed')

    // Filter by search term
    const matchesSearch =
      guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.tier.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesStatus && matchesSearch
  })

  const claimedCount = guests.filter(g => g.status === 'Claimed').length
  const totalCount = guests.length

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

  if (!event) {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: colors.textMuted }}>Event not found</div>
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
          padding: '0 24px'
        }}>
          <Link 
            href="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: colors.textMuted,
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = colors.text}
            onMouseLeave={(e) => e.currentTarget.style.color = colors.textMuted}
          >
            <ArrowLeft size={16} />
            Back to Events
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '40px 24px'
      }}>
        {/* Event Info */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <h1 style={{
              fontSize: '36px',
              fontWeight: '700',
              color: colors.text,
              lineHeight: '1.2',
              margin: 0
            }}>
              {event.name}
            </h1>
            <button
              onClick={handleEditEvent}
              style={{
                background: colors.charcoalBlue,
                border: 'none',
                color: colors.text,
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#283847'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = colors.charcoalBlue
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <Edit2 size={16} />
              Edit Event
            </button>
          </div>
          <p style={{
            color: colors.textMuted,
            fontSize: '16px',
            marginBottom: '8px'
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
            fontSize: '15px',
            color: colors.textMuted,
            marginBottom: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            {event.start_time && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} style={{ color: colors.gold }} />
                {event.start_time}
              </div>
            )}
            {event.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={16} style={{ color: colors.gold }} />
                {event.location}
              </div>
            )}
          </div>

          {/* Scanner Info Card */}
          <div style={{
            background: colors.cardBg,
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: colors.text,
                marginBottom: '8px'
              }}>
                Scanner Access
              </h3>
              {event.scanner_pin ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '14px', color: colors.textMuted }}>
                    PIN Required:
                  </span>
                  <code style={{
                    background: colors.bg,
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${colors.border}`,
                    fontSize: '16px',
                    fontFamily: 'monospace',
                    color: colors.gold,
                    fontWeight: '600'
                  }}>
                    {event.scanner_pin}
                  </code>
                </div>
              ) : (
                <p style={{ fontSize: '14px', color: colors.textMuted }}>
                  No PIN required - scanner is open access
                </p>
              )}
            </div>
            <Link
              href={`/scan/${event.id}`}
              target="_blank"
              style={{
                background: colors.success,
                color: colors.text,
                padding: '12px 24px',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '600',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                display: 'inline-block'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#5a8d6a'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = colors.success
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              Open Scanner
            </Link>
          </div>
        </div>

        {/* Stats - Compact */}
        <div style={{
          background: colors.cardBg,
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '32px',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{
              fontSize: '12px',
              color: colors.textMuted,
              marginBottom: '4px',
              fontWeight: '500',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Total
            </p>
            <p style={{
              fontSize: '28px',
              fontWeight: '700',
              color: colors.text,
              lineHeight: '1'
            }}>
              {totalCount}
            </p>
          </div>
          <div style={{
            width: '1px',
            height: '40px',
            background: colors.border
          }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{
              fontSize: '12px',
              color: colors.textMuted,
              marginBottom: '4px',
              fontWeight: '500',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Claimed
            </p>
            <p style={{
              fontSize: '28px',
              fontWeight: '700',
              color: colors.gold,
              lineHeight: '1'
            }}>
              {claimedCount}
            </p>
          </div>
          <div style={{
            width: '1px',
            height: '40px',
            background: colors.border
          }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{
              fontSize: '12px',
              color: colors.textMuted,
              marginBottom: '4px',
              fontWeight: '500',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Awaiting
            </p>
            <p style={{
              fontSize: '28px',
              fontWeight: '700',
              color: colors.textMuted,
              lineHeight: '1'
            }}>
              {totalCount - claimedCount}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          background: colors.cardBg,
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '32px'
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: colors.text,
            marginBottom: '16px'
          }}>
            Guest List Actions
          </h2>

          <div style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            {/* Quick Add Guest Button - PROMINENT GOLD */}
            <button
              onClick={handleAddGuest}
              style={{
                background: `linear-gradient(135deg, ${colors.gold} 0%, ${colors.goldLight} 100%)`,
                border: 'none',
                color: colors.bg,
                padding: '14px 28px',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: `0 4px 12px ${colors.gold}40`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = `0 6px 16px ${colors.gold}60`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = `0 4px 12px ${colors.gold}40`
              }}
            >
              <UserPlus size={20} />
              Add Guest Now
            </button>

            {/* Upload CSV Button - Charcoal Blue */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                background: colors.charcoalBlue,
                border: 'none',
                color: colors.text,
                padding: '12px 24px',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: uploading ? 'not-allowed' : 'pointer',
                opacity: uploading ? 0.5 : 1,
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                if (!uploading) {
                  e.currentTarget.style.background = '#283847'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = colors.charcoalBlue
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <Upload size={18} />
              {uploading ? 'Uploading...' : 'Upload CSV'}
            </button>

            {/* Download All QR Codes Button - Charcoal Blue */}
            {guests.length > 0 && (
              <button
                onClick={downloadAllQRCodes}
                disabled={downloadingQR}
                style={{
                  background: colors.charcoalBlue,
                  border: 'none',
                  color: colors.text,
                  padding: '12px 24px',
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: downloadingQR ? 'not-allowed' : 'pointer',
                  opacity: downloadingQR ? 0.5 : 1,
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  if (!downloadingQR) {
                    e.currentTarget.style.background = '#283847'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = colors.charcoalBlue
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <Download size={18} />
                {downloadingQR ? 'Creating ZIP...' : 'Download All QR Codes'}
              </button>
            )}
          </div>

          {uploadMessage && (
            <div style={{
              marginTop: '16px',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              background: uploadMessage.includes('Error') ? '#3a1a1a' : colors.successBg,
              color: uploadMessage.includes('Error') ? '#ff6b6b' : colors.gold,
              border: `1px solid ${uploadMessage.includes('Error') ? '#5a2a2a' : colors.success}`
            }}>
              {uploadMessage}
            </div>
          )}
        </div>

        {/* Guest List */}
        <div style={{
          background: colors.cardBg,
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '24px',
            borderBottom: `1px solid ${colors.border}`
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: colors.text,
                margin: 0
              }}>
                Guest List
              </h2>
            </div>

            {guests.length > 0 && (
              <>
                {/* Filter Tabs */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '16px',
                  flexWrap: 'wrap'
                }}>
                  <button
                    onClick={() => setFilterStatus('all')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: `1px solid ${filterStatus === 'all' ? colors.gold : colors.border}`,
                      background: filterStatus === 'all' ? `${colors.gold}15` : colors.bg,
                      color: filterStatus === 'all' ? colors.gold : colors.textMuted,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (filterStatus !== 'all') {
                        e.currentTarget.style.borderColor = colors.textMuted
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (filterStatus !== 'all') {
                        e.currentTarget.style.borderColor = colors.border
                      }
                    }}
                  >
                    All ({totalCount})
                  </button>
                  <button
                    onClick={() => setFilterStatus('claimed')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: `1px solid ${filterStatus === 'claimed' ? colors.gold : colors.border}`,
                      background: filterStatus === 'claimed' ? `${colors.gold}15` : colors.bg,
                      color: filterStatus === 'claimed' ? colors.gold : colors.textMuted,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (filterStatus !== 'claimed') {
                        e.currentTarget.style.borderColor = colors.textMuted
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (filterStatus !== 'claimed') {
                        e.currentTarget.style.borderColor = colors.border
                      }
                    }}
                  >
                    Claimed ({claimedCount})
                  </button>
                  <button
                    onClick={() => setFilterStatus('not-claimed')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: `1px solid ${filterStatus === 'not-claimed' ? colors.gold : colors.border}`,
                      background: filterStatus === 'not-claimed' ? `${colors.gold}15` : colors.bg,
                      color: filterStatus === 'not-claimed' ? colors.gold : colors.textMuted,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (filterStatus !== 'not-claimed') {
                        e.currentTarget.style.borderColor = colors.textMuted
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (filterStatus !== 'not-claimed') {
                        e.currentTarget.style.borderColor = colors.border
                      }
                    }}
                  >
                    Not Claimed ({totalCount - claimedCount})
                  </button>
                </div>

                {/* Search Input */}
                <input
                  type="text"
                  placeholder="Search guests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                />
              </>
            )}
          </div>

          {guests.length === 0 ? (
            <div style={{
              padding: '80px 24px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
              <p style={{ color: colors.textMuted, fontSize: '15px' }}>
                No guests yet. Upload a CSV file to get started.
              </p>
            </div>
          ) : filteredGuests.length === 0 ? (
            <div style={{
              padding: '80px 24px',
              textAlign: 'center'
            }}>
              <p style={{ color: colors.textMuted, fontSize: '15px' }}>
                No guests match your search.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse'
              }}>
                <thead>
                  <tr style={{
                    background: colors.bg,
                    borderBottom: `1px solid ${colors.border}`
                  }}>
                    <th style={{
                      padding: '16px 24px',
                      textAlign: 'left',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: colors.textMuted,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Name
                    </th>
                    <th style={{
                      padding: '16px 24px',
                      textAlign: 'left',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: colors.textMuted,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Status
                    </th>
                    <th style={{
                      padding: '16px 24px',
                      textAlign: 'left',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: colors.textMuted,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Tier
                    </th>
                    <th style={{
                      padding: '16px 24px',
                      textAlign: 'left',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: colors.textMuted,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      QR Code
                    </th>
                    <th style={{
                      padding: '16px 24px',
                      textAlign: 'left',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: colors.textMuted,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Email
                    </th>
                    <th style={{
                      padding: '16px 24px',
                      textAlign: 'left',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: colors.textMuted,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      minWidth: '200px'
                    }}>
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGuests.map((guest) => (
                    <tr
                      key={guest.id}
                      style={{
                        borderBottom: `1px solid ${colors.border}`,
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = colors.bg}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{
                        padding: '20px 24px'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}>
                          {guest.tier.toLowerCase().includes('vip') && (
                            <Crown size={16} style={{ color: colors.gold }} />
                          )}
                          <span style={{
                            fontSize: '15px',
                            fontWeight: '500',
                            color: colors.text
                          }}>
                            {guest.name}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '20px 24px' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '500',
                          background: guest.status === 'Claimed' ? colors.successBg : colors.bg,
                          color: guest.status === 'Claimed' ? colors.gold : colors.textMuted,
                          border: `1px solid ${guest.status === 'Claimed' ? colors.success : colors.border}`
                        }}>
                          {guest.status === 'Claimed' ? (
                            <CheckCircle size={14} />
                          ) : (
                            <Circle size={14} />
                          )}
                          {guest.status === 'Claimed' ? 'Claimed' : 'Awaiting'}
                        </div>
                      </td>
                      <td style={{ padding: '20px 24px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '500',
                          background: guest.tier.toLowerCase().includes('vip') ? `${colors.gold}15` : colors.bg,
                          color: guest.tier.toLowerCase().includes('vip') ? colors.gold : colors.textMuted,
                          border: `1px solid ${guest.tier.toLowerCase().includes('vip') ? `${colors.gold}30` : colors.border}`
                        }}>
                          {guest.tier}
                        </span>
                      </td>
                      <td style={{ padding: '20px 24px' }}>
                        <button
                          onClick={() => downloadSingleQR(guest)}
                          style={{
                            background: 'transparent',
                            border: `1px solid ${colors.border}`,
                            color: colors.textMuted,
                            padding: '8px 16px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = colors.gold
                            e.currentTarget.style.color = colors.gold
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = colors.border
                            e.currentTarget.style.color = colors.textMuted
                          }}
                        >
                          Download
                        </button>
                      </td>
                      <td style={{
                        padding: '20px 24px',
                        fontSize: '14px',
                        color: colors.textMuted
                      }}>
                        {guest.email}
                      </td>
                      <td style={{
                        padding: '20px 24px'
                      }}>
                        {editingNoteId === guest.id ? (
                          <div style={{
                            display: 'flex',
                            gap: '8px',
                            alignItems: 'center'
                          }}>
                            <input
                              type="text"
                              value={noteText}
                              onChange={(e) => setNoteText(e.target.value)}
                              placeholder="Add note..."
                              autoFocus
                              style={{
                                flex: 1,
                                padding: '8px 12px',
                                background: colors.bg,
                                border: `1px solid ${colors.border}`,
                                borderRadius: '6px',
                                color: colors.text,
                                fontSize: '14px',
                                outline: 'none'
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveNote(guest.id)
                                } else if (e.key === 'Escape') {
                                  handleCancelNote()
                                }
                              }}
                            />
                            <button
                              onClick={() => handleSaveNote(guest.id)}
                              style={{
                                padding: '8px 12px',
                                background: colors.success,
                                border: 'none',
                                borderRadius: '6px',
                                color: colors.text,
                                fontSize: '13px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#5a8d6a'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = colors.success
                              }}
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelNote}
                              style={{
                                padding: '8px',
                                background: 'transparent',
                                border: `1px solid ${colors.border}`,
                                borderRadius: '6px',
                                color: colors.textMuted,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = colors.textMuted
                                e.currentTarget.style.color = colors.text
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = colors.border
                                e.currentTarget.style.color = colors.textMuted
                              }}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditNote(guest)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 12px',
                              background: guest.notes ? `${colors.gold}10` : 'transparent',
                              border: `1px solid ${guest.notes ? colors.border : colors.border}`,
                              borderRadius: '6px',
                              color: guest.notes ? colors.text : colors.textMuted,
                              fontSize: '13px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              maxWidth: '300px',
                              textAlign: 'left'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = colors.gold
                              e.currentTarget.style.color = colors.gold
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = colors.border
                              e.currentTarget.style.color = guest.notes ? colors.text : colors.textMuted
                            }}
                          >
                            <StickyNote size={14} />
                            <span style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {guest.notes || 'Add note...'}
                            </span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Quick Add Guest Modal */}
      {isAddingGuest && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}
        onClick={handleCloseAddGuest}
        >
          <div
            style={{
              background: colors.cardBg,
              border: `1px solid ${colors.border}`,
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: colors.text,
                margin: 0
              }}>
                {newGuestQR ? '✅ Guest Added!' : '➕ Quick Add Guest'}
              </h2>
              <button
                onClick={handleCloseAddGuest}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: colors.textMuted,
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = colors.text}
                onMouseLeave={(e) => e.currentTarget.style.color = colors.textMuted}
              >
                <X size={24} />
              </button>
            </div>

            {!newGuestQR ? (
              // Form to add guest
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: colors.text,
                    marginBottom: '8px'
                  }}>
                    Guest Name *
                  </label>
                  <input
                    type="text"
                    value={addGuestForm.name}
                    onChange={(e) => setAddGuestForm({ ...addGuestForm, name: e.target.value })}
                    placeholder="e.g., Sarah Chen"
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
                    autoFocus
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: colors.text,
                    marginBottom: '8px'
                  }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    value={addGuestForm.email}
                    onChange={(e) => setAddGuestForm({ ...addGuestForm, email: e.target.value })}
                    placeholder="e.g., sarah@example.com"
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
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: colors.text,
                    marginBottom: '8px'
                  }}>
                    Tier *
                  </label>
                  <input
                    type="text"
                    value={addGuestForm.tier}
                    onChange={(e) => setAddGuestForm({ ...addGuestForm, tier: e.target.value })}
                    placeholder="e.g., VIP, Press, Standard"
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
                  />
                </div>

                {addGuestMessage && !newGuestQR && (
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: addGuestMessage.includes('Error') ? '#3a1a1a' : colors.successBg,
                    color: addGuestMessage.includes('Error') ? '#ff6b6b' : colors.gold,
                    border: `1px solid ${addGuestMessage.includes('Error') ? '#5a2a2a' : colors.success}`
                  }}>
                    {addGuestMessage}
                  </div>
                )}

                <button
                  onClick={handleQuickAddGuest}
                  disabled={addingGuest || !addGuestForm.name || !addGuestForm.email || !addGuestForm.tier}
                  style={{
                    background: `linear-gradient(135deg, ${colors.gold} 0%, ${colors.goldLight} 100%)`,
                    border: 'none',
                    color: colors.bg,
                    padding: '14px 24px',
                    borderRadius: '10px',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: (addingGuest || !addGuestForm.name || !addGuestForm.email || !addGuestForm.tier) ? 'not-allowed' : 'pointer',
                    opacity: (addingGuest || !addGuestForm.name || !addGuestForm.email || !addGuestForm.tier) ? 0.5 : 1,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!addingGuest && addGuestForm.name && addGuestForm.email && addGuestForm.tier) {
                      e.currentTarget.style.transform = 'translateY(-1px)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  {addingGuest ? 'Adding Guest...' : '➕ Add & Generate QR'}
                </button>
              </div>
            ) : (
              // QR Code Display and Sharing Options
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
                {/* Success Message */}
                <div style={{
                  width: '100%',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  background: colors.successBg,
                  border: `1px solid ${colors.success}`,
                  textAlign: 'center'
                }}>
                  <p style={{ fontSize: '16px', color: colors.gold, fontWeight: '600', marginBottom: '4px' }}>
                    {newGuestQR.name} has been added!
                  </p>
                  <p style={{ fontSize: '14px', color: colors.textMuted }}>
                    Tier: {newGuestQR.tier}
                  </p>
                </div>

                {/* QR Code Display */}
                <div style={{
                  background: 'white',
                  padding: '24px',
                  borderRadius: '16px',
                  boxShadow: `0 4px 16px ${colors.gold}20`
                }}>
                  <img
                    src={newGuestQR.qrDataUrl}
                    alt="Guest QR Code"
                    style={{
                      width: '300px',
                      height: '300px',
                      display: 'block'
                    }}
                  />
                </div>

                {/* Action Buttons */}
                <div style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  {/* WhatsApp Share Button - PRIMARY */}
                  <button
                    onClick={handleWhatsAppShare}
                    style={{
                      background: '#25D366',
                      border: 'none',
                      color: 'white',
                      padding: '16px 24px',
                      borderRadius: '10px',
                      fontSize: '16px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#20BA5A'
                      e.currentTarget.style.transform = 'translateY(-1px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#25D366'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    📱 Send via WhatsApp
                  </button>

                  {/* Download QR Button */}
                  <button
                    onClick={handleDownloadNewQR}
                    style={{
                      background: colors.charcoalBlue,
                      border: 'none',
                      color: colors.text,
                      padding: '14px 24px',
                      borderRadius: '10px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#283847'
                      e.currentTarget.style.transform = 'translateY(-1px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = colors.charcoalBlue
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    <Download size={18} />
                    Download QR Code
                  </button>

                  {/* Close Button */}
                  <button
                    onClick={handleCloseAddGuest}
                    style={{
                      background: 'transparent',
                      border: `1px solid ${colors.border}`,
                      color: colors.textMuted,
                      padding: '14px 24px',
                      borderRadius: '10px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = colors.textMuted
                      e.currentTarget.style.color = colors.text
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = colors.border
                      e.currentTarget.style.color = colors.textMuted
                    }}
                  >
                    Done
                  </button>
                </div>

                <p style={{
                  fontSize: '13px',
                  color: colors.textMuted,
                  textAlign: 'center',
                  lineHeight: '1.5'
                }}>
                  💡 The guest can also show this QR code directly from their phone screen - no need to print!
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {isEditingEvent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}
        onClick={handleCancelEdit}
        >
          <div
            style={{
              background: colors.cardBg,
              border: `1px solid ${colors.border}`,
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: colors.text,
                margin: 0
              }}>
                Edit Event
              </h2>
              <button
                onClick={handleCancelEdit}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: colors.textMuted,
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = colors.text}
                onMouseLeave={(e) => e.currentTarget.style.color = colors.textMuted}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Event Name */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: colors.text,
                  marginBottom: '8px'
                }}>
                  Event Name *
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="e.g., Exclusive VIP Gala"
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
                />
              </div>

              {/* Event Date */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: colors.text,
                  marginBottom: '8px'
                }}>
                  Event Date *
                </label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
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
                />
              </div>

              {/* Start Time */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: colors.text,
                  marginBottom: '8px'
                }}>
                  Start Time (optional)
                </label>
                <input
                  type="time"
                  value={editForm.start_time}
                  onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
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
                />
              </div>

              {/* Location */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: colors.text,
                  marginBottom: '8px'
                }}>
                  Location (optional)
                </label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  placeholder="e.g., Grand Ballroom, City Hotel"
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
                />
              </div>

              {/* Scanner PIN */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: colors.text,
                  marginBottom: '8px'
                }}>
                  Scanner PIN (optional)
                </label>
                <input
                  type="text"
                  value={editForm.scanner_pin}
                  onChange={(e) => setEditForm({ ...editForm, scanner_pin: e.target.value })}
                  placeholder="e.g., 1234"
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
                />
                <p style={{
                  fontSize: '13px',
                  color: colors.textMuted,
                  marginTop: '6px'
                }}>
                  Leave blank for open access to scanner
                </p>
              </div>

              {/* Error Message */}
              {editMessage && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: '#3a1a1a',
                  color: '#ff6b6b',
                  border: '1px solid #5a2a2a'
                }}>
                  {editMessage}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '12px',
                marginTop: '8px'
              }}>
                <button
                  onClick={handleSaveEvent}
                  disabled={savingEvent || !editForm.name || !editForm.date}
                  style={{
                    flex: 1,
                    background: colors.success,
                    border: 'none',
                    color: colors.text,
                    padding: '14px 24px',
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: (savingEvent || !editForm.name || !editForm.date) ? 'not-allowed' : 'pointer',
                    opacity: (savingEvent || !editForm.name || !editForm.date) ? 0.5 : 1,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!savingEvent && editForm.name && editForm.date) {
                      e.currentTarget.style.background = '#5a8d6a'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = colors.success
                  }}
                >
                  {savingEvent ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={savingEvent}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: `1px solid ${colors.border}`,
                    color: colors.textMuted,
                    padding: '14px 24px',
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: savingEvent ? 'not-allowed' : 'pointer',
                    opacity: savingEvent ? 0.5 : 1,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!savingEvent) {
                      e.currentTarget.style.borderColor = colors.textMuted
                      e.currentTarget.style.color = colors.text
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = colors.border
                    e.currentTarget.style.color = colors.textMuted
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
