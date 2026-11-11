# 🐾 Paws & Pals PH | Beta v1.0

A standalone, production-ready web app designed for pet owners, shelters, and veterinarians in the Philippines.

## Key Features
- **Top Banner Badge**: `🐾 Paws & Pals PH | Beta v1.0` header with quick stats and English/Tagalog language switcher.
- **English / Tagalog Multi-Language Switcher**: Toggle EN/TL translations instantly across all features with state persistence.
- **Digital QR Pet ID Generator**: Create printable/downloadable pet ID badges with embedded QR codes containing medical notes and owner emergency contacts.
- **OCR Vaccine Tracker & Reminder Alarms**: Upload or capture vaccine card photos to automatically extract vaccination records using Tesseract.js OCR, track status (Up-to-date, Due Soon, Overdue), and set alarm countdown reminders.
- **Emergency Blood Donor SOS Feed**: Philippine emergency request feed filtering by blood type (DEA 1.1 / Cat A/B), location (QC, Manila, Cebu, Davao, etc.), and species, with direct call and SMS actions.

## Deployment to Vercel
This repository is configured for direct static deployment on Vercel:
1. Import this repository or directory in Vercel.
2. Build command: None required (Static HTML).
3. Output directory: `./`
4. Deploy!

## Local Preview
Run any static file server inside the `paws-and-pals-ph` directory:
```bash
npx serve .
# or
python3 -m http.server 8000
```
