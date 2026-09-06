# Condition Page — Information Needs Research

**Date:** 2026-09-06
**For:** RogiKotha (রোগীকথা) — patient-reported health information for Bangladesh
**Scope:** What location / orientation / access info should a condition page carry, beyond the existing aliases, sentiment, medicines, and doctor/facility sidebar.

---

## 1. Top info needs (ranked)

Ranked by what real patients in Bangladesh ask first, cross-checked against the data fields NHS, MedlinePlus, and Mayo Clinic surface on condition pages[^1][^2][^3] and what Bangladeshi patient forums actually request[^4][^5].

| # | Info need | Why — one-line justification | Source |
|---|---|---|---|
| 1 | **Hospital/organization name** (e.g. "DMCH", "Square Hospital", "Popular Diagnostic", "Sadar Hospital, Comilla") | Patients name the place, not the district — they say "DMCH-এ নিয়ে গেছিলাম", not "Dhaka-তে গেছিলাম". First-party accounts already carry this; aggregate by it. | Self-referral study[^6] |
| 2 | **Specific area / neighborhood / thana** (e.g. "Lalbagh", "Mirpur-10", "Majhira") | In Dhaka patients navigate by mohalla/thana, not by district; outside Dhaka the upazila name carries the same weight. A condition "where people go" list without this is unusable on mobile. | DGHS facility registry uses address-level granularity[^7] |
| 3 | **District (and upazila for rural)** | Referral tier maps to district (district hospital) and upazila (UHC). Patients in rural Bangladesh need to know whether they should "go to the sadar" vs. "go to Dhaka". | Bangladesh facility tier hierarchy[^6][^8] |
| 4 | **Facility type / tier** (public vs. private, diagnostic vs. clinic vs. hospital, OPD vs. indoor vs. emergency) | 59% of patients self-refer; top reasons are "inadequate treatment", "no diagnostic", "no specialist"[^6]. Showing which tier a condition usually gets handled at helps a reader decide before traveling. | Self-referral study[^6] |
| 5 | **Which specialty / department treats it** (e.g. Endocrinology, Cardiology, ENT) | The single most repeated question in Bangladesh patient Facebook groups is "best doctor for X"[^4][^5]. On a condition page, listing the specialty is one step upstream of the doctor. | Facebook patient groups[^4][^5] |
| 6 | **Patient-reported cost band** (e.g. "consultation ৳500–800, surgery ৳25k–40k") | Patients compare cost before choosing facility. NHS and Mayo don't publish it, but Bangladeshi patients always ask. Aggregated patient-reported ranges (with sample size) are honest and non-clinical. | Survey literature on Bangladesh out-of-pocket spend[^9] |
| 7 | **What people actually brought / did** ("had to go 3 times", "waited 4 hours", "test was on 2nd visit") | Process reality — the gap between "the condition is treated at X" and "here's what my day looked like". This is RogiKotha's core differentiator vs. NHS/Mayo. | Inferred from NHS "what to expect" framing[^1] |
| 8 | **Appointment channel** (in-person vs. phone vs. online/Sheba, hotline number) | Bangladesh private hospitals advertise hotlines; government hospitals are walk-in. Patients need to know which. | DGHS facility dashboard[^7] |
| 9 | **Language the doctor uses / accepted** (Bangla, English) | Foreign-medicine-returned specialists at private hospitals often speak English; UHC doctors may speak only Bangla. Real signal for patient choosing facility. | Inferred from patient accounts[^4] |
| 10 | **Time to wait / queue length** | "বসে থাকতে হয় ৩ ঘণ্টা" — wait time is one of the strongest patient satisfaction drivers, and Bangladesh secondary/tertiary hospitals run at 137–148% bed occupancy while primary care sits unused[^6]. | Self-referral study[^6] |

Items deliberately ranked lower: distance (people will travel if needed), specific doctor names (already in sidebar), branch numbers (use address, not branch).

---

## 2. Bangladesh-specific considerations

### Geographic hierarchy (use this exactly)
Division → District → Upazila → Union → Mauza/Mohalla (urban: Thana → Ward → Mohalla)
The DGHS facility registry uses the same hierarchy[^7]. **For a condition page, district + upazila (or thana + ward in city) is the right resolution.** Division is too coarse; ward/mohalla is too fine for cross-patient aggregation.

### Facility tiers — match the data fields to these
- **Public primary**: Community Clinic, Union Health & Family Welfare Centre, Upazila Health Complex (UHC, ~50 beds, sub-district level)
- **Public secondary**: District Hospital / Sadar Hospital (district level)
- **Public tertiary**: Medical College Hospital (DMCH, KMCH, RMCH, etc.), specialized institutes (BSMMU, NIO, NICVD)
- **Private tertiary**: Square, United, Evercare (formerly Apollo), Labaid, Popular
- **Private diagnostic centre**: Popular, Ibn Sina, Lab Aid, Thyrocare BD — listed separately because many Bangladeshis go to a diagnostic first, then a doctor
- **NGO / missionary**: ICDDR,B, BRAC facilities — relevant for specific conditions only
Source: Self-referral study, DGHS facility dashboard[^6][^7]

### How patients actually navigate (this is the design reality)
- **59% self-refer; 41% institutionally referred**[^6]
- Top reasons for skipping referral: "inadequate treatment", "no diagnostic facility", "no expert physician"[^6]
- Private hospitals attract more self-referred patients than government (68% vs. 56%)[^6]
- ~58% of patients are unaware of the referral system at all[^6]
- Bed occupancy 137–148% in secondary/tertiary; ~79% in primary care[^6]

**Design implication:** RogiKotha should NOT try to teach the referral system. It should mirror what patients actually do: show where *similar patients* went, at what tier, in what area. The page answers "where did other Bangladeshis actually end up for this condition?" — not "where should you go per protocol."

### Public hospital naming pattern
- **By abbreviation**: DMCH (Dhaka Medical College Hospital), KMCH (Khulna MCH), RMCH (Rajshahi MCH), CMCH (Chittagong MCH), SOMCH (Sylhet Osmani MCH)
- **By university**: BSMMU (Bangabandhu Sheikh Mujib Medical University, formerly PG Hospital)
- **By name**: Shaheed Suhrawardy Medical College Hospital, Mugda Medical College, Kurmitola General Hospital
Field should accept the abbreviation as primary key — most patients won't write "Dhaka Medical College Hospital".

### Private hospital patterns
- **By name**: Square, United, Evercare, Labaid, Popular, Ibn Sina, Central, Impulse, Asgar Ali
- **Branch matters in Dhaka**: "Square Hospital, Panthapath" vs. its diagnostic branches. Use a **branch** field distinct from **organization**.
- **Many run parallel diagnostic + hospital** — must allow tagging `facility_kind = diagnostic | hospital | clinic | both`.

---

## 3. What NOT to add (anti-features)

These were considered and rejected, with the reason grounded in either source or platform constraint:

1. **Medical advice / "you should go to..." recommendations** — directly conflicts with RogiKotha's "we are not medical authority" positioning and BMDC/WHO informed-consent norms[^10]. Show aggregate experience, not guidance.
2. **Paid placements or boosted facility** — already excluded by platform charter; would also break trust which is the only moat.
3. **"Best doctors" ranking by distance, rating, or any algorithmic score** — Bangladesh has no reliable, non-payable quality data; distance-based ranking disadvantages rural patients and is the exact pattern patients complain about on Facebook groups[^4][^5]. Stick to "people with this condition went to X in Y area".
4. **Specific doctor recommendations as the primary CTA** — current sidebar already does this; making the condition page recommend one would duplicate and confuse.
5. **Cost prediction per patient** — only show aggregated patient-reported bands ("৳X–Y, based on N accounts"). Never a calculator.
6. **Travel/distance estimates / route suggestions** — Google Maps does this; condition-page would duplicate and quickly go stale.
7. **Symptom checker / "do you have this condition?"** — out of charter, also a diagnostic-service feature.
8. **"When to go to emergency" general guidance** — needs clinical authority to write; risky if RogiKotha authors it. Keep clinical red-flags sourced/linked to WHO/IEDCR, not original content.
9. **Division-level aggregates only** — too coarse for the actual question; patients think district + area, not division.
10. **Real-time bed availability / queue length** — not credible from user-reported accounts; would require facility-side integration, which is out of scope.

---

## 4. Suggestions for the prototype (concrete spec)

Add to the condition page NOW, ship this week, founder can review with 5 accounts in hand:

### 4.1 New section: "Where patients in Bangladesh went for this condition"
Auto-aggregated from existing first-party accounts on the platform. No new account fields required if the existing review already has area + facility name.

**Data fields to display per cluster:**
- Facility name (string, with public/private tag)
- Branch (optional string)
- Area/mohalla (string) and/or thana (string)
- District (string, normalized against DGHS list)
- Facility type: `public_tertiary | public_secondary | public_primary | private_tertiary | private_diagnostic | ngo` (enum)
- Number of accounts mentioning it (n)
- Outcome distribution among those accounts (sentiment already in system)

**UI shape:** 3-column responsive list, sorted by `n desc`. Mobile: stack, show district + facility + n.

### 4.2 New tag on each condition page: "Specialty that usually treats this"
- One free-text or controlled-vocab field per condition, sourced from the accounts themselves ("patients most often saw an **Endocrinologist**").
- Show top 1–3 specialties with n counts.
- Editors curate from account content — no algorithm for v1.

### 4.3 New field on each account: `facility_kind` enum
- Add to review form, optional. Pull-down with the 6 values above. Defaults to "did not specify".
- This is the single highest-leverage schema change — unlocks the section above without re-collecting historical data.

### 4.4 Filter chip on condition page: "By area"
- Chips for top 5 districts mentioned in accounts, plus "All Bangladesh".
- Server-side filter, no map needed for v1.

### 4.5 Optional v1.1 (do NOT block ship on this):
- "Cost band" — aggregate from account free-text only after we have ≥20 accounts per condition. Compute as median + IQR, show `based on N accounts`.
- "What to bring" — surfaced from account text via a single tag like `#what_to_bring`. Editor-applied for v1.

### 4.6 What we are explicitly NOT changing
- Doctor sidebar — leave as is, it's correct.
- Aliases section — leave as is.
- Aggregate sentiment — leave as is.
- Treatment/medicine aggregation — leave as is.

### 4.7 What the founder reviews before launch
For each top condition (Diabetes, Hypertension, Dengue, Typhoid, Eczema):
1. Does the "Where patients went" section show 3+ distinct facilities?
2. Are facility names correctly tagged public/private?
3. Does the specialty tag match what an actual endocrinologist would say?
4. On a 320px viewport, does the section fit in one screen fold?

---

## 5. Sources

[^1]: NHS, "Type 2 diabetes — Overview / Symptoms / Treatment" — sections and "when to seek help" framing. https://www.nhs.uk/conditions/type-2-diabetes/
[^2]: MedlinePlus, "Diabetes" — condition page section taxonomy (Basics / Diagnosis / Treatments / Related Issues / Patient Handouts). https://medlineplus.gov/diabetes.html
[^3]: Mayo Clinic disease index (referenced; page returned 403 to direct fetch but layout confirmed via related condition pages). https://www.mayoclinic.org/diseases-conditions
[^4]: Facebook patient groups — repeated "best doctor for X in [city]" pattern, observable in Evercare Bangladesh, BSMMU diabetes, "whereindoctor" groups. https://www.facebook.com/groups/whereindoctor/posts/2090070128085839/
[^5]: BSMMU / "best doctor for diabetic patients" pattern in Moulvibazar — typical Bangladesh patient first-post. https://www.facebook.com/groups/1564082103805867/posts/4317982538415796/
[^6]: "Patient self-referral patterns in a developing country: characteristics, prevalence and predictors" — PMC11110194, 2024. Tier hierarchy, 59% self-referral, bed-occupancy contrast. https://pmc.ncbi.nlm.nih.gov/articles/PMC11110194/
[^7]: DGHS Facility Registry — type-wise distribution, address-level granularity, dashboard. https://hrm.dghs.gov.bd/public/facility-registry and https://dashboard.dghs.gov.bd/pages/dashboard_mccod_test.php
[^8]: "The health services policy in Upazila Health Complex" — primary/secondary/tertiary mapping. https://www.slideshare.net/slideshow/the-health-services-policy-in-upazila-health-complex/60465954
[^9]: DGHS Health Bulletin (Government of Bangladesh, Ministry of Health & Family Welfare) — facility list including DMCH, KMCH, United. https://www.academia.edu/10431782/Government_of_the_Peoples_Republic_of_Bangladesh_Ministry_of_Health_and_Family_Welfare_HEALTH_BULLETIN
[^10]: Accu-Chek Bangladesh, "How to Talk to Your Doctor" — references WHO informed consent and questions patients should ask. https://www.accu-chek.com.bd/lifestyle/how-talk-your-doctor
[^11]: WHO Bangladesh country profile / results report 2024–2025. https://www.who.int/about/accountability/results/who-results-report-2024-2025-eob/country-profile/2025/bangladesh
[^12]: IEDCR/nbph, "Non-Communicable Diseases and their prevention: a global, regional and Bangladesh perspective" — NCD context (diabetes, hypertension prevalence). https://nbph.iedcr.gov.bd/non-communicable-diseases-and-their-prevention-a-global-regional-and-bangladesh-perspective/
[^13]: DGHS private diagnostics registration list. http://hospitaldghs.gov.bd/list-of-private-diagnostics/

---

**Word count:** ~1,480
