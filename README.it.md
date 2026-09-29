# Playwright boilerplate

🇬🇧 [Read in English](README.md)

Un punto di partenza pronto all'uso per i test end-to-end con [Playwright](https://playwright.dev)
e TypeScript. Offre una struttura di progetto pulita e convenzioni collaudate, così puoi scrivere i
test per la tua applicazione fin dal primo giorno invece di costruire prima l'impalcatura.

Funziona subito: include una piccola applicazione demo locale, quindi `npm test` passa senza
account esterni, database o server.

## Funzionalità

- **Page object in tre file**: locator, azioni e classe della pagina restano separati, così le spec
  si leggono come semplici passaggi.
- **Fixture composte**: page object e helper vengono iniettati nei test tramite `mergeTests()`,
  senza codice di setup dentro le spec.
- **Un solo login per browser**: un progetto di setup esegue l'accesso, salva la sessione e ogni
  test la riutilizza.
- **Configurazione tipizzata**: le variabili d'ambiente sono validate con [Zod](https://zod.dev)
  all'avvio, quindi un valore mancante o non valido fallisce subito con un messaggio chiaro.
- **Controlli di accessibilità**: la fixture `scanAxe()` esegue
  [axe-core](https://github.com/dequelabs/axe-core) secondo WCAG 2.1 A/AA e allega i risultati
  completi al report.
- **Multi-browser**: Chromium, Firefox e WebKit di default.
- **Strumenti di qualità**: ESLint, Prettier, TypeScript in modalità strict e un hook pre-commit
  Husky con lint-staged.
- **Pronto per la CI**: un workflow GitHub Actions per controlli e test sui browser.
- **Pensato per gli assistenti AI**: linee guida condivise in
  [docs/ai/repository-guidelines.md](docs/ai/repository-guidelines.md) (in inglese) e
  [skill](#skill-per-gli-assistenti-ai) riutilizzabili per Claude Code, GitHub Copilot, Codex e
  Gemini.

## Requisiti

- Node.js 22 o superiore
- npm

## Avvio rapido

```sh
npm ci
npx playwright install --with-deps
npm test
```

Playwright avvia l'applicazione demo su `http://127.0.0.1:4173`, esegue l'accesso una volta per
browser e lancia le spec di esempio (riuso della sessione, logout e validazione del form) su tutti e
tre i browser, con una scansione di accessibilità per ogni stato dell'interfaccia.

> Il login della demo salva solo un nome visualizzato in `localStorage`. È un segnaposto, non un
> sistema di autenticazione sicuro.

## Script

| Comando                                          | Cosa fa                                             |
| ------------------------------------------------ | --------------------------------------------------- |
| `npm test`                                       | Esegue tutti i test su tutti i browser              |
| `npm run test:chromium` / `:firefox` / `:webkit` | Esegue i test su un solo browser                    |
| `npm run test:headed`                            | Esegue i test con il browser visibile               |
| `npm run test:ui`                                | Apre la UI mode di Playwright                       |
| `npm run test:list`                              | Elenca i test senza eseguirli                       |
| `npm run report`                                 | Apre l'ultimo report HTML                           |
| `npm run type:check`                             | Controllo dei tipi con `tsc`                        |
| `npm run lint`                                   | Lint con ESLint                                     |
| `npm run format` / `format:check`                | Formatta, o verifica la formattazione, con Prettier |

## Struttura del progetto

```text
.
├── lib/
│   ├── api/            # Costanti degli status HTTP e classificazione degli errori
│   ├── auth/           # Percorsi dello storage state e helper di setup
│   └── fixtures/       # Fixture composte con mergeTests() (page object, accessibilità)
├── src/
│   ├── config/
│   │   ├── environments/   # Configurazione di runtime già validata
│   │   └── schemas/        # Schemi Zod per ambiente e utenti
│   ├── pages/<dominio>/    # Page object: <Nome>Locators, <Nome>Actions, <Nome>Page
│   ├── shared/types/       # Tipi TypeScript condivisi
│   └── tests/
│       ├── setup/          # Setup dell'autenticazione per browser
│       └── ui/<dominio>/   # Spec UI
├── scripts/demo-server.mjs # Applicazione demo locale usata dagli esempi
├── docs/ai/                # Linee guida condivise del repository
└── playwright.config.ts
```

Gli import usano gli alias `@lib/*`, `@fixtures/*`, `@pages/*`, `@config/*` e `@shared/*`.

## Com'è fatto un test

```ts
import { test, expect } from '@fixtures/base';

test('signs out of the example app', async ({ examplePage, scanAxe }) => {
  await examplePage.do.open();
  await examplePage.do.signOut();
  await expect(examplePage.on.displayName).toBeVisible();
  await scanAxe('signed-out');
});
```

`examplePage.on` contiene i locator ed `examplePage.do` contiene le azioni. Entrambi provengono dal
page object in `src/pages/example/`.

## Adattarlo alla tua applicazione

1. Copia `.env.example` in `.env`, poi imposta `ENV=test` e `BASE_URL` con l'URL della tua
   applicazione. Con `ENV=test` il server demo non viene avviato.
2. Sostituisci il page object di esempio in `src/pages/example/` con i tuoi, mantenendo la
   suddivisione Locators / Actions / Page.
3. Aggiorna `src/tests/setup/auth.ui.setup.ts` con il tuo vero flusso di login. Verifica che
   l'accesso sia riuscito prima di salvare lo stato ed evita attese fisse.
4. Registra i tuoi page object in `lib/fixtures/page-fixture.ts`.
5. Sostituisci le spec di esempio in `src/tests/ui/`.
6. Aggiungi utenti e impostazioni tramite gli schemi Zod in `src/config/schemas/`. Leggi le
   credenziali da variabili d'ambiente o secret della CI e non committarle mai.

### Note sullo stato di autenticazione

- La sessione viene salvata per ogni ambiente e browser in `.auth/<env>/<browser>.json`. Viene
  rigenerata a ogni esecuzione ed è ignorata da Git.
- Playwright salva cookie e `localStorage`. Se la tua applicazione usa `sessionStorage`, devi
  salvarlo e ripristinarlo tu.
- I test che modificano lo stato dell'account lato server dovrebbero usare un account diverso per
  ogni worker.

## Integrazione continua

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) viene eseguito sui push su `main`, sulle
pull request e su richiesta. Controlla i tipi, esegue il lint, verifica la formattazione, controlla
che gli entry point delle skill AI siano sincronizzati, lancia tutti i test sui browser e carica il
report HTML come artifact. Non richiede secret né servizi esterni.

## Skill per gli assistenti AI

Le skill sono flussi di lavoro passo passo che gli assistenti AI possono eseguire su richiesta.
Ognuna è scritta una sola volta in `.agents/skills/<nome>/SKILL.md` (in inglese) ed è condivisa da
tutti gli assistenti supportati.

| Skill                   | Cosa fa                                                                       |
| ----------------------- | ----------------------------------------------------------------------------- |
| `create-page-object`    | Crea un page object e la prima spec partendo dall'applicazione reale          |
| `pom-reviewer`          | Verifica page object e spec rispetto alle regole del Page Object Model        |
| `a11y-reviewer`         | Controlla che le spec UI scansionino ogni stato rilevante per l'accessibilità |
| `refactor-spec`         | Sposta locator e interazioni dalla spec ai page object                        |
| `review-branch`         | Revisiona il diff di un branch locale, esegue i controlli e riporta l'esito   |
| `investigate-pr`        | Raccoglie diff, review e stato CI di una PR GitHub prima della revisione      |
| `pr-description-writer` | Prepara la descrizione di una PR e segnala modifiche non correlate            |
| `debug-test`            | Analizza un test fallito o instabile e ne corregge la causa                   |
| `log-test-error`        | Diagnostica un errore dei test e lo registra in `docs/troubleshooting.md`     |
| `safe-rename`           | Modifica un valore condiviso dopo averne trovato tutti gli utilizzi           |
| `review-scenarios`      | Verifica che i piani di test siano completi e pronti per l'automazione        |

Dopo aver aggiunto o modificato una skill, esegui `npm run ai:skills:sync`. Genera gli entry point
per ogni assistente: `.claude/skills/` e `.claude/agents/` per Claude Code, `.github/prompts/` per
Copilot e l'elenco delle skill in `AGENTS.md` per Codex e Gemini. Non modificare mai a mano questi
file generati.

Per Claude Code, `.claude/settings.json` aggiunge anche due hook: uno blocca le modifiche che
violano le linee guida verificabili in automatico (per esempio i selettori XPath), l'altro esegue
lint e formattazione su ogni file TypeScript appena scritto. Impedisce inoltre all'assistente di
leggere o modificare `.env`.

## Convenzioni

Le convenzioni per page object, fixture, autenticazione, copertura API e accessibilità sono in
[docs/ai/repository-guidelines.md](docs/ai/repository-guidelines.md) (in inglese). Sono scritte sia
per le persone sia per gli assistenti AI.

Prima di aprire una pull request, esegui:

```sh
npm run type:check && npm run lint && npm run format:check && npm test
```
