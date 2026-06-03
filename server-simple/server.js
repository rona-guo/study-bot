import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 内存数据库
const db = {
  subjects: [],
  chapters: [],
  knowledgePoints: [],
  wrongQuestions: [],
  similarQuestions: [],
  practiceRecords: []
};

// 预设科目
const defaultSubjects = [
  { id: 1, name: '数学', created_at: new Date().toISOString() },
  { id: 2, name: '英语', created_at: new Date().toISOString() },
  { id: 3, name: '物理', created_at: new Date().toISOString() },
  { id: 4, name: '语文', created_at: new Date().toISOString() },
  { id: 5, name: '化学', created_at: new Date().toISOString() },
  { id: 6, name: '生物', created_at: new Date().toISOString() }
];

db.subjects = [...defaultSubjects];

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/api/v1/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 科目路由
app.get('/api/v1/subjects', (req, res) => res.json(db.subjects));

app.post('/api/v1/subjects', (req, res) => {
  const { name } = req.body;
  const newSubject = { id: Date.now(), name, created_at: new Date().toISOString() };
  db.subjects.push(newSubject);
  res.json(newSubject);
});

// 章节路由
app.get('/api/v1/chapters', (req, res) => {
  const { subject_id } = req.query;
  if (subject_id) {
    return res.json(db.chapters.filter(c => c.subject_id === parseInt(subject_id)));
  }
  res.json(db.chapters);
});

app.post('/api/v1/chapters', (req, res) => {
  const { subject_id, name, order_index } = req.body;
  const newChapter = { 
    id: Date.now(), 
    subject_id: parseInt(subject_id), 
    name, 
    order_index: order_index || 0, 
    created_at: new Date().toISOString() 
  };
  db.chapters.push(newChapter);
  res.json(newChapter);
});

// 知识点路由
app.get('/api/v1/knowledge-points', (req, res) => {
  const { chapter_id, status } = req.query;
  let result = db.knowledgePoints;
  if (chapter_id) result = result.filter(k => k.chapter_id === parseInt(chapter_id));
  if (status) result = result.filter(k => k.status === status);
  res.json(result);
});

app.get('/api/v1/knowledge-points/stats', (req, res) => {
  const total = db.knowledgePoints.length;
  const mastered = db.knowledgePoints.filter(k => k.status === 'mastered').length;
  const pending = db.knowledgePoints.filter(k => k.status === 'pending').length;
  const learning = db.knowledgePoints.filter(k => k.status === 'learning').length;
  res.json({
    total,
    mastered,
    pending,
    learning,
    wrongQuestionCount: db.wrongQuestions.length,
    similarQuestionCount: db.similarQuestions.length
  });
});

app.post('/api/v1/knowledge-points', (req, res) => {
  const { chapter_id, name, order_index } = req.body;
  const newKP = { 
    id: Date.now(), 
    chapter_id: parseInt(chapter_id), 
    name, 
    order_index: order_index || 0,
    status: 'pending',
    start_date: null,
    mastered_date: null,
    created_at: new Date().toISOString() 
  };
  db.knowledgePoints.push(newKP);
  res.json(newKP);
});

app.patch('/api/v1/knowledge-points/:id', (req, res) => {
  const { id } = req.params;
  const idx = db.knowledgePoints.findIndex(k => k.id === parseInt(id));
  if (idx !== -1) {
    db.knowledgePoints[idx] = { ...db.knowledgePoints[idx], ...req.body };
    res.json(db.knowledgePoints[idx]);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// 错题路由
app.get('/api/v1/wrong-questions', (req, res) => {
  const { knowledge_point_id } = req.query;
  if (knowledge_point_id) {
    return res.json(db.wrongQuestions.filter(q => q.knowledge_point_id === parseInt(knowledge_point_id)));
  }
  res.json(db.wrongQuestions);
});

app.post('/api/v1/wrong-questions', (req, res) => {
  const { knowledge_point_id, question_text, answer, wrong_reason } = req.body;
  const newWQ = { 
    id: Date.now(), 
    knowledge_point_id: parseInt(knowledge_point_id),
    question_text,
    answer,
    wrong_reason,
    is_mastered: 0,
    mastered_date: null,
    created_at: new Date().toISOString()
  };
  db.wrongQuestions.push(newWQ);
  res.json(newWQ);
});

// 同类题路由
app.get('/api/v1/similar-questions', (req, res) => {
  const { knowledge_point_id, difficulty } = req.query;
  let result = db.similarQuestions;
  if (knowledge_point_id) result = result.filter(q => q.knowledge_point_id === parseInt(knowledge_point_id));
  if (difficulty) result = result.filter(q => q.difficulty === difficulty);
  res.json(result);
});

app.post('/api/v1/similar-questions/generate', (req, res) => {
  const { knowledge_point_id, difficulty = 'medium', count = 3 } = req.body;
  // 模拟 AI 生成同类题
  const kp = db.knowledgePoints.find(k => k.id === parseInt(knowledge_point_id));
  const generatedQuestions = [];
  for (let i = 0; i < count; i++) {
    generatedQuestions.push({
      id: Date.now() + i,
      knowledge_point_id: parseInt(knowledge_point_id),
      question_text: `【同类题 ${i + 1}】基于知识点「${kp?.name || '未知'}」生成的练习题`,
      answer: `这是第 ${i + 1} 题的答案解析`,
      explanation: `本题考察的是知识点「${kp?.name || '未知'}」的应用，请认真思考后作答。`,
      difficulty,
      is_mastered: 0,
      created_at: new Date().toISOString()
    });
  }
  db.similarQuestions.push(...generatedQuestions);
  res.json(generatedQuestions);
});

// 练习记录路由
app.get('/api/v1/practice-records', (req, res) => {
  const { knowledge_point_id } = req.query;
  if (knowledge_point_id) {
    return res.json(db.practiceRecords.filter(r => r.knowledge_point_id === parseInt(knowledge_point_id)));
  }
  res.json(db.practiceRecords);
});

app.post('/api/v1/practice-records', (req, res) => {
  const { knowledge_point_id, similar_question_id, wrong_question_id, user_answer, is_correct, difficulty } = req.body;
  const newRecord = {
    id: Date.now(),
    knowledge_point_id: parseInt(knowledge_point_id),
    similar_question_id: similar_question_id ? parseInt(similar_question_id) : null,
    wrong_question_id: wrong_question_id ? parseInt(wrong_question_id) : null,
    user_answer,
    is_correct: is_correct ? 1 : 0,
    difficulty,
    practiced_at: new Date().toISOString()
  };
  db.practiceRecords.push(newRecord);
  res.json(newRecord);
});

// AI 分析路由
app.post('/api/v1/analyze', (req, res) => {
  const { image_base64 } = req.body;
  // 模拟 AI 分析
  const subjects = ['数学', '英语', '物理'];
  const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
  
  const analysis = {
    subject: randomSubject,
    chapters: [
      { name: '第一章 基础概念', knowledge_points: [
        { name: '核心知识点 A' },
        { name: '核心知识点 B' },
        { name: '核心知识点 C' }
      ]}
    ],
    wrong_reason_options: ['概念不清', '审题错误', '计算失误', '完全不会'],
    summary: `这是${randomSubject}科的典型错题，建议从基础概念开始复习。`
  };
  
  res.json(analysis);
});

// 搞定判定路由
app.post('/api/v1/check-mastery', (req, res) => {
  const { knowledge_point_id } = req.body;
  const records = db.practiceRecords.filter(r => r.knowledge_point_id === parseInt(knowledge_point_id));
  
  // 简化判定逻辑
  const correctCount = records.filter(r => r.is_correct === 1).length;
  const totalCount = records.length;
  
  res.json({
    mastered: correctCount >= 3 && totalCount >= 5,
    reason: correctCount >= 3 && totalCount >= 5 
      ? '恭喜！这个知识点已掌握！'
      : `还需要继续练习。当前正确率：${totalCount > 0 ? Math.round(correctCount / totalCount * 100) : 0}%`,
    stats: { correct: correctCount, total: totalCount }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
