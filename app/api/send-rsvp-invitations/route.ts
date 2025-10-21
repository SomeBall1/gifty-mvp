import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { rsvpInvitationTemplate } from '@/lib/email/templates'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    // Debug logging
    console.log('Environment check:', {
      hasKey: !!process.env.RESEND_API_KEY,
      keyPrefix: process.env.RESEND_API_KEY?.substring(0, 3),
      allEnvKeys: Object.keys(process.env).filter(k => k.includes('RESEND'))
    })

    // Check for Resend API key at runtime
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Resend API key not configured' },
        { status: 500 }
      )
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const supabase = createServerSupabaseClient()

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { eventId, guestIds, fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev' } = await request.json()

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      )
    }

    // Fetch event details (RLS ensures user owns this event)
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Fetch guests - either specific IDs or all pending RSVP
    let guestsQuery = supabase
      .from('guests')
      .select('*')
      .eq('event_id', eventId)

    if (guestIds && Array.isArray(guestIds) && guestIds.length > 0) {
      guestsQuery = guestsQuery.in('id', guestIds)
    } else {
      guestsQuery = guestsQuery.eq('rsvp_status', 'Pending')
    }

    const { data: guests, error: guestsError } = await guestsQuery

    if (guestsError) {
      return NextResponse.json(
        { error: 'Error fetching guests' },
        { status: 500 }
      )
    }

    if (!guests || guests.length === 0) {
      return NextResponse.json(
        { message: 'No pending RSVP guests to send invitations to', sent: 0 },
        { status: 200 }
      )
    }

    interface EmailResult {
      guestId: string
      guestName: string
      guestEmail: string
      success: boolean
      error?: string
    }

    const results: EmailResult[] = []

    // Send email to each guest
    for (const guest of guests) {
      try {
        // Generate RSVP URLs
        const rsvpYesUrl = `${process.env.NEXT_PUBLIC_APP_URL}/rsvp/${eventId}?guest_id=${guest.id}&response=yes`
        const rsvpNoUrl = `${process.env.NEXT_PUBLIC_APP_URL}/rsvp/${eventId}?guest_id=${guest.id}&response=no`

        // Format date nicely
        const eventDate = new Date(event.date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })

        // Generate email HTML
        const html = rsvpInvitationTemplate({
          guestName: guest.name,
          eventName: event.name,
          eventDate,
          eventLocation: event.location || undefined,
          tier: guest.tier,
          rsvpYesUrl,
          rsvpNoUrl
        })

        // Send email via Resend
        const { error: sendError } = await resend.emails.send({
          from: fromEmail,
          to: guest.email,
          subject: `You're Invited to ${event.name} - Please RSVP`,
          html,
        })

        if (sendError) {
          results.push({
            guestId: guest.id,
            guestName: guest.name,
            guestEmail: guest.email,
            success: false,
            error: sendError.message
          })
        } else {
          // Update guest record with invitation sent timestamp
          await supabase
            .from('guests')
            .update({ rsvp_invitation_sent_at: new Date().toISOString() })
            .eq('id', guest.id)

          results.push({
            guestId: guest.id,
            guestName: guest.name,
            guestEmail: guest.email,
            success: true
          })
        }
      } catch (error: any) {
        results.push({
          guestId: guest.id,
          guestName: guest.name,
          guestEmail: guest.email,
          success: false,
          error: error.message
        })
      }
    }

    const sentCount = results.filter(r => r.success).length
    const failedCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      sent: sentCount,
      failed: failedCount,
      total: guests.length,
      results
    })
  } catch (error: any) {
    console.error('Error in send-rsvp-invitations API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
