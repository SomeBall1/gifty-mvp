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
  rsvp_status: string
  rsvp_responded_at: string | null
  notes: string | null
}

interface Event {
  id: string
  name: string
  date: string
  start_time: string | null
  location: string | null
  scanner_pin: string | null
  logo_url: string | null
  show_powered_by: boolean
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
  const [filterRSVP, setFilterRSVP] = useState<'all' | 'pending' | 'confirmed' | 'declined'>('all')
  const [sendingRSVPEmails, setSendingRSVPEmails] = useState(false)
  const [rsvpEmailMessage, setRSVPEmailMessage] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [isEditingEvent, setIsEditingEvent] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    date: '',
    start_time: '',
    location: '',
    scanner_pin: '',
    show_powered_by: true
  })
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
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

  const sendRSVPInvitations = async () => {
    setSendingRSVPEmails(true)
    setRSVPEmailMessage('')

    try {
      const response = await fetch('/api/send-rsvp-invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: params.id,
          fromEmail: process.env.NEXT_PUBLIC_RESEND_FROM_EMAIL || 'onboarding@resend.dev'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setRSVPEmailMessage(`Error: ${data.error}`)
        setSendingRSVPEmails(false)
        return
      }

      setRSVPEmailMessage(
        `Successfully sent ${data.sent} RSVP invitation${data.sent !== 1 ? 's' : ''}!` +
        (data.failed > 0 ? ` (${data.failed} failed)` : '')
      )
      setTimeout(() => setRSVPEmailMessage(''), 5000)
    } catch (error: any) {
      setRSVPEmailMessage(`Error: ${error.message}`)
    } finally {
      setSendingRSVPEmails(false)
    }
  }

  const handleEditEvent = () => {
    if (!event) return
    setEditForm({
      name: event.name,
      date: event.date,
      start_time: event.start_time || '',
      location: event.location || '',
      scanner_pin: event.scanner_pin || '',
      show_powered_by: event.show_powered_by
    })
    setLogoPreview(event.logo_url)
    setLogoFile(null)
    setIsEditingEvent(true)
    setEditMessage('')
  }

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be less than 2MB')
      return
    }

    setLogoFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return event?.logo_url || null

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const fileExt = logoFile.name.split('.').pop()
      const fileName = `${session.user.id}/${event?.id}.${fileExt}`

      const { data, error } = await supabase.storage
        .from('event-logos')
        .upload(fileName, logoFile, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('event-logos')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (error: any) {
      console.error('Error uploading logo:', error)
      throw new Error(`Failed to upload logo: ${error.message}`)
    }
  }

  const handleSaveEvent = async () => {
    if (!event) return

    setSavingEvent(true)
    setEditMessage('')

    try {
      // Upload logo if a new one was selected
      let logoUrl = event.logo_url
      if (logoFile) {
        setUploadingLogo(true)
        try {
          logoUrl = await uploadLogo()
        } catch (error: any) {
          setEditMessage(error.message)
          setSavingEvent(false)
          setUploadingLogo(false)
          return
        }
        setUploadingLogo(false)
      }

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
          scanner_pin: editForm.scanner_pin || null,
          logo_url: logoUrl,
          show_powered_by: editForm.show_powered_by
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
      setLogoFile(null)
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
    if (!addGuestForm.name) {
      setAddGuestMessage('Name is required')
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
          email: addGuestForm.email.trim() || '',
          tier: addGuestForm.tier.trim() || 'Guest',
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

    // Create WhatsApp message with instructions to download QR
    const message = encodeURIComponent(
      `🎁 GIFTY Event Invitation\n\n` +
      `Event: ${event?.name}\n` +
      `Guest: ${newGuestQR.name}\n` +
      `Tier: ${newGuestQR.tier}\n\n` +
      `You've been added to the VIP guest list! 🎉\n\n` +
      `To get your QR code:\n` +
      `1. Download the QR code image I'm sending\n` +
      `2. Show it on your phone at the event entrance\n` +
      `3. Get your goodie bag scanned!\n\n` +
      `See you at the event! ✨`
    )

    // Open WhatsApp with message, user can then attach the QR image manually
    // Or download QR first, then share via WhatsApp's image sharing
    window.open(`https://wa.me/?text=${message}`, '_blank')

    // Also trigger download so they have the QR ready to attach
    setTimeout(() => {
      handleDownloadNewQR()
    }, 500)
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

    // Filter by RSVP status
    const matchesRSVP =
      filterRSVP === 'all' ||
      (filterRSVP === 'pending' && guest.rsvp_status === 'Pending') ||
      (filterRSVP === 'confirmed' && guest.rsvp_status === 'Confirmed') ||
      (filterRSVP === 'declined' && guest.rsvp_status === 'Declined')

    // Filter by search term
    const matchesSearch =
      guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.tier.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesStatus && matchesRSVP && matchesSearch
  })

  const claimedCount = guests.filter(g => g.status === 'Claimed').length
  const totalCount = guests.length
  const rsvpPendingCount = guests.filter(g => g.rsvp_status === 'Pending').length
  const rsvpConfirmedCount = guests.filter(g => g.rsvp_status === 'Confirmed').length
  const rsvpDeclinedCount = guests.filter(g => g.rsvp_status === 'Declined').length

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
          {/* Event Logo */}
          {event.logo_url && (
            <div style={{
              marginBottom: '24px',
              textAlign: 'center'
            }}>
              <img
                src={event.logo_url}
                alt={event.name}
                style={{
                  maxWidth: '300px',
                  maxHeight: '150px',
                  objectFit: 'contain'
                }}
              />
            </div>
          )}

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

            {/* Send RSVP Invitations Button */}
            {rsvpPendingCount > 0 && (
              <button
                onClick={sendRSVPInvitations}
                disabled={sendingRSVPEmails}
                style={{
                  background: colors.gold,
                  border: 'none',
                  color: colors.bg,
                  padding: '12px 24px',
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: sendingRSVPEmails ? 'not-allowed' : 'pointer',
                  opacity: sendingRSVPEmails ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  transform: 'translateY(0)'
                }}
                onMouseEnter={(e) => {
                  if (!sendingRSVPEmails) {
                    e.currentTarget.style.background = colors.goldLight
                    e.currentTarget.style.transform = 'translateY(-1px)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = colors.gold
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                📧 {sendingRSVPEmails ? 'Sending...' : `Send RSVP Invites (${rsvpPendingCount})`}
              </button>
            )}
          </div>

          {rsvpEmailMessage && (
            <div style={{
              marginTop: '16px',
              padding: '12px 16px',
              borderRadius: '8px',
              background: rsvpEmailMessage.includes('Error') ? `${colors.error}20` : colors.successBg,
              border: `1px solid ${rsvpEmailMessage.includes('Error') ? colors.error : colors.success}`,
              color: rsvpEmailMessage.includes('Error') ? colors.error : colors.success,
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {rsvpEmailMessage}
            </div>
          )}

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

                {/* RSVP Filter Tabs */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '16px',
                  flexWrap: 'wrap'
                }}>
                  <span style={{
                    padding: '8px 12px',
                    color: colors.textMuted,
                    fontSize: '13px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    RSVP:
                  </span>
                  <button
                    onClick={() => setFilterRSVP('all')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: `1px solid ${filterRSVP === 'all' ? colors.gold : colors.border}`,
                      background: filterRSVP === 'all' ? `${colors.gold}15` : colors.bg,
                      color: filterRSVP === 'all' ? colors.gold : colors.textMuted,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (filterRSVP !== 'all') {
                        e.currentTarget.style.borderColor = colors.textMuted
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (filterRSVP !== 'all') {
                        e.currentTarget.style.borderColor = colors.border
                      }
                    }}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterRSVP('pending')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: `1px solid ${filterRSVP === 'pending' ? colors.gold : colors.border}`,
                      background: filterRSVP === 'pending' ? `${colors.gold}15` : colors.bg,
                      color: filterRSVP === 'pending' ? colors.gold : colors.textMuted,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (filterRSVP !== 'pending') {
                        e.currentTarget.style.borderColor = colors.textMuted
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (filterRSVP !== 'pending') {
                        e.currentTarget.style.borderColor = colors.border
                      }
                    }}
                  >
                    Pending ({rsvpPendingCount})
                  </button>
                  <button
                    onClick={() => setFilterRSVP('confirmed')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: `1px solid ${filterRSVP === 'confirmed' ? colors.gold : colors.border}`,
                      background: filterRSVP === 'confirmed' ? `${colors.gold}15` : colors.bg,
                      color: filterRSVP === 'confirmed' ? colors.gold : colors.textMuted,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (filterRSVP !== 'confirmed') {
                        e.currentTarget.style.borderColor = colors.textMuted
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (filterRSVP !== 'confirmed') {
                        e.currentTarget.style.borderColor = colors.border
                      }
                    }}
                  >
                    Confirmed ({rsvpConfirmedCount})
                  </button>
                  <button
                    onClick={() => setFilterRSVP('declined')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: `1px solid ${filterRSVP === 'declined' ? colors.gold : colors.border}`,
                      background: filterRSVP === 'declined' ? `${colors.gold}15` : colors.bg,
                      color: filterRSVP === 'declined' ? colors.gold : colors.textMuted,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (filterRSVP !== 'declined') {
                        e.currentTarget.style.borderColor = colors.textMuted
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (filterRSVP !== 'declined') {
                        e.currentTarget.style.borderColor = colors.border
                      }
                    }}
                  >
                    Declined ({rsvpDeclinedCount})
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
                      RSVP
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
                        <span style={{
                          display: 'inline-block',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '500',
                          background:
                            guest.rsvp_status === 'Confirmed' ? `${colors.success}20` :
                            guest.rsvp_status === 'Declined' ? `${colors.error}20` :
                            `${colors.textMuted}15`,
                          color:
                            guest.rsvp_status === 'Confirmed' ? colors.success :
                            guest.rsvp_status === 'Declined' ? colors.error :
                            colors.textMuted,
                          border: `1px solid ${
                            guest.rsvp_status === 'Confirmed' ? `${colors.success}40` :
                            guest.rsvp_status === 'Declined' ? `${colors.error}40` :
                            colors.border
                          }`
                        }}>
                          {guest.rsvp_status}
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
                    color: colors.textMuted,
                    marginBottom: '8px'
                  }}>
                    Email <span style={{ fontSize: '12px', color: colors.textMuted }}>(optional)</span>
                  </label>
                  <input
                    type="email"
                    value={addGuestForm.email}
                    onChange={(e) => setAddGuestForm({ ...addGuestForm, email: e.target.value })}
                    placeholder="e.g., sarah@example.com (optional)"
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
                    color: colors.textMuted,
                    marginBottom: '8px'
                  }}>
                    Tier <span style={{ fontSize: '12px', color: colors.textMuted }}>(optional - defaults to "Guest")</span>
                  </label>
                  <input
                    type="text"
                    value={addGuestForm.tier}
                    onChange={(e) => setAddGuestForm({ ...addGuestForm, tier: e.target.value })}
                    placeholder="e.g., VIP, Press, Standard (optional)"
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
                  disabled={addingGuest || !addGuestForm.name}
                  style={{
                    background: `linear-gradient(135deg, ${colors.gold} 0%, ${colors.goldLight} 100%)`,
                    border: 'none',
                    color: colors.bg,
                    padding: '14px 24px',
                    borderRadius: '10px',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: (addingGuest || !addGuestForm.name) ? 'not-allowed' : 'pointer',
                    opacity: (addingGuest || !addGuestForm.name) ? 0.5 : 1,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!addingGuest && addGuestForm.name) {
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

              {/* Event Logo */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: colors.text,
                  marginBottom: '8px'
                }}>
                  Event Logo (optional)
                </label>

                {logoPreview && (
                  <div style={{
                    marginBottom: '12px',
                    padding: '16px',
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '10px',
                    textAlign: 'center'
                  }}>
                    <img
                      src={logoPreview}
                      alt="Event logo preview"
                      style={{
                        maxWidth: '200px',
                        maxHeight: '120px',
                        objectFit: 'contain'
                      }}
                    />
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoSelect}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '10px',
                    color: colors.text,
                    fontSize: '15px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
                <p style={{
                  fontSize: '13px',
                  color: colors.textMuted,
                  marginTop: '6px'
                }}>
                  Max 2MB. Recommended: 400x200px
                </p>
              </div>

              {/* Powered by Gifty Toggle */}
              <div style={{
                padding: '16px',
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: '10px'
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  gap: '12px'
                }}>
                  <input
                    type="checkbox"
                    checked={editForm.show_powered_by}
                    onChange={(e) => setEditForm({ ...editForm, show_powered_by: e.target.checked })}
                    style={{
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer'
                    }}
                  />
                  <div>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: colors.text
                    }}>
                      Show "Powered by Gifty"
                    </span>
                    <p style={{
                      fontSize: '13px',
                      color: colors.textMuted,
                      marginTop: '4px',
                      margin: 0
                    }}>
                      Display a small watermark supporting Gifty (can be removed with premium)
                    </p>
                  </div>
                </label>
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
                  {uploadingLogo ? 'Uploading Logo...' : savingEvent ? 'Saving...' : 'Save Changes'}
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

      {/* Powered by Gifty Watermark */}
      {event?.show_powered_by && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '8px 16px',
          background: `${colors.cardBg}dd`,
          border: `1px solid ${colors.border}`,
          borderRadius: '20px',
          backdropFilter: 'blur(10px)',
          fontSize: '12px',
          color: colors.textMuted,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          zIndex: 100
        }}>
          <span>Powered by</span>
          <span style={{
            fontWeight: '700',
            background: `linear-gradient(135deg, ${colors.gold} 0%, ${colors.goldLight} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Gifty
          </span>
        </div>
      )}
    </div>
  )
}
