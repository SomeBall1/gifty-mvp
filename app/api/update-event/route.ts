import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { eventId, name, date, start_time, location, scanner_pin } = body

    // Validate required fields
    if (!eventId || !name || !date) {
      return NextResponse.json(
        { error: 'Event ID, name, and date are required' },
        { status: 400 }
      )
    }

    // Update the event (RLS ensures user can only update their own events)
    const { data, error } = await supabase
      .from('events')
      .update({
        name,
        date,
        start_time: start_time || null,
        location: location || null,
        scanner_pin: scanner_pin || null
      })
      .eq('id', eventId)
      .select()
      .single()

    if (error) {
      console.error('Error updating event:', error)
      return NextResponse.json(
        { error: 'Failed to update event' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, event: data })
  } catch (error) {
    console.error('Error in update-event API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
