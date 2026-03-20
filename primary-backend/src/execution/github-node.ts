/**
 * GitHub REST helper for workflow "github" catalog nodes.
 * GET operations work for public repos without a token (rate limits apply).
 * Mutations (create_issue) require a valid PAT. `{{secrets.KEY}}` is resolved from the workspace Secret library before this runs.
 */

const GITHUB_API = "https://api.github.com";

export type GithubOperation =
  | "get_repository"
  | "list_issues"
  | "create_issue"
  | "list_pull_requests";

function isSecretPlaceholder(token: unknown): boolean {
  if (token == null || typeof token !== "string") return false;
  const t = token.trim();
  return t.includes("{{") && t.includes("}}");
}

function hasUsablePat(token: unknown): boolean {
  if (token == null || typeof token !== "string") return false;
  const t = token.trim();
  if (t.length < 20) return false;
  if (isSecretPlaceholder(t)) return false;
  return true;
}

async function githubJson(
  path: string,
  opts: { token?: string; method?: string; body?: unknown },
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "AutoChain-Workflow/1.0",
  };
  const t = opts.token?.trim();
  if (t && !isSecretPlaceholder(t)) {
    headers.Authorization = `Bearer ${t}`;
  }

  const init: RequestInit = {
    method: opts.method || "GET",
    headers: { ...headers },
  };

  if (opts.body !== undefined) {
    (init.headers as Record<string, string>)["Content-Type"] = "application/json";
    init.body = JSON.stringify(opts.body);
  }

  const res = await fetch(`${GITHUB_API}${path}`, init);
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}

export function mockGithubOutput(cfg: Record<string, unknown>): Record<string, unknown> {
  const owner = String(cfg.owner ?? "octocat");
  const repo = String(cfg.repo ?? "Hello-World");
  const op = (cfg.operation as GithubOperation) || "get_repository";
  const base: Record<string, unknown> = {
    ok: true,
    simulated: true,
    operation: op,
    fullName: `${owner}/${repo}`,
    message:
      "Simulated response. For live data: use a public repo (GET ops work without a token) or set a GitHub PAT (fine-grained or classic).",
  };
  if (op === "list_issues") {
    base.issues = [{ number: 1, title: "Sample issue", state: "open" }];
  }
  if (op === "list_pull_requests") {
    base.pulls = [{ number: 2, title: "Sample pull request", state: "open" }];
  }
  if (op === "create_issue") {
    base.issueNumber = 99;
    base.htmlUrl = `https://github.com/${owner}/${repo}/issues/99`;
  }
  if (op === "get_repository") {
    base.stars = 42;
    base.openIssues = 3;
    base.defaultBranch = "main";
  }
  return base;
}

/**
 * Calls GitHub REST. On non-OK response, returns { ok: false, ... } (no throw).
 * Falls back to mock output when the API call is not possible or fails for demo workflows.
 */
export async function executeGithubNode(
  cfg: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const owner = String(cfg.owner ?? "").trim();
  const repo = String(cfg.repo ?? "").trim();
  const operation = (cfg.operation as GithubOperation) || "get_repository";
  const token = cfg.personalAccessToken;
  const perPage = Math.min(Math.max(Number(cfg.perPage) || 5, 1), 100);

  if (!owner || !repo) {
    return {
      ...mockGithubOutput(cfg),
      ok: false,
      error: "owner and repo are required",
    };
  }

  const tok = typeof token === "string" ? token : undefined;

  if (operation === "create_issue" && !hasUsablePat(tok)) {
    return {
      ok: true,
      ...mockGithubOutput(cfg),
      note: "create_issue needs a real PAT in personalAccessToken, or `{{secrets.KEY}}` with a matching secret in this workspace.",
    };
  }

  try {
    switch (operation) {
      case "get_repository": {
        const r = await githubJson(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
          token: tok,
        });
        if (!r.ok) {
          return {
            ...mockGithubOutput(cfg),
            ok: false,
            liveFailed: true,
            status: r.status,
            operation,
            error: r.data,
          };
        }
        const d = r.data as Record<string, unknown>;
        return {
          ok: true,
          operation,
          fullName: d.full_name,
          description: d.description,
          defaultBranch: d.default_branch,
          stars: d.stargazers_count,
          openIssues: d.open_issues_count,
          htmlUrl: d.html_url,
        };
      }
      case "list_issues": {
        const r = await githubJson(
          `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?state=open&per_page=${perPage}`,
          { token: tok },
        );
        if (!r.ok) {
          return {
            ...mockGithubOutput(cfg),
            ok: false,
            liveFailed: true,
            status: r.status,
            operation,
            error: r.data,
          };
        }
        const arr = Array.isArray(r.data) ? r.data : [];
        return {
          ok: true,
          operation,
          count: arr.length,
          issues: arr.map((it: any) => ({
            number: it.number,
            title: it.title,
            state: it.state,
            htmlUrl: it.html_url,
          })),
        };
      }
      case "list_pull_requests": {
        const r = await githubJson(
          `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?state=open&per_page=${perPage}`,
          { token: tok },
        );
        if (!r.ok) {
          return {
            ...mockGithubOutput(cfg),
            ok: false,
            liveFailed: true,
            status: r.status,
            operation,
            error: r.data,
          };
        }
        const arr = Array.isArray(r.data) ? r.data : [];
        return {
          ok: true,
          operation,
          count: arr.length,
          pulls: arr.map((it: any) => ({
            number: it.number,
            title: it.title,
            state: it.state,
            htmlUrl: it.html_url,
          })),
        };
      }
      case "create_issue": {
        const title = String(cfg.issueTitle ?? "").trim();
        const body = String(cfg.issueBody ?? "").trim();
        const r = await githubJson(
          `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`,
          {
            token: tok,
            method: "POST",
            body: { title, body: body || undefined },
          },
        );
        if (!r.ok) {
          return {
            ok: false,
            status: r.status,
            operation,
            error: r.data,
          };
        }
        const d = r.data as Record<string, unknown>;
        return {
          ok: true,
          operation,
          issueNumber: d.number,
          htmlUrl: d.html_url,
          title: d.title,
        };
      }
      default:
        return {
          ...mockGithubOutput(cfg),
          ok: false,
          error: `Unknown operation: ${operation}`,
        };
    }
  } catch (e) {
    return {
      ...mockGithubOutput(cfg),
      ok: false,
      liveFailed: true,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
