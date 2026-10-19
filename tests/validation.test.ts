import { describe, it, expect } from "vitest";
import {
  RegisterSchema,
  LoginSchema,
  CreateProjectSchema,
  UpdateProjectSchema,
  CreateTaskSchema,
  TransitionStatusSchema,
} from "../src/lib/validations";

describe("Input Validation Schemas (Zod)", () => {
  describe("Registration Schema", () => {
    it("accepts valid registration payload", () => {
      const res = RegisterSchema.safeParse({
        name: "Jane Developer",
        email: "jane@company.com",
        password: "securepassword123",
      });
      expect(res.success).toBe(true);
    });

    it("rejects invalid email formats", () => {
      const res = RegisterSchema.safeParse({
        name: "Jane",
        email: "not-an-email",
        password: "securepassword123",
      });
      expect(res.success).toBe(false);
    });

    it("rejects short passwords under 6 characters", () => {
      const res = RegisterSchema.safeParse({
        name: "Jane",
        email: "jane@company.com",
        password: "123",
      });
      expect(res.success).toBe(false);
    });
  });

  describe("Project Schema", () => {
    it("accepts valid alphanumeric project key", () => {
      const res = CreateProjectSchema.safeParse({
        name: "Mobile Banking App",
        key: "BANK",
        description: "Core retail banking microservices",
      });
      expect(res.success).toBe(true);
    });

    it("rejects lowercase project keys or special characters", () => {
      const res = CreateProjectSchema.safeParse({
        name: "Mobile Banking App",
        key: "bank-1", // invalid: lowercase and dash
      });
      expect(res.success).toBe(false);
    });

    it("accepts valid update project key prefix", () => {
      const res = UpdateProjectSchema.safeParse({
        name: "Mobile Banking App V2",
        key: "BANKV2",
      });
      expect(res.success).toBe(true);
    });
  });

  describe("Task Schema", () => {
    it("accepts valid task with subtasks and story points", () => {
      const res = CreateTaskSchema.safeParse({
        projectId: "123e4567-e89b-12d3-a456-426614174000",
        title: "Implement OAuth2 SSO",
        priority: "HIGH",
        storyPoints: 5,
        subtasks: [{ title: "Configure Google credentials" }],
      });
      expect(res.success).toBe(true);
    });

    it("rejects task with empty title", () => {
      const res = CreateTaskSchema.safeParse({
        projectId: "123e4567-e89b-12d3-a456-426614174000",
        title: "ab", // below 3 characters min
      });
      expect(res.success).toBe(false);
    });
  });

  describe("Status Transition Schema", () => {
    it("rejects arbitrary unsupported status string", () => {
      const res = TransitionStatusSchema.safeParse({
        status: "NOT_A_REAL_STATUS",
      });
      expect(res.success).toBe(false);
    });
  });
});
