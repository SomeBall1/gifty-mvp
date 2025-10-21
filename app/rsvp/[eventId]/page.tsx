'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { CheckCircle, XCircle, Calendar, Crown } from 'lucide-react'
import Link from 'next/link'

export default function RSVPPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const eventId = params.eventId as string
  const guestId = searchParams.get('guest_id')
  const response = searchParams.get('response') // 'yes' or 'no'

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'already_responded'>('loading')
  const [guestInfo, setGuestInfo] = useState<{ name: string; tier: string; eventName: string; eventDate: string } | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const handleRSVP = async () => {
      if (!guestId || !response || (response !== 'yes' && response !== 'no')) {
        setStatus('error')
        setErrorMessage('Invalid RSVP link')
        return
      }

      const supabase = createClient()

      try {
        // Fetch guest and event info
        const { data: guest, error: fetchError } = await supabase
          .from('guests')
          .select(`
            id,
            name,
            tier,
            rsvp_status,
            event_id,
            events (
              name,
              date
            )
          `)
          .eq('id', guestId)
          .eq('event_id', eventId)
          .single()

        if (fetchError || !guest) {
          console.error('Error fetching guest:', fetchError)
          setStatus('error')
          setErrorMessage('Guest not found')
          return
        }

        // Check if already responded
        if (guest.rsvp_status !== 'Pending') {
          setStatus('already_responded')
          setGuestInfo({
            name: guest.name,
            tier: guest.tier,
            eventName: (guest.events as any)?.name || 'Unknown Event',
            eventDate: (guest.events as any)?.date || ''
          })
          return
        }

        // Update RSVP status
        const newStatus = response === 'yes' ? 'Confirmed' : 'Declined'
        const { error: updateError } = await supabase
          .from('guests')
          .update({
            rsvp_status: newStatus,
            rsvp_responded_at: new Date().toISOString()
          })
          .eq('id', guestId)

        if (updateError) {
          console.error('Error updating RSVP:', updateError)
          setStatus('error')
          setErrorMessage('Failed to update RSVP')
          return
        }

        // Success!
        setStatus('success')
        setGuestInfo({
          name: guest.name,
          tier: guest.tier,
          eventName: (guest.events as any)?.name || 'Unknown Event',
          eventDate: (guest.events as any)?.date || ''
        })

      } catch (err) {
        console.error('Error handling RSVP:', err)
        setStatus('error')
        setErrorMessage('Something went wrong')
      }
    }

    handleRSVP()
  }, [guestId, response, eventId])

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f0f0f' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 mx-auto mb-4" style={{ borderColor: '#c9a961' }}></div>
          <p style={{ color: '#a8a8a0' }}>Processing your RSVP...</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0f0f0f' }}>
        <div className="max-w-md w-full rounded-lg p-8 text-center" style={{ backgroundColor: '#1a1a1a' }}>
          <XCircle size={64} className="mx-auto mb-4" style={{ color: '#8b7474' }} />
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#f5f5f0' }}>RSVP Error</h1>
          <p className="mb-6" style={{ color: '#a8a8a0' }}>{errorMessage}</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 rounded-lg font-semibold transition-colors"
            style={{ backgroundColor: '#c9a961', color: '#0f0f0f' }}
          >
            Go to Home
          </Link>
        </div>
      </div>
    )
  }

  if (status === 'already_responded' && guestInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0f0f0f' }}>
        <div className="max-w-md w-full rounded-lg p-8 text-center" style={{ backgroundColor: '#1a1a1a' }}>
          <Calendar size={64} className="mx-auto mb-4" style={{ color: '#9b8b74' }} />
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#f5f5f0' }}>Already Responded</h1>
          <p className="mb-2" style={{ color: '#a8a8a0' }}>
            You&apos;ve already responded to this invitation.
          </p>
          <p className="text-lg font-semibold mb-6" style={{ color: '#c9a961' }}>
            {guestInfo.name}
          </p>
          <div className="text-sm mb-6" style={{ color: '#a8a8a0' }}>
            <p>{guestInfo.eventName}</p>
            <p>{formatDate(guestInfo.eventDate)}</p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'success' && guestInfo) {
    const isConfirmed = response === 'yes'

    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0f0f0f' }}>
        <div className="max-w-md w-full rounded-lg p-8 text-center" style={{ backgroundColor: '#1a1a1a' }}>
          {isConfirmed ? (
            <CheckCircle size={64} className="mx-auto mb-4" style={{ color: '#4a7c59' }} />
          ) : (
            <XCircle size={64} className="mx-auto mb-4" style={{ color: '#8b7474' }} />
          )}

          <h1 className="text-2xl font-bold mb-2" style={{ color: '#f5f5f0' }}>
            {isConfirmed ? 'RSVP Confirmed!' : 'RSVP Declined'}
          </h1>

          <p className="mb-4" style={{ color: '#a8a8a0' }}>
            {isConfirmed
              ? "We're looking forward to seeing you!"
              : "Thank you for letting us know."}
          </p>

          <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: '#0f0f0f', border: '1px solid #2a2a2a' }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <p className="text-lg font-semibold" style={{ color: '#c9a961' }}>
                {guestInfo.name}
              </p>
              {guestInfo.tier.toLowerCase() === 'vip' && (
                <Crown size={20} style={{ color: '#c9a961' }} />
              )}
            </div>
            <p className="text-sm mb-1" style={{ color: '#a8a8a0' }}>{guestInfo.tier}</p>
            <div className="text-sm mt-4" style={{ color: '#a8a8a0' }}>
              <p className="font-semibold mb-1" style={{ color: '#f5f5f0' }}>{guestInfo.eventName}</p>
              <p>{formatDate(guestInfo.eventDate)}</p>
            </div>
          </div>

          {isConfirmed && (
            <p className="text-sm" style={{ color: '#a8a8a0' }}>
              You&apos;ll receive your QR code invitation shortly.
            </p>
          )}
        </div>
      </div>
    )
  }

  return null
}
