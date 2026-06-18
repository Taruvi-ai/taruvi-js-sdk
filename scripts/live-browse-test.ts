/**
 * Live integration test for the Storage.browse() SDK method.
 *
 * Run:
 *   npx tsx scripts/live-browse-test.ts
 *
 * Requires a running Taruvi backend at localhost:8000 and a valid JWT.
 * Generates its own JWT via the Django management shell — no manual token needed.
 *
 * Architecture:
 *   Uses the real Storage builder (URL construction + filter merging)
 *   but swaps in a JWT-authenticated axios client so the calls reach
 *   the backend without needing an allauth session token.
 */

import axios from "axios";
import { execSync } from "child_process";
import { Client, Storage } from "../src/index.js";
import type {
  StorageBrowseResponse,
  StorageBrowseFolder,
  StorageBrowseFile,
} from "../src/index.js";

// ── Config ────────────────────────────────────────────────────────────────────

const SITE = "dev-appbuild";
const APP = "sdk-browse-test";
const BUCKET = "sdk-test-bucket";
const API_BASE = "http://localhost:8000";
const SITE_API = `${API_BASE}/sites/${SITE}`;
const DJANGO_ROOT = "/Users/prajwalk/Projects/Taruvi";
const PYTHON = `${DJANGO_ROOT}/.venv/bin/python3`;

// ── Colours ───────────────────────────────────────────────────────────────────

const C = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
};

// ── Test state ────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures: string[] = [];

function pass(name: string) {
  passed++;
  console.log(`  ${C.green("✓")} ${name}`);
}

function fail(name: string, detail?: string) {
  failed++;
  failures.push(name + (detail ? `: ${detail}` : ""));
  console.log(`  ${C.red("✗")} ${name}`);
  if (detail) console.log(`    ${C.dim(detail)}`);
}

function section(title: string) {
  console.log(`\n${C.bold(title)}`);
}

function assert(condition: boolean, name: string, detail?: string) {
  condition ? pass(name) : fail(name, detail);
}

// ── JWT helper ────────────────────────────────────────────────────────────────

function getJWT(): string {
  // Python one-liner using semicolons — safe to pass on a single shell line
  const oneliner = [
    "from rest_framework_simplejwt.tokens import RefreshToken",
    "from django.contrib.auth import get_user_model",
    "U=get_user_model()",
    "u=U.objects.filter(is_superuser=True).first()",
    "r=RefreshToken.for_user(u)",
    "print(str(r.access_token))",
  ].join("; ");

  const result = execSync(
    `cd ${DJANGO_ROOT} && ${PYTHON} manage.py shell -c "${oneliner}"`,
    { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
  );
  // stdout has shell-import noise before the token; grab the last non-empty line
  return result.trim().split("\n").at(-1)!.trim();
}

// ── Build JWT-authenticated SDK client ────────────────────────────────────────
//
// The Storage builder calls this.client.httpClient.get(url, opts).
// We inject a custom httpClient that uses axios with Authorization: Bearer
// so we get full SDK URL-building while bypassing allauth session auth.

function buildSdkClient(jwt: string): Client {
  const jwtAxios = axios.create({
    baseURL: SITE_API,
    headers: { Authorization: `Bearer ${jwt}` },
  });

  const mockHttpClient = {
    get: async <T>(endpoint: string, opts?: { responseType?: string }) => {
      const res = await jwtAxios.get<T>(`/${endpoint}`, {
        responseType: (opts?.responseType as "blob" | "json") ?? "json",
      });
      return res.data;
    },
    post: async <T>(endpoint: string, body: unknown) => {
      const res = await jwtAxios.post<T>(`/${endpoint}`, body);
      return res.data;
    },
    put: async <T>(endpoint: string, body: unknown) => {
      const res = await jwtAxios.put<T>(`/${endpoint}`, body);
      return res.data;
    },
    delete: async <T>(endpoint: string) => {
      const res = await jwtAxios.delete<T>(`/${endpoint}`);
      return res.data;
    },
  };

  return {
    httpClient: mockHttpClient,
    getConfig: () => ({
      apiKey: "live-test",
      appSlug: APP,
      apiUrl: SITE_API,
    }),
  } as unknown as Client;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isFolder(e: StorageBrowseFolder | StorageBrowseFile): e is StorageBrowseFolder {
  return e.type === "folder";
}

// ── Tests ─────────────────────────────────────────────────────────────────────

async function runTests(client: Client) {
  const storage = new Storage(client);

  // ── 1. Root browse ─────────────────────────────────────────────────────────
  section("1. Root browse — folders + files at top level");
  {
    const res = await storage
      .from(BUCKET)
      .browse()
      .execute<StorageBrowseResponse>();

    assert(res.status === "success", "status is success");
    assert(typeof res.data.prefix === "string", "data.prefix is string");
    assert(res.data.prefix === "", "prefix is empty string at root");
    assert(Array.isArray(res.data.folders), "data.folders is array");
    assert(Array.isArray(res.data.objects), "data.objects is array");
    assert(typeof res.data.has_next === "boolean", "data.has_next is boolean");
    assert(typeof res.data.page === "number", "data.page is number");
    assert(typeof res.data.page_size === "number", "data.page_size is number");

    // Should see 3 top-level folders + 2 root files
    const folderNames = res.data.folders.map((f) => f.name).sort();
    const fileNames = res.data.objects.map((o) => o.name).sort();
    assert(folderNames.includes("reports"), "folders includes 'reports'");
    assert(folderNames.includes("invoices"), "folders includes 'invoices'");
    assert(folderNames.includes("archive"), "folders includes 'archive'");
    assert(fileNames.includes("readme.md"), "objects includes 'readme.md'");
    assert(fileNames.includes("logo.png"), "objects includes 'logo.png'");

    // Type discriminants
    assert(
      res.data.folders.every((f) => f.type === "folder"),
      "all folders have type='folder'"
    );
    assert(
      res.data.objects.every((o) => o.type === "file"),
      "all objects have type='file'"
    );

    // Folder path ends with /
    const reportsFolder = res.data.folders.find((f) => f.name === "reports");
    assert(
      reportsFolder?.path === "reports/",
      "reports folder path = 'reports/'"
    );

    // File shape: required fields
    const readme = res.data.objects.find((o) => o.name === "readme.md");
    assert(typeof readme?.id === "number", "file has numeric id");
    assert(typeof readme?.uuid === "string", "file has uuid string");
    assert(typeof readme?.size === "number", "file has numeric size");
    assert(typeof readme?.mimetype === "string", "file has mimetype");
    assert(typeof readme?.visibility === "string", "file has visibility");
    assert(typeof readme?.is_office_editable === "boolean", "file has is_office_editable");
    assert(typeof readme?.created_at === "string", "file has created_at");
    assert(typeof readme?.updated_at === "string", "file has updated_at");
    assert("download_url" in (readme ?? {}), "file has download_url field");
  }

  // ── 2. Navigate into subfolder ─────────────────────────────────────────────
  section("2. Navigate into 'reports/' subfolder");
  {
    const res = await storage
      .from(BUCKET)
      .browse({ prefix: "reports/" })
      .execute<StorageBrowseResponse>();

    assert(res.status === "success", "status is success");
    assert(res.data.prefix === "reports/", "prefix = 'reports/'");

    const fileNames = res.data.objects.map((o) => o.name).sort();
    assert(fileNames.includes("q1-2024.pdf"), "contains q1-2024.pdf");
    assert(fileNames.includes("q2-2024.pdf"), "contains q2-2024.pdf");

    // Should see '2025' as a subfolder
    assert(
      res.data.folders.some((f) => f.name === "2025"),
      "has sub-folder '2025'"
    );

    // Files paths should be prefix + name
    const q1 = res.data.objects.find((o) => o.name === "q1-2024.pdf");
    assert(q1?.path === "reports/q1-2024.pdf", "file path = 'reports/q1-2024.pdf'");
  }

  // ── 3. Deep subfolder navigation ───────────────────────────────────────────
  section("3. Navigate into 'reports/2025/' (two levels deep)");
  {
    const res = await storage
      .from(BUCKET)
      .browse({ prefix: "reports/2025/" })
      .execute<StorageBrowseResponse>();

    assert(res.status === "success", "status is success");
    assert(res.data.prefix === "reports/2025/", "prefix = 'reports/2025/'");
    assert(res.data.folders.length === 0, "no sub-folders");
    assert(
      res.data.objects.some((o) => o.name === "annual.pdf"),
      "contains annual.pdf"
    );
  }

  // ── 4. Pagination ──────────────────────────────────────────────────────────
  section("4. Pagination — page_size=2 on reports/");
  {
    const page1 = await storage
      .from(BUCKET)
      .browse({ prefix: "reports/", page: 1, page_size: 2 })
      .execute<StorageBrowseResponse>();

    assert(page1.status === "success", "page 1 status success");
    assert(page1.data.page === 1, "page = 1");
    assert(page1.data.page_size === 2, "page_size = 2");
    const p1Total = page1.data.folders.length + page1.data.objects.length;
    assert(p1Total <= 2, `page 1 entries <= page_size (got ${p1Total})`);
    assert(page1.data.has_next === true, "has_next = true (more pages exist)");

    const page2 = await storage
      .from(BUCKET)
      .browse({ prefix: "reports/", page: 2, page_size: 2 })
      .execute<StorageBrowseResponse>();

    assert(page2.status === "success", "page 2 status success");
    assert(page2.data.page === 2, "page = 2");
  }

  // ── 5. Sorting ─────────────────────────────────────────────────────────────
  section("5. Sort: name asc vs name desc");
  {
    const asc = await storage
      .from(BUCKET)
      .browse({ sort: "name", order: "asc" })
      .execute<StorageBrowseResponse>();

    const desc = await storage
      .from(BUCKET)
      .browse({ sort: "name", order: "desc" })
      .execute<StorageBrowseResponse>();

    assert(asc.status === "success", "asc status success");
    assert(desc.status === "success", "desc status success");

    const ascNames = [
      ...asc.data.folders.map((f) => f.name),
      ...asc.data.objects.map((o) => o.name),
    ];
    const descNames = [
      ...desc.data.folders.map((f) => f.name),
      ...desc.data.objects.map((o) => o.name),
    ];

    // If more than 1 entry, order should differ
    if (ascNames.length > 1) {
      assert(
        JSON.stringify(ascNames) !== JSON.stringify(descNames),
        "asc and desc orders differ"
      );
    } else {
      pass("only 1 entry — skip order-diff check");
    }

    // Sort by size
    const bySize = await storage
      .from(BUCKET)
      .browse({ sort: "size", order: "desc" })
      .execute<StorageBrowseResponse>();
    assert(bySize.status === "success", "sort by size desc succeeds");
  }

  // ── 6. Empty subfolder ─────────────────────────────────────────────────────
  section("6. Empty prefix (nonexistent folder)");
  {
    const res = await storage
      .from(BUCKET)
      .browse({ prefix: "nonexistent-folder/" })
      .execute<StorageBrowseResponse>();

    assert(res.status === "success", "status success for empty prefix");
    assert(res.data.folders.length === 0, "no folders");
    assert(res.data.objects.length === 0, "no objects");
    assert(res.data.has_next === false, "has_next false");
  }

  // ── 7. Invalid sort rejected gracefully ───────────────────────────────────
  section("7. Invalid sort param → 400 validation error");
  {
    try {
      await storage
        .from(BUCKET)
        .browse({ sort: "invalid_col" as "name" })
        .execute<StorageBrowseResponse>();
      fail("should have thrown on invalid sort");
    } catch (err: unknown) {
      const status =
        (err as { response?: { status?: number } })?.response?.status ?? 0;
      assert(status === 400, `got 400 for invalid sort (got ${status})`);
    }
  }

  // ── 8. Unauthenticated request rejected ───────────────────────────────────
  section("8. Unauthenticated browse → 401/403");
  {
    try {
      const unauthClient = {
        httpClient: {
          get: async <T>(endpoint: string) => {
            const res = await axios.get<T>(`${SITE_API}/${endpoint}`);
            return res.data;
          },
        },
        getConfig: () => ({
          apiKey: "live-test",
          appSlug: APP,
          apiUrl: SITE_API,
        }),
      } as unknown as Client;

      await new Storage(unauthClient).from(BUCKET).browse().execute();
      fail("unauthenticated request should have been rejected");
    } catch (err: unknown) {
      const status =
        (err as { response?: { status?: number } })?.response?.status ?? 0;
      assert(
        status === 401 || status === 403,
        `unauthenticated returns 401/403 (got ${status})`
      );
    }
  }

  // ── 9. URL shape verification ──────────────────────────────────────────────
  section("9. SDK URL construction matches expected pattern");
  {
    const capturedUrls: string[] = [];
    const spyClient = {
      httpClient: {
        get: async <T>(endpoint: string) => {
          capturedUrls.push(endpoint);
          return {} as T;
        },
      },
      getConfig: () => ({
        apiKey: "spy",
        appSlug: APP,
        apiUrl: SITE_API,
      }),
    } as unknown as Client;

    // Root browse URL
    await new Storage(spyClient).from(BUCKET).browse().execute().catch(() => {});
    assert(
      capturedUrls[0]?.includes(`/objects/browse/`),
      `root URL contains /objects/browse/ (got: ${capturedUrls[0]})`
    );

    // Browse with filters URL
    await new Storage(spyClient)
      .from(BUCKET)
      .browse({ prefix: "docs/", page: 2, page_size: 10, sort: "name", order: "asc" })
      .execute()
      .catch(() => {});
    const filterUrl = capturedUrls[1] ?? "";
    assert(filterUrl.includes("prefix=docs%2F"), `prefix encoded in URL`);
    assert(filterUrl.includes("page=2"), `page in URL`);
    assert(filterUrl.includes("page_size=10"), `page_size in URL`);
    assert(filterUrl.includes("sort=name"), `sort in URL`);
    assert(filterUrl.includes("order=asc"), `order in URL`);
    assert(!filterUrl.includes("limit="), `'limit' NOT in URL (deprecated)`);
    assert(!filterUrl.includes("offset="), `'offset' NOT in URL (deprecated)`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(C.bold("\nTaruvi SDK — browse() live integration test"));
  console.log(C.dim(`  Site: ${SITE} | App: ${APP} | Bucket: ${BUCKET}\n`));

  let jwt: string;
  try {
    process.stdout.write("Acquiring JWT... ");
    jwt = getJWT();
    console.log(C.green("OK") + C.dim(` (${jwt.substring(0, 20)}...)`));
  } catch (err) {
    console.log(C.red("FAILED"));
    console.error("Could not get JWT:", err);
    process.exit(1);
  }

  const client = buildSdkClient(jwt);

  try {
    await runTests(client);
  } catch (err) {
    console.error(C.red("\nUnhandled error:"), err);
    failed++;
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n${C.bold("─".repeat(50))}`);
  const total = passed + failed;
  const summary =
    failed === 0
      ? C.green(`All ${total} assertions passed`)
      : C.red(`${failed} failed`) + C.dim(` / ${total} total`);
  console.log(`  ${summary}`);

  if (failures.length > 0) {
    console.log(C.red("\n  Failures:"));
    failures.forEach((f) => console.log(`    ${C.red("•")} ${f}`));
  }

  console.log();
  process.exit(failed > 0 ? 1 : 0);
}

main();
