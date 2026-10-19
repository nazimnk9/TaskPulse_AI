import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Clear existing
  await db.activityLog.deleteMany();
  await db.comment.deleteMany();
  await db.subtask.deleteMany();
  await db.task.deleteMany();
  await db.projectMember.deleteMany();
  await db.project.deleteMany();
  await db.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  // 1. Create Users
  const adminUser = await db.user.create({
    data: {
      email: "admin@devsprint.io",
      name: "Nazim Ahmed (Lead Architect)",
      passwordHash,
      role: "ADMIN",
    },
  });

  const devUser = await db.user.create({
    data: {
      email: "sarah@devsprint.io",
      name: "Sarah Jenkins (Full-Stack)",
      passwordHash,
      role: "MEMBER",
    },
  });

  const frontendUser = await db.user.create({
    data: {
      email: "alex@devsprint.io",
      name: "Alex Rivera (Frontend Eng)",
      passwordHash,
      role: "MEMBER",
    },
  });

  console.log("✅ Created 3 demo users");

  // 2. Create Project
  const project = await db.project.create({
    data: {
      name: "PulseFlow Core Platform",
      key: "PULSE",
      description: "High-performance distributed issue tracker with AI-driven sprint intelligence and workflow automation.",
      ownerId: adminUser.id,
      members: {
        create: [
          { userId: adminUser.id, role: "ADMIN" },
          { userId: devUser.id, role: "MEMBER" },
          { userId: frontendUser.id, role: "MEMBER" },
        ],
      },
    },
  });

  console.log("✅ Created project:", project.name);

  // 3. Create Tasks across all statuses
  // Task 1: DONE
  const task1 = await db.task.create({
    data: {
      projectId: project.id,
      taskKey: "PULSE-1",
      title: "Design PostgreSQL relational schema & migrations",
      description: "Define comprehensive data models for Users, Projects, Tasks, Subtasks, and immutable Activity Audit logs with relational constraints.",
      status: "DONE",
      priority: "HIGH",
      storyPoints: 5,
      creatorId: adminUser.id,
      assigneeId: adminUser.id,
      aiGenerated: false,
      subtasks: {
        create: [
          { title: "Define User and Role entities with bcrypt hash", isCompleted: true, order: 0 },
          { title: "Design Project and ProjectMember relations", isCompleted: true, order: 1 },
          { title: "Configure cascading deletes for subtasks and audit logs", isCompleted: true, order: 2 },
        ],
      },
      activityLogs: {
        create: [
          { actorId: adminUser.id, action: "TASK_CREATED", details: "Task created" },
          { actorId: adminUser.id, action: "STATUS_CHANGED", details: "Moved task status from TODO to IN_PROGRESS" },
          { actorId: adminUser.id, action: "STATUS_CHANGED", details: "Moved task status from IN_PROGRESS to IN_REVIEW" },
          { actorId: adminUser.id, action: "STATUS_CHANGED", details: "Moved task status from IN_REVIEW to DONE" },
        ],
      },
    },
  });

  // Task 2: IN_REVIEW
  const task2 = await db.task.create({
    data: {
      projectId: project.id,
      taskKey: "PULSE-2",
      title: "Implement secure JWT auth session with HTTP-only cookies",
      description: "Use jose library for stateless HS256 JWT tokens. Store tokens in secure, sameSite=lax HTTP-only cookies with server-side validation middleware.",
      status: "IN_REVIEW",
      priority: "URGENT",
      storyPoints: 5,
      creatorId: adminUser.id,
      assigneeId: devUser.id,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3), // 3 days from now
      aiGenerated: false,
      subtasks: {
        create: [
          { title: "Implement password hashing with bcryptjs (10 salt rounds)", isCompleted: true, order: 0 },
          { title: "Build /api/auth/register, /login, /logout, /me endpoints", isCompleted: true, order: 1 },
          { title: "Write unit tests for token expiration and tampering", isCompleted: true, order: 2 },
        ],
      },
      comments: {
        create: [
          { authorId: adminUser.id, content: "PR looks solid! Please make sure edge cookie expiration is handled cleanly." },
          { authorId: devUser.id, content: "Updated! All token tests pass green." },
        ],
      },
      activityLogs: {
        create: [
          { actorId: devUser.id, action: "TASK_CREATED", details: "Task created" },
          { actorId: devUser.id, action: "STATUS_CHANGED", details: "Moved task status from TODO to IN_PROGRESS" },
          { actorId: devUser.id, action: "STATUS_CHANGED", details: "Moved task status from IN_PROGRESS to IN_REVIEW" },
        ],
      },
    },
  });

  // Task 3: IN_PROGRESS (Has incomplete subtask - try moving to DONE will showcase business rule blocker!)
  const task3 = await db.task.create({
    data: {
      projectId: project.id,
      taskKey: "PULSE-3",
      title: "Build Kanban Board UI with responsive column workflow",
      description: "Interactive board with status columns, visual progress bars, task cards, and strict workflow transition enforcement.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      storyPoints: 8,
      creatorId: adminUser.id,
      assigneeId: frontendUser.id,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1), // 1 day from now
      aiGenerated: true,
      aiMetadata: JSON.stringify({
        acceptanceCriteria: [
          "Columns must display real-time task counts and story points sum",
          "Status transitions must validate business invariant rules",
          "Visual indicator must highlight tasks near due dates",
        ],
      }),
      subtasks: {
        create: [
          { title: "Create responsive Column and Card components", isCompleted: true, order: 0 },
          { title: "Implement status change modal and action triggers", isCompleted: true, order: 1 },
          { title: "Add optimistic UI updates with error rollback", isCompleted: false, order: 2 }, // Incomplete! Blocks DONE transition
        ],
      },
      comments: {
        create: [
          { authorId: frontendUser.id, content: "Kanban columns look gorgeous! Finalizing error rollback toast." },
        ],
      },
      activityLogs: {
        create: [
          { actorId: adminUser.id, action: "TASK_CREATED", details: "Task created with AI assistant" },
          { actorId: frontendUser.id, action: "STATUS_CHANGED", details: "Moved task status from TODO to IN_PROGRESS" },
        ],
      },
    },
  });

  // Task 4: TODO
  const task4 = await db.task.create({
    data: {
      projectId: project.id,
      taskKey: "PULSE-4",
      title: "Integrate Gemini AI Task Decomposition assistant",
      description: "Allow developers to paste high-level user stories and automatically generate subtasks, acceptance criteria, and story points.",
      status: "TODO",
      priority: "MEDIUM",
      storyPoints: 5,
      creatorId: devUser.id,
      assigneeId: adminUser.id,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
      aiGenerated: true,
      subtasks: {
        create: [
          { title: "Configure Google Generative AI client with structured JSON mode", isCompleted: false, order: 0 },
          { title: "Build robust fallback heuristic parser for offline/demo use", isCompleted: false, order: 1 },
          { title: "Expose /api/ai/health endpoint documenting inputs, outputs, and limitations", isCompleted: false, order: 2 },
        ],
      },
      activityLogs: {
        create: [{ actorId: devUser.id, action: "TASK_CREATED", details: "Task created" }],
      },
    },
  });

  // Task 5: BACKLOG
  const task5 = await db.task.create({
    data: {
      projectId: project.id,
      taskKey: "PULSE-5",
      title: "Webhook integrations for GitHub Commit & PR sync",
      description: "Auto-transition tasks to IN_REVIEW when a linked GitHub Pull Request is opened with the task key in its branch name.",
      status: "BACKLOG",
      priority: "LOW",
      storyPoints: 3,
      creatorId: adminUser.id,
      assigneeId: null,
      aiGenerated: false,
      subtasks: {
        create: [
          { title: "Define HMAC SHA256 webhook signature validation", isCompleted: false, order: 0 },
          { title: "Extract task keys (e.g. PULSE-123) from PR branch names", isCompleted: false, order: 1 },
        ],
      },
      activityLogs: {
        create: [{ actorId: adminUser.id, action: "TASK_CREATED", details: "Task created in backlog" }],
      },
    },
  });

  console.log("✅ Seeded 5 comprehensive demo tasks with subtasks and activity logs");
  console.log("\n🔑 Demo Credentials for Login:");
  console.log("-----------------------------------------");
  console.log("Email:    admin@devsprint.io");
  console.log("Password: password123");
  console.log("-----------------------------------------");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
