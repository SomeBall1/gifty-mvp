'use client'

import { useState, useEffect } from 'react'
import { X, Mail, AlertCircle, CheckCircle, Clock, ExternalLink } from 'lucide-react'

interface Guest {
  id: string
  name: string
  email: string
  tier: string
}

interface EmailResult {
  guestId: string
  guestName: string
  guestEmail: string
  success: boolean
  error?: string
}

interface EmailInvitationModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  eventName: string
  eventDate: string
  eventLocation?: string | null
  recipients: Guest[]
  invitationType: 'rsvp' | 'qr'
  fromEmail: string
  onSendComplete?: () => void
}

type ModalStep = 'confirm' | 'sending' | 'results'

const colors = {
  bg: '#0f0f0f',
  cardBg: '#1a1a1a',
  charcoalBlue: '#1e2835',
  gold: '#c9a961',
  goldLight: '#d4af37',
  text: '#f5f5f0',
  textMuted: '#a8a8a0',
  border: '#2a2a2a',
  success: '#4a7c59',
  successBg: '#1a2f1f',
  error: '#8b7474',
  errorBg: '#2f1a1a',
  warning: '#9b8b74'
}

export default function EmailInvitationModal({
  isOpen,
  onClose,
  eventId,
  eventName,
  eventDate,
  eventLocation,
  recipients,
  invitationType,
  fromEmail,
  onSendComplete
}: EmailInvitationModalProps) {
  const [step, setStep] = useState<ModalStep>('confirm')
  const [sending, setSending] = useState(false)
  const [sendProgress, setSendProgress] = useState(0)
  const [results, setResults] = useState<EmailResult[]>([])
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set())

  const isTestMode = fromEmail === 'onboarding@resend.dev'
  const invitationTypeLabel = invitationType === 'rsvp' ? 'RSVP Invitation' : 'QR Code Invitation'
  const successCount = results.filter(r => r.success).length
  const failedCount = results.filter(r => !r.success).length
  const allSelected = selectedRecipients.size === recipients.length && recipients.length > 0
  const someSelected = selectedRecipients.size > 0 && selectedRecipients.size < recipients.length

  // Initialize all recipients as selected when modal opens
  useEffect(() => {
    if (isOpen && recipients.length > 0) {
      setSelectedRecipients(new Set(recipients.map(r => r.id)))
    }
  }, [isOpen, recipients])

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedRecipients(new Set())
    } else {
      setSelectedRecipients(new Set(recipients.map(r => r.id)))
    }
  }

  const toggleRecipient = (recipientId: string) => {
    const newSelected = new Set(selectedRecipients)
    if (newSelected.has(recipientId)) {
      newSelected.delete(recipientId)
    } else {
      newSelected.add(recipientId)
    }
    setSelectedRecipients(newSelected)
  }

  const getSelectedRecipients = () => {
    return recipients.filter(r => selectedRecipients.has(r.id))
  }

  const handleSend = async () => {
    const recipientsToSend = getSelectedRecipients()

    if (recipientsToSend.length === 0) {
      alert('Please select at least one recipient')
      return
    }
    setSending(true)
    setStep('sending')
    setSendProgress(0)

    try {
      const apiEndpoint = invitationType === 'rsvp'
        ? '/api/send-rsvp-invitations'
        : '/api/send-invitations'

      // Create abort controller for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000) // 2 minute timeout

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          guestIds: Array.from(selectedRecipients),
          fromEmail
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Server returned ${response.status} ${response.statusText}. Expected JSON response.`)
      }

      const data = await response.json()

      if (!response.ok) {
        // Special handling for API key error
        if (data.error?.includes('API key not configured') || data.details?.includes('API key not configured')) {
          throw new Error('Resend API key is not configured. Please add RESEND_API_KEY to your environment variables (.env.local or Vercel settings).')
        }
        throw new Error(data.error || data.details || 'Failed to send invitations')
      }

      // Simulate progress for better UX
      setSendProgress(100)
      setResults(data.results || [])
      setStep('results')

      if (onSendComplete) {
        onSendComplete()
      }
    } catch (error: any) {
      console.error('Error sending invitations:', error)

      // Better error messages
      let errorMessage = error.message
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. The server took too long to respond. Please try again with fewer recipients or check your network connection.'
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error. Please check your internet connection and try again.'
      }

      alert(`❌ Error: ${errorMessage}`)
      setStep('confirm')
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    setStep('confirm')
    setSendProgress(0)
    setResults([])
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.border}`,
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '700px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Mail size={24} style={{ color: colors.gold }} />
            {step === 'confirm' && `Send ${invitationTypeLabel}s`}
            {step === 'sending' && `Sending ${invitationTypeLabel}s...`}
            {step === 'results' && 'Send Complete'}
          </h2>
          <button
            onClick={handleClose}
            disabled={sending}
            style={{
              background: 'transparent',
              border: 'none',
              color: colors.textMuted,
              cursor: sending ? 'not-allowed' : 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s ease',
              opacity: sending ? 0.5 : 1
            }}
            onMouseEnter={(e) => !sending && (e.currentTarget.style.color = colors.text)}
            onMouseLeave={(e) => e.currentTarget.style.color = colors.textMuted}
          >
            <X size={24} />
          </button>
        </div>

        {/* Test Mode Warning */}
        {isTestMode && step === 'confirm' && (
          <div style={{
            background: `${colors.warning}20`,
            border: `1px solid ${colors.warning}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}>
            <AlertCircle size={20} style={{ color: colors.warning, flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{
                margin: '0 0 8px',
                color: colors.text,
                fontSize: '15px',
                fontWeight: '600'
              }}>
                Test Mode Active
              </p>
              <p style={{
                margin: 0,
                color: colors.textMuted,
                fontSize: '14px',
                lineHeight: '1.5'
              }}>
                Using Resend test mode. All emails will be sent to <code style={{
                  background: colors.bg,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  color: colors.gold
                }}>onboarding@resend.dev</code> instead of actual recipients. To send to real email addresses, verify your domain in Resend settings.
              </p>
            </div>
          </div>
        )}

        {/* STEP 1: CONFIRMATION */}
        {step === 'confirm' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Event Details */}
            <div style={{
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              borderRadius: '12px',
              padding: '20px'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: colors.text,
                marginBottom: '12px'
              }}>
                Event Details
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ margin: 0, color: colors.textMuted, fontSize: '14px' }}>
                  <strong style={{ color: colors.text }}>Event:</strong> {eventName}
                </p>
                <p style={{ margin: 0, color: colors.textMuted, fontSize: '14px' }}>
                  <strong style={{ color: colors.text }}>Date:</strong> {eventDate}
                </p>
                {eventLocation && (
                  <p style={{ margin: 0, color: colors.textMuted, fontSize: '14px' }}>
                    <strong style={{ color: colors.text }}>Location:</strong> {eventLocation}
                  </p>
                )}
                <p style={{ margin: 0, color: colors.textMuted, fontSize: '14px' }}>
                  <strong style={{ color: colors.text }}>From:</strong> {fromEmail}
                </p>
                <p style={{ margin: 0, color: colors.textMuted, fontSize: '14px' }}>
                  <strong style={{ color: colors.text }}>Type:</strong> {invitationTypeLabel}
                </p>
              </div>
            </div>

            {/* Recipients List */}
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: colors.text,
                  margin: 0
                }}>
                  Recipients ({selectedRecipients.size} of {recipients.length} selected)
                </h3>
                <button
                  onClick={toggleSelectAll}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${colors.border}`,
                    color: colors.gold,
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = colors.gold
                    e.currentTarget.style.background = `${colors.gold}10`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = colors.border
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  {allSelected ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div style={{
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: '12px',
                maxHeight: '300px',
                overflowY: 'auto'
              }}>
                {recipients.map((recipient, index) => {
                  const isSelected = selectedRecipients.has(recipient.id)
                  return (
                    <div
                      key={recipient.id}
                      onClick={() => toggleRecipient(recipient.id)}
                      style={{
                        padding: '12px 16px',
                        borderBottom: index < recipients.length - 1 ? `1px solid ${colors.border}` : 'none',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        background: isSelected ? `${colors.gold}05` : 'transparent',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = `${colors.border}50`
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isSelected ? `${colors.gold}05` : 'transparent'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRecipient(recipient.id)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer',
                          accentColor: colors.gold,
                          flexShrink: 0
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          margin: 0,
                          color: isSelected ? colors.text : colors.textMuted,
                          fontSize: '14px',
                          fontWeight: '500',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {recipient.name}
                        </p>
                        <p style={{
                          margin: 0,
                          color: colors.textMuted,
                          fontSize: '13px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {isTestMode ? 'onboarding@resend.dev' : recipient.email}
                        </p>
                      </div>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: recipient.tier.toLowerCase().includes('vip') ? `${colors.gold}15` : colors.cardBg,
                        color: recipient.tier.toLowerCase().includes('vip') ? colors.gold : colors.textMuted,
                        border: `1px solid ${recipient.tier.toLowerCase().includes('vip') ? `${colors.gold}30` : colors.border}`,
                        flexShrink: 0
                      }}>
                        {recipient.tier}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Email Preview Info */}
            <div style={{
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              borderRadius: '12px',
              padding: '16px'
            }}>
              <p style={{
                margin: '0 0 12px',
                color: colors.text,
                fontSize: '14px',
                fontWeight: '600'
              }}>
                📧 Email Preview
              </p>

              {invitationType === 'rsvp' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{
                    background: colors.cardBg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '13px',
                    color: colors.textMuted,
                    lineHeight: '1.6'
                  }}>
                    <p style={{ margin: '0 0 8px', color: colors.text, fontWeight: '600' }}>
                      Subject: You're Invited to {eventName} - Please RSVP
                    </p>
                    <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: '8px', marginTop: '8px' }}>
                      <p style={{ margin: '0 0 8px' }}>Dear <strong>[Guest Name]</strong>,</p>
                      <p style={{ margin: '0 0 8px' }}>We're delighted to invite you to:</p>
                      <div style={{ background: colors.bg, padding: '10px', borderRadius: '6px', margin: '8px 0' }}>
                        <p style={{ margin: '0 0 4px', fontWeight: '600', color: colors.gold }}>{eventName}</p>
                        <p style={{ margin: '0 0 4px' }}>📅 {eventDate}</p>
                        {eventLocation && <p style={{ margin: 0 }}>📍 {eventLocation}</p>}
                      </div>
                      <p style={{ margin: '8px 0', fontWeight: '600', color: colors.text }}>Will you be joining us?</p>
                      <div style={{ display: 'flex', gap: '8px', margin: '8px 0' }}>
                        <span style={{ background: colors.gold, color: colors.bg, padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                          ✓ Yes, I'll Attend
                        </span>
                        <span style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted, padding: '6px 12px', borderRadius: '4px', fontSize: '12px' }}>
                          ✗ Can't Make It
                        </span>
                      </div>
                      <p style={{ margin: '8px 0 0', fontSize: '12px' }}>After confirming, you'll receive your exclusive QR code invitation via email.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{
                    background: colors.cardBg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '13px',
                    color: colors.textMuted,
                    lineHeight: '1.6'
                  }}>
                    <p style={{ margin: '0 0 8px', color: colors.text, fontWeight: '600' }}>
                      Subject: Your Invitation to {eventName}
                    </p>
                    <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: '8px', marginTop: '8px' }}>
                      <p style={{ margin: '0 0 8px' }}>Dear <strong>[Guest Name]</strong>,</p>
                      <p style={{ margin: '0 0 8px' }}>We're delighted to invite you to:</p>
                      <div style={{ background: colors.bg, padding: '10px', borderRadius: '6px', margin: '8px 0' }}>
                        <p style={{ margin: '0 0 4px', fontWeight: '600', color: colors.gold }}>{eventName}</p>
                        <p style={{ margin: 0 }}>📅 {eventDate}</p>
                      </div>
                      <p style={{ margin: '8px 0', fontWeight: '600', color: colors.text }}>Please present this QR code at the event exit to receive your exclusive goodie bag:</p>
                      <div style={{
                        background: '#ffffff',
                        padding: '16px',
                        borderRadius: '8px',
                        margin: '8px 0',
                        textAlign: 'center'
                      }}>
                        <div style={{
                          width: '120px',
                          height: '120px',
                          background: colors.border,
                          margin: '0 auto',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          color: colors.textMuted
                        }}>
                          [QR Code]
                        </div>
                      </div>
                      <p style={{ margin: '8px 0 0', fontSize: '12px' }}>Save this email or take a screenshot for easy access. Each code can only be used once.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '8px'
            }}>
              <button
                onClick={handleSend}
                disabled={selectedRecipients.size === 0}
                style={{
                  flex: 1,
                  background: selectedRecipients.size === 0 ? colors.border : `linear-gradient(135deg, ${colors.gold} 0%, ${colors.goldLight} 100%)`,
                  border: 'none',
                  color: selectedRecipients.size === 0 ? colors.textMuted : colors.bg,
                  padding: '14px 24px',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: selectedRecipients.size === 0 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: selectedRecipients.size === 0 ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (selectedRecipients.size > 0) {
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = `0 6px 16px ${colors.gold}40`
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <Mail size={18} />
                Send {selectedRecipients.size} Email{selectedRecipients.size !== 1 ? 's' : ''}
              </button>
              <button
                onClick={handleClose}
                style={{
                  flex: 1,
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
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: SENDING */}
        {step === 'sending' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
            padding: '40px 20px'
          }}>
            <Clock size={48} style={{ color: colors.gold }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{
                margin: '0 0 8px',
                color: colors.text,
                fontSize: '18px',
                fontWeight: '600'
              }}>
                Sending Invitations...
              </p>
              <p style={{
                margin: 0,
                color: colors.textMuted,
                fontSize: '14px'
              }}>
                Please wait while we send {selectedRecipients.size} email{selectedRecipients.size !== 1 ? 's' : ''}
              </p>
            </div>
            {/* Progress Bar */}
            <div style={{
              width: '100%',
              height: '8px',
              background: colors.bg,
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${sendProgress}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${colors.gold} 0%, ${colors.goldLight} 100%)`,
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}

        {/* STEP 3: RESULTS */}
        {step === 'results' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Summary */}
            <div style={{
              background: successCount === recipients.length ? colors.successBg : failedCount > 0 ? colors.errorBg : colors.bg,
              border: `1px solid ${successCount === recipients.length ? colors.success : failedCount > 0 ? colors.error : colors.border}`,
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center'
            }}>
              {successCount === recipients.length ? (
                <>
                  <CheckCircle size={48} style={{ color: colors.success, marginBottom: '12px' }} />
                  <p style={{
                    margin: '0 0 8px',
                    color: colors.text,
                    fontSize: '18px',
                    fontWeight: '600'
                  }}>
                    All Emails Sent Successfully!
                  </p>
                  <p style={{
                    margin: 0,
                    color: colors.textMuted,
                    fontSize: '14px'
                  }}>
                    {successCount} {invitationType === 'rsvp' ? 'RSVP invitation' : 'QR code invitation'}{successCount !== 1 ? 's' : ''} delivered
                  </p>
                </>
              ) : (
                <>
                  <AlertCircle size={48} style={{ color: failedCount > 0 ? colors.error : colors.gold, marginBottom: '12px' }} />
                  <p style={{
                    margin: '0 0 8px',
                    color: colors.text,
                    fontSize: '18px',
                    fontWeight: '600'
                  }}>
                    {successCount > 0 ? 'Partially Complete' : 'Send Failed'}
                  </p>
                  <p style={{
                    margin: 0,
                    color: colors.textMuted,
                    fontSize: '14px'
                  }}>
                    {successCount} succeeded, {failedCount} failed
                  </p>
                </>
              )}
            </div>

            {/* Detailed Results */}
            <div>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: colors.text,
                marginBottom: '12px'
              }}>
                Detailed Results
              </h3>

              {/* Success Tab */}
              {successCount > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{
                    background: colors.successBg,
                    border: `1px solid ${colors.success}`,
                    borderRadius: '8px',
                    padding: '12px 16px',
                    marginBottom: '8px'
                  }}>
                    <p style={{
                      margin: 0,
                      color: colors.success,
                      fontSize: '14px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <CheckCircle size={16} />
                      Successfully Sent ({successCount})
                    </p>
                  </div>
                  <div style={{
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}>
                    {results.filter(r => r.success).map((result, index, arr) => (
                      <div
                        key={result.guestId}
                        style={{
                          padding: '10px 16px',
                          borderBottom: index < arr.length - 1 ? `1px solid ${colors.border}` : 'none'
                        }}
                      >
                        <p style={{
                          margin: 0,
                          color: colors.text,
                          fontSize: '14px',
                          fontWeight: '500'
                        }}>
                          {result.guestName}
                        </p>
                        <p style={{
                          margin: 0,
                          color: colors.textMuted,
                          fontSize: '13px'
                        }}>
                          {isTestMode ? 'onboarding@resend.dev' : result.guestEmail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Failed Tab */}
              {failedCount > 0 && (
                <div>
                  <div style={{
                    background: colors.errorBg,
                    border: `1px solid ${colors.error}`,
                    borderRadius: '8px',
                    padding: '12px 16px',
                    marginBottom: '8px'
                  }}>
                    <p style={{
                      margin: 0,
                      color: colors.error,
                      fontSize: '14px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <AlertCircle size={16} />
                      Failed ({failedCount})
                    </p>
                  </div>
                  <div style={{
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}>
                    {results.filter(r => !r.success).map((result, index, arr) => (
                      <div
                        key={result.guestId}
                        style={{
                          padding: '10px 16px',
                          borderBottom: index < arr.length - 1 ? `1px solid ${colors.border}` : 'none'
                        }}
                      >
                        <p style={{
                          margin: 0,
                          color: colors.text,
                          fontSize: '14px',
                          fontWeight: '500'
                        }}>
                          {result.guestName}
                        </p>
                        <p style={{
                          margin: 0,
                          color: colors.textMuted,
                          fontSize: '13px',
                          marginBottom: '4px'
                        }}>
                          {result.guestEmail}
                        </p>
                        <p style={{
                          margin: 0,
                          color: colors.error,
                          fontSize: '12px',
                          fontStyle: 'italic'
                        }}>
                          Error: {result.error}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={handleClose}
              style={{
                width: '100%',
                background: colors.charcoalBlue,
                border: 'none',
                color: colors.text,
                padding: '14px 24px',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
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
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
