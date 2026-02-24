export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
  // computed
  memory_count?: number;
  session_count?: number;
  concept_count?: number;
  depth_score?: number;
}

export interface MemoryChunk {
  id: string;
  user_id: string;
  project_id: string;
  content: string;
  embedding?: number[];
  source_type: 'chat' | 'note' | 'url' | 'document' | 'session';
  source_label: string;
  importance_score: number;
  access_count: number;
  last_accessed: string;
  metadata: Record<string, unknown>;
  created_at: string;
  // from search
  similarity?: number;
}

export interface Session {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  summary: string;
  open_questions: string[];
  resolved_questions: string[];
  message_count: number;
  created_at: string;
  ended_at: string | null;
}

export interface Message {
  id: string;
  session_id: string;
  project_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  memories_used: MemoryChunk[];
  agent_outputs: AgentOutputs;
  created_at: string;
}

export interface AgentOutputs {
  recall?: RecallOutput;
  explorer?: ExplorerOutput;
  critique?: CritiqueOutput;
  connector?: ConnectorOutput;
  conflicts?: ConflictOutput;
}

export interface RecallOutput {
  memories: MemoryChunk[];
  confidence: number;
  used_count: number;
}

export interface ExplorerOutput {
  triggered: boolean;
  sources: WebSource[];
  summary: string;
}

export interface WebSource {
  title: string;
  url: string;
  snippet: string;
}

export interface CritiqueOutput {
  counterarguments: string[];
  assumptions: string[];
  gaps: string[];
}

export interface ConnectorOutput {
  connections: ConceptConnection[];
}

export interface ConceptConnection {
  from: string;
  to: string;
  description: string;
  strength: number;
}

export interface ConflictResult {
  memory_a: string;
  memory_b: string;
  source_a: string;
  source_b: string;
  conflict_description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ConflictOutput {
  detected: boolean;
  conflicts: ConflictResult[];
}

export interface DeepResearchProgress {
  type: 'status' | 'complete' | 'error';
  message?: string;
  step?: number;
  total?: number;
  queries?: string[];
  sources?: Array<{ title: string; url: string; snippet: string }>;
  synthesis?: string;
  memoriesStored?: number;
}

export interface Concept {
  id: string;
  project_id: string;
  user_id: string;
  label: string;
  cluster: string;
  weight: number;
  color: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ConceptRelationship {
  id: string;
  project_id: string;
  from_concept_id: string;
  to_concept_id: string;
  relationship_type: 'supports' | 'contradicts' | 'extends' | 'questions' | 'related' | 'references';
  strength: number;
  created_at: string;
}

export interface ResearchDigest {
  id: string;
  project_id: string;
  user_id: string;
  connections_found: DigestConnection[];
  gaps_detected: string[];
  open_questions: string[];
  is_read: boolean;
  created_at: string;
}

export interface DigestConnection {
  concept_a: string;
  concept_b: string;
  description: string;
  similarity: number;
}

export interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string;
  research_domain: string;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AgentStatus {
  id: 'recall' | 'explorer' | 'critique' | 'connector';
  label: string;
  status: 'idle' | 'running' | 'done' | 'error';
  result?: string;
  color: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  memories?: MemoryChunk[];
  agentOutputs?: AgentOutputs;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface KnowledgeGraphNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: {
    label: string;
    weight: number;
    cluster?: string;
    color: string;
  };
}

export interface KnowledgeGraphEdge {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
  data?: {
    relationship?: string;
    strength?: number;
  };
}
