> **Internal planning doc.** For current SDK usage, see **[docs/README.md](docs/README.md)**.

taruvi-sdk/
├── src/                                    # Source code
│   ├── index.ts                           # Main entry point
│   ├── client.ts                          # TaruviClient class
│   ├── types.ts                           # Shared types
│   │
│   ├── lib/                               # Public API modules
│   │   ├── auth/
│   │   │   ├── AuthClient.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── database/
│   │   │   ├── DatabaseClient.ts
│   │   │   ├── QueryBuilder.ts
│   │   │   ├── filters.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── storage/
│   │   │   ├── StorageClient.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   │
│   │   └── function/
│   │       ├── FunctionsClient.ts
│   │       ├── types.ts
│   │       └── index.ts
│   │
│   ├── lib-internal/                      # Internal infrastructure
│   │   ├── http/
│   │   │   ├── HttpClient.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── errors/
│   │   │   ├── TaruviError.ts
│   │   │   ├── AuthError.ts
│   │   │   ├── DatabaseError.ts
│   │   │   ├── StorageError.ts
│   │   │   ├── NetworkError.ts
│   │   │   ├── ValidationError.ts
│   │   │   └── index.ts
│   │   │
│   │   └── token/
│   │       ├── TokenManager.ts
│   │       ├── StorageAdapter.ts
│   │       ├── types.ts
│   │       └── index.ts
│   │
│   └── utils/
│       ├── validators.ts
│       └── index.ts
│
├── tests/                                  # All tests here ✅
│   ├── setup.ts                           # Global test setup
│   │
│   ├── mocks/                             # Mock data & handlers
│   │   ├── server.ts                      # MSW server setup
│   │   ├── handlers.ts                    # API request handlers
│   │   └── data/
│   │       ├── users.ts                   # Mock user data
│   │       ├── sessions.ts                # Mock session data
│   │       └── files.ts                   # Mock file data
│   │
│   ├── factories/                         # Test data factories
│   │   ├── index.ts                       # Export all factories
│   │   ├── user.factory.ts
│   │   ├── session.factory.ts
│   │   └── database.factory.ts
│   │
│   ├── utils/                             # Test helpers
│   │   ├── test-helpers.ts
│   │   └── custom-matchers.ts
│   │
│   ├── unit/                              # Unit tests (70%)
│   │   ├── lib-internal/
│   │   │   ├── http/
│   │   │   │   └── HttpClient.test.ts
│   │   │   ├── errors/
│   │   │   │   ├── TaruviError.test.ts
│   │   │   │   ├── AuthError.test.ts
│   │   │   │   └── NetworkError.test.ts
│   │   │   └── token/
│   │   │       └── TokenManager.test.ts
│   │   │
│   │   └── lib/
│   │       ├── auth/
│   │       │   ├── AuthClient.test.ts
│   │       │   └── providers.test.ts
│   │       ├── database/
│   │       │   ├── DatabaseClient.test.ts
│   │       │   ├── QueryBuilder.test.ts
│   │       │   └── filters.test.ts
│   │       ├── storage/
│   │       │   └── StorageClient.test.ts
│   │       └── function/
│   │           └── FunctionsClient.test.ts
│   │
│   ├── integration/                       # Integration tests (20%)
│   │   ├── auth-flow.test.ts
│   │   ├── database-operations.test.ts
│   │   ├── storage-operations.test.ts
│   │   └── token-refresh.test.ts
│   │
│   └── e2e/                               # End-to-end tests (10%)
│       ├── auth-workflows.test.ts
│       ├── crud-workflows.test.ts
│       └── file-upload-workflows.test.ts
│
├── dist/                                   # Build output (gitignored)
│   ├── index.js
│   ├── index.d.ts
│   ├── lib/
│   └── ...
│
├── coverage/                               # Coverage reports (gitignored)
│   ├── index.html
│   └── lcov.info
│
├── node_modules/                           # Dependencies (gitignored)
│
├── .github/
│   └── workflows/
│       └── test.yml                       # CI/CD workflow
│
├── vitest.config.ts                       # Vitest configuration ✅
├── tsconfig.json                          # TypeScript config
├── package.json                           # Package metadata
├── .gitignore                             # Git ignore rules
├── .npmignore                             # npm ignore rules (optional)
├── README.md                              # Documentation
├── LICENSE                                # License file
└── CHANGELOG.md                           # Version history (optional)