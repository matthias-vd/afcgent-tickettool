# Ticketing

Inschrijvingen, QR-tickets, check-in aan de deur en CSV-export. Gebouwd voor één evenement per installatie.

## Starten

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) voor het inschrijfformulier.
Open [http://localhost:3000/admin/login](http://localhost:3000/admin/login) voor scanner, aanwezigheid en export.

Standaard wachtwoord voor de organisatie: `admin123` (zet dit om in `.env.local`).

## Wat het doet

- Publiek formulier: naam, e-mail, telefoon, CV (PDF), extra info, voedselvoorkeur
- Uniek ticket met QR-code na inschrijving
- Bevestigingsmail met dezelfde QR-code (als SMTP is ingesteld)
- Scanner aan de ingang registreert aanwezigheid
- Deelnemerslijst met handmatige check-in en CV-download
- CSV-export (Excel-vriendelijk, puntkomma + UTF-8 BOM)

## E-mail instellen

Zet in `.env.local` bijvoorbeeld Gmail (app-wachtwoord), Mailtrap of Resend SMTP:

```
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=resend
SMTP_PASS=re_xxxxxxxxx
SMTP_FROM="AFC Avond <tickets@jouwdomein.be>"
```

Zonder SMTP blijft inschrijven werken. Het ticket verschijnt op `/ticket/...`; de mail wordt overgeslagen.

`APP_URL` moet het publieke adres zijn, omdat de QR-code naar dat ticket linkt.

## Data

Lokale SQLite-database en CV’s staan in `data/` (niet in git).

```
data/tickets.db
data/uploads/*.pdf
```
