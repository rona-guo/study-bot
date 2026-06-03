import { getSupabaseClient } from '../storage/database/supabase-client';

// 内置科目列表（可扩展）
const KNOWN_SUBJECTS = [
  '语文', '数学', '英语', '物理', '化学', '生物',
  '历史', '地理', '政治', '信息技术', '通用技术'
];

// 分析错题，自动识别知识点
export async function analyzeQuestion(
  questionText: string,
  questionImageUrl?: string
): Promise<{
  knowledgePoints: Array<{
    subject: string;   // 科目
    grade: string;     // 年级（如：高一、高二、高三）
    chapter: string;    // 章节
    point: string;     // 具体知识点
  }>;
  wrongReason: 'concept' | 'misread' | 'calculation' | 'totally_wrong';
  summary: string;
}> {
  const prompt = `你是一个湖北省武汉市高考教学专家。请分析这道高中错题，重点科目是数学、英语、物理。

学生信息：
- 地区：湖北省武汉市
- 年级：高二（准高三）
- 重点科目：数学、英语、物理

题目：${questionText}

请按以下JSON格式输出（只输出JSON，不要其他内容）：
{
  "knowledgePoints": [
    {
      "subject": "科目（优先识别：数学、英语、物理，其他可选：${KNOWN_SUBJECTS.join('、')}）",
      "grade": "高二 或 高考一轮复习",
      "chapter": "章节名称（参考武汉教材版本，如：人教A版必修一/选择性必修一/选修）",
      "point": "具体知识点（精确到小节，如：函数的单调性与最值）"
    }
  ],
  "wrongReason": "错因（只能是以下之一：concept-概念不清, misread-审题不清, calculation-计算错误, totally_wrong-完全不会）",
  "summary": "一句话学习建议"
}`;

  try {
    // 调用 AI 服务
    const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091'}/api/v1/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        messages: [{ role: 'user', content: prompt }],
        system: '你是一个严谨的高考教学专家，分析题目时只输出JSON格式。'
      }),
    });
    
    if (!response.ok) {
      throw new Error('AI service unavailable');
    }
    
    const data = await response.json() as { content?: string; message?: { content?: string } };
    const content = data.content || data.message?.content || '';
    
    // 解析 JSON
    let result;
    try {
      result = JSON.parse(content);
    } catch {
      // 如果解析失败，尝试提取 JSON 部分
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid JSON response');
      }
    }
    
    // 确保知识点的完整性
    if (!result.knowledgePoints || result.knowledgePoints.length === 0) {
      result.knowledgePoints = [{
        subject: '数学',
        grade: '高二',
        chapter: '待分类',
        point: '待分类'
      }];
    }
    
    // 确保每条知识点都有必要字段
    result.knowledgePoints = result.knowledgePoints.map((kp: any) => ({
      subject: kp.subject || '数学',
      grade: kp.grade || '高二',
      chapter: kp.chapter || '待分类',
      point: kp.point || '待分类'
    }));
    
    return {
      knowledgePoints: result.knowledgePoints,
      wrongReason: result.wrongReason || 'totally_wrong',
      summary: result.summary || '建议加强相关知识点练习'
    };
  } catch (error) {
    console.error('AI analysis error:', error);
    return {
      knowledgePoints: [{
        subject: '数学',
        grade: '高二',
        chapter: '待分类',
        point: '待分类'
      }],
      wrongReason: 'totally_wrong',
      summary: '建议复习相关知识点后重新练习'
    };
  }
}

// 生成同类题
export async function generateSimilarQuestions(
  knowledgePoint: {
    subject: string;
    chapter: string;
    point: string;
  },
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  count: number = 3
): Promise<Array<{
  question: string;
  answer: string;
  explanation: string;
}>> {
  const difficultyText = difficulty === 'easy' ? '基础' : difficulty === 'medium' ? '中等' : '困难';
  
  const prompt = `你是一个湖北省武汉市高考${knowledgePoint.subject}老师。请为以下知识点生成${count}道${difficultyText}难度的练习题。

学生信息：
- 地区：湖北省武汉市
- 年级：高二（准高三，备考2025年高考）
- 科目：${knowledgePoint.subject}

知识点信息：
- 章节：${knowledgePoint.chapter}
- 知识点：${knowledgePoint.point}

要求：
1. 题目类型为湖北高考常见题型，参考近3年湖北高考真题风格
2. 答案必须准确（特别是数学要有详细计算过程）
3. 每道题附带详细解析
4. ${knowledgePoint.subject === '数学' ? '数学题目要有完整解题步骤和易错点提醒' : ''}
5. ${knowledgePoint.subject === '英语' ? '英语题目要涵盖阅读理解、完形填空、语法填空等题型' : ''}
6. ${knowledgePoint.subject === '物理' ? '物理题目要注明涉及的概念和公式' : ''}

请按以下JSON格式输出（只输出JSON，不要其他内容）：
[
  {
    "question": "题目内容（包含完整条件）",
    "answer": "标准答案",
    "explanation": "详细解题步骤和思路"
  }
]`;

  try {
    const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091'}/api/v1/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        messages: [{ role: 'user', content: prompt }],
        system: '你是一个严谨的高考教学专家，回答问题只输出JSON格式。'
      }),
    });
    
    if (!response.ok) {
      throw new Error('AI service unavailable');
    }
    
    const data = await response.json() as { content?: string; message?: { content?: string } };
    const content = data.content || data.message?.content || '[]';
    
    let result;
    try {
      result = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        return [];
      }
    }
    
    // 确保每道题都有必要字段
    return result.map((q: any) => ({
      question: q.question || '',
      answer: q.answer || '',
      explanation: q.explanation || '无解析'
    }));
  } catch (error) {
    console.error('Generate questions error:', error);
    return [];
  }
}

// 搞定判断逻辑
export async function checkMastery(knowledgePointId: number): Promise<{
  isMastered: boolean;
  reason?: string;
  rule?: 'same_question_next_day' | 'similar_3_correct' | 'similar_2_after_week';
}> {
  const client = getSupabaseClient();
  
  // 获取该知识点所有练习记录
  const { data: records, error } = await client
    .from('practice_records')
    .select('*')
    .eq('knowledge_point_id', knowledgePointId)
    .order('practiced_at', { ascending: true });
  
  if (error) throw new Error(`查询失败: ${error.message}`);
  
  // 获取该知识点下所有错题（同一题重做做对）
  const { data: wrongQuestions } = await client
    .from('wrong_questions')
    .select('*')
    .eq('knowledge_point_id', knowledgePointId);
  
  // 规则1：同一题第二天重做作对
  if (wrongQuestions && wrongQuestions.length > 0) {
    // 检查是否有复习记录，且最后复习是第二天且做对
    for (const wq of wrongQuestions) {
      if (wq.is_mastered === 1) {
        return { isMastered: true, reason: '同一题第二天做对', rule: 'same_question_next_day' };
      }
    }
  }
  
  // 规则2：同类题(中等难度)不看答案作对≥3个
  const mediumCorrectCount = records?.filter(r => 
    r.difficulty === 'medium' && 
    r.is_correct === 1 && 
    r.used_hint === 0
  ).length || 0;
  
  if (mediumCorrectCount >= 3) {
    return { isMastered: true, reason: `中等难度不看答案作对${mediumCorrectCount}题`, rule: 'similar_3_correct' };
  }
  
  // 规则3：一周后同类题(中等难度)不看答案作对≥2个
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const recentMediumCorrectCount = records?.filter(r => 
    r.difficulty === 'medium' && 
    r.is_correct === 1 && 
    r.used_hint === 0 &&
    new Date(r.practiced_at) >= oneWeekAgo
  ).length || 0;
  
  if (recentMediumCorrectCount >= 2) {
    return { isMastered: true, reason: `一周后中等难度不看答案作对${recentMediumCorrectCount}题`, rule: 'similar_2_after_week' };
  }
  
  return { isMastered: false };
}

// 预置科目数据
export async function initSubjects() {
  const client = getSupabaseClient();
  
  // 检查是否已有科目
  const { data: existing } = await client.from('subjects').select('id');
  if (existing && existing.length > 0) {
    console.log('Subjects already exist');
    return;
  }
  
  // 插入高考常用科目
  const subjects = [
    { name: '语文' },
    { name: '数学' },
    { name: '英语' },
    { name: '物理' },
    { name: '化学' },
    { name: '生物' },
    { name: '历史' },
    { name: '地理' },
    { name: '政治' },
  ];
  
  const { error } = await client.from('subjects').insert(subjects);
  if (error) {
    console.error('Failed to init subjects:', error);
  } else {
    console.log('Subjects initialized');
  }
}
