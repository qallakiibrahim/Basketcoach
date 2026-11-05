# Basketcoach Pro 🏀

En modern webbapplikation för basketcoacher, byggd med React, Vite, Firebase och Google Gemini AI.

## Funktioner

*   **Laghantering:** Spelarprofiler, närvaro och färdighetsbedömning (Radargraf).
*   **Säsongsplanering:** 8-faser utvecklingsplan baserad på SBBF:s principer.
*   **Live Träning:** Digitalt clipboard för att betygsätta övningar i realtid.
*   **Matchanalys:** Shot charts, taktik-whiteboard och SISU-bedömning.
*   **AI Coach:** Integrerad AI-assistent (Gemini) för videoanalys och coach-sparring.
*   **Spelarportal:** Gamification-system för spelare med XP och uppdrag.

## Installation

1.  Klona repot:
    ```bash
    git clone https://github.com/ditt-anvandarnamn/basketcoach-pro.git
    cd basketcoach-pro
    ```

2.  Installera beroenden:
    ```bash
    npm install
    ```

3.  Konfigurera miljövariabler:
    Skapa en fil som heter `.env` i roten av projektet och fyll i dina nycklar:

    ```env
    API_KEY=din_google_gemini_api_key
    
    VITE_FIREBASE_API_KEY=din_firebase_api_key
    VITE_FIREBASE_AUTH_DOMAIN=ditt-projekt.firebaseapp.com
    VITE_FIREBASE_PROJECT_ID=ditt-projekt-id
    VITE_FIREBASE_STORAGE_BUCKET=ditt-projekt.firebasestorage.app
    VITE_FIREBASE_MESSAGING_SENDER_ID=din_sender_id
    VITE_FIREBASE_APP_ID=din_app_id
    VITE_FIREBASE_MEASUREMENT_ID=din_measurement_id
    ```

4.  Starta utvecklingsservern:
    ```bash
    npm run dev
    ```

## Publicering (Vercel)

Detta projekt är optimerat för Vercel.

1.  Ladda upp till GitHub.
2.  Importera projektet i Vercel.
3.  Kopiera in alla variabler från `.env` till "Environment Variables" i Vercel-inställningarna.
4.  Deploy!

## Teknisk Stack

*   **Frontend:** React 19, TypeScript, Tailwind CSS
*   **Build Tool:** Vite
*   **Backend/Auth:** Firebase (Firestore, Auth)
*   **AI:** Google Gemini API (Multimodal: Text, Vision, Audio)
*   **Ikoner:** Lucide React
