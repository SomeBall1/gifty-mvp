'use client'

import { useState } from 'react'
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

  const isTestMode = fromEmail === 'onboarding@resend.dev'
  const invitationTypeLabel = invitationType === 'rsvp' ? 'RSVP Invitation' : 'QR Code Invitation'
  const successCount = results.filter(r => r.success).length
  const failedCount = results.filter(r => !r.success).length

  const handleSend = async () => {
    setSending(true)
    setStep('sending')
    setSendProgress(0)

    try {
      const apiEndpoint = invitationType === 'rsvp'
        ? '/api/send-rsvp-invitations'
        : '/api/send-invitations'

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          fromEmail
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitations')
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
      alert(`Error: ${error.message}`)
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
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: colors.text,
                marginBottom: '12px'
              }}>
                Recipients ({recipients.length})
              </h3>
              <div style={{
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: '12px',
                maxHeight: '300px',
                overflowY: 'auto'
              }}>
                {recipients.map((recipient, index) => (
                  <div
                    key={recipient.id}
                    style={{
                      padding: '12px 16px',
                      borderBottom: index < recipients.length - 1 ? `1px solid ${colors.border}` : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        margin: 0,
                        color: colors.text,
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
                ))}
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
                margin: '0 0 8px',
                color: colors.text,
                fontSize: '14px',
                fontWeight: '600'
              }}>
                📧 Email Content
              </p>
              <p style={{
                margin: 0,
                color: colors.textMuted,
                fontSize: '13px',
                lineHeight: '1.6'
              }}>
                {invitationType === 'rsvp'
                  ? 'Recipients will receive a professional RSVP invitation with Yes/No buttons to confirm their attendance.'
                  : 'Recipients will receive their personalized QR code embedded in the email, ready to show at the event.'}
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '8px'
            }}>
              <button
                onClick={handleSend}
                style={{
                  flex: 1,
                  background: `linear-gradient(135deg, ${colors.gold} 0%, ${colors.goldLight} 100%)`,
                  border: 'none',
                  color: colors.bg,
                  padding: '14px 24px',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = `0 6px 16px ${colors.gold}40`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <Mail size={18} />
                Send {recipients.length} Email{recipients.length !== 1 ? 's' : ''}
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
                Please wait while we send {recipients.length} email{recipients.length !== 1 ? 's' : ''}
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
