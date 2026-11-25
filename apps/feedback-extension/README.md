# Trail Feedback (Chrome extension)

Persoonlijke extensie: commentaar op elke browser-tab, gestructureerd als preview-feedback naar Trail.

## Setup (lokaal)

1. Start Trail: `vp run dev` (of `npm run dev`).
2. Open **één keer** de Trail-app in **Chrome** op localhost (pairing-URL uit de terminal). Alleen de Electron-desktop-app is niet genoeg: die sessie zit niet in Chrome.
3. In de extensie-popup: zet **Debug-log** aan als projecten/threads leeg blijven. Je ziet dan welke poort/token wordt geprobeerd en wat de API antwoordt.
4. Bouwen en laden:

   ```sh
   cd apps/feedback-extension
   npm install
   npm run build   # esbuild IIFE voor content.js (geen export in de pagina)
   ```

5. `chrome://extensions` → **Load unpacked** → `apps/feedback-extension/dist`.
6. Popup: kies bestemming (thread / issue), **Opslaan & HUD aan**. Optioneel: vaste **Trail-URL** als je meerdere worktree-poorten hebt.

## Gebruik

1. Open de pagina die je wilt reviewen.
2. **Comment** → element kiezen → notitie. Herhaal desgewenst.
3. **Send to Trail** → batch gaat naar de gekozen bestemming.

## Fouten

| Melding | Actie |
|--------|--------|
| Geen Trail op localhost | Dev-server starten, extensie reloaden. |
| Geen sessie | Pairing in **Chrome** op localhost, niet alleen desktop. |
| Lege project/thread-lijsten | Debug-log: `Context OK` met `projects:0` → verkeerde/leeg DB; geen `Context OK` → sessie of poort. Bij «thread»: filter «Alle projecten». |
| Service worker status 3 | `npm run build` opnieuw, extensie **Reload**. |

Poorten: web `5733` en server `13773`, elk + offset (worktrees). Zet bij twijfel de exacte pairing-URL onder **Trail-URL**.

## API

`POST /api/trail/feedback/submit`, `GET /api/trail/feedback/context` — zie `packages/trail-contracts`.