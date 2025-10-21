'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import QRCode from 'qrcode'
import Link from 'next/link'
import { ArrowLeft, Upload, Download, CheckCircle, Circle, Crown } from 'lucide-react'

interface Guest {
  id: string
  name: string
  email: string
  tier: string
  status: string
  claimed_at: string | null
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

  const filteredGuests = guests.filter(guest =>
    guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guest.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guest.tier.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
          <h1 style={{
            fontSize: '36px',
            fontWeight: '700',
            marginBottom: '12px',
            color: colors.text,
            lineHeight: '1.2'
          }}>
            {event.name}
          </h1>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
