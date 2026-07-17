/* Seed data. Import runSeed() — wipe:true clears domain tables first (auth users survive). */
import { db, schema } from "@/db";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const uid = () => randomUUID();
const PASSWORD = "Skilltimate#2026";

async function ensureUser(email: string, name: string, role: "admin" | "student") {
  const existing = await db.query.user.findFirst({ where: eq(schema.user.email, email) });
  if (existing) {
    if (existing.role !== role) await db.update(schema.user).set({ role }).where(eq(schema.user.id, existing.id));
    return existing.id;
  }
  const res = await auth.api.signUpEmail({ body: { email, password: PASSWORD, name } });
  const id = res.user.id;
  if (role !== "student") await db.update(schema.user).set({ role }).where(eq(schema.user.id, id));
  return id;
}

export async function runSeed({ wipe = false } = {}) {
  console.log("Seeding…");

  if (wipe) for (const t of [
    schema.attemptResponses, schema.examAttempts, schema.exams, schema.questions, schema.questionPools,
    schema.lessonProgress, schema.lessons, schema.modules, schema.accessGrants, schema.inviteCodes,
    schema.batchMembers, schema.batches, schema.courses, schema.notes, schema.lessonQuestions, schema.activityLog,
  ]) await db.delete(t);

  const adminId = await ensureUser("arup@skilltimate.com", "Arup", "admin");
  const demoId = await ensureUser("demo@skilltimate.com", "Demo Student", "student");

  /* ─── Courses ─── */
  const az900 = uid(), ai900 = uid(), dp900 = uid(), ab900 = uid();
  await db.insert(schema.courses).values([
    {
      id: az900, slug: "az-900", certCode: "AZ-900", title: "Azure Fundamentals",
      subtitle: "Cloud concepts, core Azure services, and the management layer — built for the AZ-900 paper.",
      status: "published", accessMode: "invite", position: 1,
      descriptionMd: `Microsoft's AZ-900 tests three domains, and this course walks them in the exam's own order: **cloud concepts** (25–30%), **Azure architecture and services** (35–40%), and **management and governance** (30–35%).

Every module ends at the question bank: read, watch, then answer under the same conditions you'll face at the test centre. When your mock trend crosses 700 consistently, you're ready to book.`,
    },
    {
      id: ai900, slug: "ai-900", certCode: "AI-900", title: "Azure AI Fundamentals",
      subtitle: "AI workloads, machine learning basics, and Azure's AI services for the AI-900 paper.",
      status: "published", accessMode: "invite", position: 2,
      descriptionMd: "Curriculum is being authored — mock exams for AI-900 arrive with it. Redeem access now and it unlocks the moment it publishes.",
    },
    {
      id: dp900, slug: "dp-900", certCode: "DP-900", title: "Azure Data Fundamentals",
      subtitle: "Core data concepts, relational and non-relational data on Azure for the DP-900 paper.",
      status: "published", accessMode: "invite", position: 3,
      descriptionMd: "Curriculum is being authored — mock exams for DP-900 arrive with it.",
    },
    {
      id: ab900, slug: "ab-900", certCode: "AB-900", title: "Azure AI Business Fundamentals",
      subtitle: "The business side of AI adoption on Azure for the AB-900 paper.",
      status: "published", accessMode: "invite", position: 4,
      descriptionMd: "Curriculum is being authored.",
    },
  ]);

  /* ─── AZ-900 curriculum ─── */
  const m1 = uid(), m2 = uid(), m3 = uid();
  await db.insert(schema.modules).values([
    { id: m1, courseId: az900, position: 0, title: "Describe cloud concepts" },
    { id: m2, courseId: az900, position: 1, title: "Describe Azure architecture and services" },
    { id: m3, courseId: az900, position: 2, title: "Describe Azure management and governance" },
  ]);

  await db.insert(schema.lessons).values([
    {
      id: uid(), moduleId: m1, position: 0, title: "What cloud computing actually is", kind: "article", isFreePreview: true,
      content: {
        md: `## The definition the exam wants

Cloud computing is the delivery of computing services — servers, storage, databases, networking, software, analytics and intelligence — **over the internet**, with **consumption-based pricing**: you pay for what you use, when you use it.

Two properties do most of the work in exam questions:

1. **No capital expenditure.** You don't buy hardware up front; infrastructure cost becomes an operating expense (OpEx, not CapEx).
2. **Elasticity.** Resources grow and shrink with demand — automatically if you configure autoscale.

## The shared responsibility model

Every AZ-900 paper tests this. The cloud provider always secures the **physical layer**: datacentres, racks, hosts. You always own your **data, identities and access management**. Everything between shifts with the service model:

| Layer | IaaS | PaaS | SaaS |
|---|---|---|---|
| Applications & data | You | You | You (data) |
| Runtime & middleware | You | Provider | Provider |
| OS | You | Provider | Provider |
| Physical hosts & network | Provider | Provider | Provider |

**Exam instinct:** the more managed the service, the more responsibility moves to Microsoft — but *your data and identities never stop being yours to secure.*

## Deployment models

- **Public cloud** — services offered over the public internet on shared provider infrastructure. No capital cost, near-unlimited scale.
- **Private cloud** — infrastructure dedicated to one organisation (on-premises or hosted). Maximum control, maximum cost.
- **Hybrid cloud** — public + private connected. The exam loves hybrid scenarios: keep regulated data on-premises, burst compute to Azure.`,
      },
    },
    {
      id: uid(), moduleId: m1, position: 1, title: "Cloud concepts — slide deck", kind: "presentation",
      content: { slides: Array.from({ length: 6 }, (_, i) => `/slides/az900-cloud-concepts/slide-${String(i + 1).padStart(2, "0")}.png`) },
    },
    {
      id: uid(), moduleId: m1, position: 2, title: "Benefits of cloud computing (video)", kind: "video",
      content: { provider: "gumlet", asset_id: "" },
    },
    {
      id: uid(), moduleId: m1, position: 3, title: "Checkpoint — cloud concepts", kind: "checkpoint",
      content: { note: "Take the AZ-900 Cloud Concepts practice set before starting module 2. Target: 80%+ with explanations you could teach." },
    },
    {
      id: uid(), moduleId: m2, position: 0, title: "Compute, networking and storage on Azure", kind: "article",
      content: {
        md: `## Compute — pick the right level of control

- **Virtual Machines (IaaS)** — full OS control; you patch, you configure. The answer whenever the question says *"lift and shift"* or *"legacy application requiring OS access"*.
- **App Service (PaaS)** — deploy web apps and APIs without touching servers.
- **Azure Functions (serverless)** — event-driven pieces of code; billed per execution; scales to zero. The answer for *"run code when a file is uploaded"*.
- **AKS** — managed Kubernetes when the question says *containers at scale* or *orchestration*.
- **Azure Container Instances** — a single container, fastest possible start, no orchestration.

## Networking

- **Virtual Network (VNet)** — your private network in Azure.
- **VPN Gateway** — encrypted site-to-site tunnel **over the public internet**.
- **ExpressRoute** — private dedicated connection that **never touches the public internet**. If the question says "private connection" or "does not traverse the internet" — ExpressRoute.
- **Azure DNS** — hosts your DNS zones.

## Storage

- **Blob Storage** for unstructured objects, with access tiers: **Hot** (frequent), **Cool** (infrequent, ≥30 days), **Archive** (rare, ≥180 days, hours to rehydrate — offline).
- **Azure Files** — managed SMB file shares you can mount from anywhere.
- **Managed Disks** — block storage for VMs.
- Redundancy ladder: **LRS** (one datacentre) → **ZRS** (three zones in a region) → **GRS/GZRS** (replicated to a paired secondary region).`,
      },
    },
    {
      id: uid(), moduleId: m2, position: 1, title: "Core services cheat sheet (PDF)", kind: "pdf",
      content: { file: "/files/az900-service-cheatsheet.pdf" },
    },
    {
      id: uid(), moduleId: m3, position: 0, title: "Cost, governance and monitoring", kind: "article",
      content: {
        md: `## Cost management

- **Pricing calculator** — estimate *before* you deploy.
- **TCO calculator** — compare on-premises cost vs Azure over years.
- **Microsoft Cost Management** — analyse actual spend, set **budgets**, get alerts.
- Cost levers the exam tests: reserved instances (1–3 yr commitment for discounts), spot VMs, right-sizing, shutting down dev/test out of hours, choosing the right region.

## Governance

- **Microsoft Entra ID** — identities. **RBAC** — permissions, assigned at a **scope** (management group → subscription → resource group → resource) and inherited downward.
- **Azure Policy** — *rules about resources* ("only deploy to India regions", "every resource must carry a cost-centre tag"). Policy ≠ RBAC: RBAC governs **who can act**, Policy governs **what is allowed to exist**.
- **Resource locks** — \`CanNotDelete\` and \`ReadOnly\`; they beat RBAC (even owners are blocked until the lock is removed).
- **Microsoft Purview** — data governance and compliance across the estate.

## Monitoring

- **Azure Monitor** — the metrics/logs platform; **Application Insights** for app performance.
- **Azure Advisor** — free recommendations across cost, security, reliability, operational excellence, performance.
- **Azure Service Health** — *Azure's* problems affecting *you* (incidents, planned maintenance). Resource Health = your specific resource. Advisor = recommendations. The three get cross-tested — keep them separate.`,
      },
    },
    {
      id: uid(), moduleId: m3, position: 1, title: "Exam-day resource pack", kind: "resource",
      content: { files: [{ name: "AZ-900 core services cheat sheet (PDF)", url: "/files/az900-service-cheatsheet.pdf" }] },
    },
  ]);

  /* ─── Question pools + 24 questions ─── */
  const p1 = uid(), p2 = uid(), p3 = uid();
  await db.insert(schema.questionPools).values([
    { id: p1, certCode: "AZ-900", domainCode: "D1", title: "Describe cloud concepts" },
    { id: p2, certCode: "AZ-900", domainCode: "D2", title: "Azure architecture and services" },
    { id: p3, certCode: "AZ-900", domainCode: "D3", title: "Management and governance" },
  ]);

  const sc = (poolId: string, stem: string, choices: string[], correctIdx: number, expl: string) => ({
    id: uid(), poolId, type: "single_choice", stemMd: stem,
    options: { choices: choices.map((text, i) => ({ id: String.fromCharCode(97 + i), text })) },
    answer: { choice: String.fromCharCode(97 + correctIdx) },
    explanationMd: expl, status: "live" as const,
  });
  const mc = (poolId: string, stem: string, choices: string[], correct: number[], expl: string) => ({
    id: uid(), poolId, type: "multi_choice", stemMd: stem,
    options: { choices: choices.map((text, i) => ({ id: String.fromCharCode(97 + i), text })), select: correct.length },
    answer: { choices: correct.map((i) => String.fromCharCode(97 + i)) },
    explanationMd: expl, status: "live" as const,
  });
  const tf = (poolId: string, stem: string, value: boolean, expl: string) => ({
    id: uid(), poolId, type: "true_false", stemMd: stem, options: {}, answer: { value }, explanationMd: expl, status: "live" as const,
  });
  const fb = (poolId: string, stem: string, placeholder: string, accept: string[], expl: string) => ({
    id: uid(), poolId, type: "fill_blank", stemMd: stem, options: { placeholder }, answer: { accept }, explanationMd: expl, status: "live" as const,
  });

  await db.insert(schema.questions).values([
    /* D1 — cloud concepts (9) */
    sc(p1, "Your company wants to eliminate up-front hardware purchases and pay only for the compute it consumes each month. Which expenditure model does this describe?",
      ["Capital expenditure (CapEx)", "Operational expenditure (OpEx)", "Fixed-cost provisioning", "Depreciated expenditure"], 1,
      "Consumption-based cloud pricing converts infrastructure cost into **OpEx** — an ongoing operating expense — instead of CapEx spent up front on hardware."),
    sc(p1, "A hospital must keep patient records on infrastructure dedicated solely to it, while running its public website on shared cloud infrastructure. Which deployment model fits?",
      ["Public cloud", "Private cloud", "Hybrid cloud", "Community cloud"], 2,
      "Dedicated infrastructure for regulated data **plus** shared public cloud for other workloads, connected together, is the definition of **hybrid cloud**."),
    sc(p1, "In the shared responsibility model, which responsibility is **always** the customer's, regardless of IaaS, PaaS or SaaS?",
      ["Patching the host operating system", "Physical datacentre security", "Data and identities", "Hypervisor maintenance"], 2,
      "Information and data, devices, and accounts/identities always remain the customer's responsibility in every service model."),
    sc(p1, "Which cloud benefit describes a system's ability to **automatically add and remove resources** as demand changes?",
      ["High availability", "Elasticity", "Predictability", "Fault tolerance"], 1,
      "Elasticity is the dynamic grow-and-shrink behaviour. Scalability is the *ability* to grow; elasticity is doing it automatically with demand."),
    mc(p1, "Which **two** statements about the public cloud are true?",
      ["The organisation owns and maintains the physical hardware", "Services are delivered over the public internet", "It offers a pay-as-you-go pricing model", "It requires purchasing hardware before scaling"], [1, 2],
      "In public cloud the **provider** owns the hardware; you consume services over the internet and pay for usage. No up-front hardware purchase is needed to scale."),
    tf(p1, "In a Platform-as-a-Service (PaaS) offering, the customer is responsible for maintaining the underlying operating system.", false,
      "In PaaS the provider manages the OS, middleware and runtime. The customer manages applications and data. OS maintenance is a customer job only in IaaS."),
    tf(p1, "A private cloud can be hosted in a third-party datacentre and still be a private cloud.", true,
      "What makes a cloud *private* is dedication to a single organisation — not its physical location. Hosted private clouds are common."),
    fb(p1, "Complete the sentence: converting a large up-front investment into an ongoing monthly cost is moving from CapEx to ______.",
      "four-letter term", ["opex", "op-ex", "operational expenditure", "operating expenditure"],
      "OpEx — operational expenditure — is the consumption-based model's financial signature."),
    {
      id: uid(), poolId: p1, type: "drag_match", stemMd: "Match each cloud service model to the customer scenario it fits best.",
      options: {
        left: [
          { id: "l1", text: "Lift-and-shift a legacy app that needs full OS control" },
          { id: "l2", text: "Deploy a web app without managing servers" },
          { id: "l3", text: "Use ready-made email software by subscription" },
        ],
        right: [
          { id: "r1", text: "IaaS" },
          { id: "r2", text: "PaaS" },
          { id: "r3", text: "SaaS" },
        ],
      },
      answer: { pairs: { l1: "r1", l2: "r2", l3: "r3" } },
      explanationMd: "OS control → IaaS. Managed platform for your code → PaaS. Finished software by subscription → SaaS.",
      status: "live",
    },

    /* D2 — architecture & services (9) */
    sc(p2, "A regulatory requirement states your connection to Azure must **not traverse the public internet**. Which service do you use?",
      ["VPN Gateway", "ExpressRoute", "Azure DNS", "Azure Front Door"], 1,
      "ExpressRoute is a private, dedicated circuit into Microsoft's network. A VPN is encrypted but still rides the public internet."),
    sc(p2, "You need to run a small piece of code every time a file lands in storage, paying only per execution, with no servers to manage. Which service?",
      ["Azure Virtual Machines", "Azure Kubernetes Service", "Azure Functions", "Azure Virtual Desktop"], 2,
      "Event-driven, per-execution billing, zero server management — the textbook description of Azure Functions (serverless)."),
    sc(p2, "Backups must be kept for seven years, are almost never read, and hours of retrieval delay is acceptable. Which Blob access tier minimises cost?",
      ["Hot", "Cool", "Archive", "Premium"], 2,
      "Archive is the cheapest at-rest tier, intended for ≥180-day retention with rehydration measured in hours — perfect for long-term compliance backups."),
    sc(p2, "Which storage redundancy option keeps three copies of your data across **three availability zones** in the primary region?",
      ["LRS", "ZRS", "GRS", "RA-GRS"], 1,
      "Zone-redundant storage (ZRS) spreads the three synchronous copies across separate availability zones. LRS keeps all three in one datacentre; GRS adds a secondary region."),
    mc(p2, "Which **two** services are compute services in Azure?",
      ["Azure Container Instances", "Azure Blob Storage", "Azure App Service", "Azure DNS"], [0, 2],
      "Container Instances and App Service run your workloads (compute). Blob Storage is storage; Azure DNS is networking."),
    tf(p2, "An availability zone is a physically separate datacentre location within an Azure region.", true,
      "Zones are physically separate facilities — independent power, cooling and networking — inside one region, designed to survive datacentre-level failure."),
    tf(p2, "Azure Files shares can be mounted simultaneously by cloud VMs and on-premises machines using the SMB protocol.", true,
      "That is precisely the Azure Files use case: fully managed SMB (and NFS) shares accessible from cloud and on-premises concurrently."),
    fb(p2, "Name the Azure service that provides a **globally distributed, multi-model NoSQL** database with single-digit-millisecond latency.",
      "service name", ["cosmos db", "azure cosmos db", "cosmosdb"],
      "Azure Cosmos DB — the phrases 'globally distributed', 'NoSQL' and 'millisecond latency' in a question map to it almost every time."),
    {
      id: uid(), poolId: p2, type: "drag_order", stemMd: "Arrange the Azure resource hierarchy from the **top level down**.",
      options: {
        items: [
          { id: "i1", text: "Management group" },
          { id: "i2", text: "Subscription" },
          { id: "i3", text: "Resource group" },
          { id: "i4", text: "Resource" },
        ],
      },
      answer: { order: ["i1", "i2", "i3", "i4"] },
      explanationMd: "Management groups contain subscriptions → subscriptions contain resource groups → resource groups contain resources. RBAC and Policy assigned high flow downward by inheritance.",
      status: "live",
    },

    /* D3 — management & governance (6) */
    sc(p3, "Every resource in your subscription must carry a `cost-centre` tag; deployments without it should be denied automatically. Which service enforces this?",
      ["Role-based access control (RBAC)", "Azure Policy", "Resource locks", "Azure Advisor"], 1,
      "Azure Policy governs **what resources are allowed to exist and how** — required tags, allowed regions, allowed SKUs. RBAC only controls who can perform actions."),
    sc(p3, "A critical production resource keeps getting deleted by mistake by users who legitimately hold Owner rights. What is the most direct fix?",
      ["Remove the users' Owner role", "Apply a CanNotDelete resource lock", "Create an Azure Policy audit rule", "Enable Azure Monitor alerts"], 1,
      "A **CanNotDelete lock** blocks deletion even for Owners until the lock itself is removed — the purpose-built guard against accidental deletion."),
    sc(p3, "You want to **estimate the monthly cost of a planned architecture before deploying anything**. Which tool?",
      ["Microsoft Cost Management", "TCO calculator", "Pricing calculator", "Azure Advisor"], 2,
      "The Pricing calculator estimates future configurations. Cost Management analyses money already being spent; the TCO calculator compares on-premises vs cloud."),
    mc(p3, "Azure Advisor gives recommendations in which **two** of these categories?",
      ["Cost", "Employee performance", "Reliability", "Office layout"], [0, 2],
      "Advisor's five pillars: cost, security, reliability, operational excellence, and performance."),
    tf(p3, "Azure Service Health informs you about Azure platform incidents and planned maintenance that may affect your resources.", true,
      "Service Health = Azure-side events affecting you. Resource Health = the state of your individual resource. Azure Monitor = your metrics and logs."),
    fb(p3, "Which Azure identity service (current name) manages users, sign-in and access to applications?",
      "service name", ["microsoft entra id", "entra id", "entra", "azure active directory", "azure ad"],
      "Microsoft Entra ID — formerly Azure Active Directory. The exam accepts the current name; older material says Azure AD."),
  ]);

  /* ─── Exams ─── */
  const practiceExam = uid(), mockExam = uid();
  await db.insert(schema.exams).values([
    {
      id: practiceExam, courseId: az900, certCode: "AZ-900", mode: "practice",
      title: "AZ-900 Practice — Cloud Concepts",
      blueprint: [{ poolId: p1, count: 8 }],
      durationMinutes: 0, passScaled: 700, status: "published",
    },
    {
      id: mockExam, courseId: az900, certCode: "AZ-900", mode: "simulation",
      title: "AZ-900 Full Mock Exam",
      blueprint: [{ poolId: p1, count: 9 }, { poolId: p2, count: 9 }, { poolId: p3, count: 6 }],
      durationMinutes: 45, passScaled: 700, status: "published",
    },
  ]);

  /* ─── Access ─── */
  await db.insert(schema.accessGrants).values([
    { id: uid(), userId: demoId, courseId: az900, source: "admin", grantedBy: adminId },
  ]);
  await db.insert(schema.inviteCodes).values([
    { id: uid(), code: "AZ900-LAUNCH", courseIds: [az900, ai900, dp900, ab900], maxUses: 500, note: "Launch cohort — unlocks all four courses" },
  ]);
  const batchId = uid();
  await db.insert(schema.batches).values([{ id: batchId, name: "Demo College Batch", orgName: "Demo Engineering College" }]);
  await db.insert(schema.batchMembers).values([{ id: uid(), batchId, userId: demoId }]);

  console.log("Seed complete.");
  console.log(`  admin   → arup@skilltimate.com / ${PASSWORD}`);
  console.log(`  student → demo@skilltimate.com / ${PASSWORD}`);
  console.log("  invite  → AZ900-LAUNCH");
}

