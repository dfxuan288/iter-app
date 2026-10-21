# ITER demo script

A walk-through for presenting ITER, about 6–8 minutes. Every number below is what the demo shows on
**15 Nov 2026 (day 7 of the Tokyo trip)**, straight after **Me → Reset the demo**.

Live app: **https://iter-app-alpha.vercel.app**

## Before you present

1. On the presenting phone, open the live app. Add it to the home screen (**Download ITER**) and open it from
   there, so it runs full screen.
2. **Me → Reset the demo**, then **Me → Show the welcome screens** if you want to start from the very beginning.
3. Check **Me → Server connection** says *Connected* and *AI scanning is ready*.
4. Phone settings: turn **reduce motion off** (or the animations are skipped), brightness up, do-not-disturb on.
5. Have a backup: the receipt and menu **samples** work even if the venue Wi-Fi is poor. If the AI cannot be reached,
   they show "Sample answer (AI unavailable)" instead of failing.

## The story

Amanda is on day 7 of a 10-day trip to Tokyo, with RM 2,550 for day-to-day spending and RM 300 kept aside.

### 1. Opening (30 s)

- Open ITER. **Launch animation**: the ITER mark appears with Tokyo inside it, the camera dives in, and the photo
  lands as the Home card. (Replay any time: **Me → Replay the launch animation**.)
- *Say:* "ITER opens on your own trip. It knows where you are and what you can spend."

### 2. Welcome screens (30 s, optional)

- **Me → Show the welcome screens**: safe to spend, scanning, and what trips really cost. Then **Get started**.

### 3. Home: safe to spend (1 min)

- **RM 200 a day across your 4 days left**, *RM 200 left today*, total spent so far **RM 1,450**, total remaining **RM 1,100**.
- *Say:* "This is the one number travellers need. It is simple maths, not AI: what is left after the reserve,
  shared over the days left. (2,550 − 300 − 1,450) ÷ 4 = RM 200."
- Tap a bar in **Each day**: the date and what was spent. Point out **On track**.

### 4. A new day (45 s)

- **Me → App date → Next day** (16 Nov), then **Home**: the daily amount rebalances to
  **RM 266.66** ((2,550 − 300 − 1,450) ÷ 3), because yesterday's money was not spent.
- *Say:* "Spend less today and tomorrow gets more. Overspend and it tells you before you run short."
- **Me → App date → Back to 15 Nov** before carrying on.

### 4b. Overspending (45 s, optional)

- **Add an expense**, type `11620 yen souvenirs` (about RM 300), **Fill in**, **Save expense**.
- The big number drops to **RM 166.66 a day for your last 3 days, down from RM 200**, the "left today" line turns
  amber ("RM 100 over today's amount"), and the chip changes to **Spending fast** at once.
- *Say:* "Within your daily amount the number stays put, so it's easy to plan with. The moment you overspend, ITER
  lowers what the rest of the trip gets."
- Delete that expense (tap it → Delete) or **Reset the demo** before step 5, so later numbers match this script.

### 5. Scan a receipt with AI (1.5 min)

- **Scan** (the raised button) → **Receipt** → **No receipt to hand? → Drugstore, Ginza**.
- The AI reads the Japanese receipt: shop, date, every item, the 8% and 10% tax lines and the total ¥7,328.
- *Say:* "AI reads, code calculates. The AI only reads the paper; ITER checks the numbers add up and does all
  the money maths."
- Point out the **tax refund check** on the review screen, then **Save expense**.
- On Home: the **Expense saved** tick, the amounts count to their new values, the new expense slides into Recent,
  and the **tax refund** card's total goes up.

### 6. Tax refund tracker (45 s)

- Tap the **tax refund** card on Home: what can be claimed, what to bring to the airport, and the departure
  reminder. Japan's rules are in a config file with their source and the date they were last checked.

### 7. Menu translate (1 min)

- **Scan → Menu → Thai restaurant**: dishes in English, prices in Ringgit **including** the 10% service charge and
  7% VAT, and pork and alcohol flags.
- Add two dishes, **Log this as an expense**, **Save expense** ("Order logged").

### 8. Currency (30 s)

- **Currency**: live rates against the Ringgit, the converter, and a 7 or 30-day chart.
- *Say:* "Rates are saved on the phone, so it still converts with no signal."

### 9. Community (45 s)

- **Community**: Tokyo's **typical 5-day trip** worked out from shared trips, and the feed. Like a post (the heart
  pops). The **+** shares your own trip summary; your expenses stay private.

### 10. Plans (45 s)

- **Me → My plan**: 7-Day Pass active until 18 Nov, free trial used 9–11 Nov. **See plans**: free trial
  (3 days), Day Pass RM 2.90, 7-Day Pass RM 12.90 (about RM 1.84 a day).
- *Say:* "Pay only for the days you travel. Buying is simulated in the prototype."

### 11. Trip Wrapped (45 s)

- **Me → Your Tokyo trip so far → See it wrapped**: total spent, biggest day (Day 4, Bic Camera), where the money
  went, biggest buy, receipts scanned, tax refund, share to Community.

### 12. Any country (30 s, if time)

- **Home → +** (plan a trip) → **Somewhere else?** → type "uk" → **United Kingdom**, city "Edinburgh". The pound is
  set automatically, with live rates. (Then **Me → Your trips → Tokyo** to switch back, or **Reset the demo**.)

## If something goes wrong

| What happens | What to do |
|---|---|
| A scan takes long or fails | Use a sample; it still works without the AI. Say the offline waiting list sends real photos when signal returns. |
| Numbers differ from this script | **Me → Reset the demo** and **Me → App date → Back to 15 Nov**. |
| The app looks old after an update | Close it fully and reopen it. |
| No internet at all | Rates and saving still work if the app is already open. (Opening it from scratch needs a connection; see docs/DECISIONS.md.) |
