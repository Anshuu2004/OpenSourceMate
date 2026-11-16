import { generateTypeScriptTypes } from "../utils/openApiCodegen";
import type {
  GitHubUserProfile,
  IssueRecommendation,
} from "../types/generated-api";

describe("OpenAPI TypeScript Code Generation (#268)", () => {
  const sampleOpenApiSchema = {
    openapi: "3.1.0",
    components: {
      schemas: {
        RepositoryMetric: {
          type: "object",
          required: ["name", "stars"],
          properties: {
            name: { type: "string", description: "Repository identifier" },
            stars: { type: "integer", description: "Stargazers count" },
            is_fork: { type: "boolean" },
            language: { type: "string", nullable: true },
          },
        },
        DifficultyLevel: {
          type: "string",
          enum: ["beginner", "intermediate", "advanced"],
        },
      },
    },
  };

  it("generates correct TypeScript interface with typed properties and JSDoc comments", () => {
    const tsCode = generateTypeScriptTypes(sampleOpenApiSchema);

    expect(tsCode).toContain("export interface RepositoryMetric");
    expect(tsCode).toContain("name: string;");
    expect(tsCode).toContain("stars: number;");
    expect(tsCode).toContain("is_fork?: boolean;");
    expect(tsCode).toContain("language?: string | null;");
    expect(tsCode).toContain("/** Stargazers count */");
  });

  it("generates TypeScript union types for schema enums", () => {
    const tsCode = generateTypeScriptTypes(sampleOpenApiSchema);

    expect(tsCode).toContain(
      'export type DifficultyLevel = "beginner" | "intermediate" | "advanced";'
    );
  });

  it("exports strongly-typed GitHubUserProfile conforming to OpenAPI definition", () => {
    const mockProfile: GitHubUserProfile = {
      username: "octocat",
      avatar_url: "https://avatars.githubusercontent.com/u/583231",
      name: "The Octocat",
      bio: "Open source mascot",
      followers: 12000,
      public_repositories: 8,
    };

    expect(mockProfile.username).toBe("octocat");
    expect(mockProfile.followers).toBe(12000);
  });

  it("exports strongly-typed IssueRecommendation conforming to OpenAPI definition", () => {
    const mockRecommendation: IssueRecommendation = {
      id: 42,
      title: "Add typing tests",
      url: "https://github.com/octocat/repo/issues/42",
      repository: "octocat/repo",
      difficulty: "beginner",
      match_score: 98.5,
      match_reasons: ["Matched language skills"],
    };

    expect(mockRecommendation.id).toBe(42);
    expect(mockRecommendation.difficulty).toBe("beginner");
  });
});
