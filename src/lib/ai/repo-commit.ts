// Commits a single file to the gravixar-marketing repo on its default
// branch. Used by the SEO agent (Phase 6.B4) to land drafts directly
// at `content/blog/_drafts/<date>-<slug>.mdx` so HQ /content picks them
// up automatically (and the existing Phase 6.A2 Promote button can
// move them out of _drafts/ → live in one click).
//
// Why a direct main-branch commit instead of a PR:
// - The file lives under _drafts/ which is excluded from the production
//   build (loadBlogPosts({ includeDrafts: false }) is the default).
//   So the agent's commit doesn't change what's publicly visible.
// - The human-in-the-loop review happens at Promote time (HQ /content
//   → click Promote → PR opens → operator reviews + merges → live).
// - A two-step review (agent commit + promote PR) is overkill; the
//   single promote PR is sufficient.

import { Octokit } from "@octokit/rest";

const MARKETING_REPO = "gravixar-sv/gravixar-marketing";

export interface CommitFileResult {
  ok: true;
  sha: string;
  commitSha: string;
  url: string;
}

export interface CommitFileError {
  ok: false;
  error: string;
}

interface CommitFileArgs {
  /** GitHub fine-grained PAT — needs Contents: Write on the target repo. */
  token: string;
  /** Repo-relative path, e.g. `content/blog/_drafts/2026-05-12-foo.mdx` */
  path: string;
  /** UTF-8 file content */
  content: string;
  /** Commit message subject (single line) */
  message: string;
  /** Optional author override; defaults to gravixar-bot identity */
  author?: { name: string; email: string };
}

export async function commitFileToMain(
  args: CommitFileArgs,
): Promise<CommitFileResult | CommitFileError> {
  const octokit = new Octokit({
    auth: args.token,
    userAgent: "gravixar-seo-agent",
  });
  const [owner, repo] = MARKETING_REPO.split("/") as [string, string];
  const author = args.author ?? {
    name: "gravixar SEO agent",
    email: "seo-agent@gravixar.com",
  };

  try {
    // Resolve default branch + base SHA + base tree.
    const { data: repoMeta } = await octokit.repos.get({ owner, repo });
    const baseBranch = repoMeta.default_branch;
    const { data: baseRef } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${baseBranch}`,
    });
    const baseSha = baseRef.object.sha;
    const { data: baseCommit } = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: baseSha,
    });
    const baseTreeSha = baseCommit.tree.sha;

    // Build a tree that adds the file. Single-file tree on top of the
    // existing base — Octokit handles the merge.
    const { data: newTree } = await octokit.git.createTree({
      owner,
      repo,
      base_tree: baseTreeSha,
      tree: [
        {
          path: args.path,
          mode: "100644",
          type: "blob",
          content: args.content,
        },
      ],
    });

    // Create commit.
    const { data: commit } = await octokit.git.createCommit({
      owner,
      repo,
      message: args.message,
      tree: newTree.sha,
      parents: [baseSha],
      author: { ...author, date: new Date().toISOString() },
      committer: author,
    });

    // Fast-forward the default branch ref to the new commit. This is
    // a direct push to main — safe here because the file lives under
    // _drafts/ and is excluded from the production build.
    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${baseBranch}`,
      sha: commit.sha,
    });

    // Octokit's tree response gives us the new blob SHA via .tree[],
    // but we'd need to find the matching path. Cheaper: just hand
    // back the commit info; callers don't currently need the blob sha.
    return {
      ok: true,
      sha: newTree.sha,
      commitSha: commit.sha,
      url: `https://github.com/${owner}/${repo}/blob/${baseBranch}/${args.path}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
