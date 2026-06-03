import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';
import { generateSimilarQuestions } from '../services/aiService';

const router = Router();
const client = getSupabaseClient();

// 获取同类题列表
router.get('/', async (req, res) => {
  try {
    const { knowledge_point_id, difficulty } = req.query;
    
    let query = client
      .from('similar_questions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (knowledge_point_id) {
      query = query.eq('knowledge_point_id', knowledge_point_id);
    }
    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }
    
    const { data, error } = await query;
    if (error) throw new Error(`查询失败: ${error.message}`);
    res.json({ data });
  } catch (err: any) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 获取待练习的同类题
router.get('/pending', async (req, res) => {
  try {
    const { knowledge_point_id } = req.query;
    
    // 获取已练习的同类题ID
    const { data: practiced } = await client
      .from('practice_records')
      .select('similar_question_id')
      .eq('knowledge_point_id', knowledge_point_id)
      .not('similar_question_id', 'is', null);
    
    const practicedIds = practiced?.map(p => p.similar_question_id).filter(Boolean) || [];
    
    // 获取该知识点的同类题
    let query = client
      .from('similar_questions')
      .select('*')
      .eq('knowledge_point_id', knowledge_point_id)
      .order('created_at', { ascending: true });
    
    const { data: allQuestions, error } = await query;
    if (error) throw new Error(`查询失败: ${error.message}`);
    
    // 过滤掉已练习的
    const pendingQuestions = allQuestions?.filter(q => !practicedIds.includes(q.id)) || [];
    res.json({ data: pendingQuestions });
  } catch (err: any) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// AI 生成同类题
router.post('/generate', async (req, res) => {
  try {
    const { knowledge_point_id, knowledge_point_name, difficulty, count } = req.body;
    
    if (!knowledge_point_name) {
      return res.status(400).json({ error: '知识点名称不能为空' });
    }
    
    const questions = await generateSimilarQuestions(
      knowledge_point_name,
      difficulty || 'medium',
      count || 3
    );
    
    // 保存到数据库
    if (questions.length > 0 && knowledge_point_id) {
      const insertData = questions.map(q => ({
        knowledge_point_id,
        question_text: q.question,
        answer: q.answer,
        explanation: q.explanation || null,
        difficulty: difficulty || 'medium'
      }));
      
      const { error } = await client
        .from('similar_questions')
        .insert(insertData);
      
      if (error) throw new Error(`保存失败: ${error.message}`);
    }
    
    res.json({ data: questions });
  } catch (err: any) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 创建同类题（手动）
router.post('/', async (req, res) => {
  try {
    const { knowledge_point_id, source_question_id, question_text, answer, explanation, difficulty } = req.body;
    
    if (!knowledge_point_id || !question_text || !answer) {
      return res.status(400).json({ error: '知识点ID、题目和答案不能为空' });
    }
    
    const { data, error } = await client
      .from('similar_questions')
      .insert({ 
        knowledge_point_id,
        source_question_id,
        question_text,
        answer,
        explanation,
        difficulty: difficulty || 'medium'
      })
      .select()
      .single();
    
    if (error) throw new Error(`创建失败: ${error.message}`);
    res.json({ data });
  } catch (err: any) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 更新同类题
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { question_text, answer, explanation, difficulty } = req.body;
    
    const updateData: any = {};
    if (question_text) updateData.question_text = question_text;
    if (answer) updateData.answer = answer;
    if (explanation) updateData.explanation = explanation;
    if (difficulty) updateData.difficulty = difficulty;
    
    const { data, error } = await client
      .from('similar_questions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`更新失败: ${error.message}`);
    res.json({ data });
  } catch (err: any) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 删除同类题
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await client
      .from('similar_questions')
      .delete()
      .eq('id', id);
    
    if (error) throw new Error(`删除失败: ${error.message}`);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
