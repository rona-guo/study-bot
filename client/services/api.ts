const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://110.42.206.64:3000';

// 通用请求方法
async function request<T>(path: string, options?: RequestInit): Promise<{ data: T }> {
  const url = `${BASE_URL}/api/v1${path}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }
    
    return { data };
  } catch (error: any) {
    console.error(`API Error [${path}]:`, error);
    throw error;
  }
}

// ============ 科目 API ============
export const subjectsApi = {
  list: () => request<any[]>('/subjects'),
  create: (name: string) => request<any>('/subjects', { method: 'POST', body: JSON.stringify({ name }) }),
  delete: (id: number) => request<void>(`/subjects/${id}`, { method: 'DELETE' }),
};

// ============ 章节 API ============
export const chaptersApi = {
  list: (subjectId?: number) => request<any[]>(`/chapters${subjectId ? `?subject_id=${subjectId}` : ''}`),
  create: (data: { subject_id: number; name: string; order_index?: number }) => 
    request<any>('/chapters', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { name?: string; order_index?: number }) =>
    request<any>(`/chapters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request<void>(`/chapters/${id}`, { method: 'DELETE' }),
};

// ============ 知识点 API ============
export const knowledgePointsApi = {
  list: (params?: { chapter_id?: number; subject_id?: number; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.chapter_id) query.append('chapter_id', String(params.chapter_id));
    if (params?.subject_id) query.append('subject_id', String(params.subject_id));
    if (params?.status) query.append('status', params.status);
    return request<any[]>(`/knowledge-points${query.toString() ? `?${query}` : ''}`);
  },
  stats: () => request<{ total: number; pending: number; learning: number; mastered: number }>('/knowledge-points/stats'),
  create: (data: { chapter_id: number; name: string; order_index?: number }) =>
    request<any>('/knowledge-points', { method: 'POST', body: JSON.stringify(data) }),
  startLearning: (id: number) =>
    request<any>(`/knowledge-points/${id}/start`, { method: 'POST' }),
  checkMastery: (id: number) =>
    request<{ isMastered: boolean; reason?: string; rule?: string }>(`/knowledge-points/${id}/check-mastery`, { method: 'POST' }),
  delete: (id: number) => request<void>(`/knowledge-points/${id}`, { method: 'DELETE' }),
};

// ============ 错题 API ============
export const wrongQuestionsApi = {
  list: (params?: { knowledge_point_id?: number; is_mastered?: boolean; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.knowledge_point_id) query.append('knowledge_point_id', String(params.knowledge_point_id));
    if (params?.is_mastered !== undefined) query.append('is_mastered', String(params.is_mastered));
    if (params?.limit) query.append('limit', String(params.limit));
    return request<any[]>(`/wrong-questions${query.toString() ? `?${query}` : ''}`);
  },
  create: (data: {
    knowledge_point_id: number;
    question_text: string;
    answer: string;
    question_image_url?: string;
    wrong_reason: string;
  }) => request<any>('/wrong-questions', { method: 'POST', body: JSON.stringify(data) }),
  markMastered: (id: number) =>
    request<any>(`/wrong-questions/${id}/mark-mastered`, { method: 'POST' }),
  delete: (id: number) => request<void>(`/wrong-questions/${id}`, { method: 'DELETE' }),
};

// ============ 同类题 API ============
export const similarQuestionsApi = {
  list: (params?: { knowledge_point_id?: number; difficulty?: string }) => {
    const query = new URLSearchParams();
    if (params?.knowledge_point_id) query.append('knowledge_point_id', String(params.knowledge_point_id));
    if (params?.difficulty) query.append('difficulty', params.difficulty);
    return request<any[]>(`/similar-questions${query.toString() ? `?${query}` : ''}`);
  },
  pending: (knowledgePointId: number) =>
    request<any[]>(`/similar-questions/pending?knowledge_point_id=${knowledgePointId}`),
  generate: (data: {
    knowledge_point_id?: number;
    knowledge_point_name: string;
    difficulty?: string;
    count?: number;
  }) => request<any[]>('/similar-questions/gener', { method: 'POST', body: JSON.stringify(data) }),
  create: (data: {
    knowledge_point_id: number;
    question_text: string;
    answer: string;
    explanation?: string;
    difficulty?: string;
  }) => request<any>('/similar-questions', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: number) => request<void>(`/similar-questions/${id}`, { method: 'DELETE' }),
};

// ============ 练习记录 API ============
export const practiceRecordsApi = {
  list: (params?: { knowledge_point_id?: number; is_correct?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.knowledge_point_id) query.append('knowledge_point_id', String(params.knowledge_point_id));
    if (params?.is_correct !== undefined) query.append('is_correct', String(params.is_correct));
    return request<any[]>(`/practice-records${query.toString() ? `?${query}` : ''}`);
  },
  create: (data: {
    knowledge_point_id: number;
    similar_question_id?: number;
    wrong_question_id?: number;
    user_answer: string;
    is_correct: boolean;
    difficulty?: string;
    used_hint?: boolean;
  }) => request<any>('/practice-records', { method: 'POST', body: JSON.stringify(data) }),
  stats: (knowledgePointId: number) =>
    request<any>(`/practice-records/stats/${knowledgePointId}`),
  today: () => request<{ total: number; correct: number; incorrect: number; accuracy: number }>('/practice-records/today'),
};

// ============ AI 分析 API ============
export const analyzeQuestion = async (questionText: string) => {
  const response = await fetch(`${BASE_URL}/api/v1/ai/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionText }),
  });
  
  if (!response.ok) {
    throw new Error('Analysis failed');
  }
  
  return response.json();
};

export default {
  subjects: subjectsApi,
  chapters: chaptersApi,
  knowledgePoints: knowledgePointsApi,
  wrongQuestions: wrongQuestionsApi,
  similarQuestions: similarQuestionsApi,
  practiceRecords: practiceRecordsApi,
  analyzeQuestion,
};
