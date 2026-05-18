# UNICROSS Candidate Registration Platform — Project Context

## What this is
A candidate-facing registration portal for UNICROSS (University of Cross River State).
Prospective students use this to purchase an E-pin, upload their documents, and submit
their application for screening.

This is a SEPARATE app from the admin screening portal.

## Tech Stack
- Plain HTML5 + CSS3
- Bootstrap 5 (CDN — no npm)
- Vanilla JavaScript (no frameworks)
- Credo payment gateway for online payments

## Branding
- University: University of Cross River State (UNICROSS)
- Primary color (dark navy): #1a2332
- Secondary color (blue): #1e73be
- Accent/success: #28a745
- Danger/error: #dc3545
- Warning: #ffc107
- Font: Use Bootstrap default (system font stack)
- Logo text: "UNICROSS" bold + "PORTAL" light weight, same style as screening portal

## Pages to Build (in order)

### 1. index.html — Homepage
Two-option landing page + registration instructions.
- University header with logo/wordmark and name
- Hero section: "2025/2026 Post-UTME Screening Registration"
- TWO CARDS side by side:
  Card A (Fresh Candidate): Enter JAMB reg number → click "Proceed to Purchase E-Pin"
  Card B (Returning Candidate / Has E-Pin): Enter JAMB reg number + E-Pin → click "Login"
- Registration Instructions section below cards (step-by-step numbered list)
- Footer with university name

### 2. verify.html — Candidate Info & Contact Update
Shown after JAMB number is verified for fresh candidates.
- Displays candidate's info pulled from JAMB (name, DOB, faculty, department, programme)
- Form to update: Email Address, Phone Number (required before proceeding)
- "Proceed to Payment" button

### 3. payment.html — E-Pin Payment Page
- Shows candidate's name and JAMB reg number
- Shows pin cost (e.g. ₦2,000 — amount from backend)
- "Pay Now" button → triggers Credo payment gateway
- Note: Credo inline JS or redirect integration

### 4. success.html — Payment Success
- Green success banner
- Shows generated E-Pin prominently (large, bold, copyable)
- Shows candidate details (name, JAMB reg no)
- Instruction: "Save your E-Pin. You will need it to login and complete registration."
- Button: "Continue to Upload Documents"

### 5. failed.html — Payment Failed
- Red error banner
- "Your payment was not successful"
- Shows transaction reference
- "Try Again" button → back to payment page
- "Contact Support" link

### 6. register.html — Document Upload & Submission
Shown after candidate logs in with E-Pin + JAMB reg number.
- Shows candidate's details at top (read-only)
- Upload fields:
  - Passport Photo (image only, max 200KB)
  - WAEC/NECO Result (image or PDF, max 2MB)
  - JAMB Result Slip (image or PDF, max 2MB)
- File preview for passport photo (show thumbnail after selection)
- Submit Application button
- Warning: "Once submitted, you cannot make further changes"
- Confirmation modal before final submit

### 7. submitted.html — Application Locked
- Success state page
- "Application Submitted Successfully"
- Shows submitted details summary
- "Your application is under review. Check back after screening is activated."
- No edit options

## File Structure
```
unicross-registration/
├── index.html
├── verify.html
├── payment.html
├── success.html
├── failed.html
├── register.html
├── submitted.html
├── css/
│   └── style.css        (custom styles on top of Bootstrap)
└── js/
    └── main.js          (shared JS utilities, sessionStorage helpers)
```

## Data Flow (sessionStorage between pages)
- After JAMB verification: store candidate object in sessionStorage
- After payment: store e-pin + transaction ref in sessionStorage
- After login: store candidate + auth token in sessionStorage
- On register.html load: read from sessionStorage, display candidate info

## Key Rules
- Bootstrap 5 via CDN only — no npm, no build tools
- All pages share the same header/footer style
- Mobile-responsive (Bootstrap grid)
- Nigerian Naira symbol: ₦
- No inline styles — use Bootstrap classes + custom CSS file
- sessionStorage for passing data between pages (not localStorage)
- Every form has basic validation before submission
- Credo payment: use their inline JS SDK (script tag from CDN)
  Docs: https://docs.getcredo.com
  On payment success → redirect to success.html
  On payment failure → redirect to failed.html

## Colors as CSS Variables (in style.css)
```css
:root {
  --unicross-navy: #1a2332;
  --unicross-blue: #1e73be;
}
```