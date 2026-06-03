import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';
import { checkMastery } from '../services/aiService';

const router = Router();
const client = getSupabaseClient();

// 获取练习记录
router.get('/', async (req, res) => {
  try {
    const { knowledge_point_id, similar_question_id, wrong_question_id, is_correct } = req.query;
    
    let query = client
      .from('practice_records')
      .select('*')
      .order('practiced_at', { ascending: false });
    
    if (knowledge_point_id) {
      query = query.eq('knowledge_point_id', knowledge_point_id);
    }
    if (similar_question_id) {
      query = query.eq('similar_question_id', similar_question_id);
    }
    if (wrong_question_id) {
      query = query.eq('wrong_question_id', wrong_question_id);
    }
    if (is_correct !== undefined) {
      query = query.eq('is_correct', is_correct === 'true' ? 1 : 0);
    }
    
    const { data, error } = await query;
    if (error) throw new Error(`查询失败: ${error.message}`);
    res.json({ data });
  } catch (err: any) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 记录练习结果
router.post('/', async (req, res) => {
  try {
    const { 
      knowledge_point_id, 
      similar_question_id, 
      wrong_question_id,
      user_answer, 
      is_correct,
      difficulty,
      used_hint 
    } = req.body;
    
    if (!knowledge_point_id || is_correct === undefined) {
      return res.status(400).json({ error: '知识点ID和正确性不能为空' });
    }
    
    const { data, error } = await client
      .from('practice_records')
      .insert({ 
        knowledge_point_id,
        similar_question_id,
        wrong_question_id,
        user_answer,
        is_correct: is_correct ? 1 : 0,
        difficulty: difficulty || null,
        used_hint: used_hint ? 1 : 0
      })
      .select()
      .single();
    
    if (error) throw new Error(`创建失败: ${error.message}`);
    
    // 自动检查是否搞定
    const masteryResult = await checkMastery(Number(knowledge_point_id));
    
    res.json({ data, masteryResult });
  } catch (err: any) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 获取某知识点练习统计
router.get('/stats/:knowledgePointId', async (req, res) => {
  try {
    const { knowledgePointId } = req.params;
    
    const { data, error } = await client
      .from('practice_records')
      .select('*')
      .eq('knowledge_point_id', knowledgePointId);
    
    if (error) throw new Error(`查询失败: ${error.message}`);
    
    // 统计
    const total = data?.length || 0;
    const correct = data?.filter(r => r.is_correct === 1).length || 0;
    const incorrect = total - correct;
    const usedHint = data?.filter(r => r.used_hint === 1).length || 0;
    
    // 按难度统计
    const byDifficulty = {
      easy: { total: 0, correct: 0 },
      medium: { total: 0, correct: 0 },
      hard: { total: 0, correct: 0 }
    };
    
    data?.forEach(r => {
      if (r.difficulty && byDifficulty[r.difficulty as keyof typeof byDifficulty]) {
        byDifficulty[r.difficulty as keyof typeof byDifficulty].total++;
        if (r.is_correct === 1) {
          byDifficulty[r.difficulty as keyof typeof byDifficulty].correct++;
        }
      }
    });
    
    res.json({ 
      data: {
        total,
        correct,
        incorrect,
        usedHint,
        accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
        byDifficulty
      }
    });
  } catch (err: any) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 获取今日练习概览
router.get('/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data, error } = await client
      .from('practice_records')
      .select('*')
      .gte('practiced_at', today.toISOString());
    
    if (error) throw new Error(`查询失败: ${error.message}`);
    
    const total = data?.length || 0;
    const correct = data?.filter(r => r.is_correct === 1).length || 0;
    
    res.json({
      data: {
        total,
        correct,
        incorrect: total - correct,
        accuracy: total > 0 ? Math.round((correct / total) * 100) : 0
      }
    });
  } catch (err: any) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
