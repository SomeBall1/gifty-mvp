'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-client'
import jsQR from 'jsqr'
import { ArrowLeft, Camera } from 'lucide-react'
import { useRouter } from 'next/navigation'

type ScanResult = {
  type: 'success' | 'already_claimed' | 'invalid'
  name?: string
  tier?: string
}

// Deep charcoal + gold color scheme
const colors = {
  bg: '#0f0f0f',
  cardBg: '#1a1a1a',
  text: '#f5f5f0',
  textMuted: '#a0a0a0',
  gold: '#c9a961',
  goldLight: '#d4af6f',
  border: '#2a2a2a',
  success: '#8b9474', // Muted sage green
  error: '#8b7474', // Muted rose
  warning: '#9b8b74' // Muted amber
}

export default function ScannerPage({ params }: { params: { eventId: string } }) {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [eventName, setEventName] = useState('')
  const [eventLogo, setEventLogo] = useState<string | null>(null)
  const [showPoweredBy, setShowPoweredBy] = useState(true)
  const [loading, setLoading] = useState(true)
  const [hasPin, setHasPin] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState('')
  const [cameraError, setCameraError] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanningRef = useRef(false)
  const supabase = createClient()

  useEffect(() => {
    checkEventPin()
    return () => {
      stopCamera()
    }
  }, [])

  const checkEventPin = async () => {
    const { data: event, error } = await supabase
      .from('events')
      .select('name, scanner_pin, logo_url, show_powered_by')
      .eq('id', params.eventId)
      .single()

    if (error || !event) {
      setError('Event not found')
      setLoading(false)
      return
    }

    setEventName(event.name)
    setEventLogo(event.logo_url)
    setShowPoweredBy(event.show_powered_by)

    if (!event.scanner_pin) {
      setIsAuthenticated(true)
      setHasPin(false)
    } else {
      setHasPin(true)
    }

    setLoading(false)
  }

  const verifyPin = () => {
    setPinError('')
    
    supabase
      .from('events')
      .select('scanner_pin')
      .eq('id', params.eventId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setPinError('Error verifying PIN')
          return
        }

        if (data.scanner_pin === pin) {
          setIsAuthenticated(true)
        } else {
          setPinError('Incorrect PIN')
          setPin('')
        }
      })
  }

  const startCamera = async () => {
    console.log('Starting camera...')
    setError('')
    setCameraError('')
    setResult(null)
    setScanning(true)
    
    // Give React time to render the video element
    await new Promise(resolve => setTimeout(resolve, 100))
    
    await initCamera()
  }

  const initCamera = async () => {
    try {
      console.log('Requesting camera permission...')
      
      // Stop any existing camera first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      
      console.log('Camera permission granted, stream obtained')
      
      if (!videoRef.current) {
        console.error('Video ref not available')
        setCameraError('Camera initialization failed. Please try again.')
        setScanning(false)
        return
      }
      
      videoRef.current.srcObject = stream
      streamRef.current = stream
      
      videoRef.current.onloadedmetadata = () => {
        console.log('Video metadata loaded')
        if (videoRef.current) {
          videoRef.current.play()
            .then(() => {
              console.log('Video playing successfully')
              scanningRef.current = true
              setTimeout(() => {
                requestAnimationFrame(tick)
              }, 100)
            })
            .catch(err => {
              console.error('Play failed:', err)
              setCameraError('Failed to start camera preview. Please try again.')
              stopCamera()
            })
        }
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err)
      let errorMsg = 'Unable to access camera. '
      
      if (err.name === 'NotAllowedError') {
        errorMsg += 'Camera permission was denied. Please allow camera access in your browser settings and try again.'
      } else if (err.name === 'NotFoundError') {
        errorMsg += 'No camera was found on this device.'
      } else if (err.name === 'NotReadableError') {
        errorMsg += 'Camera is being used by another application. Please close other apps and try again.'
      } else {
        errorMsg += 'Please check permissions.'
      }
      
      setCameraError(errorMsg)
      setScanning(false)
    }
  }

  const stopCamera = () => {
    console.log('Stopping camera...')
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
        console.log('Stopped track:', track.kind)
      })
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setScanning(false)
    scanningRef.current = false
  }

  const tick = () => {
    if (!scanningRef.current || !videoRef.current || !canvasRef.current) {
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.height = video.videoHeight
      canvas.width = video.videoWidth
      const ctx = canvas.getContext('2d')
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        })

        if (code) {
          console.log('QR code detected:', code.data)
          handleQRCode(code.data)
          return
        }
      }
    }

    requestAnimationFrame(tick)
  }

  const handleQRCode = async (data: string) => {
    stopCamera()
    
    try {
      console.log('Processing QR code data:', data)
      
      // Extract guest_id from the URL
      const url = new URL(data)
      const guestId = url.searchParams.get('guest_id')
      
      console.log('Extracted guest_id:', guestId)
      
      if (!guestId) {
        console.error('No guest_id found in QR code')
        setResult({ type: 'invalid' })
        return
      }

      console.log('Calling verification API...')
      const response = await fetch('/api/verify-guest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ guestId }),
      })

      console.log('API response status:', response.status)
      const responseData = await response.json()
      console.log('API response data:', responseData)

      if (response.ok) {
        setResult({
          type: 'success',
          name: responseData.name,
          tier: responseData.tier,
        })
      } else if (response.status === 409) {
        setResult({
          type: 'already_claimed',
          name: responseData.name,
          tier: responseData.tier,
        })
      } else {
        console.error('Verification failed:', responseData)
        setResult({ type: 'invalid' })
      }
    } catch (err) {
      console.error('Error processing QR code:', err)
      setResult({ type: 'invalid' })
    }
  }

  const resetScanner = () => {
    console.log('Resetting scanner')
    setResult(null)
    setError('')
    setCameraError('')
  }

  // Loading screen
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: colors.text, fontSize: '20px' }}>Loading...</div>
      </div>
    )
  }

  // PIN entry screen
  if (!isAuthenticated && hasPin) {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px'
      }}>
        <div style={{
          background: colors.cardBg,
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '400px',
          width: '100%',
          border: `1px solid ${colors.border}`
        }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: colors.text,
            marginBottom: '8px',
            textAlign: 'center'
          }}>
            {eventName}
          </h1>
          <p style={{
            color: colors.textMuted,
            textAlign: 'center',
            marginBottom: '24px',
            fontSize: '14px'
          }}>
            Scanner Access
          </p>
          
          <form onSubmit={(e) => { e.preventDefault(); verifyPin(); }}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: colors.text,
                marginBottom: '8px'
              }}>
                Enter Scanner PIN
              </label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  background: colors.bg,
                  color: colors.text,
                  fontSize: '18px',
                  textAlign: 'center',
                  letterSpacing: '4px',
                  outline: 'none'
                }}
                placeholder="••••"
                autoFocus
                maxLength={10}
              />
              {pinError && (
                <p style={{
                  marginTop: '8px',
                  color: colors.error,
                  fontSize: '14px',
                  textAlign: 'center'
                }}>
                  {pinError}
                </p>
              )}
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                background: colors.gold,
                color: colors.bg,
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Access Scanner
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Result screens
  if (result?.type === 'success') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.success,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        textAlign: 'center',
        position: 'relative'
      }}>
        {/* Event Logo */}
        {eventLogo && (
          <div style={{ marginBottom: '24px' }}>
            <img
              src={eventLogo}
              alt="Event Logo"
              style={{
                maxWidth: '250px',
                maxHeight: '120px',
                objectFit: 'contain'
              }}
            />
          </div>
        )}

        <div style={{ fontSize: '128px', marginBottom: '32px' }}>✓</div>
        <h1 style={{
          fontSize: '48px',
          fontWeight: '700',
          color: 'white',
          marginBottom: '16px',
          wordBreak: 'break-word'
        }}>
          {result.name}
        </h1>
        <p style={{
          fontSize: '32px',
          fontWeight: '600',
          color: 'white',
          marginBottom: '48px'
        }}>
          {result.tier} Confirmed
        </p>
        <button
          onClick={resetScanner}
          style={{
            background: 'white',
            color: colors.success,
            padding: '16px 48px',
            borderRadius: '16px',
            border: 'none',
            fontSize: '24px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          Done
        </button>

        {/* Powered by Gifty Watermark */}
        {showPoweredBy && (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            padding: '8px 16px',
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            fontSize: '12px',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>Powered by</span>
            <span style={{ fontWeight: '700' }}>Gifty</span>
          </div>
        )}
      </div>
    )
  }

  if (result?.type === 'already_claimed') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.error,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        textAlign: 'center',
        position: 'relative'
      }}>
        {/* Event Logo */}
        {eventLogo && (
          <div style={{ marginBottom: '24px' }}>
            <img
              src={eventLogo}
              alt="Event Logo"
              style={{
                maxWidth: '250px',
                maxHeight: '120px',
                objectFit: 'contain'
              }}
            />
          </div>
        )}

        <div style={{ fontSize: '128px', marginBottom: '32px' }}>✕</div>
        <h1 style={{
          fontSize: '48px',
          fontWeight: '700',
          color: 'white',
          marginBottom: '16px',
          wordBreak: 'break-word'
        }}>
          {result.name}
        </h1>
        <p style={{
          fontSize: '32px',
          fontWeight: '600',
          color: 'white',
          marginBottom: '48px'
        }}>
          ALREADY CLAIMED
        </p>
        <button
          onClick={resetScanner}
          style={{
            background: 'white',
            color: colors.error,
            padding: '16px 48px',
            borderRadius: '16px',
            border: 'none',
            fontSize: '24px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          Done
        </button>

        {/* Powered by Gifty Watermark */}
        {showPoweredBy && (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            padding: '8px 16px',
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            fontSize: '12px',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>Powered by</span>
            <span style={{ fontWeight: '700' }}>Gifty</span>
          </div>
        )}
      </div>
    )
  }

  if (result?.type === 'invalid') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.warning,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        textAlign: 'center',
        position: 'relative'
      }}>
        {/* Event Logo */}
        {eventLogo && (
          <div style={{ marginBottom: '24px' }}>
            <img
              src={eventLogo}
              alt="Event Logo"
              style={{
                maxWidth: '250px',
                maxHeight: '120px',
                objectFit: 'contain'
              }}
            />
          </div>
        )}

        <div style={{ fontSize: '128px', marginBottom: '32px' }}>⚠</div>
        <h1 style={{
          fontSize: '48px',
          fontWeight: '700',
          color: 'white',
          marginBottom: '48px'
        }}>
          QR CODE NOT RECOGNIZED
        </h1>
        <button
          onClick={resetScanner}
          style={{
            background: 'white',
            color: colors.warning,
            padding: '16px 48px',
            borderRadius: '16px',
            border: 'none',
            fontSize: '24px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          Done
        </button>

        {/* Powered by Gifty Watermark */}
        {showPoweredBy && (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            padding: '8px 16px',
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            fontSize: '12px',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>Powered by</span>
            <span style={{ fontWeight: '700' }}>Gifty</span>
          </div>
        )}
      </div>
    )
  }

  // Camera error screen (with working Try Again button!)
  if (cameraError) {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bg,
        color: colors.text,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          background: colors.cardBg,
          padding: '16px',
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <button
            onClick={() => router.push(`/event/${params.eventId}`)}
            style={{
              background: 'transparent',
              border: 'none',
              color: colors.gold,
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ArrowLeft size={24} />
          </button>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '400', flex: 1 }}>
            Scanner
          </h2>
        </div>

        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center'
        }}>
          <Camera size={64} color={colors.textMuted} style={{ marginBottom: '24px' }} />
          <h3 style={{ fontSize: '20px', color: colors.text, marginBottom: '12px' }}>
            Camera Access Needed
          </h3>
          <p style={{
            fontSize: '15px',
            color: colors.textMuted,
            marginBottom: '32px',
            maxWidth: '400px',
            lineHeight: '1.5'
          }}>
            {cameraError}
          </p>
          <button
            onClick={() => {
              console.log('Try Again button clicked')
              setCameraError('')
              setScanning(false)
              startCamera()
            }}
            style={{
              background: colors.gold,
              color: colors.bg,
              border: 'none',
              padding: '14px 32px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Scanner interface
  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bg,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        background: colors.cardBg,
        padding: '16px',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <button
          onClick={() => router.push(`/event/${params.eventId}`)}
          style={{
            background: 'transparent',
            border: 'none',
            color: colors.gold,
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <ArrowLeft size={24} />
        </button>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '400', flex: 1 }}>
          Scanner
        </h2>
      </div>

      {/* Camera View or Start Button */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: scanning ? '0' : '24px',
        position: 'relative'
      }}>
        {!scanning ? (
          <div style={{ textAlign: 'center' }}>
            <Camera size={64} color={colors.gold} style={{ marginBottom: '24px' }} />
            <h3 style={{
              fontSize: '20px',
              color: colors.text,
              marginBottom: '32px'
            }}>
              {eventName}
            </h3>
            <button
              onClick={startCamera}
              style={{
                background: colors.gold,
                color: colors.bg,
                border: 'none',
                padding: '16px 32px',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Scan QR Code
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              style={{ display: 'none' }}
            />
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '250px',
              height: '250px',
              border: `3px solid ${colors.gold}`,
              borderRadius: '16px',
              pointerEvents: 'none'
            }} />
          </>
        )}
      </div>
    </div>
  )
}
