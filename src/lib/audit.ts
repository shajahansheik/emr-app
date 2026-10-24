import { getStore } from "./db";
import type { AuditEntry, SessionUser } from "./types";
import { newId, nowIso } from "./util";

/** Record every create/update/delete action in the audit_log collection. */
export async function audit(
  user: Pick<SessionUser, "id" | "name" | "role">,
  action: string,
  entity: string,
  entityId: string,
  summary: string
) {
  const t = nowIso();
  await getStore().insert<AuditEntry>("audit_log", {
    id: newId(),
    createdAt: t,
    updatedAt: t,
    userId: user.id,
    userName: user.name,
    role: user.role,
    action,
    entity,
    entityId,
    summary,
  });
}
