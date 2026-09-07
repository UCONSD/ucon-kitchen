<!--
SOURCE OF TRUTH: project "UCON Business OS" → docs/ucon-module-map.md
This file is a COPY. Edit the source only, then refresh the copies in:
  ucon-field-app/docs/ucon-module-map.md
  ucon-cabinet-engine/docs/ucon-module-map.md
  ucon-kitchen/docs/ucon-module-map.md
Version: 2026-09-07
-->

# UCON — карта модулей (черновик)

**Статус:** ЧЕРНОВИК. Не решение и не целевая архитектура.
**Спека:** S-001 «UCON module map», проект «UCON Business OS».
**Дата чтения:** 2026-09-07 · **Машина:** домашний лаптоп (`macbook-pro-4-local`), `~/dev`
**Режим:** read-only. Ни один файл не изменён, git-команд записи не выполнялось.

**Для чего этот файл.** Из него режутся эпики: он фиксирует, какие модули существуют,
что делает каждый, какой должен быть готов раньше какого и где сессия в одном модуле
может ничего не знать о соседнем. Он же — вход для решения **D-02 «где живёт платформа»**;
вопросы, нужные именно для D-02, вынесены в §7A отдельно от остальных.

Целевая архитектура здесь не проектируется, hub не предлагается, стек не рекомендуется.
Пробелы не закрыты догадками: неизвестное — пронумерованный вопрос в §7.

---

## 0. Метки достоверности

Каждое утверждение в этом файле несёт ровно одну метку. Утверждение без метки — дефект.

- **`Confirmed`** — прочитано в коде, конфиге или документе репозитория; источник указан.
- **`Assumption`** — не подтверждено кодом; связано с пронумерованным вопросом в §7.
- **`No code on this machine`** — на этой машине кода нет, структура не выдумывается.

Отдельно: **`Confirmed (as intent)`** — документ в репозитории утверждает это как намерение;
подтверждён сам документ, а не его реализация. Это подвид `Confirmed`, источник обязателен.

### Состояние прочитанного

| Репозиторий | Ветка на диске | HEAD | Remote | Метка |
|---|---|---|---|---|
| `ucon-field-app` | `light/2026-09-03-reports-and-photos-visible` | `7960dc6` | `github.com/UCONSD/ucon-field-app` | `Confirmed` — `git log`, `git remote -v` |
| `ucon-field-app` | `main` | `65770e3` | — | `Confirmed` — `git log -1 main` |
| `ucon-cabinet-engine` | `main` | `30b8b7b` | `github.com/UCONSD/ucon-cabinet-engine` | `Confirmed` — `git log`, `git remote -v` |
| `ucon-kitchen` | `main` | `a31a812` | `github.com/UCONSD/ucon-kitchen` | `Confirmed` — `git log`, `git remote -v` |

⚠️ **Рабочее дерево Field App читалось на фича-ветке, а не на `main`** (ветка на два коммита
впереди `main`). Все факты о файлах Field App ниже — с этой ветки. `Confirmed` — `git branch`.

⚠️ **Вторая машина не читалась.** Офисный Мак — независимый клон; чистое дерево лаптопа о нём
ничего не говорит. `Confirmed` — `ucon-field-app/CLAUDE.md`, раздел про две машины.

### Что уже было известно до сессии

Из `ucon-field-app/docs/2026-08-30-ucon-os-stack-audit.md` (аудит от 2026-08-30, повторно не
переделывался, взят готовым):

- Системы под названием «UCON OS» в коде не существует; хаба нет; серверного слоя нет ни в
  одном репозитории. `Confirmed` — аудит, Executive Summary п.1–2.
- Takeoff и дашборд кода на этой машине не имеют. `Confirmed` — аудит, Sources Inspected.

Одно утверждение аудита за неделю устарело и здесь исправлено: **Finding 1 слит в `main`**
(`a3a236c` «Merge e4f7e8e into main — Finding 1 full fix + rules findings #4/#6/#8/#10»).
На 2026-08-30 аудит фиксировал его как «не слит». `Confirmed` — `git log main`.

---

## 1. Модули, у которых на этой машине есть код

### 1.1 UCON Field App — `~/dev/ucon-field-app`

**Назначение:** мобильный PWA для полевых бригад: проекты, люди, команды, ежедневные отчёты,
фото, сервис-коллы. `Confirmed` — `CLAUDE.md` §Architecture.

| Что | Значение | Метка / источник |
|---|---|---|
| Стек | React 19 + Vite 8, чистый JavaScript (не TypeScript) | `Confirmed` — `package.json`, `src/` |
| Прод-зависимости | `firebase ^12.14.0`, `react`, `react-dom`, `qrcode.react`, `vite-plugin-pwa` — пять штук | `Confirmed` — `package.json` |
| Бэкенд | Firebase: Firestore + Storage + Auth. Собственного сервера, API и Cloud Functions нет | `Confirmed` — аудит §Confirmed Current Stack; `firebase.json` |
| Точка входа | `src/main.jsx` → `src/App.jsx` | `Confirmed` — `src/` |
| Внутренняя структура | `App.jsx` (3550 строк), `components/Login.jsx`, `context/AppContext.jsx`, `data/`, `db/schema.js` (724), `firebase.js`, `hooks/useAuth.js`, `hooks/useFirestore.js`, `scripts/` | `Confirmed` — `ls src`, `wc -l` |
| `context/AppContext.jsx` | существует, но `App.jsx` его не потребляет — неиспользуемая заглушка | `Confirmed` — `CLAUDE.md` §State and data |
| Коллекции Firestore | `projects`, `checklists`, `photos`, `users`, `userSeeds`, `teams`, `serviceCalls` (+ подколлекции `dailyReports`, `dailyReports/photos`) | `Confirmed` — `src/db/schema.js:109–116` |
| `userSeeds` | коллекция приглашений, появилась в полном фиксе Finding 1; в аудите 30.08 её ещё не было | `Confirmed` — `schema.js:124–125` |
| Роли | четыре: `pm`, `superintendent`, `crew_leader`, `installer` | `Confirmed` — `CLAUDE.md` §Role-based access |
| Доступ | по allowlist: PM заводит запись до первого входа; проверка `isEmailAllowed` до `createOrUpdateUser` | `Confirmed` — `schema.js:137`, `CLAUDE.md` |
| Права | проверяются и в UI, и на сервере — `firestore.rules` (629 строк), `storage.rules` | `Confirmed` — `wc -l`, аудит |
| Навигация | без роутера: `tab` + `detailId` в состоянии, нижняя панель фильтруется ролью | `Confirmed` — `CLAUDE.md` §Navigation model |
| Слои одного изменения | `firestore.rules` → `src/db/schema.js` → `src/hooks/useFirestore.js` → `src/App.jsx` → экран на реальном телефоне | `Confirmed` — `CLAUDE.md` §Tracer bullet |
| Тесты | один сюит правил безопасности `test/rules.test.mjs`; фреймворка тестов нет | `Confirmed` — `CLAUDE.md` («No test framework is configured») |
| Деплой | Vercel, автосборка по пушу в `main`; staging нет, CI нет | `Confirmed` — аудит §7 |

**Внутренние узкие места, значимые для планирования эпиков**

- Каркаса модулей нет: весь UI живёт в одном файле `App.jsx` (3550 строк). Два изменения в этом
  файле одновременно вести нельзя — правило репозитория. `Confirmed` — `CLAUDE.md` §Feature workflow.
- `firestore.rules` ревьюится отдельной сессией без доступа к файловой системе. `Confirmed` —
  `CLAUDE.md` §Session context and discipline.

### 1.2 UCON Cabinet Engine — `~/dev/ucon-cabinet-engine`

**Назначение:** параметрическое расширение SketchUp 2025, генерирующее по каталогу Cesar
предварительную кабинетри с каталожными кодами; цель — презентационные CAD-листы в LayOut.
`Confirmed` — `CLAUDE.md` §What this is.

| Что | Значение | Метка / источник |
|---|---|---|
| Стек | Ruby, SketchUp Extension API. `package.json` отсутствует, JS-стека нет | `Confirmed` — `ls`, отсутствие `package.json` |
| Установка | репозиторий и есть установка: два симлинка в Plugins SketchUp, .rbz не собирается | `Confirmed` — `CLAUDE.md` §What this is |
| Регистраторов расширений — **два** | `src/ucon_cabinet_engine.rb` и `src/ucon_appliances.rb`; соответственно две папки: `src/ucon_cabinet_engine/`, `src/ucon_appliances/` | `Confirmed` — `ls src` |
| `ucon_appliances` | отдельная папка с `main.rb`, `lib/`, `data/`, `ui_panel.rb`, `panel_kit.rb`, собственным `README.md`. В §Layout файла `CLAUDE.md` не описана | `Confirmed` — `ls src/ucon_appliances`; см. вопрос Q-09 |
| Ядро | `src/ucon_cabinet_engine/core/` — 23 файла с номерным порядком загрузки: `00_version` … `95_dev_bridge`, включая `85_export`, `86_export_run`, `88_appliance_check` | `Confirmed` — `ls core` |
| Каталог как данные | `registry/cesar/`: `_manifest.json` + **59** посекционных JSON (семейства H.39/H.48/H.58,5/H.78, wall, tall, fillers, panels, shelves, tops, glass, dish drainer, appliance) | `Confirmed` — `ls registry/cesar` |
| Контракт данных | `docs/UCON_Object_Contract_v2.md` (revision v2.4, 2026-08-28, Locked): словарь атрибутов SketchUp `CabinetEngine`, закрытый список ключей, `schema_version = "2"` | `Confirmed` — сам документ, §0–§1.1 |
| Где контракт применяется | `core/20_contract.rb` (`Contract.write!` — сверяющая запись: отсутствующие ключи удаляются) | `Confirmed` — контракт §1, `CLAUDE.md` domain rule 3 |
| Тесты | `tools/test_contract.rb` — headless Ruby, без SketchUp | `Confirmed` — `CLAUDE.md` §Workflow |
| Каталог-исходники | `sources/` в `.gitignore`; PDF-тома с кодом не путешествуют, состояние машинозависимо | `Confirmed` — `CLAUDE.md` §What this is |

⚠️ **Раздел `## Current state (2026-08-17)` в `CLAUDE.md` устарел относительно диска:** он
называет 126 кодов в трёх секциях и ядро без экспортёра, тогда как на диске 59 секционных
файлов и модули `85_export` / `86_export_run` присутствуют. Волатильные числа по правилу
репозитория живут в `claude/repo-state.md`, который в этой сессии не читался. `Confirmed` —
сравнение `ls` с текстом `CLAUDE.md`; см. вопрос Q-10.

### 1.3 UCON Kitchen — `~/dev/ucon-kitchen`

**Назначение (по документам):** разговорная платформа квалификации клиента: AI ведёт
discovery, собирает структурированный Project State, квалифицирует, передаёт живому дизайнеру.
`Confirmed (as intent)` — `CLAUDE.md` §What this project is.

| Что | Значение | Метка / источник |
|---|---|---|
| Что лежит в коде **фактически** | CLI-срез «мозга»: `src/cli.ts`, `src/llm.ts`, `src/engine/` — `types.ts`, `orchestrate.ts`, `nbq.ts`, `budgetFloor.ts`, `hardFloor.ts`, `materialize.ts`, `serviceability.ts`, `budget.regression.test.ts` | `Confirmed` — `ls -R src` |
| Имя пакета | `ucon-kitchen-brain-slice` — «срез мозга», не приложение | `Confirmed` — `package.json` |
| Зависимости | `ai`, `@ai-sdk/openai`, `zod`; dev: `tsx`, `typescript`, `@types/node`. **`next` отсутствует** | `Confirmed` — `package.json` |
| Команды | `npm run roleplay` (`tsx src/cli.ts`), `npm test` (`node --test`) | `Confirmed` — `package.json` |
| Supabase / Postgres в коде | ссылок нет ни одной | `Confirmed` — grep по `src/` |
| Язык | TypeScript (в отличие от Field App) | `Confirmed` — `tsconfig.json`, `src/*.ts` |
| Заявленная архитектура | модульный монолит: один Next.js на Vercel + один Supabase; модули `conversation`, `project-state`, `qualification`, `rules`, `files`, `human-review`, `analytics` | `Confirmed (as intent)` — `docs/ARCHITECTURE.md` |
| Заявленный прод | `project.ucon.us` (Vercel), Supabase отдельным проектом от Field App, RLS как граница безопасности | `Confirmed (as intent)` — `docs/ARCHITECTURE.md` §Environments |
| Заявленные жёсткие границы | бизнес-логика не в AI SDK; LLM не пишет переходы состояний; транскрипт чата — не база | `Confirmed (as intent)` — `docs/ARCHITECTURE.md` §Hard boundaries |

**Из семи заявленных модулей на диске в виде кода нет ни одного как модуля приложения**; есть
детерминированный движок квалификации (`src/engine/`), соответствующий по смыслу `qualification`
и `rules`. Веб-слоя, хранилища, аутентификации и файлов нет. `No code on this machine` (модули
приложения) / `Confirmed` (движок — `ls -R src`).

---

## 2. Модули, названные владельцем, но без кода на этой машине

Структура ниже не достраивается — перечислено только то, что названо, и чем подтверждено отсутствие.

| Модуль | Состояние | Чем проверено |
|---|---|---|
| **UCON Takeoff** | `No code on this machine` | `find ~/dev -maxdepth 2 -iname "*takeoff*"` — пусто |
| **UCON·OS / дашборд / hub на Railway** | `No code on this machine` | `find ~/dev -maxdepth 3 -name "next.config*"` и `-iname "*prisma*"` — пусто; то же в аудите 30.08 |
| **QBO Finance spoke, Today View** | `No code on this machine` | названы только как порядок сборки хаба в аудите; директорий нет |
| **Master Catalog (Google Sheet)** | `No code on this machine` | интеграции с Sheets нет ни в одном репозитории — аудит §9 |

Из этого следует ровно одно и не больше: **на прочитанной машине платформы-хаба не существует**.
Существует ли она где-то ещё — вопрос Q-01, а не пробел, который здесь закрывается догадкой.

---

## 3. Вне области карты — упомянуто один раз, не раскрывается

| Путь | Что это | Метка |
|---|---|---|
| `~/dev/ucon-cabinet` | пустая директория (только `.` и `..`) | `Confirmed` — `ls -a` |
| `~/dev/_archive` | россыпь Ruby-скриптов, дампов и картинок прошлых итераций | `Confirmed` — `ls` |
| `~/dev/ucon-sketchup-scripts` | git-репозиторий без remote: три Ruby-файла и контрольный документ шаблона Cesar | `Confirmed` — `ls`, `git remote -v` |

## 4. Прочее, что лежит в `~/dev` и в область спеки S-001 не входит

Перечислено, чтобы карта не выдавала три репозитория за всё, что есть. Не раскрывается.

| Путь | Состояние | Метка |
|---|---|---|
| `~/dev/pdf2room` | репозиторий `github.com/UCONSD/pdf2room`; README: «Phase 0 — проверка технологии, кода нет»; на диске `docs/`, `spikes/s1_scale`, `spikes/s5_adapter` | `Confirmed` — `README.md`, `ls` |
| `~/dev/site-capture` | не репозиторий: только markdown-документы и папки `phase0/`, `targets/` | `Confirmed` — `ls`, отсутствие `.git` |
| `~/dev/ucon-refinery` | репозиторий `github.com/UCONSD/ucon-refinery`; markdown-реестр (`INBOX/QUEUE/REGISTRY`), приложения нет | `Confirmed` — `ls`, `git remote -v` |
| `~/dev/contrarian-research` | git-репозиторий без remote; Python (`pyproject.toml`, `src/`, `tests/`) | `Confirmed` — `ls`, `git remote -v` |
| `~/dev/_claude`, `~/dev/_corpus` | рабочие черновики сессий и корпус; кода нет | `Confirmed` — `ls` |

---

## 5. Граф зависимостей

Читается как список рёбер «X должен быть готов раньше Y» с причиной. Рёбра, не видимые в коде,
помечены `Assumption` и связаны с вопросом из §7.

### 5.1 Подтверждённые рёбра

**E-1. `templates/coding-session-spec-template.md` (проект «UCON Business OS») → `docs/spec-template.md` во всех трёх репозиториях.**
Причина: копия объявляет источник в шапке; правка идёт в источник, потом обновляются три копии.
Три файла на диске побайтово совпадают (md5 `93276a937f90550c5f6195df4a2159b1`). Это **единственный
объект, общий для всех трёх репозиториев**, и он документ, а не код. `Confirmed` — `md5sum`, шапка файла.

**E-2. `docs/UCON_Object_Contract_v2.md` → `core/20_contract.rb` → `registry/cesar/*.json` → `core/50_registry.rb` → `core/60_generator.rb` → `70_symbols` / `80_panel` / `85_export`.**
Причина: контракт объявлен load-bearing и заперт (Locked); изменение имён атрибутов, допустимых
значений или словаря `status` требует новой версии и миграционной записки. Порядок загрузки ядра
задан номерами файлов. `Confirmed` — контракт §0 и §1, `CLAUDE.md` domain rule 3, `ls core`.

**E-3. `sources/factory/*.pdf` (на конкретной машине) → строка в `registry/cesar/*.json`.**
Причина: каталожный факт попадает в реестр только после сверки с исходным PDF; `sources/` в
`.gitignore`, поэтому том должен физически лежать на той машине, где ведётся извлечение.
`Confirmed` — `CLAUDE.md` domain rule 1 и раздел про две машины.

**E-4. `firestore.rules` → `src/db/schema.js` → `src/hooks/useFirestore.js` → `src/App.jsx` → приёмка на телефоне.**
Причина: в Field App нет серверного яруса, поэтому любая новая функция проводится этой цепочкой
целиком — правило tracer bullet. `Confirmed` — `CLAUDE.md` §Feature workflow.

**E-5. `userSeeds` (приглашение, заводит PM) → первый вход пользователя → `users/{uid}`.**
Причина: `createOrUpdateUser` не выполняется, пока `isEmailAllowed` не найдёт активную запись или
приглашение; приглашение при первом входе превращается в документ `users` и удаляется.
`Confirmed` — `src/db/schema.js:121–149, 187–190`.

**E-6. Finding 1 (полный фикс) → любые новые работы над правами Field App.**
Причина: фикс слит в `main` коммитом `a3a236c` вместе с findings #4/#6/#8/#10; всё, что строится
на модели доступа, теперь строится поверх него, а не поверх состояния из аудита 30.08.
`Confirmed` — `git log main`.

### 5.2 Рёбра, которых в коде нет

**N-1. Между тремя репозиториями нет ни одного импорта, общей схемы или общего remote-хранилища.**
Grep по `src/` каждого репозитория не дал ни одной ссылки на другой репозиторий; единственное
совпадение — путь в комментарии `dev_reload.rb`, указывающий на собственную папку. Общие у них:
организация на GitHub (`UCONSD`), шаблон спеки (E-1) и человек. `Confirmed` — grep по `src/`, `git remote -v`.

**N-2. Takeoff → identity и реестр проектов Field App.** Предполагается в аудите как форма
интеграции. Кода нет ни с одной стороны. `Assumption` — аудит §Recommended Takeoff Integration;
вопросы Q-02, Q-05.

**N-3. Cabinet Engine (экспортёр `85_export` / `86_export_run`) → объёмы работ / Takeoff / оценка.**
Модули экспорта в ядре есть; куда попадает их вывод и потребляет ли его кто-либо за пределами
репозитория — из кода не видно. `Assumption` — `ls core`; вопрос Q-11.

**N-4. UCON Kitchen → Field App.** Ребра нет и оно запрещено документом: «Never assume shared
code, schema, auth, or data with `ucon-field-app`. They share only accounts and workflow.»
`Confirmed` — `ucon-kitchen/CLAUDE.md` §This repo is isolated…; `README.md:17`.

---

## 6. Границы интеграции

Формулировка каждой строки: сессия в A может ничего не знать о B.

| Граница | Формулировка | Метка / источник |
|---|---|---|
| Kitchen ⟂ Field App | Сессия в `ucon-kitchen` может ничего не знать о `ucon-field-app`: разные база, auth, хранилище, деплой и домен — заявлено репозиторием явно | `Confirmed` — `ucon-kitchen/CLAUDE.md`, `README.md:17` |
| Cabinet Engine ⟂ Field App | Сессия в `ucon-cabinet-engine` может ничего не знать о `ucon-field-app`: Ruby-расширение внутри SketchUp и браузерный SPA не имеют общего рантайма и общих файлов | `Confirmed` — grep по `src/`, разные языки и точки входа |
| Cabinet Engine ⟂ Kitchen | Взаимных ссылок нет ни в одну сторону | `Confirmed` — grep по `src/` |
| Внутри Cabinet Engine: `core/00,10,20,50` ⟂ SketchUp API | Эти файлы обязаны грузиться headless; сессия в них может ничего не знать об API SketchUp — API трогают только 30/60/70/80/90 | `Confirmed` — `CLAUDE.md` §Layout |
| Внутри Cabinet Engine: `registry/cesar/*.json` ⟂ `core/` | Добавление секции каталога не требует изменений в `core/` — новый файл сам разворачивает уровни пикера | `Confirmed` — `CLAUDE.md` §How we work |
| Внутри Field App: `App.jsx` — **не** граница | Обратный случай: изолированной работы в `App.jsx` не бывает, два изменения одновременно запрещены. Единственный файл UI — общий ресурс, а не модуль | `Confirmed` — `CLAUDE.md` §Feature workflow |
| Общий шаблон спеки | Правка `docs/spec-template.md` в любом репозитории — не локальное изменение: файл копия, источник в проекте | `Confirmed` — шапка файла, `md5sum` |

---

## 7. Вопросы

Отвечать можно по одному, не перечитывая репозитории.

### 7A. Нужны для решения D-02 «где живёт платформа»

**Q-01. Существует ли хаб UCON·OS как код — и где?**
На этой машине его нет (§2). Нужен URL репозитория или указание машины. Пока ответа нет, любой
выбор кодовой базы — угадывание. Это же главный риск аудита 30.08 (Р1).

**Q-02. Что технически значит «общая система»: единый провайдер identity, единый реестр проектов
или единая база данных?**
Три ответа дают три разные архитектуры и три разных решения D-02.

**Q-03. Какой репозиторий назначается платформой — новый, `ucon-kitchen` или `ucon-field-app`?**
Фактура на сегодня: в `ucon-kitchen` Supabase заявлен документом, но в коде отсутствует и
приложения нет (`Confirmed`, §1.3); в `ucon-field-app` серверного слоя нет вовсе (`Confirmed`, §1.1).
То есть выбор делается не между двумя работающими платформами.

**Q-04. Входит ли Cabinet Engine в контур платформы?**
Это desktop-расширение SketchUp на Ruby без сервера (`Confirmed`, §1.2). Если платформа обязана
его вмещать — набор кандидатов один; если он явно вне контура — другой.

**Q-05. Где живёт Takeoff и от чего он читает проекты?**
Кода нет ни с одной стороны (§2). Ответ на Q-02 задаёт, чем Takeoff связан с Field App —
`projectId` и email по сверке, общая база или ничего.

**Q-06. Кто владеет identity, если у платформы два разных класса пользователей?**
Field App: доступ по allowlist, PM заводит человека до первого входа (`Confirmed`, §1.1).
Kitchen: анонимный публичный трафик, RLS как граница (`Confirmed (as intent)`, §1.3).
Один провайдер identity должен обслужить оба или это два контура.

**Q-07. Данные Field App в Firestore — мигрируют, зеркалятся или остаются как есть?**
От ответа зависит, является ли выбор платформы ещё и миграцией.

**Q-08. Порядок: Takeoff и новые модули — после закрытия долга безопасности Field App или параллельно?**
Finding 1 слит в `main` (`Confirmed`, E-6). Закрыт ли остаток долга — из этой сессии не видно.

### 7B. Остальные — для полноты карты, D-02 не блокируют

**Q-09.** `src/ucon_appliances/` — самостоятельное расширение SketchUp или часть Cabinet Engine?
Регистратор у него отдельный, в `CLAUDE.md` §Layout он не описан (`Confirmed`, §1.2).

**Q-10.** Что считается авторитетным описанием текущего состояния Cabinet Engine:
`claude/repo-state.md` (по правилу репозитория — владелец волатильных чисел) или раздел
`## Current state (2026-08-17)` в `CLAUDE.md`, который диску уже не соответствует?

**Q-11.** Куда попадает вывод `core/85_export.rb` / `86_export_run.rb` и потребляет ли его
что-нибудь за пределами репозитория?

**Q-12.** Остаётся ли заявленная в `ucon-kitchen/docs/ARCHITECTURE.md` схема из семи модулей
планом, при том что кода приложения нет, а на диске лежит CLI-срез движка?

**Q-13.** `pdf2room`, `site-capture`, `ucon-refinery` — модули будущей платформы или отдельные
исследовательские треки? В карту эпиков они сейчас не входят.

**Q-14.** `~/dev/ucon-cabinet` — пустая директория: удалить или зарезервирована?
`ucon-sketchup-scripts` — заменён Cabinet Engine или ещё используется?

**Q-15.** Какая машина держит авторитетный клон? Аудит 30.08 фиксировал незапушенный коммит
`adf8d20` на офисном Маке; в этой сессии читался только лаптоп, и Field App читался на фича-ветке,
а не на `main`.

---

*Составлено чтением кода и документов в режиме read-only. Ни один файл в репозиториях не изменён,
зависимости не устанавливались, git-команд записи не выполнялось. Целевая архитектура не
предлагается: этот файл описывает то, что есть на 2026-09-07.*
