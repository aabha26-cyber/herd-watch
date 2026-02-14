# HerdWatch — Project Overview

> Consolidated from the UN Challenge brief, stakeholder interviews (Jorge, DICT), and team planning sessions.

---

## The Problem

Cattle movement in South Sudan is a **primary driver of resource-based conflict**. Herds migrate seasonally across grazing corridors, and when two groups converge on the same water source or pastureland, violence erupts. The UN currently relies on peacekeeper patrols and word-of-mouth reports — slow, patchy, and not scalable.

### Why Cattle Matter

- **Proxy for wealth** in pastoral communities
- **Indicator of food access** and livelihood stability
- **Visible marker** for potential grazing/water conflicts
- Tracking cattle complements (doesn't replace) people-tracking for medical/school access planning

---

## Stakeholder Context (Jorge — UN DICT)

**Background:** Department of Information & Communications Technology expert with field experience in Congo, Bangkok, Lebanon, Jordan. Currently at NYC university partnering on UN research.

### Key Insights from Jorge

1. **Tracking location** — Current methods (peacekeeper patrols, aerial drones) are not efficient or scalable. Need **near-real-time** understanding instead of delayed info.
2. **Movement prediction** — They want to know not just where cattle *are*, but where they're *going*. Currently rely on empirical/seasonal knowledge from locals but have no automated system.
3. **Conflict prediction** — The "gold prize" and ultimate objective, but the hardest to achieve. Solving location + movement gets closer to this.
4. **Information translation** — Least problematic. They monitor local radio in multiple dialects and can mine data for conflict signals.

### What Success Looks Like

- **Open-source repository** with clear instructions
- Usable by **normal humans** in different country offices without dependencies
- **Scalable** — not requiring $25k satellite images each time
- **Adaptable** to different landscapes (desert, jungle, etc.)
- Not hardcoded to specific scenarios — should "go viral" across offices
- Budget range: $20k–$200k depending on requirements; **always seek cheapest solution first**

### Validation Timeline

| Capability | Validation Period |
|---|---|
| Present situation awareness | Most immediately valuable |
| Short-term forecasting (2-7 days) | Couple months needed |
| Annual migration patterns | Multiple years required |
| **Priority** | Near real-time current status with high certainty |

---

## System Architecture (Conceptual)

The system is designed as a **6-layer coordination platform**:

### Layer 1: Prediction Layer (AI Brain)

Using satellite imagery (Sentinel-1 SAR for all-weather), vegetation data (NDVI), water availability maps, seasonal migration history, and weather forecasts to predict herd movement 2-7 days ahead.

### Layer 2: Risk Detection Engine

Continuously evaluates:
- Will two herds reach the same resource simultaneously? (competition = violence risk)
- Are herds moving toward villages or farmland? (crop destruction triggers clashes)
- Are herds entering known tension zones? (past violence predicts future)

When risk crosses threshold → Alert Generated.

### Layer 3: Peacekeeper Coordination Platform

- Live map with herd locations, predicted paths, and risk zones
- Movement alerts: "Two large cattle groups predicted to converge near Bor in 3 days. High conflict probability."

### Layer 4: Rerouting Guidance

Like Uber rerouting drivers around traffic — suggest safer alternative grazing routes:
- Based on grass availability, water access, distance feasibility, territorial boundaries
- **AI suggests → Peacekeepers communicate → Herders decide**

### Layer 5: Communication Layer

- Radio network integration
- SMS alerts in local languages
- Pre-written message templates for field use

### Layer 6: Feedback Loop

Peacekeepers log outcomes (did herd change direction? was conflict avoided?) → data feeds back into AI to improve predictions over time.

---

## Satellite & Data Strategy

### Multi-Sensor Approach

| Satellite | Type | Resolution | Revisit | Season |
|---|---|---|---|---|
| **Sentinel-1** | SAR (radar) | 10m | 6-day | Primary in **wet season** (penetrates clouds) |
| **Sentinel-2** | Optical | 10m | 5-day | Primary in **dry season** (high detail) |
| **Planet** | Optical (commercial) | 3-5m | Daily | Supplementary for fine-tuning |
| **MODIS** | Multi-spectral | 250m-1km | Daily | NDVI, temperature, floods |
| **VIIRS** | Multi-spectral | 375m-750m | Daily | Weather, land/ocean surfaces |

All Sentinel and MODIS/VIIRS data is **free and open-source**. Planet requires subscription but adds daily coverage.

### 8 Key Environmental Factors (Ranked by Influence)

| Rank | Factor | Why It Matters |
|------|--------|----------------|
| 10 | Vegetation/NDVI | Primary driver — cattle go where grazing is good |
| 9 | Geospatial (water, elevation, conflict zones) | Conflicts override everything; water is essential |
| 9 | Rainfall | Drives flooding/drought migrations |
| 9 | Water bodies/surface water | Essential for drinking |
| 8 | Flood extent | Triggers avoidance of lowlands |
| 8 | Soil moisture | Affects vegetation and water retention |
| 7 | Evapotranspiration | Increases water stress |
| 6 | Land surface temperature | Secondary — stress but not primary driver |

---

## Ethical Guardrails

- **Not surveillance** — Environmental signal analysis only
- **No GPS or individual tracking** — Satellite-based environmental patterns
- **Prevention only** — AI suggests, peacekeepers communicate, herders decide
- **Not for enforcement or military use**
- Internal UN personnel use initially; cybersecurity assessments required
- Must not create tools usable against supported populations

---

## Framing for Presentation

> "A digital early-warning and coordination system that empowers peacekeepers and communities to prevent resource-driven conflict."

> "Just as Uber prevents traffic jams through predictive routing, our system prevents violent clashes by forecasting cattle movement and guiding peacekeepers to coordinate safer migration paths in advance."

---

*Consolidated from: UN Challenge brief, Jorge stakeholder interview, team Slack planning sessions (Tabs 1-9 of project doc).*
