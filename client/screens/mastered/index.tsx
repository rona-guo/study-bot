import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import api from '@/services/api';

interface MasteredPoint {
  id: number;
  name: string;
  status: string;
  mastered_date?: string;
  chapter?: {
    name: string;
    subject_id: number;
  };
}

export default function MasteredScreen() {
  const router = useSafeRouter();
  const [masteredPoints, setMasteredPoints] = useState<MasteredPoint[]>([]);
  const [pendingPoints, setPendingPoints] = useState<MasteredPoint[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'mastered' | 'pending'>('mastered');

  const fetchData = async () => {
    try {
      const [masteredRes, pendingRes] = await Promise.all([
        api.knowledgePoints.list({ status: 'mastered' }),
        api.knowledgePoints.list({ status: 'pending' }),
      ]);
      
      // 按搞定日期排序
      const mastered = (masteredRes.data || []).sort((a: any, b: any) => {
        const dateA = a.mastered_date ? new Date(a.mastered_date).getTime() : 0;
        const dateB = b.mastered_date ? new Date(b.mastered_date).getTime() : 0;
        return dateB - dateA;
      });
      
      setMasteredPoints(mastered);
      setPendingPoints(pendingRes.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const currentList = activeTab === 'mastered' ? masteredPoints : pendingPoints;

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
          <Text style={styles.title}>搞定列表</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{masteredPoints.length}</Text>
            <Text style={styles.statLabel}>已搞定</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#FF6B6B' }]}>{pendingPoints.length}</Text>
            <Text style={styles.statLabel}>待搞定</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'mastered' && styles.tabActive]}
            onPress={() => setActiveTab('mastered')}
          >
            <Text style={[styles.tabText, activeTab === 'mastered' && styles.tabTextActive]}>
              已搞定 ({masteredPoints.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
            onPress={() => setActiveTab('pending')}
          >
            <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
              待搞定 ({pendingPoints.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* List */}
        {currentList.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {activeTab === 'mastered' ? '暂无已搞定的知识点' : '暂无待搞定的知识点'}
            </Text>
            <Text style={styles.emptyHint}>
              {activeTab === 'mastered' 
                ? '完成练习达到搞定条件后会自动出现在这里'
                : '拍照上传错题后会创建知识点'}
            </Text>
          </View>
        ) : (
          currentList.map(point => (
            <TouchableOpacity
              key={point.id}
              style={styles.itemCard}
              onPress={() => router.push(`/practice?kpId=${point.id}`)}
            >
              <View style={styles.itemContent}>
                <View style={styles.itemHeader}>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: activeTab === 'mastered' ? '#00B894' : '#FF6B6B' }
                  ]}>
                    <Text style={styles.statusBadgeText}>
                      {activeTab === 'mastered' ? '✓ 已搞定' : '○ 待学习'}
                    </Text>
                  </View>
                  {point.mastered_date && (
                    <Text style={styles.dateText}>{formatDate(point.mastered_date)}</Text>
                  )}
                </View>
                
                <Text style={styles.pointName}>{point.name}</Text>
                
                {point.chapter && (
                  <Text style={styles.chapterName}>{point.chapter.name}</Text>
                )}
              </View>

              <View style={styles.itemArrow}>
                <Text style={styles.arrowText}>›</Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Tips */}
        {activeTab === 'pending' && pendingPoints.length > 0 && (
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>搞定条件</Text>
            <Text style={styles.tipText}>1. 同一题第二天重做作对</Text>
            <Text style={styles.tipText}>2. 中等难度题不看答案作对≥3个</Text>
            <Text style={styles.tipText}>3. 一周后中等难度题不看答案作对≥2个</Text>
          </View>
        )}
      </ScrollView>
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
    marginBottom: 24,
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
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#D1D9E6',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: '#00B894',
  },
  statLabel: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E8E8EB',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#6C63FF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#636E72',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#636E72',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 13,
    color: '#B2BEC3',
    textAlign: 'center',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#D1D9E6',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dateText: {
    fontSize: 12,
    color: '#636E72',
    marginLeft: 8,
  },
  pointName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 4,
  },
  chapterName: {
    fontSize: 13,
    color: '#636E72',
  },
  itemArrow: {
    marginLeft: 12,
  },
  arrowText: {
    fontSize: 24,
    color: '#B2BEC3',
  },
  tipsCard: {
    backgroundColor: 'rgba(108,99,255,0.08)',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6C63FF',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 13,
    color: '#636E72',
    lineHeight: 22,
  },
});
