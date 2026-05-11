# VXZ Intelligence Engine - Architecture Document

## 1. System Overview
The **VXZ Intelligence Scraper (VIS)** is an autonomous backend engine designed to discover, extract, and mathematically verify global news events. It transforms raw, unorganized web data and RSS feeds into **Structured Intelligence Objects (SIO)** using the JIC (Joint Intelligence Committee) and ACH (Analysis of Competing Hypotheses) frameworks.

## 2. Ingestion: The Hunter Array
The engine utilizes a concurrent, multi-threaded "Hunter Array" to scrape data in milliseconds from global sources:
*   **T1 (Primary Newswires):** NYT World, Yahoo/Reuters/AP. Extremely high authority (Weight: 1.0).
*   **T2 (Broadcast & Editorial):** BBC, Al Jazeera, France24, The Guardian, DW News, CNN, Washington Post, CBC. Moderate authority (Weight: 0.7).
*   *(Future) T3 (OSINT & Social):* Telegram, X/Twitter for raw ground-truth media.

## 3. The Processing Pipeline (Verification Gates)
Every scraped article passes through four strict logic gates:

### Gate 1: Semantic Clustering & De-duplication
The engine strips stop-words and evaluates keyword overlap. If multiple sources report the same event (e.g., "Iran", "Rescue", "Officer"), they are clustered into a single **Event ID**.

### Gate 2: Source Alignment (Maskirovka Check)
The system calculates the **Effective Source Count ($S_{eff}$)** to prevent state-sponsored "echo chambers" from inflating the score.
*Formula: $S_{eff} = I + (A / \sqrt{A})$* (where I = Independent sources, A = Aligned/State-linked sources).

### Gate 3: ACH Matrix (Analysis of Competing Hypotheses)
The AI evaluates the stack against three hypotheses:
*   **H1_Reported:** The event occurred as claimed. (Requires independent corroboration).
*   **H2_Staged:** An information operation or propaganda. (Triggered by high bias language + aligned sources).
*   **H3_Error:** Misinterpretation.

### Gate 4: Truth Score ($T_s$)
Calculates a final percentage (0.0 to 1.0).
*   Uses a **Confidence Constant ($C_{max}$)** that physically prevents any single source from exceeding **66.7% (ASSESSED)**.
*   Requires multi-source independent corroboration to reach **CONFIRMED (80%+ )**.
*   Applies a Bias Penalty ($P_b$) if the source uses emotionally loaded words ("bombshell", "propaganda", "slams").

## 4. Data Persistence & Ecosystem
*   **Local Cache:** `better-sqlite3` stores events locally for quick retrieval and deduplication.
*   **Live Cloud Sync:** Connected natively to **Firebase Firestore** (`vxz-news`). Every verified event is atomically synced to the cloud database for front-end consumption (ViteJS/React).
*   **Alerting:** Dispatches an automated Intelligence Brief via Resend API to stakeholders.

## 5. Execution Loop
*   Triggered via Linux `cron` every 12 hours (configurable to 1 minute for real-time mode).
