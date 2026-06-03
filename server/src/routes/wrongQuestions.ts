import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';

const router = Router();
const client = getSupabaseClient();

// 获取错题列表
router.get('/', async (req, res) => {
  try {
    const { knowledge_point_id, is_mastered, limit } = req.query;
    
    let query = client
      .from('wrong_questions')
      .select(`
        *,
        knowledge_point:knowledge_points(id, name, status)
      `)
      .order('created_at', { ascending: false });
    
    if (knowledge_point_id) {
      query = query.eq('knowledge_point_id', knowledge_point_id);
    }
    if (is_mastered !== undefined) {
      query = query.eq('is_mastered', is_mastered === 'true' ? 1 : 0);
    }
    if (limit) {
      query = query.limit(Number(limit));
    }
    
    const { data, error } = await query;
    if (error) throw new Error(`查询失败: ${error.message}`);
    res.json({ data });
  } catch (err: any) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 创建错题
router.post('/', async (req, res) => {
  try {
    const { knowledge_point_id, question_text, question_image_url, answer, wrong_reason } = req.body;
    
    if (!knowledge_point_id || !question_text || !answer) {
      return res.status(400).json({ error: '知识点ID、题目和答案不能为空' });
    }
    
    const { data, error } = await client
      .from('wrong_questions')
      .insert({ 
        knowledge_point_id,
        question_text,
        question_image_url,
        answer,
        wrong_reason: wrong_reason || 'totally_wrong'
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

// 批量创建错题
router.post('/batch', async (req, res) => {
  try {
    const { questions } = req.body;
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: '题目列表不能为空' });
    }
    
    const { error } = await client
      .from('wrong_questions')
      .insert(questions);
    
    if (error) throw new Error(`批量创建失败: ${error.message}`);
    res.json({ success: true, count: questions.length });
  } catch (err: any) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 标记错题为已搞定（同一题第二天做对）
router.post('/:id/mark-mastered', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await client
      .from('wrong_questions')
      .update({ 
        is_mastered: 1,
        mastered_date: new Date().toISOString()
      })
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

// 更新错题
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { question_text, answer, wrong_reason, review_count, last_review_date } = req.body;
    
    const updateData: any = {};
    if (question_text) updateData.question_text = question_text;
    if (answer) updateData.answer = answer;
    if (wrong_reason) updateData.wrong_reason = wrong_reason;
    if (review_count !== undefined) updateData.review_count = review_count;
    if (last_review_date) updateData.last_review_date = last_review_date;
    
    const { data, error } = await client
      .from('wrong_questions')
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

// 删除错题
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await client
      .from('wrong_questions')
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
