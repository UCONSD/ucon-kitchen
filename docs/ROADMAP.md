# Roadmap — UCON Kitchen

## MVP success criterion

The MVP does **not** exist to build an impressive AI kitchen configurator. It exists to
answer one question:

> Will qualified homeowners engage with a conversational kitchen design process long
> enough to establish trust, discuss budget, provide meaningful project information, and
> take a paid or human-assisted next step?

- If **no** → fix or abandon the funnel. Do not build 3D/CAD/engineering automation.
- If **yes** → invest progressively (see "After validation").

## MVP — MUST HAVE

**Customer**

1. Open a mobile web page.
2. Start a conversation without registration.
3. Answer naturally by text.
4. Upload photos / images / documents.
5. AI understands the project.
6. AI updates structured Project State.
7. AI asks intelligent next questions (Next Best Question).
8. Budget conversation (handles declared / refused / unknown).
9. Basic deterministic qualification.
10. Receive a First Value Summary (~8–12 min).
11. Save the project.
12. Return later and continue (persistent project, no re-asking).
13. Request / proceed to human review.

**Internal (designer view — minimal, not a CRM)**

1. See projects.
2. See Project State.
3. See qualification.
4. See uploads.
5. See conversation.
6. See abandonment / milestone.
7. Human can review a project.
8. Human can respond / take over the same conversation.
9. Analytics events captured (PostHog).

## Nice to have — NOT required for first launch

Voice; AI photo analysis beyond basic understanding; professionally rendered concept
cards; automated property lookup; SMS; payments; sample ordering; a sophisticated designer
dashboard. **Do not delay the market test for these.**

## What NOT to build now (binding — scope-creep protection)

Full room planner; drag-and-drop cabinets; customer cabinet-by-cabinet configurator;
Three.js planner; WebGL/WebGPU engine; parametric CAD; OpenCascade; CNC integration;
manufacturing BOM; production engineering; complete appliance database; LiDAR measurement
app; property-intelligence automation; contractor marketplace; WhatsApp integration;
native iOS/Android app; CarPlay; complicated CRM; microservices; a sophisticated rules
engine; automated nationwide workflow.

## Development principle for the first 20–50 customers

**Automation First → Human When Valuable → Deterministic Validation When Critical.**
If a human can do a backend step manually in five minutes, keep it manual. Example: AI
qualifies a project → system alerts the internal team → a human reviews manually. Automate
only after real usage shows repetition.

## After validation (progressive investment order)

1. Human designer tooling
2. Better visual concepts (Design Studies / representative concepts — never pass a
   fictional render off as a completed customer project)
3. Samples (curated, possibly paid/credited)
4. Site Verification (laser / photos / LiDAR → updates the same Project Model)
5. Appliance data
6. Rules engine
7. Engineering Protection Engine (Failure → Rule → Automated Validation)
8. Parametric cabinet configuration
9. Manufacturing integration

The long-term moat is not beautiful 3D — it is the **Engineering Protection Engine**. The
architecture must not make it hard to add later, but it is explicitly **not** MVP.

## Trust positioning (must be communicated early in the conversation)

No sale of leads. No marketing distribution of project data. The AI earns no commission
and won't push a more expensive kitchen to inflate the sale. No aggressive follow-up if
the customer declines. (Do **not** promise "we never share data with anyone" — project
data legitimately reaches designers, installers, technicians, and logistics/payment
providers required to do the work.)
