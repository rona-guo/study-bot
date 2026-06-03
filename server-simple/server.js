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

// AI OCR 解析路由 - 拍照后自动识别题目并生成答案
app.post('/api/v1/ai/ocr', async (req, res) => {
  try {
    let image_base64 = req.body.image_base64;
    
    // 如果没有 base64，尝试从 multipart form 获取
    if (!image_base64 && req.body.image) {
      const imageData = req.body.image;
      if (typeof imageData === 'string' && imageData.startsWith('data:')) {
        image_base64 = imageData.split(',')[1];
      }
    }
    
    if (!image_base64) {
      return res.status(400).json({ error: '需要提供图片数据' });
    }

    // 调用 AI 解析图片
    const analysis = await analyzeImage(image_base64);
    res.json(analysis);
  } catch (error) {
    console.error('OCR error:', error);
    res.status(500).json({ error: '图片解析失败' });
  }
});

// AI 图片分析函数
async function analyzeImage(image_base64) {
  // 根据 COZE_MODEL 选择 AI 服务
  const model = process.env.COZE_MODEL || 'doubao';
  
  if (model === 'doubao') {
    return analyzeWithDoubao(image_base64);
  } else if (model === 'kimi') {
    return analyzeWithKimi(image_base64);
  } else {
    // 默认使用模拟数据
    return mockAnalysis();
  }
}

// 豆包 AI 分析
async function analyzeWithDoubao(image_base64) {
  const apiKey = process.env.DOUBAO_API_KEY;
  if (!apiKey) {
    console.log('Doubao API key not found, using mock data');
    return mockAnalysis();
  }
  
  try {
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'doubao-pro-32k',
        messages: [
          {
            role: 'system',
            content: `你是一个中学错题本AI助手。用户会发送一道错题的图片，请解析并返回JSON格式：
{
  "questionText": "识别的题目内容（如果是图片请描述题目）",
  "answer": "标准答案",
  "analysis": "详细解题步骤分析",
  "knowledgePoints": ["知识点1", "知识点2"],
  "knowledgePointDetail": {
    "subject": "科目",
    "grade": "年级（如高二）",
    "chapter": "章节名称",
    "point": "具体知识点"
  },
  "summary": "知识点总结和学习建议"
}
注意：答案必须包含详细的解题步骤和知识点分析，因为用户的答案可能是自己做的不准确。`
          },
          {
            role: 'user',
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${image_base64}`
                }
              }
            ]
          }
        ],
        max_tokens: 2000
      })
    });
    
    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const content = data.choices[0].message.content;
      // 尝试解析 JSON
      try {
        return JSON.parse(content);
      } catch {
        return parseAnalysisFromText(content);
      }
    }
    return mockAnalysis();
  } catch (error) {
    console.error('Doubao API error:', error);
    return mockAnalysis();
  }
}

// Kimi AI 分析
async function analyzeWithKimi(image_base64) {
  const apiKey = process.env.KIMI_API_KEY;
  if (!apiKey) {
    console.log('Kimi API key not found, using mock data');
    return mockAnalysis();
  }
  
  try {
    const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'moonshot-v1-32k',
        messages: [
          {
            role: 'system',
            content: `你是一个中学错题本AI助手。用户会发送一道错题的图片，请解析并返回JSON格式：
{
  "questionText": "识别的题目内容",
  "answer": "标准答案（包含详细解题步骤）",
  "analysis": "完整解题过程分析",
  "knowledgePoints": ["涉及的知识点列表"],
  "knowledgePointDetail": {
    "subject": "科目",
    "grade": "年级",
    "chapter": "章节名称",
    "point": "具体知识点"
  },
  "summary": "知识点总结和学习建议"
}
答案必须包含详细的解题步骤和知识点分析，因为用户的答案可能是自己做的不准确。`
          },
          {
            role: 'user',
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${image_base64}`
                }
              }
            ]
          }
        ],
        max_tokens: 2000
      })
    });
    
    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const content = data.choices[0].message.content;
      try {
        return JSON.parse(content);
      } catch {
        return parseAnalysisFromText(content);
      }
    }
    return mockAnalysis();
  } catch (error) {
    console.error('Kimi API error:', error);
    return mockAnalysis();
  }
}

// 从文本中解析分析结果
function parseAnalysisFromText(text) {
  // 尝试提取关键信息
  const result = {
    questionText: '',
    answer: '',
    analysis: '',
    knowledgePoints: [],
    knowledgePointDetail: { subject: '数学', grade: '高二', chapter: '待分类', point: '待分类' },
    summary: ''
  };
  
  // 简单解析，如果无法解析则使用默认值
  const subjects = ['数学', '英语', '物理', '语文', '化学', '生物'];
  for (const s of subjects) {
    if (text.includes(s)) {
      result.knowledgePointDetail.subject = s;
      break;
    }
  }
  
  return result;
}

// 模拟分析结果
function mockAnalysis() {
  return {
    questionText: '【模拟题目】请拍摄真实题目，AI将自动识别并填入',
    answer: '【AI标准答案】（含详细解题步骤）\n\n解题步骤：\n1. 首先分析题目条件...\n2. 根据公式/定理进行推导...\n3. 得出最终答案...\n\n【知识点分析】\n本题主要考察：\n- 核心概念理解\n- 公式应用能力\n- 综合分析能力',
    analysis: '本题需要先理解题目条件，然后运用相关知识点进行求解。',
    knowledgePoints: ['相关知识点1', '相关知识点2'],
    knowledgePointDetail: {
      subject: '数学',
      grade: '高二',
      chapter: '待分类',
      point: '待分类'
    },
    summary: '建议复习相关知识点后重新练习'
  };
}

// AI 分析路由（文本分析）
app.post('/api/v1/ai/analyze', async (req, res) => {
  try {
    const { questionText, knowledgePointDetail } = req.body;
    
    // 如果有图片base64，调用图片分析
    if (req.body.image_base64) {
      const result = await analyzeImage(req.body.image_base64);
      return res.json(result);
    }
    
    // 文本分析
    const analysis = {
      subject: knowledgePointDetail?.subject || '数学',
      grade: knowledgePointDetail?.grade || '高二',
      chapters: [
        { name: knowledgePointDetail?.chapter || '待分类', knowledge_points: [
          { name: knowledgePointDetail?.point || '待分类' }
        ]}
      ],
      summary: '请先上传题目图片进行识别'
    };
    
    res.json(analysis);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: '分析失败' });
  }
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
