/**
 * Inactive Assignees Nudge and Unassign Script
 *
 * Scans open assigned issues in the repository:
 * 1. Skips issues with exempt labels (e.g., 'on-hold', 'blocked', 'keep-assigned').
 * 2. Skips issues with active open linked PRs referencing the issue.
 * 3. Checks the last activity timestamp (latest comment, assignment, or update).
 * 4. At 5+ days of inactivity: posts a kind nudge comment reminding the contributor,
 *    suggesting draft PRs or the 'on-hold' label, and adds 'stale-assignment' label.
 * 5. At 7+ days of inactivity (or 2+ days after nudge): unassigns the contributor,
 *    removes 'stale-assignment', posts a friendly unassignment comment, and explains
 *    how to get reassigned when they are ready.
 */

const NUDGE_DAYS = 5;
const UNASSIGN_DAYS = 7;
const EXEMPT_LABELS = ["on-hold", "blocked", "keep-assigned", "wip-extended"];
const STALE_LABEL = "stale-assignment";
const NUDGE_MARKER = "<!-- inactive-assignee-nudge -->";
const UNASSIGN_MARKER = "<!-- inactive-assignee-unassign -->";

function getNudgeMessage(assigneeHandles) {
  const mentions = assigneeHandles.map((h) => `@${h}`).join(" ");
  return `${NUDGE_MARKER}
👋 Hi ${mentions}!

Just checking in on this issue, as it has been assigned for **5 days** without recent activity.

- **Still working on this?** Please share a quick update or open a draft pull request so we know you're making progress.
- **Need more time?** If you have exams, travel, or are waiting on something, let us know and we can add the \`on-hold\` label to pause automatic reassignment.
- **Need help or stuck?** Feel free to ask questions here or in [GitHub Discussions](https://github.com/Muskankr/OpenSourceMate/discussions).

*Note: To keep contribution opportunities open for everyone, if there is no update within **2 days** (7 days total inactivity), this issue will be automatically unassigned. Thank you for contributing to OpenSourceMate!*`;
}

function getUnassignMessage(assigneeHandles) {
  const mentions = assigneeHandles.map((h) => `@${h}`).join(" ");
  return `${UNASSIGN_MARKER}
👋 Hi ${mentions},

This issue is being automatically unassigned because there hasn't been activity for over **7 days**.

**No worries at all!** We understand that priorities and schedules change, and we truly appreciate your willingness to help.

- **Want to pick this up again?** When you have time to work on it, simply leave a comment here asking to be reassigned! If the issue is still open and unassigned, a maintainer will gladly reassign it to you.
- **Explore other issues:** Check out our [good first issues](https://github.com/Muskankr/OpenSourceMate/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) anytime.

Thank you again for being part of our community!`;
}

async function checkInactiveAssignees({ github, context, dryRun = false, now = new Date() }) {
  const owner = context.repo.owner;
  const repo = context.repo.repo;

  console.log(`Checking inactive assignees for ${owner}/${repo} (dryRun: ${dryRun})...`);

  // Fetch all open issues in repository
  const issues = await github.paginate(github.rest.issues.listForRepo, {
    owner,
    repo,
    state: "open",
    per_page: 100,
  });

  console.log(`Found ${issues.length} open items in repository.`);

  let nudgedCount = 0;
  let unassignedCount = 0;
  let skippedCount = 0;

  for (const issue of issues) {
    // Skip pull requests returned by issues API
    if (issue.pull_request) {
      continue;
    }

    // Skip unassigned issues
    if (!issue.assignees || issue.assignees.length === 0) {
      continue;
    }

    const assigneeLogins = issue.assignees.map((a) => a.login);
    const issueLabels = (issue.labels || []).map((l) => (typeof l === "string" ? l : l.name));

    // 1. Skip issues with exempt labels (e.g. on-hold, blocked)
    const isExempt = issueLabels.some((label) => EXEMPT_LABELS.includes(label));
    if (isExempt) {
      console.log(
        `Issue #${issue.number} is exempt via labels (${issueLabels.join(", ")}). Skipping.`
      );
      skippedCount++;
      continue;
    }

    // 2. Check for open linked PRs referencing this issue
    try {
      const prSearch = await github.rest.search.issuesAndPullRequests({
        q: `type:pr state:open repo:${owner}/${repo} ${issue.number}`,
      });
      const hasLinkedPR =
        prSearch.data &&
        prSearch.data.items &&
        prSearch.data.items.some((item) => {
          const body = (item.body || "").toLowerCase();
          const title = (item.title || "").toLowerCase();
          return (
            body.includes(`#${issue.number}`) ||
            body.includes(`/issues/${issue.number}`) ||
            title.includes(`#${issue.number}`)
          );
        });

      if (hasLinkedPR) {
        console.log(`Issue #${issue.number} has open linked PR. Skipping.`);
        skippedCount++;
        continue;
      }
    } catch (err) {
      console.warn(
        `Could not search linked PRs for #${issue.number}: ${err.message}. Continuing check.`
      );
    }

    // 3. Fetch issue comments to determine last activity and previous nudges
    const comments = await github.paginate(github.rest.issues.listComments, {
      owner,
      repo,
      issue_number: issue.number,
      per_page: 100,
    });

    // Find previous automated messages
    const nudgeComment = [...comments]
      .reverse()
      .find((c) => c.body && c.body.includes(NUDGE_MARKER));
    const unassignComment = [...comments]
      .reverse()
      .find((c) => c.body && c.body.includes(UNASSIGN_MARKER));

    // If already unassigned and no new assignee, continue
    if (unassignComment && !nudgeComment) {
      continue;
    }

    // Check if there was contributor activity after the nudge
    const hasActivityAfterNudge =
      nudgeComment &&
      comments.some(
        (c) =>
          new Date(c.created_at) > new Date(nudgeComment.created_at) &&
          !c.body.includes(NUDGE_MARKER) &&
          !c.body.includes(UNASSIGN_MARKER)
      );

    if (hasActivityAfterNudge) {
      console.log(`Issue #${issue.number} has new activity after nudge. Clearing stale label.`);
      if (!dryRun && issueLabels.includes(STALE_LABEL)) {
        try {
          await github.rest.issues.removeLabel({
            owner,
            repo,
            issue_number: issue.number,
            name: STALE_LABEL,
          });
        } catch {
          // Label may not exist or cannot be removed
        }
      }
      continue;
    }

    // Determine the latest activity timestamp
    // Can be the latest comment, the issue update timestamp, or issue creation
    let latestActivityTimestamp = new Date(issue.created_at).getTime();

    // Check non-bot comments
    for (const comment of comments) {
      if (
        comment.body &&
        !comment.body.includes(NUDGE_MARKER) &&
        !comment.body.includes(UNASSIGN_MARKER)
      ) {
        const commentTime = new Date(comment.created_at).getTime();
        if (commentTime > latestActivityTimestamp) {
          latestActivityTimestamp = commentTime;
        }
      }
    }

    const inactiveMs = now.getTime() - latestActivityTimestamp;
    const inactiveDays = inactiveMs / (1000 * 60 * 60 * 24);

    console.log(
      `Issue #${issue.number} assigned to [${assigneeLogins.join(", ")}] inactive for ${inactiveDays.toFixed(1)} days.`
    );

    // 4. Action: Unassign if inactive >= UNASSIGN_DAYS or nudged >= 2 days ago
    const shouldUnassign =
      inactiveDays >= UNASSIGN_DAYS ||
      (nudgeComment &&
        (now.getTime() - new Date(nudgeComment.created_at).getTime()) / (1000 * 60 * 60 * 24) >= 2);

    if (shouldUnassign) {
      console.log(
        `--> Unassigning #${issue.number} (inactive for ${inactiveDays.toFixed(1)} days)`
      );
      unassignedCount++;

      if (!dryRun) {
        // Remove assignees
        await github.rest.issues.removeAssignees({
          owner,
          repo,
          issue_number: issue.number,
          assignees: assigneeLogins,
        });

        // Remove stale label if present
        if (issueLabels.includes(STALE_LABEL)) {
          try {
            await github.rest.issues.removeLabel({
              owner,
              repo,
              issue_number: issue.number,
              name: STALE_LABEL,
            });
          } catch {
            // Ignore if label absent
          }
        }

        // Post kind unassignment comment
        await github.rest.issues.createComment({
          owner,
          repo,
          issue_number: issue.number,
          body: getUnassignMessage(assigneeLogins),
        });
      }
      continue;
    }

    // 5. Action: Nudge if inactive >= NUDGE_DAYS and not yet nudged
    if (inactiveDays >= NUDGE_DAYS && !nudgeComment) {
      console.log(`--> Nudging #${issue.number} (inactive for ${inactiveDays.toFixed(1)} days)`);
      nudgedCount++;

      if (!dryRun) {
        // Add stale label
        try {
          await github.rest.issues.addLabels({
            owner,
            repo,
            issue_number: issue.number,
            labels: [STALE_LABEL],
          });
        } catch (err) {
          console.warn(`Could not add label ${STALE_LABEL}: ${err.message}`);
        }

        // Post friendly reminder comment
        await github.rest.issues.createComment({
          owner,
          repo,
          issue_number: issue.number,
          body: getNudgeMessage(assigneeLogins),
        });
      }
    }
  }

  console.log(
    `Summary: ${nudgedCount} nudged, ${unassignedCount} unassigned, ${skippedCount} skipped.`
  );
  return { nudgedCount, unassignedCount, skippedCount };
}

module.exports = {
  checkInactiveAssignees,
  getNudgeMessage,
  getUnassignMessage,
  NUDGE_DAYS,
  UNASSIGN_DAYS,
  EXEMPT_LABELS,
  STALE_LABEL,
  NUDGE_MARKER,
  UNASSIGN_MARKER,
};
