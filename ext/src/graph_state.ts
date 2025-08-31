export interface GraphState {
    initial_request: string;
    blueprint_xml?: string;
    task_queue: any[];
    current_task?: any;
    current_files?: string[];
    completed_files?: string[];
    review_feedback?: string;
    error?: string;
    modules?: Array<{ name: string; tasks: Array<{ id: string; description: string }>; dependencies?: string[] }>;
    tasks?: Array<{ id: string; description: string; dependencies?: string[] }>;
    currentAgent?: string;
    status?: string;
}

export interface Task {
    description: string;
    context: string;
    id: string;
}

export interface ModelConfig {
    litellmModelName: string;
    isFree: boolean;
    contextWindow: number;
    description: string;
}

export interface ProviderConfig {
    [modelName: string]: ModelConfig;
}

export interface UsageData {
    [provider: string]: {
        [model: string]: {
            total_input_tokens: number;
            total_output_tokens: number;
            total_cost: number;
            requests: Array<{
                timestamp: string;
                input_tokens: number;
                output_tokens: number;
                cost: number;
            }>;
        };
    };
}

export interface PerformanceData {
    [agentName: string]: number[];
}
