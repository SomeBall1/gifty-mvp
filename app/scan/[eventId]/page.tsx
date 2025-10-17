'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Crown, CheckCircle2, Circle, Camera, ArrowLeft, Sparkles } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

export default function ScannerPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId;

  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [guestData, setGuestData] = useState<any>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Color palette
  const colors = {
    bg: '#0f0f0f',
    cardBg: '#1a1a1a',
    gold: '#c9a961',
    goldLight: '#d4af37',
    text: '#f5f5f0',
    textMuted: '#a8a8a0',
    success: '#4a7c59',
    successGlow: 'rgba(201, 169, 97, 0.15)',
    border: '#2a2a2a',
    purple: '#2d2640',
    richGrey: '#4a4a4a',
    softGrey: '#6a6a6a',
    greyGlow: 'rgba(106, 106, 106, 0.12)'
  };

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    try {
      const html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        onScanSuccess,
        onScanFailure
      );

      setScanning(true);
      setCameraError(null);
    } catch (err) {
      console.error("Camera error:", err);
      setCameraError("Unable to access camera. Please check permissions.");
    }
  };

  const stopScanner = () => {
    if (html5QrCodeRef.current && scanning) {
      html5QrCodeRef.current.stop().catch(err => console.error("Error stopping scanner:", err));
      setScanning(false);
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    stopScanner();

    try {
      const url = new URL(decodedText);
      const guestId = url.searchParams.get('guest_id');

      if (!guestId) {
        setScanResult('invalid');
        setTimeout(resetScanner, 3000);
        return;
      }

      const response = await fetch('/api/verify-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, guestId })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setScanResult('success');
        setGuestData(data.guest);
      } else if (data.error === 'already_claimed') {
        setScanResult('already-claimed');
        setGuestData(data.guest);
      } else {
        setScanResult('invalid');
      }

      setTimeout(resetScanner, 4000);
    } catch (error) {
      console.error('Scan error:', error);
      setScanResult('invalid');
      setTimeout(resetScanner, 3000);
    }
  };

  const onScanFailure = (error: any) => {
    // Silent - no need to show every scan attempt failure
  };

  const resetScanner = () => {
    setScanResult(null);
    setGuestData(null);
    startScanner();
  };

  const manualReset = () => {
    setScanResult(null);
    setGuestData(null);
    if (!scanning) {
      startScanner();
    }
  };

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
            onClick={() => router.push(`/event/${eventId}`)}
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
          <p style={{ fontSize: '15px', color: colors.textMuted, marginBottom: '32px', maxWidth: '320px' }}>
            {cameraError}
          </p>
          <button
            onClick={startScanner}
            style={{
              background: colors.gold,
              border: 'none',
              color: colors.bg,
              padding: '14px 32px',
              borderRadius: '12px',
              fontSize: '15px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: colors.bg,
      color: colors.text,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
          onClick={() => router.push(`/event/${eventId}`)}
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
          Scan Guest QR Code
        </h2>
      </div>

      {/* Scanner/Result Area */}
      {!scanResult ? (
        <div style={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          {/* Camera Preview */}
          <div style={{
            width: '100%',
            maxWidth: '400px',
            aspectRatio: '1',
            background: `linear-gradient(135deg, ${colors.cardBg} 0%, ${colors.purple} 100%)`,
            borderRadius: '24px',
            border: `2px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '32px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* QR Reader Container */}
            <div id="qr-reader" style={{ width: '100%', height: '100%' }}></div>

            {/* Scanning Corners */}
            <div style={{
              position: 'absolute',
              top: '40px',
              left: '40px',
              width: '40px',
              height: '40px',
              borderTop: `3px solid ${colors.gold}`,
              borderLeft: `3px solid ${colors.gold}`,
              borderRadius: '4px 0 0 0',
              pointerEvents: 'none'
            }} />
            <div style={{
              position: 'absolute',
              top: '40px',
              right: '40px',
              width: '40px',
              height: '40px',
              borderTop: `3px solid ${colors.gold}`,
              borderRight: `3px solid ${colors.gold}`,
              borderRadius: '0 4px 0 0',
              pointerEvents: 'none'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '40px',
              left: '40px',
              width: '40px',
              height: '40px',
              borderBottom: `3px solid ${colors.gold}`,
              borderLeft: `3px solid ${colors.gold}`,
              borderRadius: '0 0 0 4px',
              pointerEvents: 'none'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '40px',
              right: '40px',
              width: '40px',
              height: '40px',
              borderBottom: `3px solid ${colors.gold}`,
              borderRight: `3px solid ${colors.gold}`,
              borderRadius: '0 0 4px 0',
              pointerEvents: 'none'
            }} />
          </div>

          <p style={{ 
            fontSize: '15px',
            color: colors.textMuted,
            textAlign: 'center',
            marginBottom: '8px'
          }}>
            Position the QR code within the frame
          </p>
          <p style={{ 
            fontSize: '13px',
            color: colors.softGrey,
            textAlign: 'center'
          }}>
            Scanning automatically...
          </p>
        </div>
      ) : (
        // Scan Result
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: scanResult === 'success' 
            ? `linear-gradient(135deg, ${colors.bg} 0%, ${colors.success}20 100%)`
            : scanResult === 'already-claimed'
            ? `linear-gradient(135deg, ${colors.bg} 0%, ${colors.greyGlow} 100%)`
            : `linear-gradient(135deg, ${colors.bg} 0%, ${colors.purple}20 100%)`
        }}>
          {/* Success State */}
          {scanResult === 'success' && guestData && (
            <>
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: colors.successGlow,
                border: `3px solid ${colors.gold}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '32px',
                position: 'relative'
              }}>
                <CheckCircle2 size={64} color={colors.gold} />
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '-10px',
                  animation: 'sparkle 1.5s ease-in-out infinite'
                }}>
                  <Sparkles size={24} color={colors.goldLight} />
                </div>
              </div>

              <h3 style={{ 
                fontSize: '28px',
                fontWeight: '300',
                margin: '0 0 16px 0',
                color: colors.gold,
                letterSpacing: '1px'
              }}>Welcome</h3>
              
              <p style={{ 
                fontSize: '20px',
                color: colors.text,
                margin: '0 0 12px 0',
                fontWeight: '500'
              }}>{guestData.name}</p>
              
              {guestData.tier === 'VIP' && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: `${colors.gold}20`,
                  padding: '8px 20px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: colors.gold,
                  marginBottom: '32px',
                  letterSpacing: '0.5px'
                }}>
                  <Crown size={16} />
                  VIP GUEST
                </div>
              )}
              
              <div style={{
                background: colors.cardBg,
                border: `1px solid ${colors.gold}30`,
                borderRadius: '16px',
                padding: '20px',
                marginTop: '16px',
                textAlign: 'center',
                maxWidth: '320px'
              }}>
                <p style={{ 
                  fontSize: '15px',
                  color: colors.text,
                  margin: '0 0 8px 0',
                  fontWeight: '500'
                }}>✓ Goodie Bag Claimed</p>
                <p style={{ 
                  fontSize: '13px',
                  color: colors.textMuted,
                  margin: 0
                }}>Thank you for attending</p>
              </div>

              <button
                onClick={manualReset}
                style={{
                  marginTop: '48px',
                  background: colors.gold,
                  border: 'none',
                  color: colors.bg,
                  padding: '14px 40px',
                  borderRadius: '12px',
                  fontSize: '15px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  boxShadow: `0 4px 16px ${colors.gold}40`
                }}
              >
                Next Guest
              </button>
            </>
          )}

          {/* Already Claimed State - Rich Grey, Classy */}
          {scanResult === 'already-claimed' && guestData && (
            <>
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: colors.greyGlow,
                border: `3px solid ${colors.softGrey}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '32px'
              }}>
                <CheckCircle2 size={64} color={colors.softGrey} />
              </div>

              <h3 style={{ 
                fontSize: '24px',
                fontWeight: '300',
                margin: '0 0 16px 0',
                color: colors.softGrey,
                letterSpacing: '0.5px'
              }}>Already Checked In</h3>
              
              <p style={{ 
                fontSize: '18px',
                color: colors.text,
                margin: '0 0 12px 0',
                fontWeight: '500'
              }}>{guestData.name}</p>
              
              {guestData.tier === 'VIP' && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: `${colors.softGrey}20`,
                  padding: '6px 16px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: colors.softGrey,
                  marginBottom: '24px'
                }}>
                  <Crown size={14} />
                  VIP
                </div>
              )}

              <div style={{
                background: colors.cardBg,
                border: `1px solid ${colors.border}`,
                borderRadius: '16px',
                padding: '20px',
                marginTop: '16px',
                textAlign: 'center',
                maxWidth: '320px'
              }}>
                <p style={{ 
                  fontSize: '14px',
                  color: colors.textMuted,
                  margin: '0 0 8px 0'
                }}>Goodie bag collected earlier</p>
                {guestData.claimed_at && (
                  <p style={{ 
                    fontSize: '13px',
                    color: colors.softGrey,
                    margin: 0
                  }}>
                    at {new Date(guestData.claimed_at).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </p>
                )}
              </div>

              <button
                onClick={manualReset}
                style={{
                  marginTop: '48px',
                  background: colors.cardBg,
                  border: `1px solid ${colors.softGrey}`,
                  color: colors.softGrey,
                  padding: '14px 40px',
                  borderRadius: '12px',
                  fontSize: '15px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Next Guest
              </button>
            </>
          )}

          {/* Invalid State - Still Classy */}
          {scanResult === 'invalid' && (
            <>
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: colors.greyGlow,
                border: `3px solid ${colors.richGrey}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '32px'
              }}>
                <Circle size={64} color={colors.richGrey} />
              </div>

              <h3 style={{ 
                fontSize: '24px',
                fontWeight: '300',
                margin: '0 0 16px 0',
                color: colors.richGrey
              }}>QR Code Not Recognized</h3>
              
              <p style={{ 
                fontSize: '14px',
                color: colors.textMuted,
                textAlign: 'center',
                maxWidth: '280px',
                lineHeight: '1.6'
              }}>
                This code may not be for this event. Please check with event staff.
              </p>

              <button
                onClick={manualReset}
                style={{
                  marginTop: '48px',
                  background: colors.cardBg,
                  border: `1px solid ${colors.richGrey}`,
                  color: colors.text,
                  padding: '14px 40px',
                  borderRadius: '12px',
                  fontSize: '15px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Try Again
              </button>
            </>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes sparkle {
          0%, 100% { opacity: 1; transform: scale(1) rotate(0deg); }
          50% { opacity: 0.6; transform: scale(1.1) rotate(180deg); }
        }

        #qr-reader video {
          border-radius: 20px;
          object-fit: cover;
        }

        #qr-reader__dashboard {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
