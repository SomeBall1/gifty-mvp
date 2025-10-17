'use client'

import { useState, useEffect, useRef } from 'react'
import jsQR from 'jsqr'
import { createClient  } from '@/lib/supabase-client'

interface ScanResult {
  type: 'success' | 'already_claimed' | 'invalid'
  name?: string
  tier?: string
}

export default function ScannerPage({ params }: { params: { eventId: string } }) {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [eventName, setEventName] = useState<string>('')
  const [hasPin, setHasPin] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanningRef = useRef(false)

  const supabase = createClient ()

  useEffect(() => {
    fetchEventInfo()
    return () => {
      stopCamera()
    }
  }, [])

  const fetchEventInfo = async () => {
    const { data: event } = await supabase
      .from('events')
      .select('name, scanner_pin')
      .eq('id', params.eventId)
      .single()

    if (event) {
      setEventName(event.name)
      setHasPin(!!event.scanner_pin)
      if (!event.scanner_pin) {
        setIsAuthenticated(true)
      }
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
      .then(({ data }) => {
        if (data && data.scanner_pin === pinInput) {
          setIsAuthenticated(true)
        } else {
          setPinError('Incorrect PIN')
        }
      })
  }

  const startScanning = async () => {
    setScanning(true)
    setError('')

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
      
      videoRef.current.onloadedmetadata = () => {
        if (videoRef.current) {
          videoRef.current.play()
            .then(() => {
              scanningRef.current = true
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
          return
        }
      }
    }

    requestAnimationFrame(tick)
  }

  const handleQRCode = async (data: string) => {
    stopCamera()
    
    try {
      const url = new URL(data)
      const guestId = url.searchParams.get('guest_id')
      
      if (!guestId) {
        setResult({ type: 'invalid' })
        return
      }

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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-xl font-medium">Loading scanner...</div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated && hasPin) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-8">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {eventName}
            </h1>
            <p className="text-gray-600">Scanner Access</p>
          </div>
          
          <form onSubmit={(e) => { e.preventDefault(); verifyPin(); }}>
            <div className="mb-6">
              <label htmlFor="pin" className="block text-sm font-semibold text-gray-700 mb-3">
                Enter Scanner PIN
              </label>
              <input
                id="pin"
                type="text"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value)
                  setPinError('')
                }}
                className="w-full px-4 py-4 text-center text-2xl font-mono border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-gray-900 focus:ring-opacity-20 focus:border-gray-900 outline-none transition-all"
                placeholder="••••"
                autoFocus
              />
              {pinError && (
                <div className="mt-3 text-red-600 text-sm font-medium flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {pinError}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-gray-900 text-white px-6 py-4 rounded-xl font-semibold hover:bg-gray-800 transition-all hover:shadow-lg active:scale-95"
            >
              Unlock Scanner
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Success screen with animation
  if (result?.type === 'success') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-green-500 via-green-600 to-emerald-600 flex flex-col items-center justify-center p-8 animate-fadeIn">
        <div className="text-center animate-scaleIn">
          {/* Animated checkmark */}
          <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl animate-bounce-once">
            <svg className="w-20 h-20 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h1 className="text-6xl font-bold text-white mb-4 drop-shadow-lg">{result.name}</h1>
          <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl px-8 py-4 inline-block mb-8">
            <p className="text-3xl font-semibold text-white">{result.tier}</p>
          </div>
          <p className="text-2xl text-white font-medium mb-12 opacity-90">✓ Goodie Bag Approved</p>
        </div>
        
        <button
          onClick={resetScanner}
          className="bg-white text-green-600 px-12 py-5 rounded-2xl text-2xl font-bold hover:bg-green-50 transition-all shadow-2xl hover:shadow-3xl hover:scale-105 active:scale-95"
        >
          Scan Next Guest
        </button>
      </div>
    )
  }

  // Already claimed screen
  if (result?.type === 'already_claimed') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-red-500 via-red-600 to-rose-600 flex flex-col items-center justify-center p-8 animate-fadeIn">
        <div className="text-center animate-shake">
          {/* Animated X */}
          <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl">
            <svg className="w-20 h-20 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          
          <h1 className="text-6xl font-bold text-white mb-4 drop-shadow-lg">{result.name}</h1>
          <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl px-8 py-4 inline-block mb-8">
            <p className="text-3xl font-semibold text-white">{result.tier}</p>
          </div>
          <p className="text-3xl text-white font-bold mb-12">ALREADY CLAIMED</p>
        </div>
        
        <button
          onClick={resetScanner}
          className="bg-white text-red-600 px-12 py-5 rounded-2xl text-2xl font-bold hover:bg-red-50 transition-all shadow-2xl hover:shadow-3xl hover:scale-105 active:scale-95"
        >
          Scan Next Guest
        </button>
      </div>
    )
  }

  // Invalid code screen
  if (result?.type === 'invalid') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 flex flex-col items-center justify-center p-8 animate-fadeIn">
        <div className="text-center animate-shake">
          {/* Warning icon */}
          <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl">
            <svg className="w-20 h-20 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h1 className="text-6xl font-bold text-white mb-8 drop-shadow-lg">INVALID CODE</h1>
          <p className="text-2xl text-white font-medium mb-12 opacity-90">This QR code is not recognized</p>
        </div>
        
        <button
          onClick={resetScanner}
          className="bg-white text-orange-600 px-12 py-5 rounded-2xl text-2xl font-bold hover:bg-orange-50 transition-all shadow-2xl hover:shadow-3xl hover:scale-105 active:scale-95"
        >
          Scan Next Guest
        </button>
      </div>
    )
  }

  // Scanner interface
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-6 text-center border-b border-gray-700 shadow-lg">
        <h1 className="text-3xl font-bold text-white tracking-tight">{eventName || 'Goodie Bag Scanner'}</h1>
        {eventName && (
          <p className="text-gray-400 text-sm mt-2 font-medium">Ready to scan</p>
        )}
      </div>

      {/* Camera View or Start Button */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {!scanning ? (
          <div className="text-center animate-fadeIn">
            <div className="w-32 h-32 bg-gradient-to-br from-gray-700 to-gray-800 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Scan</h2>
            <p className="text-gray-400 mb-8 text-lg max-w-md mx-auto">
              Point your camera at the guest's QR code to verify their goodie bag
            </p>
            
            <button
              onClick={startScanning}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-10 py-5 rounded-2xl text-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all shadow-2xl hover:shadow-green-500/50 hover:scale-105 active:scale-95"
            >
              <span className="flex items-center">
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Start Camera
              </span>
            </button>

            {error && (
              <div className="mt-6 bg-red-500 bg-opacity-20 border border-red-500 rounded-xl p-4 max-w-md mx-auto">
                <p className="text-red-200 font-medium">{error}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full max-w-2xl">
            {/* Camera preview */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-gray-700 bg-black">
              <video
                ref={videoRef}
                className="w-full h-auto"
                playsInline
              />
              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 border-4 border-green-400 rounded-2xl animate-pulse shadow-lg shadow-green-400/50"></div>
              </div>
              {/* Scanning indicator */}
              <div className="absolute top-4 left-4 right-4">
                <div className="bg-green-500 bg-opacity-90 backdrop-blur-sm rounded-xl px-4 py-3 flex items-center justify-center shadow-lg">
                  <div className="w-3 h-3 bg-white rounded-full animate-ping mr-3"></div>
                  <span className="text-white font-semibold">Scanning for QR codes...</span>
                </div>
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}
      </div>

      {/* Instructions */}
      {scanning && (
        <div className="p-6 bg-gray-800 bg-opacity-50 backdrop-blur-sm border-t border-gray-700">
          <p className="text-center text-gray-300 text-sm">
            <span className="font-semibold">Tip:</span> Hold the QR code steady within the frame
          </p>
        </div>
      )}
    </div>
  )
}
