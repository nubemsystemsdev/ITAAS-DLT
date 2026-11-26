import { ApiAgentsAdmin } from "@/api/api-group-agents-admin";
import type { AgentAdminList } from "@/api/definitions";
import { hasPlatformOrganizationAccess } from "@/control/organization-admin-access";
import { buildFlowLabelLookupFromAgents, type FlowLabelLookup } from "@/utils/itaas-platform-execution-domain";
import { getUniqueStringId } from "@/utils/unique-id";
import { Request } from "@asanrom/request-browser";
import { ref, type Ref } from "vue";

const AGENTS_PAGE_SIZE = 25;

export type UseItaasFlowLabelLookupResult = {
    flowLabelLookup: Ref<FlowLabelLookup>;
    flowLabelsLoading: Ref<boolean>;
    loadFlowLabelLookup: () => void;
    abortFlowLabelLookup: () => void;
};

export function useItaasFlowLabelLookup(): UseItaasFlowLabelLookupResult {
    const flowLabelLookup = ref<FlowLabelLookup>({});
    const flowLabelsLoading = ref(false);
    const loadRequestId = getUniqueStringId();

    const loadFlowLabelLookup = function (): void {
        if (!hasPlatformOrganizationAccess()) {
            flowLabelLookup.value = {};
            return;
        }

        if (flowLabelsLoading.value) {
            return;
        }

        Request.Abort(loadRequestId);
        flowLabelsLoading.value = true;

        const agents: AgentAdminList["agents"] = [];

        const fetchPage = function (page: number): void {
            const request = ApiAgentsAdmin.GetAgents({
                page: page,
                pageSize: AGENTS_PAGE_SIZE,
            });

            Request.Pending(loadRequestId, request)
                .onSuccess((payload) => {
                    const response = payload as unknown as AgentAdminList;
                    agents.push(...(response.agents || []));

                    const totalPages = Math.max(1, response.totalPages || 1);
                    if (page < totalPages) {
                        fetchPage(page + 1);
                        return;
                    }

                    flowLabelLookup.value = buildFlowLabelLookupFromAgents(agents);
                    flowLabelsLoading.value = false;
                })
                .onRequestError(function () {
                    flowLabelLookup.value = buildFlowLabelLookupFromAgents(agents);
                    flowLabelsLoading.value = false;
                })
                .onUnexpectedError(function () {
                    flowLabelLookup.value = buildFlowLabelLookupFromAgents(agents);
                    flowLabelsLoading.value = false;
                });
        };

        fetchPage(1);
    };

    const abortFlowLabelLookup = function (): void {
        Request.Abort(loadRequestId);
    };

    return {
        flowLabelLookup,
        flowLabelsLoading,
        loadFlowLabelLookup,
        abortFlowLabelLookup,
    };
}
