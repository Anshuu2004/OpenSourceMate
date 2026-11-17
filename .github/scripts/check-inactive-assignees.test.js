const { test, describe } = require("node:test");
const assert = require("node:assert");
const {
  checkInactiveAssignees,
  getNudgeMessage,
  getUnassignMessage,
  NUDGE_MARKER,
  UNASSIGN_MARKER,
  STALE_LABEL,
} = require("./check-inactive-assignees.js");

describe("Inactive Assignees Workflow Logic", () => {
  const mockContext = {
    repo: {
      owner: "Muskankr",
      repo: "OpenSourceMate",
    },
  };

  function createMockGithub({ issues = [], comments = {}, prs = [] }) {
    const apiCalls = {
      createComment: [],
      removeAssignees: [],
      addLabels: [],
      removeLabel: [],
    };

    const github = {
      paginate: async (method, params) => {
        if (params.issue_number) {
          return comments[params.issue_number] || [];
        }
        return issues;
      },
      rest: {
        issues: {
          listForRepo: async () => issues,
          listComments: async ({ issue_number }) => ({ data: comments[issue_number] || [] }),
          createComment: async (params) => {
            apiCalls.createComment.push(params);
            return { data: { id: 101, ...params } };
          },
          removeAssignees: async (params) => {
            apiCalls.removeAssignees.push(params);
            return { data: {} };
          },
          addLabels: async (params) => {
            apiCalls.addLabels.push(params);
            return { data: [] };
          },
          removeLabel: async (params) => {
            apiCalls.removeLabel.push(params);
            return { data: [] };
          },
        },
        search: {
          issuesAndPullRequests: async ({ q }) => {
            const matches = prs.filter((pr) => {
              const text = (pr.title + " " + (pr.body || "")).toLowerCase();
              return q.split(" ").some((term) => term && text.includes(term.toLowerCase()));
            });
            return { data: { total_count: matches.length, items: matches } };
          },
        },
      },
      apiCalls,
    };

    return github;
  }

  test("messages contain polite tone, handles, and reassignment guidelines", () => {
    const nudge = getNudgeMessage(["testuser"]);
    assert.match(nudge, /@testuser/);
    assert.match(nudge, /5 days/i);
    assert.match(nudge, /on-hold/);
    assert.match(nudge, new RegExp(NUDGE_MARKER));

    const unassign = getUnassignMessage(["testuser"]);
    assert.match(unassign, /@testuser/);
    assert.match(unassign, /No worries at all/i);
    assert.match(unassign, /reassigned/i);
    assert.match(unassign, new RegExp(UNASSIGN_MARKER));
  });

  test("ignores active issues under 5 days", async () => {
    const now = new Date("2026-11-17T12:00:00Z");
    const threeDaysAgo = new Date("2026-11-14T12:00:00Z").toISOString();

    const issues = [
      {
        number: 10,
        state: "open",
        assignees: [{ login: "alice" }],
        created_at: threeDaysAgo,
        labels: [],
      },
    ];

    const github = createMockGithub({ issues });
    const result = await checkInactiveAssignees({
      github,
      context: mockContext,
      now,
    });

    assert.strictEqual(result.nudgedCount, 0);
    assert.strictEqual(result.unassignedCount, 0);
    assert.strictEqual(github.apiCalls.createComment.length, 0);
  });

  test("nudges issues inactive for 5 to 6 days and applies stale label", async () => {
    const now = new Date("2026-11-17T12:00:00Z");
    const fiveDaysAgo = new Date("2026-11-12T00:00:00Z").toISOString();

    const issues = [
      {
        number: 15,
        state: "open",
        assignees: [{ login: "bob" }],
        created_at: fiveDaysAgo,
        labels: [],
      },
    ];

    const github = createMockGithub({ issues });
    const result = await checkInactiveAssignees({
      github,
      context: mockContext,
      now,
    });

    assert.strictEqual(result.nudgedCount, 1);
    assert.strictEqual(result.unassignedCount, 0);
    assert.strictEqual(github.apiCalls.createComment.length, 1);
    assert.match(github.apiCalls.createComment[0].body, /@bob/);
    assert.strictEqual(github.apiCalls.addLabels.length, 1);
    assert.deepStrictEqual(github.apiCalls.addLabels[0].labels, [STALE_LABEL]);
  });

  test("unassigns issues inactive for 7+ days with previous nudge", async () => {
    const now = new Date("2026-11-17T12:00:00Z");
    const eightDaysAgo = new Date("2026-11-09T00:00:00Z").toISOString();
    const threeDaysAgo = new Date("2026-11-14T00:00:00Z").toISOString();

    const issues = [
      {
        number: 20,
        state: "open",
        assignees: [{ login: "charlie" }],
        created_at: eightDaysAgo,
        labels: [{ name: STALE_LABEL }],
      },
    ];

    const comments = {
      20: [
        {
          body: `${NUDGE_MARKER} Hi @charlie!`,
          created_at: threeDaysAgo,
        },
      ],
    };

    const github = createMockGithub({ issues, comments });
    const result = await checkInactiveAssignees({
      github,
      context: mockContext,
      now,
    });

    assert.strictEqual(result.nudgedCount, 0);
    assert.strictEqual(result.unassignedCount, 1);
    assert.strictEqual(github.apiCalls.removeAssignees.length, 1);
    assert.deepStrictEqual(github.apiCalls.removeAssignees[0].assignees, ["charlie"]);
    assert.strictEqual(github.apiCalls.createComment.length, 1);
    assert.match(github.apiCalls.createComment[0].body, /reassigned/i);
    assert.strictEqual(github.apiCalls.removeLabel.length, 1);
  });

  test("skips issues with on-hold or exempt labels", async () => {
    const now = new Date("2026-11-17T12:00:00Z");
    const tenDaysAgo = new Date("2026-11-07T00:00:00Z").toISOString();

    const issues = [
      {
        number: 25,
        state: "open",
        assignees: [{ login: "david" }],
        created_at: tenDaysAgo,
        labels: [{ name: "on-hold" }],
      },
    ];

    const github = createMockGithub({ issues });
    const result = await checkInactiveAssignees({
      github,
      context: mockContext,
      now,
    });

    assert.strictEqual(result.skippedCount, 1);
    assert.strictEqual(result.nudgedCount, 0);
    assert.strictEqual(result.unassignedCount, 0);
    assert.strictEqual(github.apiCalls.createComment.length, 0);
  });

  test("skips issues with linked open pull request", async () => {
    const now = new Date("2026-11-17T12:00:00Z");
    const sixDaysAgo = new Date("2026-11-11T00:00:00Z").toISOString();

    const issues = [
      {
        number: 30,
        state: "open",
        assignees: [{ login: "emma" }],
        created_at: sixDaysAgo,
        labels: [],
      },
    ];

    const prs = [
      {
        number: 31,
        title: "Fix issue #30",
        body: "Resolves #30 by updating the service.",
      },
    ];

    const github = createMockGithub({ issues, prs });
    const result = await checkInactiveAssignees({
      github,
      context: mockContext,
      now,
    });

    assert.strictEqual(result.skippedCount, 1);
    assert.strictEqual(result.nudgedCount, 0);
    assert.strictEqual(result.unassignedCount, 0);
  });

  test("resets stale label if contributor replied after nudge", async () => {
    const now = new Date("2026-11-17T12:00:00Z");
    const eightDaysAgo = new Date("2026-11-09T00:00:00Z").toISOString();
    const threeDaysAgo = new Date("2026-11-14T00:00:00Z").toISOString();
    const yesterday = new Date("2026-11-16T10:00:00Z").toISOString();

    const issues = [
      {
        number: 35,
        state: "open",
        assignees: [{ login: "frank" }],
        created_at: eightDaysAgo,
        labels: [{ name: STALE_LABEL }],
      },
    ];

    const comments = {
      35: [
        {
          body: `${NUDGE_MARKER} Hi @frank!`,
          created_at: threeDaysAgo,
        },
        {
          body: "Working on this! Almost ready with the PR.",
          created_at: yesterday,
        },
      ],
    };

    const github = createMockGithub({ issues, comments });
    const result = await checkInactiveAssignees({
      github,
      context: mockContext,
      now,
    });

    assert.strictEqual(result.nudgedCount, 0);
    assert.strictEqual(result.unassignedCount, 0);
    assert.strictEqual(github.apiCalls.removeLabel.length, 1);
    assert.strictEqual(github.apiCalls.removeAssignees.length, 0);
  });

  test("dry-run mode does not invoke write APIs", async () => {
    const now = new Date("2026-11-17T12:00:00Z");
    const tenDaysAgo = new Date("2026-11-07T00:00:00Z").toISOString();
    const threeDaysAgo = new Date("2026-11-14T00:00:00Z").toISOString();

    const issues = [
      {
        number: 40,
        state: "open",
        assignees: [{ login: "grace" }],
        created_at: tenDaysAgo,
        labels: [{ name: STALE_LABEL }],
      },
    ];

    const comments = {
      40: [
        {
          body: `${NUDGE_MARKER} Hi @grace!`,
          created_at: threeDaysAgo,
        },
      ],
    };

    const github = createMockGithub({ issues, comments });
    const result = await checkInactiveAssignees({
      github,
      context: mockContext,
      dryRun: true,
      now,
    });

    assert.strictEqual(result.unassignedCount, 1);
    assert.strictEqual(github.apiCalls.removeAssignees.length, 0);
    assert.strictEqual(github.apiCalls.createComment.length, 0);
    assert.strictEqual(github.apiCalls.removeLabel.length, 0);
  });
});
