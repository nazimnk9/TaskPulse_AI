import { z } from "zod";

export const RegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(60),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const CreateProjectSchema = z.object({
  name: z.string().min(2, "Project name must be at least 2 characters").max(80),
  key: z
    .string()
    .min(2, "Project key must be 2-6 uppercase letters")
    .max(6)
    .regex(/^[A-Z0-9]+$/, "Project key must be alphanumeric uppercase (e.g. CORE, APP, DEV)"),
  description: z.string().max(500).optional(),
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export const TaskStatusEnum = z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]);
export const PriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const CreateTaskSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  title: z.string().min(3, "Task title must be at least 3 characters").max(160),
  description: z.string().max(4000).optional(),
  status: TaskStatusEnum.default("TODO"),
  priority: PriorityEnum.default("MEDIUM"),
  storyPoints: z.number().int().min(1).max(21).optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  aiGenerated: z.boolean().optional().default(false),
  aiMetadata: z.string().optional().nullable(),
  subtasks: z
    .array(
      z.object({
        title: z.string().min(1, "Subtask title is required").max(160),
      })
    )
    .optional(),
});

export const UpdateTaskSchema = z.object({
  title: z.string().min(3).max(160).optional(),
  description: z.string().max(4000).optional().nullable(),
  status: TaskStatusEnum.optional(),
  priority: PriorityEnum.optional(),
  storyPoints: z.number().int().min(1).max(21).optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  aiMetadata: z.string().optional().nullable(),
  order: z.number().int().optional(),
});

export const TransitionStatusSchema = z.object({
  status: TaskStatusEnum,
});

export const CreateSubtaskSchema = z.object({
  title: z.string().min(1, "Subtask title is required").max(160),
});

export const UpdateSubtaskSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  isCompleted: z.boolean().optional(),
});

export const CreateCommentSchema = z.object({
  content: z.string().min(1, "Comment content cannot be empty").max(2000),
});

export const AiBreakdownRequestSchema = z.object({
  prompt: z
    .string()
    .min(5, "Feature or bug prompt must be at least 5 characters")
    .max(1500, "Prompt cannot exceed 1500 characters"),
  projectContext: z.string().max(300).optional(),
});
