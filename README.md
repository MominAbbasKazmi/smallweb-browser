# SmallWeb Browser

A miniature, database-backed browser for exploring a connected collection of
user-published pages at custom `.zz` addresses.

## Assessment coverage

| Requirement | Implementation |
| --- | --- |
| Browse and follow links | Address bar and internal `.zz` links, including broken destinations |
| Back and Forward | Navigation stack, forward-branch truncation, and scroll restoration |
| Per-person history | Seeded person selector, visit history, and persisted browser sessions |
| Content search | MongoDB text search across titles and extracted page body text |
| Publish | Simple HTML editor and unique `.zz` page publishing |
| Seed data | Four people, ten connected sites, broken links, and repeatable history |
| Safe rendering | Server sanitization and a sandboxed iframe with a restrictive CSP |

## Tech stack and architecture

- **Client:** React 18 and Vite 6.
- **API:** Node.js, Express 4, and Zod validation.
- **Database:** MongoDB with Mongoose 8.
- **Tests:** Vitest, Supertest, and MongoDB Memory Server for backend tests.

The client sends JSON requests to the Express API. MongoDB stores `Person`,
`Site`, `Visit`, and `BrowserSession` records. The browser navigation reducer
owns the active entry and history stack; the API persists each person's stack
and scroll position. Search indexes both site titles and extracted page text.

## Prerequisites

- Node.js 22.x and npm 10.x (the versions used for verification).
- A running MongoDB server, local or hosted, accessible through
  `MONGODB_URI`.

## Setup

From the repository root, install the locked workspace dependencies:

```powershell
npm ci
Copy-Item .env.example .env
```

In Bash, use `cp .env.example .env` instead of `Copy-Item`.

The `mongodb-memory-server` test dependency can download a MongoDB binary
during installation. If that install-time download is slow, skip it and let the
test runner download the binary when needed:

```powershell
$env:MONGOMS_DISABLE_POSTINSTALL = "1"
npm ci
Remove-Item Env:\MONGOMS_DISABLE_POSTINSTALL
```

In Bash, prefix the install command with `MONGOMS_DISABLE_POSTINSTALL=1`.

The example environment uses:

| Variable | Default | Purpose |
| --- | --- | --- |
| `NODE_ENV` | `development` | Server environment |
| `PORT` | `4000` | Express API port |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Allowed browser-client origin |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/smallweb_browser` | MongoDB connection |

Edit `.env` if MongoDB runs elsewhere. Keep real credentials in `.env`; do not
commit that file. `.env.example` contains development defaults only.

## Seed the database

Start MongoDB first, then run:

```powershell
npm run seed
```

The seed command is repeatable and upserts the sample people, sites, visits,
and sessions without duplicating them.

## Run the application

Open two terminals at the repository root:

```powershell
npm run dev:server
```

```powershell
npm run dev:client
```

Then open <http://localhost:5173>. The API health check is available at
<http://localhost:4000/health>.

## Tests and build

```powershell
npm test
npm --workspace client test
npm run build
```

`npm test` runs the backend suite. The client test command runs the navigation,
link-policy, and API error tests. `npm run build` creates the production client
bundle.

## API overview

- `GET /api/people` - list seeded people.
- `GET /api/sites/:address` and `GET /api/sites/:address/exists` - resolve a
  page or check whether it exists.
- `POST /api/sites` - publish a page.
- `POST /api/visits` and `GET /api/people/:personId/history` - record visits
  and load per-person history.
- `GET /api/people/:personId/session`, `PUT .../session`, and
  `PATCH .../session/scroll` - restore and persist navigation state.
- `GET /api/search?q=...` - search page titles and body text.

## HTML security and limitations

The server sanitizes published HTML using an allowlist, strips active and
embedded content, and extracts searchable plain text from the sanitized page.
Pages render in an iframe with scripts disabled by its sandbox and a
restrictive Content Security Policy. The client intercepts internal `.zz`
links; unsupported destinations are made inert and reported to the user.
Images, external resources, scripts, forms, and real-world browsing are not
supported.

The iframe uses `sandbox="allow-same-origin"` so the parent can attach safe
click and scroll handlers; it does not grant `allow-scripts`. This is a
deliberate tradeoff: never add `allow-scripts` or render unsanitized page HTML.
This project has no login, account system, permissions, multiple tabs,
bookmarks, downloads, or user-hosted assets.

## Submission walkthrough

Suggested narration and timing (about 4 minutes 30 seconds):

1. **0:00-0:25 - Introduction:** Explain that the mini-web is fictional and
   uses Pakistani places and people, but is not the public internet.
2. **0:25-1:15 - Browse:** As Ayesha Malik, open `karachi-seaview.zz`, then follow
   links to `androon-lahore.zz`, `hunza-ka-safar.zz`, and
   `margalla-trails.zz`.
3. **1:15-1:55 - Back and Forward:** Go back to Karachi and forward to
   Margalla Trails, explaining the saved navigation trail.
4. **1:55-2:40 - Search:** Search for `aam`, open the Multan ka Aangan result,
   then return to Find a page and show the results.
5. **2:40-3:20 - Publish:** Publish a page with a unique `.zz` address and
   show that it opens.
6. **3:20-3:45 - Missing page:** Open `missing-seaview-map.zz` from Karachi
   Seaview and show its not-found History entry.
7. **3:45-4:30 - Wrap-up:** Explain the Person, Site, Visit, and
   BrowserSession data; HTML sanitization and iframe sandbox; and deliberate
   exclusions such as real-world browsing, accounts, tabs, and bookmarks.

**Demo video:** [Watch the narrated walkthrough](https://drive.google.com/file/d/1GvfAYgdIZ9J_hEf9a3EbLUPOxDdABWjn/view?usp=sharing).
