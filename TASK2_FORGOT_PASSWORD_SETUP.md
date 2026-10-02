# Task 2 — Forgot Password

Implemented a real forgot-password flow using a registered email address or phone number.

## What is included

- Dedicated frontend route: `/forgot-password`
- Login page links to the new forgot-password page
- Backend endpoint: `POST /password/forgot`
- Email or phone identifier is detected automatically
- A cryptographically random 12-character temporary password is generated
- Generated password contains only `A-Z` and `a-z`
- One successful reset request per account per calendar day
- A second request returns HTTP 429 with:
  `You can use this option only one time per day.`
- Email delivery through SMTP/Nodemailer
- SMS delivery through Twilio REST API
- Password is stored only as a bcrypt hash
- Password-reset request records are stored in MongoDB
- Reset request records expire automatically after 48 hours
- Phone numbers are stored on users for phone-based recovery
- Public user listing no longer exposes phone numbers or reset metadata

## Environment variables

Add these to `server/.env` as needed:

```env
# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM=your-email@gmail.com

# SMS (Twilio)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

# Calendar-day boundary for the daily reset limit
RESET_RATE_LIMIT_TIMEZONE=Asia/Kolkata
```

For Gmail, use a Google App Password rather than your normal Google account password.

For phone recovery, the stored phone number should be in a format accepted by the SMS provider (prefer E.164, for example `+919876543210`).

## Testing

1. Run the backend and frontend.
2. Create a new account with a real email and phone number, or use an existing account's email.
3. Open `/forgot-password`.
4. Enter the registered email or phone.
5. Verify the temporary password arrives through the selected channel.
6. Try the same account again on the same day; the API should return the required one-per-day warning.
7. Log in with the temporary password.

No password is returned by the API response.
