import { Router, type IRouter } from "express";
import {
  GetAuditLogResponse,
  GetDemoDocumentResponse,
  GetVeilSummaryResponse,
  ScanDocumentBody,
  ScanDocumentResponse,
  TestDisclosureBody,
  TestDisclosureResponse,
  TransformDocumentBody,
  TransformDocumentResponse,
} from "@workspace/api-zod";

type EntityType =
  | "PERSON"
  | "EMAIL"
  | "PHONE"
  | "LOCATION"
  | "ORGANIZATION"
  | "FINANCIAL"
  | "CONFIDENTIAL_SOURCE";
type Role = "PUBLIC" | "REPORTER" | "EDITOR" | "AUTHORIZED_INVESTIGATOR";
type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

type Entity = {
  id: string;
  type: EntityType;
  value: string;
  label: string;
  severity: Severity;
  start: number;
  end: number;
};

type RiskBreakdown = {
  identity: number;
  location: number;
  contact: number;
  financial: number;
  sourceExposure: number;
};

type ScanResult = {
  documentId: string;
  text: string;
  entities: Entity[];
  exposureScore: number;
  exposureLabel: string;
  risks: RiskBreakdown;
  scannedAt: Date;
};

type AuditEvent = {
  id: string;
  time: string;
  role: Role;
  resource: EntityType;
  action: string;
  result: string;
};

const router: IRouter = Router();

const demoDocument = {
  title: "Project Northstar",
  subtitle: "Fictional investigation / source protection drill",
  text:
    "Journalist Ananya Rao met confidential source Ravi Kumar at 14 MG Road, Bengaluru. Ravi provided financial documents concerning fictional company Novacore Systems. Ravi can be contacted at ravi.kumar@example.com or +91 98765 43210.",
  fictional: true,
};

let latestScan: ScanResult | null = null;
let currentRole: Role = "PUBLIC";
const auditLog: AuditEvent[] = [];

const detectionRules: Array<{
  type: EntityType;
  label: string;
  severity: Severity;
  pattern: RegExp;
}> = [
  {
    type: "EMAIL",
    label: "CONTACT",
    severity: "MEDIUM",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  },
  {
    type: "PHONE",
    label: "CONTACT",
    severity: "HIGH",
    pattern: /(?:\+\d{1,3}[\s-]?)?(?:\d[\s-]?){9,12}\d/g,
  },
  {
    type: "LOCATION",
    label: "LOCATION",
    severity: "HIGH",
    pattern:
      /\b\d{1,5}\s+[A-Z][A-Za-z]*(?:\s+[A-Za-z]+)*(?:,\s*[A-Z][A-Za-z]+(?:\s+[A-Za-z]+)*)?/g,
  },
  {
    type: "FINANCIAL",
    label: "FINANCIAL",
    severity: "HIGH",
    pattern:
      /\b(?:financial documents?|bank account|account number|transaction|payment|invoice|salary)\b|\b(?:USD|INR|EUR|GBP)\s?[\d,]+(?:\.\d{2})?/gi,
  },
  {
    type: "ORGANIZATION",
    label: "ORGANIZATION",
    severity: "MEDIUM",
    pattern:
      /\b[A-Z][A-Za-z0-9-]*(?:\s+[A-Z][A-Za-z0-9-]*)*\s+(?:Systems|Labs|Group|Corporation|Corp|Inc|Foundation)\b/g,
  },
  {
    type: "CONFIDENTIAL_SOURCE",
    label: "SOURCE IDENTITY",
    severity: "CRITICAL",
    pattern: /\b(?:confidential source|protected source)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g,
  },
  {
    type: "PERSON",
    label: "PERSON",
    severity: "HIGH",
    pattern:
      /\b(?!(?:Journalist|Reporter|Editor|Source|Captain)\b)[A-Z][a-z]+\s+[A-Z][a-z]+\b/g,
  },
];

function detectEntities(text: string): Entity[] {
  const entities: Entity[] = [];

  for (const rule of detectionRules) {
    rule.pattern.lastIndex = 0;
    for (const match of text.matchAll(rule.pattern)) {
      const value = match[0];
      const start = match.index ?? 0;
      const end = start + value.length;
      if (!value.trim() || entities.some((entity) => entity.type === rule.type && entity.start === start)) {
        continue;
      }

      entities.push({
        id: `${rule.type.toLowerCase()}-${entities.length + 1}`,
        type: rule.type,
        value,
        label: rule.label,
        severity: rule.severity,
        start,
        end,
      });
    }
  }

  return entities
    .filter((entity) => {
      if (entity.type !== "PERSON") return true;
      return !entities.some(
        (other) =>
          (other.type === "ORGANIZATION" ||
            other.type === "CONFIDENTIAL_SOURCE") &&
          entity.start < other.end &&
          entity.end > other.start,
      );
    })
    .sort((a, b) => a.start - b.start || b.end - a.end);
}

function calculateRisks(entities: Entity[]): RiskBreakdown {
  const maxSeverity = (types: EntityType[]): number => {
    const weights: Record<Severity, number> = {
      LOW: 20,
      MEDIUM: 45,
      HIGH: 72,
      CRITICAL: 100,
    };
    return Math.min(
      100,
      Math.max(
        0,
        ...entities
          .filter((entity) => types.includes(entity.type))
          .map((entity) => weights[entity.severity]),
      ),
    );
  };

  return {
    identity: maxSeverity(["PERSON"]),
    location: maxSeverity(["LOCATION"]),
    contact: maxSeverity(["EMAIL", "PHONE"]),
    financial: maxSeverity(["FINANCIAL"]),
    sourceExposure: maxSeverity(["CONFIDENTIAL_SOURCE"]),
  };
}

function makeScan(text: string): ScanResult {
  const entities = detectEntities(text);
  const risks = calculateRisks(entities);
  const exposureScore = Math.min(
    100,
    Math.round(
      risks.identity * 0.2 +
        risks.location * 0.18 +
        risks.contact * 0.16 +
        risks.financial * 0.18 +
        risks.sourceExposure * 0.28,
    ),
  );

  return {
    documentId: `doc-${Date.now()}`,
    text,
    entities,
    exposureScore,
    exposureLabel:
      exposureScore >= 70 ? "HIGH" : exposureScore >= 40 ? "MEDIUM" : "LOW",
    risks,
    scannedAt: new Date(),
  };
}

function canDisclose(role: Role, entity: EntityType): boolean {
  if (role === "AUTHORIZED_INVESTIGATOR") return true;
  if (role === "EDITOR") {
    return ["PERSON", "LOCATION", "ORGANIZATION", "FINANCIAL"].includes(entity);
  }
  if (role === "REPORTER") {
    return ["LOCATION", "ORGANIZATION"].includes(entity);
  }
  return entity === "ORGANIZATION";
}

function maskFor(entity: Entity): string {
  const masks: Record<EntityType, string> = {
    PERSON: "[NAME PROTECTED]",
    EMAIL: "[EMAIL PROTECTED]",
    PHONE: "[PHONE PROTECTED]",
    LOCATION: "[LOCATION PROTECTED]",
    ORGANIZATION: "[ORGANIZATION PROTECTED]",
    FINANCIAL: "[FINANCIAL PROTECTED]",
    CONFIDENTIAL_SOURCE: "[SOURCE PROTECTED]",
  };
  return masks[entity.type];
}

router.post("/veil/scan", (req, res): void => {
  const parsed = ScanDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  latestScan = makeScan(parsed.data.text);
  res.json(ScanDocumentResponse.parse(latestScan));
});

router.post("/veil/disclose", (req, res): void => {
  const parsed = TestDisclosureBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { role, resource } = parsed.data;
  const allowed = canDisclose(role, resource);
  currentRole = role;
  const createdAt = new Date();
  const result = allowed ? "ALLOWED" : "BLOCKED";
  const message = allowed
    ? "Disclosure permitted by current policy."
    : `${resource === "CONFIDENTIAL_SOURCE" ? "Confidential source identity" : resource.toLowerCase()} requires authorized access.`;

  auditLog.unshift({
    id: `evt-${Date.now()}-${auditLog.length}`,
    time: createdAt.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
    role,
    resource,
    action: "DISCLOSE",
    result,
  });
  if (auditLog.length > 50) auditLog.pop();

  res.json(
    TestDisclosureResponse.parse({
      allowed,
      role,
      resource,
      result,
      message,
      createdAt,
    }),
  );
});

router.post("/veil/transform", (req, res): void => {
  const parsed = TransformDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { text, role } = parsed.data;
  const entities = detectEntities(text).sort(
    (a, b) => a.start - b.start || b.end - a.end,
  );
  const chunks: string[] = [];
  let cursor = 0;
  let maskedCount = 0;
  let disclosedCount = 0;

  for (const entity of entities) {
    if (entity.start < cursor) continue;
    chunks.push(text.slice(cursor, entity.start));
    if (canDisclose(role, entity.type)) {
      chunks.push(entity.value);
      disclosedCount += 1;
    } else {
      chunks.push(maskFor(entity));
      maskedCount += 1;
    }
    cursor = entity.end;
  }
  chunks.push(text.slice(cursor));

  res.json(
    TransformDocumentResponse.parse({
      text: chunks.join(""),
      role,
      maskedCount,
      disclosedCount,
    }),
  );
});

router.get("/veil/audit-log", (_req, res): void => {
  res.json(GetAuditLogResponse.parse(auditLog));
});

router.get("/veil/demo", (_req, res): void => {
  res.json(GetDemoDocumentResponse.parse(demoDocument));
});

router.get("/veil/summary", (_req, res): void => {
  res.json(
    GetVeilSummaryResponse.parse({
      exposureScore: latestScan?.exposureScore ?? 0,
      exposureLabel: latestScan?.exposureLabel ?? "NOT SCANNED",
      entityCount: latestScan?.entities.length ?? 0,
      currentRole,
      eventCount: auditLog.length,
      lastScanAt: latestScan?.scannedAt ?? null,
    }),
  );
});

export default router;