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
    PREPARED = "prepared",
    LATER = "later",
    DENIED = "denied",
}

export interface VPReqCallbackResponse {
    status: VCHoldingResult;
    requestedVCs?: VerifiableCredential[];
}
