// The Taxonomy module (U46, T-201). Nothing here imports the Review module or the review repository
// port: review figures arrive through `ConditionStats` (BR6.1, FD-067).
import type { AuditActor, Tx } from '../../ports';
import { createProvisionalCommand } from './commands/create-provisional';
import type { TaxonomyDeps } from './deps';
import { ensureProvisionalTerm, type ProvisionalTermRequest } from './provisional-term';
import { getConditionQuery } from './queries/get-condition';
import { listConditionsQuery } from './queries/list-conditions';
import { listSpecialtiesQuery } from './queries/list-specialties';
import { listSuggestedQuery } from './queries/list-suggested';
import { resolveQuery } from './queries/resolve';

export * from './ports';
export { CREATE_PROVISIONAL_LIMIT, CREATE_PROVISIONAL_WINDOW_SEC, type TaxonomyDeps } from './deps';
export { taxonomyAudit, TAXONOMY_AUDIT_DETAIL_KEYS } from './audit';
export {
  ensureProvisionalTerm,
  type ProvisionalTermPorts,
  type ProvisionalTermRequest,
  type ProvisionalTermResult,
} from './provisional-term';
export { createProvisionalRateLimitKey } from './commands/create-provisional';
export type { ResolveResult } from './queries/resolve';
export type { SuggestedTermVM } from './queries/list-suggested';
export type { SpecialtyOptionVM } from './queries/list-specialties';

export function createTaxonomyModule(deps: TaxonomyDeps) {
  return {
    getCondition: getConditionQuery(deps),
    listConditions: listConditionsQuery(deps),
    resolve: resolveQuery(deps),
    listSuggested: listSuggestedQuery(deps),
    listSpecialties: listSpecialtiesQuery(deps),
    createProvisional: createProvisionalCommand(deps),
    /** For U47's publish, on its own transaction with its persona actor (WF10). */
    ensureProvisionalTerm: (
      tx: Tx,
      request: ProvisionalTermRequest,
      actor: AuditActor,
      correlationId: string,
    ) => ensureProvisionalTerm(deps, tx, request, actor, correlationId),
  };
}

export type TaxonomyModule = ReturnType<typeof createTaxonomyModule>;
