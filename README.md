# schichtplan-marcel

Dienstplan-Tool für ein Stationsteam: Mitarbeitende tragen pro Tag im Monat eine von vier Präferenzen ein (Möchte arbeiten / Kann arbeiten / Eher nicht / Kann nicht), der Admin-Bereich generiert daraus automatisch einen fairen Dienstplan (knappe Tage zuerst besetzt, danach Fairness-Ausgleich über die Gesamtschichtzahl) und erlaubt manuelle Nachjustierung.

Ursprünglich als Claude Artifact-Demo entstanden — dieses Repository macht daraus eine eigenständige Web-App mit echtem Backend, sodass sie auch für Personen ohne Claude-Konto nutzbar ist. Architektur-Hintergrund und Design-Entscheidungen: siehe den Plan in `michakos95-spec/claude` unter `plans/2026-09-08-dienstplan-netlify-backend.md`.

## Architektur

- **Frontend:** eine einzelne statische Seite (`public/index.html`), kein Build-Schritt nötig.
- **Backend:** kleine Netlify Functions (`netlify/functions/*.js`), jede für einen Datentyp (Team, Planungszeitraum, Wunsch-Einträge, Dienstplan, Login/Passwort, Demo-Reset).
- **Datenspeicher:** [Netlify Blobs](https://docs.netlify.com/blobs/overview/) — ein einfacher, in Netlify eingebauter Key-Value-Speicher. Kein separater Datenbank-Account nötig.
- **Live-Sync:** kein echtes Realtime — das Frontend lädt beim Öffnen und danach alle 25 Sekunden neu. Für einen monatlichen Dienstplan-Prozess ausreichend.
- **Admin-Zugriff:** ein gemeinsames Passwort (Default `marcel123`, im Admin-Bereich änderbar), serverseitig per Netlify Function geprüft — nicht im Browser-Code sichtbar. Kein Nutzerkonten-System; Mitarbeitende tragen ihre Wünsche ohne Login ein (informelles Team-Tool, keine hochsensiblen Daten).

## Lokal starten

```bash
npm install
npm run dev
```

Startet `netlify dev` (Netlify CLI) — simuliert Functions und Blobs lokal und öffnet die Seite im Browser.

## Deployen

1. Dieses Repository mit einem Netlify-Projekt verknüpfen ("Import from Git" im Netlify-Dashboard, oder `netlify link`, falls die Netlify-Seite schon existiert).
2. Im Netlify-Projekt unter **Site configuration → Environment variables** optional `ADMIN_PASSWORD_DEFAULT` setzen (Fallback-Passwort, falls noch kein Passwort in Blobs gespeichert ist — ohne diese Variable gilt `marcel123`).
3. Deploy anstoßen (passiert bei einem verknüpften Git-Repo automatisch bei jedem Push auf den Hauptbranch).

Netlify Blobs braucht keine extra Einrichtung — steht automatisch zur Verfügung, sobald die Seite über Netlify deployt ist.

## Demodaten aus dem Claude Artifact übernehmen

`scripts/migration-data.json` enthält den Team-/Wunsch-/Dienstplan-Stand aus der ursprünglichen
Claude-Artifact-Demo. Einmal nach dem ersten erfolgreichen Deploy ausführen:

```bash
node scripts/migrate-from-artifact.js https://schichtplan-marcel-test.netlify.app
```

Meldet sich mit dem Default-Passwort an (`marcel123`, oder per `ADMIN_PASSWORD=...` vorangestellt,
falls es schon geändert wurde) und überträgt Team, Planungszeitraum, alle Wunsch-Einträge und den
Dienstplan. Danach nicht mehr nötig.

## Datenmodell (Netlify Blobs, Store `dienstplan-station`)

| Key | Inhalt |
| --- | --- |
| `config/staff` | `{ people: [{id, name}], updatedAt }` |
| `config/state` | `{ planningMonth, windowOpen, windowStart, windowEnd, slotsPerDay, updatedAt }` |
| `config/security` | `{ adminPassword, updatedAt }` |
| `sessions/{token}` | `{ createdAt, expiresAt }` — Admin-Login-Sitzungen, 12 Stunden gültig |
| `months/{monat}/entries/{personId}` | `{ personId, name, prefs, updatedAt }` |
| `schedules/{monat}` | `{ assignments, stats, unfilled, slotsPerDay, generatedAt, finalized }` |

## API (Netlify Functions)

| Endpunkt | Methode | Auth | Zweck |
| --- | --- | --- | --- |
| `/.netlify/functions/staff` | GET | – | Team-Liste lesen |
| `/.netlify/functions/staff` | PUT | Admin | Team-Liste schreiben |
| `/.netlify/functions/state` | GET | – | Planungszeitraum lesen |
| `/.netlify/functions/state` | PUT | Admin | Planungszeitraum schreiben |
| `/.netlify/functions/entries?month=YYYY-MM` | GET | – | Alle Wunsch-Einträge eines Monats lesen |
| `/.netlify/functions/entries?month=YYYY-MM&personId=...` | PUT | – | Eigenen Wunsch-Eintrag schreiben |
| `/.netlify/functions/schedule?month=YYYY-MM` | GET | – | Dienstplan eines Monats lesen |
| `/.netlify/functions/schedule?month=YYYY-MM` | PUT | Admin | Dienstplan schreiben |
| `/.netlify/functions/auth-login` | POST | – | `{password}` → `{token, expiresAt}` |
| `/.netlify/functions/auth-change-password` | POST | Admin | `{newPassword}` |
| `/.netlify/functions/reset-demo` | POST | Admin | Setzt Team, Passwort und Beispiel-Wünsche zurück |

Admin-geschützte Endpunkte verlangen den Header `Authorization: Bearer <token>` aus `auth-login`.
