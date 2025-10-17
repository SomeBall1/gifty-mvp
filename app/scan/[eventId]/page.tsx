'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-client'
import jsQR from 'jsqr'

type ScanResult = {
  type: 'success' | 'already_claimed' | 'invalid'
  name?: string
  tier?: string
}

export default function ScannerPage({ params }: { params: { eventId: string } }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [eventName, setEventName] = useState('')
  const [loading, setLoading] = useState(true)
  const [hasPin, setHasPin] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState('')
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

  // Initialize camera when scanning becomes true
  useEffect(() => {
    if (scanning && videoRef.current && !streamRef.current) {
      initCamera()
    }
  }, [scanning])

  const checkEventPin = async () => {
    const { data: event, error } = await supabase
      .from('events')
      .select('name, scanner_pin')
      .eq('id', params.eventId)
      .single()

    if (error || !event) {
      setError('Event not found')
      setLoading(false)
      return
    }

    setEventName(event.name)
    
    // If no PIN is set, allow access
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

  const startCamera = () => {
    setError('')
    setResult(null)
    setScanning(true) // This triggers the useEffect that initializes the camera
  }

  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      
      if (!videoRef.current) {
        setError('Camera initialization failed')
        setScanning(false)
        return
      }
      
      videoRef.current.srcObject = stream
      streamRef.current = stream
      
      // Wait for video to be ready and play
      videoRef.current.onloadedmetadata = () => {
        if (videoRef.current) {
          videoRef.current.play()
            .then(() => {
              console.log('Video playing successfully')
              scanningRef.current = true
              // Start the scanning loop
              setTimeout(() => {
                requestAnimationFrame(tick)
              }, 100)
            })
            .catch(err => {
              console.error('Play failed:', err)
              setError('Failed to start camera preview')
              stopCamera()
            })
        }
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err)
      const errorMsg = err.name === 'NotAllowedError' 
        ? 'Camera permission denied. Please allow camera access.'
        : err.name === 'NotFoundError'
        ? 'No camera found on this device.'
        : `Camera error: ${err.message}`
      setError(errorMsg)
      setScanning(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
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
          handleQRCode(code.data)
          return // Stop scanning after finding a code
        }
      }
    }

    requestAnimationFrame(tick)
  }

  const handleQRCode = async (data: string) => {
    stopCamera()
    
    try {
      // Extract guest_id from the URL
      const url = new URL(data)
      const guestId = url.searchParams.get('guest_id')
      
      if (!guestId) {
        setResult({ type: 'invalid' })
        return
      }

      // Call verification API
      const response = await fetch('/api/verify-guest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ guestId }),
      })

      const responseData = await response.json()

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
        setResult({ type: 'invalid' })
      }
    } catch (err) {
      console.error('Error processing QR code:', err)
      setResult({ type: 'invalid' })
    }
  }

  const resetScanner = () => {
    setResult(null)
    setError('')
  }

  // Loading screen
  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  // PIN entry screen
  if (!isAuthenticated && hasPin) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex flex-col items-center justify-center p-8">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            {eventName}
          </h1>
          <p className="text-gray-600 text-center mb-6">Scanner Access</p>
          
          <form onSubmit={(e) => { e.preventDefault(); verifyPin(); }}>
            <div className="mb-6">
              <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
                Enter Scanner PIN
              </label>
              <input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-center text-2xl tracking-widest"
                placeholder="••••"
                autoFocus
                maxLength={10}
              />
              {pinError && (
                <p className="mt-2 text-red-600 text-sm text-center">{pinError}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
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
      <div className="fixed inset-0 bg-green-500 flex flex-col items-center justify-center p-8">
        <div className="text-center">
          <div className="text-8xl mb-8">✓</div>
          <h1 className="text-6xl font-bold text-white mb-4">{result.name}</h1>
          <p className="text-4xl font-semibold text-white">{result.tier} Bag</p>
        </div>
        <button
          onClick={resetScanner}
          className="mt-12 bg-white text-green-600 px-12 py-4 rounded-2xl text-2xl font-bold hover:bg-green-50 transition-colors"
        >
          Scan Next
        </button>
      </div>
    )
  }

  if (result?.type === 'already_claimed') {
    return (
      <div className="fixed inset-0 bg-red-500 flex flex-col items-center justify-center p-8">
        <div className="text-center">
          <div className="text-8xl mb-8">✕</div>
          <h1 className="text-6xl font-bold text-white mb-4">{result.name}</h1>
          <p className="text-4xl font-semibold text-white">ALREADY CLAIMED</p>
        </div>
        <button
          onClick={resetScanner}
          className="mt-12 bg-white text-red-600 px-12 py-4 rounded-2xl text-2xl font-bold hover:bg-red-50 transition-colors"
        >
          Scan Next
        </button>
      </div>
    )
  }

  if (result?.type === 'invalid') {
    return (
      <div className="fixed inset-0 bg-orange-500 flex flex-col items-center justify-center p-8">
        <div className="text-center">
          <div className="text-8xl mb-8">⚠</div>
          <h1 className="text-6xl font-bold text-white">INVALID CODE</h1>
        </div>
        <button
          onClick={resetScanner}
          className="mt-12 bg-white text-orange-600 px-12 py-4 rounded-2xl text-2xl font-bold hover:bg-orange-50 transition-colors"
        >
          Scan Next
        </button>
      </div>
    )
  }

  // Scanner interface
  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 p-6 text-center">
        <h1 className="text-2xl font-bold text-white">{eventName || 'Goodie Bag Scanner'}</h1>
        {eventName && (
          <p className="text-gray-400 text-sm mt-1">Scanner Active</p>
        )}
      </div>

      {/* Camera View or Start Button */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {!scanning ? (
          <div className="text-center">
            <button
              onClick={startCamera}
              className="bg-green-600 text-white px-16 py-8 rounded-3xl text-3xl font-bold hover:bg-green-700 transition-colors shadow-2xl"
            >
              SCAN GUEST
            </button>
            {error && (
              <p className="mt-6 text-red-400 text-lg">{error}</p>
            )}
          </div>
        ) : (
          <div className="w-full max-w-2xl">
            <div className="relative aspect-square bg-black rounded-3xl overflow-hidden shadow-2xl">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />
              <canvas
                ref={canvasRef}
                className="hidden"
              />
              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 border-4 border-green-500 rounded-3xl animate-pulse"></div>
              </div>
            </div>
            <div className="mt-6 text-center">
              <p className="text-white text-xl mb-4">Position QR code within the frame</p>
              <button
                onClick={stopCamera}
                className="bg-red-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-red-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
