import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import api from '@/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeRouter } from '@/hooks/useSafeRouter';

interface Stats {
  total: number;
  pending: number;
  learning: number;
  mastered: number;
}

export default function HomeScreen() {
  const router = useSafeRouter();
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, learning: 0, mastered: 0 });
  const [wrongCount, setWrongCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [statsRes, wrongRes] = await Promise.all([
        api.knowledgePoints.stats(),
        api.wrongQuestions.list({ limit: 100 }).then(res => res.data || []),
      ]);
      setStats(statsRes.data || { total: 0, pending: 0, learning: 0, mastered: 0 });
      setWrongCount(wrongRes.length || 0);
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
          <Text style={styles.title}>错题本</Text>
          <Text style={styles.subtitle}>高二 · 高考复习</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => router.push('/knowledge')}
          >
            <LinearGradient
              colors={['#6C63FF', '#896BFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCardGradient}
            >
              <Text style={styles.statNumber}>{stats.total}</Text>
              <Text style={styles.statLabel}>知识点</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => router.push('/knowledge?status=pending')}
          >
            <LinearGradient
              colors={['#FF6B6B', '#FF8E8E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCardGradient}
            >
              <Text style={styles.statNumber}>{stats.pending}</Text>
              <Text style={styles.statLabel}>待学习</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => router.push('/knowledge?status=learning')}
          >
            <LinearGradient
              colors={['#FDCB6E', '#F9BF3B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCardGradient}
            >
              <Text style={styles.statNumber}>{stats.learning}</Text>
              <Text style={styles.statLabel}>学习中</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => router.push('/mastered')}
          >
            <LinearGradient
              colors={['#00B894', '#00CEC9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCardGradient}
            >
              <Text style={styles.statNumber}>{stats.mastered}</Text>
              <Text style={styles.statLabel}>已搞定</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Wrong Questions Count */}
        <View style={styles.section}>
          <View style={styles.wrongCountCard}>
            <View style={styles.wrongCountContent}>
              <Text style={styles.wrongCountNumber}>{wrongCount}</Text>
              <Text style={styles.wrongCountLabel}>错题总数</Text>
            </View>
            <TouchableOpacity 
              style={styles.wrongCountButton}
              onPress={() => router.push('/knowledge')}
            >
              <Text style={styles.wrongCountButtonText}>查看全部</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>快捷操作</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/upload')}
            >
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(108,99,255,0.12)' }]}>
                <Text style={styles.actionIconText}>+</Text>
              </View>
              <Text style={styles.actionTitle}>拍照上传</Text>
              <Text style={styles.actionDesc}>拍错题自动分析</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/practice')}
            >
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(0,184,148,0.12)' }]}>
                <Text style={styles.actionIconText}>✎</Text>
              </View>
              <Text style={styles.actionTitle}>开始练习</Text>
              <Text style={styles.actionDesc}>生成同类题练习</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/knowledge')}
            >
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(253,203,110,0.12)' }]}>
                <Text style={styles.actionIconText}>☰</Text>
              </View>
              <Text style={styles.actionTitle}>知识点库</Text>
              <Text style={styles.actionDesc}>管理所有知识点</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/mastered')}
            >
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(0,206,201,0.12)' }]}>
                <Text style={styles.actionIconText}>✓</Text>
              </View>
              <Text style={styles.actionTitle}>搞定列表</Text>
              <Text style={styles.actionDesc}>已掌握的知识点</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mastery Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>搞定进度</Text>
          <View style={styles.progressCard}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: stats.total > 0 ? `${(stats.mastered / stats.total) * 100}%` : '0%' }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {stats.mastered} / {stats.total} 知识点已搞定
            </Text>
          </View>
        </View>
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
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2D3436',
  },
  subtitle: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 24,
    overflow: 'hidden',
  },
  statCardGradient: {
    padding: 20,
    alignItems: 'center',
    borderRadius: 24,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 12,
  },
  wrongCountCard: {
    backgroundColor: '#F0F0F3',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#D1D9E6',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 6,
  },
  wrongCountContent: {
    alignItems: 'center',
  },
  wrongCountNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FF6B6B',
  },
  wrongCountLabel: {
    fontSize: 13,
    color: '#636E72',
  },
  wrongCountButton: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  wrongCountButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#F0F0F3',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#D1D9E6',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionIconText: {
    fontSize: 20,
    color: '#6C63FF',
    fontWeight: '700',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3436',
  },
  actionDesc: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 4,
  },
  progressCard: {
    backgroundColor: '#F0F0F3',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#D1D9E6',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#E8E8EB',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00B894',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    color: '#636E72',
    textAlign: 'center',
  },
});
