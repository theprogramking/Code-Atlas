/**
 * FUTURE AI READINESS - INTERFACES ONLY, NO IMPLEMENTATION.
 *
 * This file defines the seams CodeAtlas will use to plug in AI-assisted
 * features later (e.g. "explain this component", "summarize this module",
 * "suggest a refactor"). Nothing here is wired up or called anywhere in the
 * app today - it exists purely so future work has a stable contract to
 * implement against, and so the parser/graph/UI layers never need to change
 * shape when that work begins.
 *
 * Design principles for whoever implements this later:
 *  - An AiProvider is the only thing that should ever know how to reach an
 *    LLM. Nothing in features/* should import a provider directly.
 *  - Every provider call takes a fully-formed CodeContext built from data the
 *    app already has (ParsedFile / ArchitectureGraph), never a live file
 *    handle - this keeps providers pure and testable.
 *  - Providers are async and cancellable, since codebase-wide operations may
 *    run long.
 */

import type { ArchitectureGraph, GraphNodeData } from '../types/graph';
import type { ParsedFile } from '../types/parser';

/** Snapshot of everything an AI feature might need about one node's context. */
export interface CodeContext {
  node: GraphNodeData;
  parsedFile: ParsedFile;
  /** Directly connected nodes (callers, callees, importers, imports). */
  neighbors: GraphNodeData[];
}

export interface AiExplainRequest {
  context: CodeContext;
  /** e.g. "explain", "find-bugs", "suggest-refactor", "summarize" */
  intent: string;
}

export interface AiExplainResponse {
  summary: string;
  details?: string;
  /** Optional suggested follow-up questions the UI could surface as chips. */
  followUps?: string[];
}

export interface AiGraphInsightRequest {
  graph: ArchitectureGraph;
  /** e.g. "find-cycles", "find-dead-code", "suggest-boundaries" */
  intent: string;
}

export interface AiGraphInsightResponse {
  summary: string;
  /** Node ids the insight is about, for highlighting in the graph. */
  relatedNodeIds: string[];
}

/**
 * The contract a future AI backend (local model, extension, or otherwise)
 * would implement. No implementation ships in this version of the app - this
 * is the extension point.
 */
export interface AiProvider {
  readonly id: string;
  readonly displayName: string;
  explainNode(request: AiExplainRequest, signal?: AbortSignal): Promise<AiExplainResponse>;
  analyzeGraph(request: AiGraphInsightRequest, signal?: AbortSignal): Promise<AiGraphInsightResponse>;
}

/**
 * Registry placeholder. Left empty intentionally - registering a real
 * provider here is future work, not part of this build.
 */
export const registeredAiProviders: AiProvider[] = [];
