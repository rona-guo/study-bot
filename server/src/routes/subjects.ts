import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';

const router = Router();
const client = getSupabaseClient();

// 获取所有科目
router.get('/', async (req, res) => {
  try {
    const { data, error } = await client
      .from('subjects')
      .select('*')
      .order('id');
    
    if (error) throw new Error(`查询失败: ${error.message}`);
    res.json({ data });
  } catch (err: any) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 创建科目
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: '科目名称不能为空' });
    }
    
    const { data, error } = await client
      .from('subjects')
      .insert({ name })
      .select()
      .single();
    
    if (error) throw new Error(`创建失败: ${error.message}`);
    res.json({ data });
  } catch (err: any) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 更新科目
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    const { data, error } = await client
      .from('subjects')
      .update({ name })
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

// 删除科目
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await client
      .from('subjects')
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
