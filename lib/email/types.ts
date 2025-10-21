// Types for the email invitation flow

export interface EmailRecipient {
  id: string
  name: string
  email: string
  tier: string
}

export interface EmailSendResult {
  guestId: string
  guestName: string
  guestEmail: string
  success: boolean
  error?: string
}

export interface EmailBatchResult {
  sent: number
  failed: number
  total: number
  results: EmailSendResult[]
}

export interface InvitationPreview {
  eventName: string
  eventDate: string
  eventLocation?: string
  fromEmail: string
  recipients: EmailRecipient[]
  templateType: 'rsvp' | 'qr'
}
