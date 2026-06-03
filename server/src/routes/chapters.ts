import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';

const router = Router();
const client = getSupabaseClient();

// 获取某科目下所有章节
router.get('/', async (req, res) => {
  try {
    const { subject_id } = req.query;
    
    let query = client.from('chapters').select('*').order('order_index');
    
    if (subject_id) {
      query = query.eq('subject_id', subject_id);
    }
    
    const { data, error } = await query;
    if (error) throw new Error(`查询失败: ${error.message}`);
    res.json({ data });
  } catch (err: any) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 创建章节
router.post('/', async (req, res) => {
  try {
    const { subject_id, name, order_index } = req.body;
    if (!subject_id || !name) {
      return res.status(400).json({ error: '科目ID和章节名称不能为空' });
    }
    
    const { data, error } = await client
      .from('chapters')
      .insert({ subject_id, name, order_index: order_index || 0 })
      .select()
      .single();
    
    if (error) throw new Error(`创建失败: ${error.message}`);
    res.json({ data });
  } catch (err: any) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 更新章节
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, order_index } = req.body;
    
    const updateData: any = {};
    if (name) updateData.name = name;
    if (order_index !== undefined) updateData.order_index = order_index;
    
    const { data, error } = await client
      .from('chapters')
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

// 删除章节
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await client
      .from('chapters')
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
