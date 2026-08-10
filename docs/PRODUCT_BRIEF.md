# UCON Conversational Kitchen Configurator
## Product & Technical Handoff — MVP

### 1. Что мы строим

Мы НЕ строим классический kitchen configurator, в котором homeowner самостоятельно расставляет cabinets, вводит размеры стен и проектирует кухню мышкой.

Мы строим:

**Conversational Kitchen Design & Qualification Platform**

Главный интерфейс для homeowner — разговор с AI Design Assistant.

Цель первой версии:

**Visitor → Conversation → Understand Project → Establish Budget → Qualify → Build Trust → Save Project → Human Designer Handoff**

В дальнейшем эта же система должна стать основой полного kitchen project lifecycle:

**Discovery → Design → Site Verification → Engineering → Cabinetry → Site Preparation Coordination → Production → Installation**

Но MVP заканчивается значительно раньше.

---

# 2. Основная продуктовая гипотеза

Большинство homeowners НЕ хотят становиться kitchen designers.

Они не хотят:

- изучать cabinet nomenclature;
- выбирать десятки технических options;
- самостоятельно измерять помещение;
- расставлять cabinets;
- понимать fillers;
- проверять appliance clearances;
- принимать сотни технических решений.

Человек хочет примерно следующее:

> “Вот моя кухня. Вот что мне не нравится. Вот несколько картинок, которые мне нравятся. Вот appliances, которые я хочу. Вот примерно сколько я готов потратить. Скажите мне, что можно сделать.”

Поэтому conversational system должна вести себя скорее как хороший kitchen designer на первой консультации, чем как ecommerce configurator.

---

# 3. Роль AI

AI является:

**Designer Assistant**

а НЕ:

- salesperson;
- final kitchen designer;
- engineer;
- production decision maker.

AI должен:

- вести discovery conversation;
- задавать разумные follow-up questions;
- объяснять terminology;
- обучать клиента;
- помогать сформулировать needs/wants;
- обсуждать budget;
- анализировать фотографии;
- принимать inspiration images;
- собирать appliance preferences;
- структурировать информацию;
- выявлять contradictions;
- квалифицировать project;
- формировать Project Brief;
- определять следующий лучший шаг;
- передавать подготовленный project human designer.

AI не должен самостоятельно принимать critical engineering/production decisions.

---

# 4. Trust positioning

В начале разговора необходимо быстро объяснить роль системы.

Основная идея:

> We are not a lead-generation service.

> Your information is not sold or distributed to competing kitchen companies or contractors for marketing.

> The AI assistant does not earn a commission and should not push the customer toward a more expensive kitchen simply to increase the sale.

> If the customer decides not to proceed, we do not chase them with repeated sales calls, texts and emails.

Юридически нельзя обещать “we never share your data with anyone”, поскольку project data может быть необходима designer, installer, site technician, payment/logistics providers и другим parties required to perform the project.

Правильная концепция:

**No sale of leads. No marketing distribution of project data.**

---

# 5. Primary UX

MVP является:

**mobile-first web application**

Клиент НЕ должен устанавливать приложение.

Marketing website может оставаться:

**ucon.us — Squarespace**

Product application:

**project.ucon.us**

или аналогичный subdomain.

Advertising/website CTA ведет непосредственно в conversational experience.

Не использовать маленький generic chat bubble.

Conversation является основным интерфейсом продукта.

---

# 6. Первый экран

Не:

“Build Your Kitchen”

Не:

“Configure Your Cabinets”

Не длинная lead form.

Пример positioning:

> Thinking about a new kitchen?

> Tell us about your home, what you would like to change and what you want to spend. In about 10 minutes we can help determine what is realistic and what direction makes sense.

CTA:

**Start**

---

# 7. Registration strategy

Не требовать:

- account;
- email;
- phone;
- password

до получения клиентом первоначальной value.

Клиент должен начать conversation практически instantly.

После нескольких meaningful answers:

> “I have a good start on your project. Would you like me to save it so you can continue anytime?”

После этого можно запросить identity/contact information.

---

# 8. Первый milestone

Conversation НЕ должна ощущаться как 45-minute questionnaire.

Target:

**8–12 минут active conversation**

Допустимый максимум первого этапа:

примерно **15 минут**.

Первый customer-visible milestone:

> “We understand your project well enough to tell you whether your expectations and budget appear realistic and what direction makes sense next.”

Это важнее внутренней qualification.

---

# 9. Information to collect during initial conversation

Не обязательно в фиксированном порядке.

Agent должен определять Next Best Question.

### Project location

- ZIP code;
- later property address.

ZIP используется прежде всего для:

- serviceability;
- local context;
- regional pricing/logistics.

Не использовать ZIP как прямое правило “wealth”.

### Project condition

Один из важнейших early gates:

1. Existing home — customer currently lives there.
2. Existing home — vacant / major remodel.
3. New construction.

Эти scenarios должны вести к разным workflows.

### Existing kitchen

Выяснить:

- что не нравится;
- что работает;
- что необходимо изменить;
- основные pain points.

### Household/use

Например:

- кто готовит;
- сколько человек;
- entertaining;
- storage needs;
- pantry;
- seating;
- cooking habits.

Не превращать это в rigid questionnaire.

### Desired outcome

Collect:

- must-haves;
- nice-to-haves;
- priorities;
- compromises customer is willing/not willing to make.

### Style

Customer может:

- загрузить Pinterest/screenshots;
- загрузить фотографии;
- выбрать visual examples;
- описать словами.

AI должен помогать переводить обычный язык клиента в professional terminology.

### Appliances

Мы appliances не продаем как core product.

Но необходимо собирать:

- existing appliances to remain;
- appliances to replace;
- preferred manufacturers;
- later exact model numbers.

На раннем discovery brand preference может быть достаточным signal.

### Budget

AI должен спросить:

> Do you already have a budget in mind, or would you like us to help determine a realistic budget?

Possible states:

- customer declares budget;
- customer refuses to disclose budget;
- customer does not know budget.

Система должна работать во всех трех случаях.

---

# 10. Budget philosophy

Budget qualification является одной из центральных функций.

Property value, ZIP, appliance preferences, project scale и другие данные могут использоваться как contextual signals.

Но:

**Property value ≠ customer budget.**

Нельзя говорить:

> “Your house is worth $3M, therefore you should spend $150k.”

Home value может быть одним из внутренних signals, но budget должен обсуждаться непосредственно с customer.

---

# 11. Property Intelligence — future/optional module

После добровольного предоставления address система потенциально может искать:

- public property information;
- square footage;
- year built;
- approximate property value;
- listing history;
- old listing photographs;
- permits/public records where available.

Critical requirement:

Каждый external fact должен иметь:

- source/provenance;
- date;
- confidence;
- verification state.

Например old listing photograph НЕ считается current condition.

Правильный UX:

> “I found listing photographs from 2019. Is this still your kitchen?”

Property Intelligence НЕ является обязательным для MVP.

Архитектура должна позволять добавить его позже.

---

# 12. Photos and documents

Customer должен иметь возможность загружать:

- current kitchen photos;
- screenshots;
- Pinterest inspiration;
- appliance screenshots;
- floor plans;
- architectural PDFs.

AI должен связывать uploads с Project State.

File upload является MVP feature.

---

# 13. Project State — critical architecture principle

**Chat transcript is NOT the database.**

Conversation является input/output interface.

После meaningful statements AI должен обновлять structured Project State.

Пример:

```json
{
  "project_type": "occupied_remodel",
  "zip": "92037",
  "budget": 80000,
  "budget_source": "customer_declared",
  "pain_points": [
    "small island",
    "insufficient storage"
  ],
  "appliance_preferences": [
    "Sub-Zero",
    "Wolf"
  ],
  "style_direction": "warm contemporary"
}
```

Project State является source of truth для workflow.

---

# 14. Facts require metadata

В перспективе useful structure:

**value + source + captured_at + confidence + verification status**

Например:

Customer-declared budget:
- source = customer;
- confidence = high;
- may require reverification after time.

Listing photo:
- source = external listing;
- date = 2019;
- confidence as current condition = low until customer confirms.

Appliance model:
- must be reverified before engineering/production.

---

# 15. Persistent Project

Conversation не является temporary session.

Customer должен иметь persistent:

**Kitchen Project**

Если он остановился после четырех минут и вернулся через неделю:

НЕ спрашивать все сначала.

Например:

> “Welcome back. Last time you mentioned that storage and the small island were the biggest problems and that you're considering Sub-Zero. Want to continue?”

Project может жить месяцами.

---

# 16. Conversation modularity

Внутренне conversation можно представить модулями:

- Project Basics
- Existing Kitchen
- Needs
- Style
- Appliances
- Budget
- Timeline

Но customer НЕ должен чувствовать, что заполняет форму.

AI должен выбирать следующий наиболее полезный вопрос.

---

# 17. Next Best Question Engine

Не использовать rigid script из 50 вопросов.

System должна знать:

**What we know**
+
**What information is missing**
+
**What information matters most now**

и выбирать Next Best Question.

Пример:

Known:

- ZIP ✓
- project type ✓
- budget ✓
- appliances partial
- photos ✕
- style ?
- timeline ?

Agent может решить, что сейчас photographs дадут больше value, чем вопрос о countertop.

---

# 18. Conversation Playbook

LLM НЕ должен работать только на одном giant system prompt:

“You are an expert kitchen designer.”

Нужны отдельные layers:

1. Project State
2. Required Information Model
3. Conversation Playbook
4. Deterministic Rules
5. Next Best Question logic
6. LLM conversational layer

LLM отвечает за natural conversation/reasoning.

Business-critical state transitions должны быть controlled.

---

# 19. Deterministic rules

Некоторые decisions должны быть обычными rules, а не LLM judgment.

Примеры:

```text
IF service_area = false
→ NOT_SERVICEABLE

IF project_type = new_construction
AND plans_available = true
→ REQUEST_PLANS

IF budget < minimum_viable_budget
AND scope = full_custom
→ BUDGET_MISMATCH

IF qualification_score >= threshold
→ HUMAN_DESIGN_REVIEW
```

В дальнейшем этот deterministic approach расширяется до Engineering Protection Engine.

---

# 20. First Value Output

После примерно 8–12 минут customer должен получить concise summary:

### Your Project

- project type;
- primary needs;
- style direction;
- appliance direction;
- major priorities;
- target budget.

### Initial Assessment

Например:

**Budget appears realistic**

или:

**Budget and requested scope currently appear misaligned**

### Initial Direction

Что примерно имеет смысл делать дальше.

Customer должен почувствовать:

> “They understood me.”

---

# 21. Showing what the budget buys

Одного текста недостаточно.

После budget alignment клиенту нужно визуально показать, что примерно соответствует этому project/budget tier.

Не использовать uncontrolled AI fantasy renderings как доказательство feasible design.

Possible approach:

**Design Studies / Representative Kitchen Concepts**

Создать несколько professionally designed high-quality concept projects различных:

- sizes;
- styles;
- budgets;
- property types.

Они могут быть rendered professionally.

Не выдавать fictional concept за completed customer project.

Правильная framing:

> “A representative kitchen of this scale and level.”

или:

> “A project direction similar to yours.”

Со временем заменить/дополнить реальными completed projects.

---

# 22. Human Designer Trust Bridge

После successful qualification system может сказать:

> “I have enough information to prepare this for a designer.”

AI формирует Project Brief.

Human designer получает:

- customer needs;
- photos;
- style references;
- budget;
- appliance preferences;
- property/project context;
- AI summary.

Designer НЕ должен заново проводить весь discovery.

Human designer проверяет direction.

Цель:

**Automation First → Human When Valuable**

---

# 23. AI visualization

AI-generated images допустимы как:

**concept/style visualization**

но НЕ как guaranteed design.

Не позволять AI imagery создавать ложные geometric promises.

Любая ранняя visualization должна иметь смысл:

**Concept visualization — final layout subject to Site Verification and design development.**

Human review перед показом expensive/high-confidence design direction предпочтителен.

---

# 24. Samples

Samples являются возможным следующим commitment step.

Не показывать customer огромный finish catalog.

Лучший UX:

> “Based on what you've shown us, these are the materials that make the most sense for your project.”

То есть:

**curated samples**, выбранные под конкретный project.

Sample Kit может быть paid и potentially credited toward future project.

Это не обязательно MVP transaction, но Project State должен поддерживать milestone:

**Samples Recommended / Ordered / Delivered**

---

# 25. Qualification outcome / Next Best Action

Не каждый customer должен получать одинаковый CTA.

Possible Next Best Actions:

- Continue discovery;
- Upload photos;
- Upload plans;
- Human Designer Review;
- Order Samples;
- Book Site Verification;
- Not a Fit;
- Budget mismatch.

Это в перспективе превращается в:

**Next Best Action Engine**

---

# 26. Human takeover

Human designer должен иметь возможность войти в тот же project/conversation.

Например:

**Sarah · Kitchen Designer**

> “I reviewed everything you discussed with the assistant…”

Customer не должен начинать новый email thread и повторять информацию.

AI → human handoff должен выглядеть seamless.

---

# 27. Designer dashboard — MVP level

Не нужен сложный CRM.

Минимум:

- list of projects;
- qualification status;
- project summary;
- photos/files;
- conversation;
- Project State;
- budget;
- next action;
- ability to add note/respond/change status.

Первые десятки projects допускают большое количество manual operations.

---

# 28. Communication channels

### Primary

**Own web application**

Это source of truth.

### Email/SMS

Используются преимущественно для:

- save/continue link;
- meaningful project notifications;
- appointments;
- designer review ready;
- samples shipped.

Не использовать aggressive automated follow-up.

### WhatsApp Business

Potential Phase 2.

WhatsApp является **door, not the house**.

Messages from WhatsApp должны попадать в тот же backend и тот же Project ID.

Не создавать отдельную WhatsApp customer database.

### Telegram

Не priority для US homeowner MVP.

---

# 29. Channel-independent identity

Архитектурно:

```text
Customer
   ↓
Project ID
   ↓
Conversation / Project State
   ↑
Web / SMS / Email / WhatsApp
```

Project существует независимо от communication channel.

---

# 30. Learning system

Система должна логировать не только conversations, но и funnel behavior.

Особенно:

- conversation started;
- first meaningful answer;
- photos uploaded;
- budget discussion reached;
- budget disclosed/refused;
- first milestone completed;
- human review requested;
- conversation abandoned;
- abandonment stage;
- returned later;
- paid next step.

Пример:

Если 30% customers исчезают на budget question — возможно проблема не в customers, а в UX вопроса.

---

# 31. Important analytics

Initial metrics:

**Landing → Conversation Started**

**Conversation Started → First Value Milestone**

**First Value Milestone → Qualified**

**Qualified → Human Review / Next Commitment**

Later:

**Qualified → Paid Design**

**Paid Design → Cabinetry Sale**

Final business metric:

**Gross Profit Collected per Qualified Lead**

Но последний metric находится за пределами configurator MVP.

---

# 32. Recommended technology stack

### Existing marketing site
Squarespace  
ucon.us

### Product
Next.js  
React  
TypeScript

Possible location:

project.ucon.us

### AI
OpenAI Responses API

### AI UI/orchestration
Vercel AI SDK or equivalent lightweight streaming layer

Important:

Do NOT place core business logic inside AI SDK.

### Database
PostgreSQL

Recommended MVP implementation:

Supabase

### Authentication
Supabase Auth

### File storage
Supabase Storage

### Hosting
Vercel

### Analytics
PostHog

Google Ads conversion events

### Payments
Stripe — when paid milestones are introduced.

---

# 33. Architecture

```text
CUSTOMER
   ↓
WEB CONVERSATIONAL UI
   ↓
CONVERSATION ORCHESTRATOR
   ↓
┌─────────────────────────────┐
│ LLM                         │
│ Natural conversation        │
│ Understanding/extraction    │
└─────────────────────────────┘
   ↓
STRUCTURED PROJECT STATE
   ↓
RULES / QUALIFICATION ENGINE
   ↓
NEXT BEST QUESTION / ACTION
   ↓
HUMAN DESIGNER WHEN REQUIRED
```

Future architecture:

```text
CUSTOMER UI
      ↓
PROJECT / CONFIGURATION MODEL
      ↓
RULES / CONSTRAINT ENGINE
      ↓
PRICING ENGINE
      ↓
ENGINEERING VALIDATION
      ↓
MANUFACTURING MODEL
      ↓
CAD / CAM / CNC
```

These layers MUST remain conceptually separate.

---

# 34. Engineering Protection Engine — future

Original strategic hypothesis remains valid:

The long-term moat is NOT beautiful 3D.

It is:

**Engineering Protection Engine**

Real failure:

**Failure → Rule → Automated Validation**

Examples future system should eventually detect:

- insufficient fillers;
- door/drawer collisions;
- refrigerator clearance;
- appliance opening errors;
- panel-ready appliance incompatibility;
- dishwasher support;
- installation tolerance;
- plumbing/electrical/HVAC conflicts;
- finished-side errors;
- missing panels;
- corner conflicts;
- countertop support;
- appliance ventilation;
- impossible cabinet configurations.

Critical engineering decisions must ultimately rely on deterministic data/rules, not uncontrolled LLM judgment.

This is NOT MVP.

But architecture should not make it difficult to add later.

---

# 35. Site Verification — future integration

Professional Site Verification eventually becomes another project milestone.

Technician may collect:

- laser measurements;
- photographs;
- LiDAR;
- walls/ceilings/floors;
- doors/windows;
- plumbing;
- electrical;
- HVAC;
- critical dimensions.

Verified conditions should update the same Project Model.

Future system:

**Design assumptions vs Verified Existing Conditions → discrepancy detection.**

Not MVP.

---

# 36. Contractor/MEP coordination — future

After paid design/cabinetry commitment, project can eventually generate:

**Construction Coordination Package**

including:

- MEP requirements;
- appliance specifications;
- rough-ins;
- critical dimensions;
- site preparation requirements;
- Site Ready checklist.

Local GC can ask questions through project portal.

Repeated GC questions should become product intelligence:

**Repeated question → improve drawing / rule / documentation.**

Not MVP.

---

# 37. What NOT to build now

Explicitly out of MVP:

- full room planner;
- drag-and-drop cabinets;
- customer cabinet-by-cabinet configurator;
- Three.js kitchen planner;
- WebGL/WebGPU visualization engine;
- parametric CAD;
- OpenCascade;
- CNC integration;
- manufacturing BOM;
- production engineering;
- complete appliance database;
- LiDAR measurement app;
- property intelligence automation;
- contractor marketplace;
- WhatsApp integration;
- native iOS/Android application;
- CarPlay;
- complicated CRM;
- microservices;
- sophisticated rules engine;
- automated nationwide workflow.

These may come later only after funnel validation.

---

# 38. MVP functionality — MUST HAVE

Version 1 should do these things extremely well:

### Customer

1. Open mobile web page.
2. Start conversation without registration.
3. Answer naturally by text.
4. Upload photos/images/documents.
5. AI understands project.
6. AI updates structured Project State.
7. AI asks intelligent next questions.
8. Budget conversation.
9. Basic deterministic qualification.
10. Receive First Value Summary.
11. Save project.
12. Return later and continue.
13. Request/proceed to human review.

### Internal

1. See projects.
2. See Project State.
3. See qualification.
4. See uploads.
5. See conversation.
6. See abandonment/milestone.
7. Human can review project.
8. Human can respond/take over.
9. Analytics events are captured.

---

# 39. Nice to have, but NOT required for first launch

- voice;
- AI photo analysis beyond basic understanding;
- professionally rendered concept cards;
- automated property lookup;
- SMS;
- payment;
- sample ordering;
- sophisticated designer dashboard.

Do not delay market test for these.

---

# 40. MVP development principle

Do NOT automate tasks merely because they can be automated.

For the first 20–50 customers:

If a human can perform a backend step manually in five minutes, keep it manual.

Example:

AI qualifies project:

> Occupied remodel  
> ZIP 92037  
> Budget $80–100k  
> Sub-Zero/Wolf  
> Warm contemporary  
> High fit

System alerts internal team.

Human reviews manually.

Only automate that process after actual usage demonstrates repetition.

---

# 41. Core engineering principle

Build a:

**modular monolith**

not microservices.

Maintain clean internal boundaries between:

- conversation;
- project state;
- qualification;
- rules;
- files;
- human review;
- analytics.

This allows later extraction into separate services if volume justifies it.

---

# 42. MVP success criterion

The purpose of MVP is NOT:

“Build an impressive AI kitchen configurator.”

It is to answer:

> **Will qualified homeowners engage with a conversational kitchen design process long enough to establish trust, discuss budget, provide meaningful project information and take a paid or human-assisted next step?**

If answer is NO:

Do not build 3D/CAD/engineering automation.

Fix or abandon funnel.

If answer is YES:

Then progressively invest in:

1. Human designer tooling
2. Better visual concepts
3. Samples
4. Site Verification
5. Appliance data
6. Rules engine
7. Engineering Protection Engine
8. Parametric cabinet configuration
9. Manufacturing integration

---

# 43. Fundamental product philosophy

The system should minimize how much work the homeowner has to do.

Do not force the customer to become an expert.

The customer should feel:

> “They understood my project, explained what I needed to know, told me what was realistic, and only asked me for information when it mattered.”

AI performs preparation.

Humans perform high-value judgment.

Deterministic systems eventually protect engineering.

**Automation First → Human When Valuable → Deterministic Validation When Critical.**

---

# 44. One-sentence developer brief

Build a mobile-first persistent conversational kitchen project application that uses AI to conduct professional discovery, convert conversation into structured project data, establish budget/project fit, preserve context across sessions, and hand qualified projects to a human designer — without building a traditional kitchen planner or production configurator in the MVP.