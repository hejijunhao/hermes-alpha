# Hermes Hunter — Vision & Architecture

## What This Is

An autonomous bug bounty hunting system built on the Nous Research Hermes Agent framework. Two AI agents work in hierarchy: a **Master** that builds, deploys, monitors, and continuously improves a **Hunter** that finds real software vulnerabilities and produces bounty-ready reports.

The Master treats the Hunter's entire codebase as mutable. When it spots inefficiencies, missed patterns, or repeated failures, it doesn't just steer — it rewrites code, adds skills, changes tools, and redeploys a better version. Over time, the Hunter gets measurably better at finding vulnerabilities, and the Master gets measurably better at improving the Hunter.

Human review and approval is required before any report is submitted to a bounty platform.

---

## The Thesis

### Can an AI agent find bounty-worthy vulnerabilities?

**Yes — with caveats.**

### What agents are already good at

- **Static code analysis.** LLMs read code and spot patterns (missing input validation, broken auth, SQLi, path traversal, IDOR) better than most static analysis tools because they understand intent, not just syntax.
- **Systematic thoroughness.** An agent can review every endpoint, every parameter, every auth flow. Humans get bored and skip things. Agents don't.
- **Cross-file reasoning.** Understanding complex control flow across multiple files, inferring what *should* happen from documentation, then finding where the code doesn't do that.
- **Report writing.** LLMs produce clear, structured, well-evidenced vulnerability reports with reproduction steps. Report quality is a real differentiator on bounty platforms.
- **Dependency auditing.** Cross-referencing dependencies against known CVE databases at scale.

### What's hard but not impossible

- **Novel vulnerability classes.** High-value bounties ($10K+) often require creative reasoning: chaining multiple low-severity issues, finding business logic flaws unique to an application, or discovering attack vectors no one has considered. Current LLMs can do some of this but aren't consistently creative in the way top researchers are.
- **Dynamic testing.** Running applications, fuzzing inputs, observing runtime behaviour, timing side channels. Doable with terminal/browser tools, but requires complex per-target environment setup.
- **Application-specific business logic.** "Users shouldn't access other users' invoices" is obvious. "The discount code validation allows negative quantities, resulting in the merchant paying the customer" requires deep domain understanding.

### Real-world evidence

- **Google's Big Sleep (2024)** — An LLM agent found a real, previously unknown exploitable buffer overflow in SQLite. A zero-day in production software, found autonomously.
- **DARPA AIxCC (2024)** — AI systems competed to find and patch real vulnerabilities in critical infrastructure software. Multiple teams demonstrated autonomous vuln discovery.
- **Academic research** — Multiple papers show GPT-4/Claude-class models identify OWASP Top 10 vulnerabilities in realistic codebases with reasonable accuracy.
- **Industry adoption** — Semgrep, Snyk, and Socket are shipping LLM-augmented vulnerability detection that finds real bugs in production.

### Where the money is

| Tier | Range | What It Takes | AI Feasibility |
|------|-------|---------------|----------------|
| Low-hanging fruit | $100–$500 | Pattern matching (XSS, SQLi, open redirect) | **High** — but competitive, often already found |
| **Mid-tier** | **$500–$5,000** | **Auth bypasses, IDOR, privilege escalation, info disclosure** | **Medium-High — the sweet spot** |
| High-tier | $5,000–$50,000 | Logic flaws, chained exploits, novel attack vectors | Medium — possible with good tooling and iteration |
| Critical | $50,000+ | RCE, full account takeover, infrastructure compromise | Low-Medium — requires creativity agents are still developing |

**The mid-tier ($500–$5,000) is the primary target.** These bugs require systematic analysis — the Hunter's strength — not genius-level creativity. Volume and thoroughness beat individual brilliance here.

### Why self-improvement is the key

A static agent plateaus. It finds some bugs on its first pass but hits a ceiling. The Master architecture changes the equation:

1. Hunter v1 analyses a target — finds 2 vulns, misses 5
2. Master reviews the logs — identifies gaps in skills, wrong analysis order, incomplete attack surface mapping
3. Master rewrites skills and tools, redeploys
4. Hunter v2 analyses the next target — finds 4 vulns, misses 3
5. Repeat. Compound improvement over time.

The self-improvement loop is the competitive edge against thousands of human researchers and automated scanners hitting the same targets.

---

## The Hierarchy

```
Creator (the human)
  └→ Browser terminal / Telegram
       └→ Master (persistent, strategic)
            └→ tools / injection / code evolution
                 └→ Hunter (ephemeral, tactical, replaceable)
                      └→ subagents (parallel analysis workers)
```

Each level has full autonomy within constraints set by the level above:
- **Creator** sets budget, reviews reports, gives strategic direction
- **Master** controls everything about the Hunter — code, skills, model, targets, lifecycle
- **Hunter** controls its own analysis workflow and can spawn subagents freely

---

## Two-Agent Architecture

### The Master

A Hermes agent with a specialised mission: make the Hunter better at finding vulnerabilities. It does NOT hunt for vulnerabilities itself.

**What it does:**
- Monitors the Hunter's activity via logs and Elephantasm event streams
- Evaluates whether the Hunter is producing quality work
- Intervenes when it sees problems — soft (runtime injection) or hard (code changes + redeploy)
- Manages LLM model selection and budget allocation
- Learns from its own intervention history via Elephantasm memory

**Three intervention modes:**
1. **SOFT** — inject a runtime instruction. Tactical steering. Low risk, immediate effect.
2. **HARD** — modify Hunter source code, commit, push, redeploy. Systemic improvements. Medium risk.
3. **MODEL** — change the Hunter's LLM tier. Cost/quality optimization.

Always prefer the least invasive intervention. Soft before hard. Small changes before large rewrites.

#### Master Control Loop

```
┌─────────────────────────────────────────────────────┐
│                  MASTER MAIN LOOP                    │
│                                                      │
│  1. CHECK Hunter status (running? stuck? errored?)   │
│     └─ If stopped/crashed → diagnose, fix, redeploy │
│                                                      │
│  2. INJECT memory context from Elephantasm           │
│     └─ Retrieve: what interventions worked, what     │
│        failed, current strategy effectiveness        │
│                                                      │
│  3. REVIEW Hunter's event stream (via Elephantasm)   │
│     └─ Look for: inefficiencies, repeated failures,  │
│        missed opportunities, tool misuse, dead ends  │
│                                                      │
│  4. EVALUATE against the only metric that matters:   │
│     └─ Are we producing high-quality reports that    │
│        are likely to earn $$$?                       │
│                                                      │
│  5. CHECK budget constraints                         │
│     └─ Current spend rate vs. budget limits          │
│     └─ Adjust model tier if needed                   │
│                                                      │
│  6. DECIDE intervention type:                        │
│     ├─ No action needed → continue monitoring        │
│     ├─ Soft intervention → inject runtime guidance   │
│     ├─ Hard intervention → modify code + redeploy   │
│     └─ Model change → switch Hunter's LLM tier      │
│                                                      │
│  7. If HARD intervention:                            │
│     a. Identify the code to change                   │
│     b. Write the change in Hunter's repo             │
│     c. Commit with descriptive message               │
│     d. Push and redeploy Hunter                      │
│     e. Monitor first N turns of new deployment       │
│     f. If regression → rollback + redeploy           │
│                                                      │
│  8. EXTRACT events to Elephantasm (own Anima)        │
│     └─ Record: what was observed, decided, changed   │
│                                                      │
│  9. SLEEP / WAIT for next monitoring interval        │
│     └─ Intervention frequency is self-regulated —    │
│        the Master learns its own optimal cadence     │
└─────────────────────────────────────────────────────┘
```

#### Self-Regulating Intervention Strategy

The Master does **not** have a fixed intervention frequency. It decides for itself how aggressive to be:

- After each intervention, it tracks the outcome (improvement, regression, neutral)
- Over time, Elephantasm memory builds up strategy knowledge: "frequent skill changes help", "model switches during active analysis cause context loss", "recon phases don't need heavy models"
- If it's been too aggressive recently (thrashing, regressions), the memory reflects that and it backs off
- If it's been too passive (stagnating metrics), the memory reflects that too

### The Hunter

A Hermes agent with security analysis skills and tools. Runs on a separate machine, analyses software for vulnerabilities, and produces structured reports.

**Per-target workflow:**

```
Phase 1: RECONNAISSANCE
  ├─ Clone target repo
  ├─ Read documentation, README, CHANGELOG
  ├─ Map attack surface (endpoints, auth, data flows)
  ├─ Identify technology stack and frameworks
  ├─ Check dependencies for known CVEs
  └─ Can spawn subagents for parallel recon tasks

Phase 2: ANALYSIS (Static + Dynamic)
  ├─ Run static analysis (semgrep rules, CodeQL queries)
  ├─ Spin up target application in sandbox (if possible)
  ├─ Dynamic testing: fuzz inputs, test auth flows, probe endpoints
  ├─ Manual code review of high-risk areas:
  │   ├─ Authentication / authorization
  │   ├─ Input validation / sanitization
  │   ├─ SQL / NoSQL query construction
  │   ├─ File upload / path traversal
  │   ├─ SSRF / open redirect
  │   ├─ Cryptographic implementations
  │   ├─ Race conditions / TOCTOU
  │   └─ Business logic flaws
  ├─ Cross-reference with known vulnerability patterns
  ├─ Can spawn subagents for parallel analysis of different areas
  └─ Prioritise findings by severity and exploitability

Phase 3: VERIFICATION
  ├─ Build minimal PoC for each finding
  ├─ Test PoC in sandboxed environment (dynamic execution)
  ├─ Confirm exploitability and impact
  ├─ Rule out false positives
  └─ Dedup check: query memory to avoid reporting known issues

Phase 4: REPORTING
  ├─ Draft structured report per finding:
  │   ├─ Title, severity (CVSS), CWE classification
  │   ├─ Description of the vulnerability
  │   ├─ Steps to reproduce
  │   ├─ Proof of concept (code + output)
  │   ├─ Impact assessment
  │   └─ Suggested remediation
  ├─ Self-review for completeness and accuracy
  └─ Queue for Master review → human approval → submission
```

**Subagent strategy:**
The Hunter has full discretion to spawn subagents. Patterns include parallel recon per component, specialist analysis per vuln class, and parallel PoC building. The Master refines this strategy over time.

### Hunter Skills (Initial Set)

Markdown skill files in `skills/security/` that the Hunter loads into its system prompt:

| Skill | Content |
|-------|---------|
| `owasp-top-10` | Patterns and detection strategies for OWASP Top 10 |
| `code-review-checklist` | Systematic code review methodology for security |
| `semgrep-rules` | How to write and run custom semgrep rules |
| `cve-research` | How to check NVD, GitHub advisories, OSV for known vulns |
| `report-writing` | Bug bounty report templates and best practices |
| `scope-assessment` | How to read bounty program scope and avoid out-of-scope work |
| `idor-hunting` | Insecure Direct Object Reference detection patterns |
| `auth-bypass` | Authentication and authorization bypass techniques |
| `injection-patterns` | SQL, NoSQL, command, template injection detection |
| `ssrf-detection` | Server-Side Request Forgery identification methods |
| `dynamic-testing` | How to spin up targets, fuzz inputs, test runtime behaviour |

Skills are **the primary target for Master improvement**. When the Master notices the Hunter is weak at something, the first move is to create or improve a skill.

---

## Communication & Control

### Runtime Injection

The Master pushes instructions into the Hunter's context via Elephantasm (preferred) or a shared injection file. The Hunter reads these each iteration and incorporates them as ephemeral guidance — never persisted to conversation history.

### Interrupt & Redeploy Protocol

```
Master decides to redeploy:
  1. Signal Hunter to pause (graceful interrupt)
     → Hunter finishes current tool, saves session, exits
  2. Wait for Hunter process to exit
  3. Apply code changes → commit → push
  4. Start fresh Hunter machine with updated code
     → Session state can be preserved across redeploys
     → Hunter continues from where it left off, with new capabilities
```

### Human Approval Flow

```
1. Master reviews the Hunter's report (quality, completeness, accuracy)
2. Master presents report to Creator:
   a. Browser terminal (CLI mode)
   b. Telegram notification (optional)
3. Creator reviews and responds:
   - "approve" → Master submits via bounty platform
   - "revise: [feedback]" → Master injects feedback, Hunter revises
   - "reject" → report discarded, finding logged for learning
4. Result captured in both Animas for learning
```

---

## Elephantasm Integration

Long-term memory and observability for both agents. Replaces the need for custom metrics/logging infrastructure.

### Anima Architecture

Each agent gets its own **Anima** (isolated identity container):

```
┌─────────────────────────────────────────────────┐
│              ELEPHANTASM                         │
│                                                  │
│  Anima: "master"                                 │
│    ├─ Events: interventions, decisions, evals    │
│    ├─ Memories: what improvements work/fail      │
│    ├─ Knowledge: learned strategies, patterns    │
│    └─ Identity: Master's evolved approach        │
│                                                  │
│  Anima: "hunter"                                 │
│    ├─ Events: tool calls, findings, analysis     │
│    ├─ Memories: vuln patterns across targets     │
│    ├─ Knowledge: which techniques yield results  │
│    └─ Identity: Hunter's evolved methodology     │
│                                                  │
│  The Dreamer (background process) automatically  │
│  synthesises events → memories → knowledge       │
└─────────────────────────────────────────────────┘
```

### Event Capture (Extract)

Both agents call `extract()` for every significant event:

```python
from elephantasm import extract, EventType

# Hunter — after finding a vulnerability
extract(
    EventType.SYSTEM,
    content="Found IDOR in /api/v2/users/{id} — user_id parameter "
            "not validated against session. Severity: High. Target: acme-api.",
    anima_id="hunter",
    session_id="hunt-2026-03-10-001",
    meta={"target": "acme-api", "cwe": "CWE-639", "severity": "high"},
    importance_score=0.9,
)

# Master — after an intervention
extract(
    EventType.SYSTEM,
    content="Hard intervention: added IDOR detection skill to Hunter. "
            "Commit abc123. Reason: Hunter missed 3 IDOR vulns in last 2 targets.",
    anima_id="master",
    session_id="master-loop-047",
    meta={"intervention_type": "hard", "commit": "abc123", "target_skill": "idor-hunting"},
)
```

### Memory Injection (Inject)

At the start of each iteration/session, agents call `inject()` to retrieve relevant context:

```python
from elephantasm import inject

# Master — get learned strategies before evaluating
pack = inject(anima_id="master", query="what intervention strategies have been effective?")
if pack:
    system_prompt += f"\n\n{pack.as_prompt()}"

# Hunter — get relevant patterns before analysing a new target
pack = inject(anima_id="hunter", query="IDOR vulnerabilities in REST APIs with user endpoints")
if pack:
    system_prompt += f"\n\n{pack.as_prompt()}"
```

### What Elephantasm Replaces

| Originally Proposed | Now Handled By |
|---------------------|----------------|
| Custom metrics SQLite tables | Elephantasm events with structured `meta` fields |
| Custom logging infrastructure | Elephantasm event streams |
| Cross-target learning system | Hunter's Anima accumulates knowledge across all targets |
| Findings deduplication | `inject(query="...")` semantic search before reporting |
| Performance dashboards | Elephantasm dashboard |
| Intervention effectiveness analysis | Master `inject()` retrieves synthesised knowledge |

### What SQLite Still Handles

- **Session persistence**: conversation history (needed for resume after redeploy)
- **Targets queue**: active targets, status (in-progress, completed, skipped)
- **Reports queue**: draft reports awaiting Master review / human approval
- **Budget tracking**: current spend, remaining budget, rate limits (needs to be local for real-time enforcement)

---

## Budget System

### Constraints

The Creator sets budget constraints that the Master must respect absolutely. Hard stop means hard stop.

```yaml
# Budget config
budget:
  max_per_day: 15.00       # USD
  alert_at_percent: 80     # notify Creator when 80% spent
  hard_stop_at_percent: 100
```

### Model Selection & Routing

The Master controls which LLM the Hunter uses. Models are **open-source** with tiered sophistication:

| Tier | Use Case | Example Models |
|------|----------|----------------|
| Heavy (Opus-class) | Complex analysis, novel vuln classes, report writing | Qwen 3.5 72B, Kimi K2.5 |
| Medium (Sonnet-class) | Standard code review, known patterns, tool orchestration | Qwen 3.5 32B |
| Light (Haiku-class) | Recon, dependency checks, boilerplate tasks, subagent work | Qwen 3.5 7B |

The Master decides model allocation based on remaining budget, task complexity, and historical performance (which model found the most real vulns per dollar). This is a key area for self-improvement.

### Break-Even Target

At ~$500–600/month operating cost ($15/day LLM budget + compute), the system needs roughly one $500–$1,000 bounty per month to break even, or one $5,000 bounty every 6–12 months to be highly profitable.

---

## Performance Metrics

### The Only Metric That Matters

**High-quality vulnerability reports that are very likely to earn bounty payouts.** Everything else is a supporting signal. The Master optimises for $$$ per dollar spent.

### Supporting Signals

**Efficiency:**
- Time per target (wall clock from clone to report)
- Cost per target (LLM spend)
- Dead-end ratio (abandoned analysis paths / total paths explored)

**Effectiveness:**
- Vulnerabilities found per target
- Severity distribution (critical/high/medium/low)
- True positive rate (confirmed vulns / reported vulns)
- Unique CWE coverage (breadth of vulnerability types found)

**Quality:**
- Report completeness (all required sections present?)
- PoC reliability (exploit works consistently?)
- Human approval rate (approved / submitted for review)
- Bounty acceptance rate (accepted by platform / submitted)

### Metric Collection via Elephantasm

Metrics are captured as Elephantasm events with structured metadata. The Dreamer automatically synthesises them into actionable knowledge ("target_scan averages 45s per target", "semgrep finds 60% of our confirmed vulns") that the Master can query.

---

## Code Evolution — What the Master Can Modify

The Master has write access to the Hunter's entire repo. Ordered by frequency and safety:

| Tier | Target | Risk | Frequency |
|------|--------|------|-----------|
| 1 | **Skills** (Markdown in `skills/security/`) | None — just text | Most frequent |
| 2 | **Prompts & tool descriptions** | Low — affects LLM behaviour, not execution | Frequent |
| 3 | **Tool logic** (Python handlers) | Medium — code changes can introduce bugs | Moderate |
| 4 | **Agent core** (runner, context, state) | High — can break the entire Hunter | Rare |

### Guardrails

1. **Always commit before modifying.** Clean state before changes.
2. **One logical change per commit.** Atomic, easy to evaluate and rollback.
3. **Monitor for 3–5 iterations after deploying.** Don't stack changes — verify each one.
4. **Automatic rollback on regression.** Revert, don't fix forward.
5. **Never modify the Master's own code.** Read-only to itself. Only the Creator changes the Master's codebase.

---

## Feedback Loops

The system operates four nested feedback loops at different timescales:

```
Loop 1: TACTICAL (seconds–minutes)
  Hunter analyses code → finds/misses vulnerability
  → Elephantasm captures event → Master reads on next iteration
  → Master injects guidance → Hunter adjusts

Loop 2: STRUCTURAL (minutes–hours)
  Master notices Hunter repeatedly misses a vuln class
  → Writes a new skill or tool → Commits, pushes, redeploys
  → Hunter gains new capability → Master monitors impact

Loop 3: STRATEGIC (hours–days)
  Master's Elephantasm memory accumulates intervention outcomes
  → Dreamer synthesises: "skill additions help 40%, model switches
    during analysis cause context loss, recon doesn't need heavy models"
  → Master's inject() retrieves this knowledge → strategy evolves

Loop 4: META-STRATEGIC (days–weeks)
  Creator reviews dashboards, reports, bounty outcomes
  → Talks to Master: "Pivot to Go projects. Write a race condition skill."
  → Master acts on strategic direction
  → A/B experiment results inform which path to invest in
```

---

## The A/B Experiment — Prime vs Alpha

The system is being developed via two parallel paths to test a fundamental question: **is pre-built infrastructure worth the investment, or can a stock agent bootstrap everything it needs?**

### Path A: Hermes Prime

- Purpose-built Phase 1 infrastructure: custom Master tools, structured APIs, budget tracker, worktree manager, Hunter controller, Elephantasm integration layer, CLI commands
- See [hermes-prime.md](./hermes-prime.md) for full details

### Path B: Hermes Alpha

- Stock Hermes agent with zero custom code, given only a blueprint document as its instruction manual
- See [alpha-blueprint.md](./alpha-blueprint.md) for full details

### What We're Measuring

| Signal | Path A (Prime) | Path B (Alpha) |
|--------|----------------|----------------|
| Time to first functional Hunter | ? | ? |
| Time to first real vulnerability finding | ? | ? |
| Hunter reliability (crashes, stuck loops) | ? | ? |
| Budget adherence (overspend incidents) | ? | ? |
| Quality of Hunter code | ? | ? |
| Master intervention effectiveness | ? | ? |
| Adaptability to novel problems | ? | ? |

The winner informs the long-term architecture: do we invest in more infrastructure or strip it back and let the agent improvise?

---

## Implementation Phases

### Phase 1: Foundation (Master ↔ Hunter IPC + Elephantasm)
Overseer can spawn, monitor, interrupt, and query a Hunter instance. Both agents connected to Elephantasm.

### Phase 2: Hunter Capabilities
Hunter can autonomously analyse a target and produce a vulnerability report using both static and dynamic analysis. End-to-end tested against deliberately vulnerable repos (DVWA, Juice Shop).

### Phase 3: Code Evolution + Human Review
Master can modify the Hunter's code, redeploy, and present reports for human approval. Automatic rollback on regression.

### Phase 4: Bounty Integration
End-to-end bounty workflow from target discovery to report submission. Platform selection driven by $$$ optimisation.

### Phase 5: Self-Improvement Loop
The system compounds improvements autonomously. Cross-target learning, skill auto-generation, model selection optimisation, subagent strategy refinement.

---

## Safety & Legal Guardrails

### Hard Constraints (Never Violate)

1. **No attacking live systems.** Source code analysis and sandboxed PoC only. Never probe, scan, or exploit production.
2. **Scope enforcement.** Verify every target is in-scope for its bounty program before analysis.
3. **Human approval for submission.** No report goes to any platform without Creator approval.
4. **No credential harvesting.** Never extract, store, or transmit credentials found in targets.
5. **Budget enforcement.** Hard stop is absolute. No exceptions.
6. **Master cannot modify its own code.** Only the Creator changes the Master's codebase.
7. **Audit trail.** Every significant action captured in Elephantasm.

### Soft Constraints

1. Responsible disclosure principles.
2. Never exploit beyond PoC necessity.
3. Report findings even if unsure about severity.
4. Respect program rules and disclosure timelines.
5. No social engineering, phishing, or physical security testing.

---

## Deployment

### Infrastructure Pattern

Both paths use the same fundamental deployment pattern:

- **Master machine** — persistent, strategic, has git/CLI access to Hunter repo
- **Hunter machine** — ephemeral, destroyed and recreated on each redeploy
- **Elephantasm** — remote API for memory and observability
- **Budget config** — locally enforced by the Master

See [hermes-prime.md](./hermes-prime.md) and [alpha-blueprint.md](./alpha-blueprint.md) for path-specific deployment details.

### Why Separate Machines

1. **PoC isolation.** The Hunter builds and runs exploit code. This MUST happen in a sandbox.
2. **Independent lifecycle.** Master kills/recreates Hunter freely without affecting itself.
3. **Security boundary.** Restricted Hunter network during PoC testing.
4. **Resource isolation.** Hunter analysis doesn't affect Master responsiveness.
