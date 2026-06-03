import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';
import { checkMastery } from '../services/aiService';

const router = Router();
const client = getSupabaseClient();

// 获取知识点列表（支持三级结构）
router.get('/', async (req, res) => {
  try {
    const { chapter_id, subject_id, status } = req.query;
    
    let query = client
      .from('knowledge_points')
      .select(`
        *,
        chapter:chapters(id, name, subject_id)
      `)
      .order('order_index');
    
    if (chapter_id) {
      query = query.eq('chapter_id', chapter_id);
    }
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    if (error) throw new Error(`查询失败: ${error.message}`);
    
    // 如果指定了 subject_id，过滤
    let result = data || [];
    if (subject_id) {
      result = result.filter((kp: any) => kp.chapter?.subject_id == subject_id);
    }
    
    res.json({ data: result });
  } catch (err: any) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 获取统计信息
router.get('/stats', async (req, res) => {
  try {
    const { data, error } = await client
      .from('knowledge_points')
      .select('status');
    
    if (error) throw new Error(`查询失败: ${error.message}`);
    
    const stats = {
      total: data?.length || 0,
      pending: data?.filter((kp: any) => kp.status === 'pending').length || 0,
      learning: data?.filter((kp: any) => kp.status === 'learning').length || 0,
      mastered: data?.filter((kp: any) => kp.status === 'mastered').length || 0,
    };
    
    res.json({ data: stats });
  } catch (err: any) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 创建知识点
router.post('/', async (req, res) => {
  try {
    const { chapter_id, name, order_index } = req.body;
    if (!chapter_id || !name) {
      return res.status(400).json({ error: '章节ID和知识点名称不能为空' });
    }
    
    const { data, error } = await client
      .from('knowledge_points')
      .insert({ 
        chapter_id, 
        name, 
        order_index: order_index || 0,
        status: 'pending'
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

// 开始学习知识点
router.post('/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await client
      .from('knowledge_points')
      .update({ 
        status: 'learning',
        start_date: new Date().toISOString()
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

// 检查并更新搞定状态
router.post('/:id/check-mastery', async (req, res) => {
  try {
    const { id } = req.params;
    
    const masteryResult = await checkMastery(Number(id));
    
    if (masteryResult.isMastered) {
      const { data, error } = await client
        .from('knowledge_points')
        .update({ 
          status: 'mastered',
          mastered_date: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw new Error(`更新失败: ${error.message}`);
      res.json({ data, masteryResult });
    } else {
      res.json({ isMastered: false });
    }
  } catch (err: any) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 更新知识点
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, order_index, status, start_date, mastered_date } = req.body;
    
    const updateData: any = {};
    if (name) updateData.name = name;
    if (order_index !== undefined) updateData.order_index = order_index;
    if (status) updateData.status = status;
    if (start_date) updateData.start_date = start_date;
    if (mastered_date) updateData.mastered_date = mastered_date;
    
    const { data, error } = await client
      .from('knowledge_points')
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

// 删除知识点
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await client
      .from('knowledge_points')
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
