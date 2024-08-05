import { VerifiableCredential } from "infra-did-js";

export class VCRequirement {
    vcType: string;
    issuer?: string;
    query?: Query;
}

class Query {
    selectedClaims: string[];
}

export interface VCsMatchingResult {
    result: boolean;
    matchingVCs?: VerifiableCredential[];
}

export enum VCHoldingResult {
    SUBMIT = "submit",
    SUBMIT_LATER = "submitLater",
    REJECTED = "rejected",
}

export interface VPReqCallbackResponse {
    status: VCHoldingResult;
    requestedVCs?: VerifiableCredential[];
}
