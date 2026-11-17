# RFC & Proposal Process

For major changes to OpenSourceMate, we use a lightweight Request for Comments (RFC) proposal process to align on design before anyone writes code.

---

## 1. When a Proposal is Needed

| Submit a Proposal for                               | Skip Proposal (Open a regular issue/PR) for |
| --------------------------------------------------- | ------------------------------------------- |
| Architectural modifications or new subsystems       | Bug fixes with reproducible steps           |
| Adding major third-party libraries or dependencies  | Documentation improvements and typos        |
| New database tables, schemas, or migrations         | Minor UI polish or styling tweaks           |
| Breaking changes to REST APIs (`/api/v1`)           | Adding unit or regression tests             |
| Significant UI/UX workflows or navigation redesigns | Pre-approved tasks on the roadmap           |

---

## 2. How to Submit

1. Open a new issue using the [**RFC / Proposal Template**](../.github/ISSUE_TEMPLATE/proposal.yml).
2. Fill out all sections: **Problem**, **Proposed Solution**, **Alternatives**, **Impact on API/UI**, and **Who will implement**.
3. Submit the proposal. The issue will be automatically tagged with `enhancement`, `proposal`, and `needs-triage`.

---

## 3. Response Time & Discussion

- **Initial Maintainer Review**: Maintainers review and respond to new proposals within **3 to 5 business days**.
- **Community Discussion**: Anyone in the community can provide feedback, ask clarifying questions, or suggest alternative approaches.
- Keep discussions respectful and focused on technical merits.

---

## 4. How Proposals are Approved

Proposals advance through three simple steps:

1. **Maintainer Consensus**: The maintainer team reviews the design for architecture fit, security, and maintenance overhead.
2. **Approval & Assignment**:
   - Once approved, a maintainer applies the `approved` label and assigns the issue to the author (or designated contributor).
   - If architectural decisions are established, an **Architecture Decision Record (ADR)** is added in [`docs/adr/`](adr/).
3. **Implementation**:
   - The contributor creates a feature branch (`feat/<topic>`) and implements the approved design.
   - PRs submitted without an approved RFC for large changes will be asked to follow this process before merging.
