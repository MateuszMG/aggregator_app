# Zadanie Rekrutacyjne: System Agregacji Danych i Raportowania Miesięcznego

## Cel Zadania

Twoim zadaniem jest zbudowanie systemu do przetwarzania wsadowego (batch processing), który na żądanie agreguje dane o zleceniach serwisowych z bazy danych i generuje na ich podstawie miesięczne raporty statystyczne.

Pokaż, że potrafisz projektować i implementować procesy agregacji danych, efektywnie odpytywać bazę danych oraz budować skalowalne aplikacje w ekosystemie TypeScript przy użyciu Dockera.

## Opis Architektury

Zaprojektuj system składający się z kilku niezależnych serwisów. Proces generowania raportu inicjuj dedykowanym endpointem w API.

**Schemat przepływu danych:**

`Użytkownik` ➡️ `Aplikacja API (inicjator)` ➡️ `Google Pub/Sub (Emulator)` ➡️ `Aplikacja Aggregator` ➡️ `PostgreSQL` (odczyt i agregacja) ➡️ `Google Datastore (Emulator)` (zapis raportu) ➡️ `Aplikacja API` (odczyt raportu) ➡️ `Użytkownik końcowy`

## Szczegółowe Wymagania Techniczne

### 1. Środowisko Deweloperskie (Docker)

Przygotuj plik `docker-compose.yml`, który zdefiniuje i uruchomi następujące kontenery:

- **`postgres-db`**:
  - Użyj obrazu: `postgres:15`.
  - Zainicjuj bazę danych dostarczonym plikiem `init.sql` przy starcie kontenera.
- **`gcp-emulators`**:
  - Użyj obrazu: `google/cloud-sdk:latest`.
  - Uruchom emulatory dla **Pub/Sub** oraz **Datastore**.
  - Skorzystaj z przykładowej komendy startowej:
    ```bash
    gcloud beta emulators pubsub start --host-port=0.0.0.0:8085 & gcloud beta emulators datastore start --host-port=0.0.0.0:8086 --project=local-dev --no-store-on-disk
    ```
- **`aggregator`**:
  - Przygotuj kontener z aplikacją Node.js, która będzie przetwarzać dane.
- **`api`**:
  - Przygotuj kontener z aplikacją Node.js (Express).

### 2. Struktura Projektu (Monorepo)

Umieść cały kod źródłowy aplikacji (`aggregator`, `api`) w jednym repozytorium (monorepo). Skorzystaj z narzędzi takich jak `pnpm workspaces`, `yarn workspaces` lub `Nx`.

### 3. Aplikacja `aggregator`

Napisz aplikację w TypeScript, która subskrybuje temat `generate-report-requests`.

Po otrzymaniu wiadomości:

1. Nawiąż połączenie z bazą PostgreSQL.
2. Na podstawie `year` i `month` z wiadomości pobierz wszystkie zlecenia, których `date_finished` mieści się w danym miesiącu.
3. **Zagreguj dane** w celu stworzenia kompleksowego raportu. Upewnij się, że raport zawiera następujące sekcje:
   - **`mechanicPerformance`**: Obiekt, gdzie kluczem jest `mechanic_id`, a wartością obiekt zawierający:
     - `totalOrders`: łączna liczba wykonanych zleceń.
     - `averageHoursPerOrder`: średnia liczba godzin spędzonych na jednym zleceniu.
     - `servicesBreakdown`: obiekt zliczeń dla każdego typu wykonanej usługi (`service_name`).
   - **`weeklyThroughput`**: Obiekt, gdzie kluczem jest numer tygodnia w roku, a wartością jest liczba ukończonych w tym tygodniu zleceń.
4. Zapisz wygenerowany raport (jeden duży obiekt JSON) w emulatorze Datastore jako encję w rodzaju (Kind) `MonthlyReport`. Użyj identyfikatora raportu w formacie `report-YYYY-MM` (np. `report-2025-07`).
5. Potwierdź (ack) wiadomość z Pub/Sub dopiero po pomyślnym zapisie raportu.

### 4. Aplikacja `api`

Zaimplementuj aplikację opartą o framework Express, napisaną w TypeScript.
Udostępnij następujące endpointy:

- **`GET /api/reports/available-months`**:
  - Nawiąż połączenie z bazą PostgreSQL.
  - Wykonaj zapytanie, które zwróci listę unikalnych par rok/miesiąc na podstawie kolumny `date_finished` w tabeli `service_orders`.
  - Zwróć listę w formacie JSON, np. `[{ "year": 2025, "month": 1 }, { "year": 2025, "month": 2 }]`.
- **`POST /api/reports/generate`**:
  - Przyjmij w requeście obiekt JSON, np. `{ "year": 2025, "month": 7 }`.
  - Nawiąż połączenie z emulatorem Pub/Sub.
  - Opublikuj wiadomość z otrzymanymi danymi na temat `generate-report-requests`, inicjując proces agregacji.
  - Zwróć status `202 Accepted`.
- **`GET /api/reports/monthly/:year/:month`**:
  - Nawiąż połączenie z emulatorem Datastore.
  - Zwróć gotowy, zagregowany raport miesięczny pobrany z Datastore.

Zadbaj, aby endpointy zwracały odpowiednie kody statusu HTTP (200, 202, 404, 500).

### 5. Testy

Napisz testy jednostkowe dla kluczowych elementów logiki biznesowej, np.:

- Logika agregacji danych w `aggregator`.
- (Opcjonalnie) Napisz testy integracyjne dla endpointów API. Rekomenduję użycie `vitest`.

### 6. Format dat i strefa czasowa

Wszystkie operacje na datach wykonuj względem strefy UTC, stosując się do poniższych zasad:

- **Baza danych (PostgreSQL)**: Kolumny `date_registered` i `date_finished` mają typ `TIMESTAMPTZ`. Wszystkie obliczenia i porównania dat/czasów wykonuj względem strefy UTC.
- **Selekcja miesiąca dla raportu** (pole `date_finished`):
  - początek: `>= YYYY-MM-01T00:00:00Z`
  - koniec: `< YYYY-(MM+1)-01T00:00:00Z` (przedział półotwarty)
  - pomijaj rekordy z `date_finished IS NULL`.
- **Parametry API**:
  - `year`: liczba całkowita, czterocyfrowa (np. `2025`).
  - `month`: liczba całkowita z zakresu `1–12`.
  - identyfikator raportu: `report-YYYY-MM` (miesiąc zero‑padded, np. `report-2025-07`).
- **Format dat w JSON** (jeśli występują w odpowiedziach): ISO 8601 w UTC, np. `2025-07-15T13:45:00Z`.
- **`weeklyThroughput`**: numer tygodnia wg ISO‑8601 w UTC.
  - w SQL możesz użyć: `to_char(date_finished AT TIME ZONE 'UTC', 'IYYY-IW')` (rok tygodniowy + numer tygodnia) lub `date_trunc('week', date_finished AT TIME ZONE 'UTC')` do grupowania tygodni.
  - w aplikacji możesz użyć odpowiedników ISO week (np. `getISOWeek`/`getISOWeekYear` z `date-fns`).
