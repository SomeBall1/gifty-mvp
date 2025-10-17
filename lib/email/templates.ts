export interface EmailTemplateProps {
  guestName: string
  eventName: string
  eventDate: string
  qrCodeDataUrl: string
  tier: string
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
