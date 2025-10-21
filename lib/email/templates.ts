export interface EmailTemplateProps {
  guestName: string
  eventName: string
  eventDate: string
  qrCodeDataUrl: string
  tier: string
}

export interface RSVPEmailTemplateProps {
  guestName: string
  eventName: string
  eventDate: string
  eventLocation?: string
  tier: string
  rsvpYesUrl: string
  rsvpNoUrl: string
}

export const qrInvitationTemplate = ({
  guestName,
  eventName,
  eventDate,
  qrCodeDataUrl,
  tier
}: EmailTemplateProps) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Exclusive Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1f2937 0%, #111827 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                You're Invited
              </h1>
              <p style="margin: 10px 0 0; color: #d1d5db; font-size: 16px;">
                An Exclusive Experience Awaits
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 40px 40px 20px;">
              <p style="margin: 0; color: #111827; font-size: 18px; line-height: 1.6;">
                Dear <strong>${guestName}</strong>,
              </p>
            </td>
          </tr>

          <!-- Event Details -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                We're delighted to invite you to:
              </p>
              <div style="background-color: #f9fafb; border-left: 4px solid #1f2937; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="margin: 0 0 10px; color: #111827; font-size: 22px; font-weight: 600;">
                  ${eventName}
                </h2>
                <p style="margin: 0; color: #6b7280; font-size: 16px;">
                  📅 ${eventDate}
                </p>
                ${tier !== 'Standard' ? `
                <p style="margin: 10px 0 0; color: #059669; font-size: 14px; font-weight: 600;">
                  🎁 ${tier} Guest
                </p>
                ` : ''}
              </div>
            </td>
          </tr>

          <!-- QR Code -->
          <tr>
            <td style="padding: 0 40px 30px; text-align: center;">
              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Please present this QR code at the event exit to receive your exclusive goodie bag:
              </p>
              <div style="background-color: #ffffff; padding: 30px; border-radius: 12px; border: 2px solid #e5e7eb; display: inline-block;">
                <img src="${qrCodeDataUrl}" alt="Your QR Code" style="width: 280px; height: 280px; display: block; margin: 0 auto;" />
              </div>
              <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px;">
                Save this email or take a screenshot for easy access
              </p>
            </td>
          </tr>

          <!-- Instructions -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px;">
                <p style="margin: 0 0 10px; color: #1e40af; font-size: 15px; font-weight: 600;">
                  📱 How it works:
                </p>
                <ul style="margin: 10px 0 0; padding-left: 20px; color: #1e3a8a; font-size: 14px; line-height: 1.8;">
                  <li>Present this QR code on your phone at the event exit</li>
                  <li>Our team will scan it instantly</li>
                  <li>Receive your exclusive goodie bag</li>
                  <li>Each code can only be used once</li>
                </ul>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; text-align: center;">
                We look forward to seeing you at the event!
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                This is an automated message. Please do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

export const rsvpInvitationTemplate = ({
  guestName,
  eventName,
  eventDate,
  eventLocation,
  tier,
  rsvpYesUrl,
  rsvpNoUrl
}: RSVPEmailTemplateProps) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RSVP - ${eventName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f0f0f;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #1a1a1a; border-radius: 16px; overflow: hidden; border: 1px solid #2a2a2a;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%); padding: 40px 40px 30px; text-align: center; border-bottom: 2px solid #c9a961;">
              <h1 style="margin: 0; color: #c9a961; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                You're Invited
              </h1>
              <p style="margin: 10px 0 0; color: #a8a8a0; font-size: 16px;">
                An Exclusive VIP Experience Awaits
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 40px 40px 20px;">
              <p style="margin: 0; color: #f5f5f0; font-size: 18px; line-height: 1.6;">
                Dear <strong style="color: #c9a961;">${guestName}</strong>,
              </p>
            </td>
          </tr>

          <!-- Event Details -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <p style="margin: 0 0 20px; color: #a8a8a0; font-size: 16px; line-height: 1.6;">
                We're delighted to invite you to an exclusive event:
              </p>
              <div style="background-color: #0f0f0f; border-left: 4px solid #c9a961; padding: 24px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="margin: 0 0 12px; color: #f5f5f0; font-size: 24px; font-weight: 600;">
                  ${eventName}
                </h2>
                <p style="margin: 0 0 8px; color: #a8a8a0; font-size: 16px;">
                  📅 ${eventDate}
                </p>
                ${eventLocation ? `
                <p style="margin: 0 0 8px; color: #a8a8a0; font-size: 16px;">
                  📍 ${eventLocation}
                </p>
                ` : ''}
                ${tier.toLowerCase() === 'vip' ? `
                <div style="margin-top: 16px; padding: 12px; background-color: #1a1a1a; border-radius: 6px; border: 1px solid #c9a961;">
                  <p style="margin: 0; color: #c9a961; font-size: 15px; font-weight: 600; text-align: center;">
                    👑 VIP Guest
                  </p>
                </div>
                ` : tier !== 'Standard' ? `
                <p style="margin: 12px 0 0; color: #c9a961; font-size: 15px; font-weight: 600;">
                  🎁 ${tier} Guest
                </p>
                ` : ''}
              </div>
            </td>
          </tr>

          <!-- RSVP Prompt -->
          <tr>
            <td style="padding: 0 40px 20px;">
              <p style="margin: 0; color: #f5f5f0; font-size: 16px; font-weight: 600; text-align: center;">
                Will you be joining us?
              </p>
            </td>
          </tr>

          <!-- RSVP Buttons -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding-right: 10px; width: 50%;">
                    <a href="${rsvpYesUrl}" style="display: block; background-color: #c9a961; color: #0f0f0f; text-decoration: none; padding: 16px 24px; border-radius: 8px; text-align: center; font-weight: 700; font-size: 16px; transition: all 0.3s;">
                      ✓ Yes, I'll Attend
                    </a>
                  </td>
                  <td style="padding-left: 10px; width: 50%;">
                    <a href="${rsvpNoUrl}" style="display: block; background-color: transparent; color: #a8a8a0; text-decoration: none; padding: 16px 24px; border-radius: 8px; border: 2px solid #2a2a2a; text-align: center; font-weight: 600; font-size: 16px; transition: all 0.3s;">
                      ✗ Can't Make It
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Instructions -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <div style="background-color: #0f0f0f; border-radius: 8px; padding: 20px; border: 1px solid #2a2a2a;">
                <p style="margin: 0 0 10px; color: #c9a961; font-size: 15px; font-weight: 600;">
                  📋 What happens next:
                </p>
                <ul style="margin: 10px 0 0; padding-left: 20px; color: #a8a8a0; font-size: 14px; line-height: 1.8;">
                  <li>Click one of the buttons above to confirm your attendance</li>
                  <li>You'll receive your exclusive QR code invitation via email</li>
                  <li>Present the QR code at the event to collect your VIP goodie bag</li>
                  <li>Each code can only be used once</li>
                </ul>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #0f0f0f; border-top: 1px solid #2a2a2a;">
              <p style="margin: 0 0 10px; color: #a8a8a0; font-size: 14px; text-align: center;">
                We look forward to seeing you at the event!
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
                This is an automated message. Please do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

