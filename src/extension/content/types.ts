export interface RecordedAction {
    n: number;
    step: string;
    ts: string;
    delayMs: number;
    action: 'click' | 'dblclick' | 'key';
    key?: string;
    docUrl: string;
    tag: string;
    id: string;
    classes: string;
    text: string;
    ariaLabel: string;
    role: string;
    rect: { w: number; h: number };
    path: string;
    selector: string;
    selectors: string[];
    inIframe: boolean;
    parentFormbox: string;
    parentRecord: string;
    parentRecordUi: string;
    tpRecordUiHovered: boolean;
}

export type BlockAgentJobStatus = 'queued' | 'running' | 'streaming' | 'retrying' | 'success' | 'error';

export interface BlockAgentJobSnapshot {
    jobId: string;
    planId?: string;
    blockIndex: number;
    blockType: string;
    status: BlockAgentJobStatus;
    attempts: number;
    maxRetries: number;
    createdAt: number;
    startedAt?: number;
    finishedAt?: number;
    nextRetryAt?: number;
    error?: string;
    partialHtml?: string;
}

export interface BlockAgentJobResult extends BlockAgentJobSnapshot {
    html?: string;
}

export interface TildaUploadParams {
    publicKey: string;
    uploadKey: string;
    baseUrl: string;
}

export interface TildaUploadResponse {
    success: boolean;
    fileId?: string;
    url?: string;
    error?: string;
}
