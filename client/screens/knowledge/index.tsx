import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import api from '@/services/api';

interface Subject {
  id: number;
  name: string;
}

interface Chapter {
  id: number;
  subject_id: number;
  name: string;
}

interface KnowledgePoint {
  id: number;
  chapter_id: number;
  name: string;
  status: 'pending' | 'learning' | 'mastered';
  start_date?: string;
  mastered_date?: string;
  chapter?: Chapter;
}

const STATUS_COLORS = {
  pending: '#FF6B6B',
  learning: '#FDCB6E',
  mastered: '#00B894',
};

const STATUS_LABELS = {
  pending: '待学习',
  learning: '学习中',
  mastered: '已搞定',
};

export default function KnowledgeScreen() {
  const router = useSafeRouter();
  const params = useLocalSearchParams<{ status?: string }>();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(params.status || null);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [expandedSubjects, setExpandedSubjects] = useState<number[]>([]);

  const fetchData = async () => {
    try {
      // 获取所有科目
      const subjectsRes = await api.subjects.list();
      setSubjects(subjectsRes.data || []);

      // 获取所有章节
      const chaptersRes = await api.chapters.list();
      setChapters(chaptersRes.data || []);

      // 获取知识点
      const kpParams: any = {};
      if (filterStatus) kpParams.status = filterStatus;
      const kpRes = await api.knowledgePoints.list(kpParams);
      setKnowledgePoints(kpRes.data || []);

    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [filterStatus])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // 按科目分组章节
  const chaptersBySubject = chapters.reduce((acc, chapter) => {
    if (!acc[chapter.subject_id]) {
      acc[chapter.subject_id] = [];
    }
    acc[chapter.subject_id].push(chapter);
    return acc;
  }, {} as Record<number, Chapter[]>);

  // 按章节分组知识点
  const kpByChapter = knowledgePoints.reduce((acc, kp) => {
    if (!acc[kp.chapter_id]) {
      acc[kp.chapter_id] = [];
    }
    acc[kp.chapter_id].push(kp);
    return acc;
  }, {} as Record<number, KnowledgePoint[]>);

  // 切换科目展开
  const toggleSubject = (subjectId: number) => {
    setExpandedSubjects(prev => 
      prev.includes(subjectId) 
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  // 开始学习
  const handleStartLearning = async (kp: KnowledgePoint) => {
    try {
      await api.knowledgePoints.startLearning(kp.id);
      fetchData();
    } catch (error) {
      console.error('Failed to start learning:', error);
    }
  };

  // 删除知识点
  const handleDelete = async (kp: KnowledgePoint) => {
    try {
      await api.knowledgePoints.delete(kp.id);
      fetchData();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  // 获取统计
  const getStats = (chapterId: number) => {
    const points = kpByChapter[chapterId] || [];
    return {
      total: points.length,
      mastered: points.filter(p => p.status === 'mastered').length,
    };
  };

  return (
    <Screen>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>← 返回</Text>
          </TouchableOpacity>
          <Text style={styles.title}>知识点库</Text>
          <TouchableOpacity onPress={() => setShowFilter(true)}>
            <Text style={styles.filterButton}>筛选</Text>
          </TouchableOpacity>
        </View>

        {/* Active Filter */}
        {filterStatus && (
          <View style={styles.activeFilter}>
            <Text style={styles.activeFilterText}>
              当前筛选：{STATUS_LABELS[filterStatus as keyof typeof STATUS_LABELS]}
            </Text>
            <TouchableOpacity onPress={() => setFilterStatus(null)}>
              <Text style={styles.clearFilter}>清除</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Subject List */}
        {subjects.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>暂无知识点</Text>
            <Text style={styles.emptyHint}>拍照上传错题后会自动创建知识点</Text>
          </View>
        ) : (
          subjects.map(subject => {
            const subjectChapters = chaptersBySubject[subject.id] || [];
            const isExpanded = expandedSubjects.includes(subject.id);

            return (
              <View key={subject.id} style={styles.subjectCard}>
                <TouchableOpacity
                  style={styles.subjectHeader}
                  onPress={() => toggleSubject(subject.id)}
                >
                  <View style={styles.subjectInfo}>
                    <Text style={styles.subjectName}>{subject.name}</Text>
                    <Text style={styles.chapterCount}>{subjectChapters.length} 个章节</Text>
                  </View>
                  <Text style={styles.expandIcon}>{isExpanded ? '-' : '+'}</Text>
                </TouchableOpacity>

                {isExpanded && subjectChapters.map(chapter => {
                  const stats = getStats(chapter.id);
                  const chapterKps = kpByChapter[chapter.id] || [];

                  return (
                    <View key={chapter.id} style={styles.chapterSection}>
                      <View style={styles.chapterHeader}>
                        <Text style={styles.chapterName}>{chapter.name}</Text>
                        <Text style={styles.chapterStats}>
                          {stats.mastered}/{stats.total} 搞定
                        </Text>
                      </View>

                      {chapterKps.map(kp => (
                        <TouchableOpacity
                          key={kp.id}
                          style={styles.kpCard}
                          onPress={() => router.push(`/practice?kpId=${kp.id}`)}
                        >
                          <View style={styles.kpContent}>
                            <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[kp.status] }]} />
                            <View style={styles.kpInfo}>
                              <Text style={styles.kpName}>{kp.name}</Text>
                              <Text style={styles.kpStatus}>
                                {STATUS_LABELS[kp.status]}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.kpActions}>
                            {kp.status === 'pending' && (
                              <TouchableOpacity
                                style={styles.startButton}
                                onPress={() => handleStartLearning(kp)}
                              >
                                <Text style={styles.startButtonText}>开始学习</Text>
                              </TouchableOpacity>
                            )}
                            {kp.status === 'learning' && (
                              <TouchableOpacity
                                style={styles.practiceButton}
                                onPress={() => router.push(`/practice?kpId=${kp.id}`)}
                              >
                                <Text style={styles.practiceButtonText}>练习</Text>
                              </TouchableOpacity>
                            )}
                            {kp.status === 'mastered' && (
                              <View style={styles.masteredBadge}>
                                <Text style={styles.masteredBadgeText}>✓ 已搞定</Text>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  );
                })}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal visible={showFilter} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>筛选知识点</Text>

            <TouchableOpacity
              style={[styles.filterOption, !filterStatus && styles.filterOptionActive]}
              onPress={() => {
                setFilterStatus(null);
                setShowFilter(false);
              }}
            >
              <Text style={[styles.filterOptionText, !filterStatus && styles.filterOptionTextActive]}>
                全部
              </Text>
            </TouchableOpacity>

            {(['pending', 'learning', 'mastered'] as const).map(status => (
              <TouchableOpacity
                key={status}
                style={[styles.filterOption, filterStatus === status && styles.filterOptionActive]}
                onPress={() => {
                  setFilterStatus(status);
                  setShowFilter(false);
                }}
              >
                <View style={[styles.filterDot, { backgroundColor: STATUS_COLORS[status] }]} />
                <Text style={[styles.filterOptionText, filterStatus === status && styles.filterOptionTextActive]}>
                  {STATUS_LABELS[status]}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowFilter(false)}
            >
              <Text style={styles.modalCloseText}>关闭</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F0F3',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    fontSize: 16,
    color: '#6C63FF',
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2D3436',
    flex: 1,
  },
  filterButton: {
    fontSize: 16,
    color: '#6C63FF',
  },
  activeFilter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(108,99,255,0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  activeFilterText: {
    fontSize: 14,
    color: '#6C63FF',
  },
  clearFilter: {
    fontSize: 14,
    color: '#FF6B6B',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#636E72',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: '#B2BEC3',
  },
  subjectCard: {
    backgroundColor: '#F0F0F3',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#D1D9E6',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  subjectInfo: {},
  subjectName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3436',
  },
  chapterCount: {
    fontSize: 13,
    color: '#636E72',
    marginTop: 4,
  },
  expandIcon: {
    fontSize: 14,
    color: '#636E72',
  },
  chapterSection: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  chapterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#E8E8EB',
    marginTop: 8,
    borderRadius: 12,
  },
  chapterName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3436',
  },
  chapterStats: {
    fontSize: 13,
    color: '#636E72',
  },
  kpCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    borderRadius: 12,
  },
  kpContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  kpInfo: {
    flex: 1,
  },
  kpName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3436',
  },
  kpStatus: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 2,
  },
  kpActions: {
    marginLeft: 12,
  },
  startButton: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  practiceButton: {
    backgroundColor: '#FDCB6E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  practiceButtonText: {
    color: '#2D3436',
    fontSize: 13,
    fontWeight: '600',
  },
  masteredBadge: {
    backgroundColor: '#00B894',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  masteredBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 20,
    textAlign: 'center',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  filterOptionActive: {
    backgroundColor: 'rgba(108,99,255,0.1)',
  },
  filterDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  filterOptionText: {
    fontSize: 16,
    color: '#2D3436',
  },
  filterOptionTextActive: {
    color: '#6C63FF',
    fontWeight: '600',
  },
  modalClose: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F0F0F3',
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#636E72',
  },
});
