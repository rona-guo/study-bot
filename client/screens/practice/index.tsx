import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import api from '@/services/api';

interface KnowledgePoint {
  id: number;
  name: string;
  status: string;
  chapter?: { name: string };
}

interface SimilarQuestion {
  id: number;
  question_text: string;
  answer: string;
  explanation?: string;
  difficulty: string;
}

const DIFFICULTY_COLORS = {
  easy: '#00B894',
  medium: '#FDCB6E',
  hard: '#FF6B6B',
};

const DIFFICULTY_LABELS = {
  easy: '基础',
  medium: '中等',
  hard: '困难',
};

export default function PracticeScreen() {
  const router = useSafeRouter();
  const params = useLocalSearchParams<{ kpId?: string }>();
  const [knowledgePoint, setKnowledgePoint] = useState<KnowledgePoint | null>(null);
  const [questions, setQuestions] = useState<SimilarQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [usedHint, setUsedHint] = useState(false);
  const [results, setResults] = useState<{ correct: number; total: number }>({ correct: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  // 获取知识点信息
  const fetchKnowledgePoint = async () => {
    if (!params.kpId) return;
    
    try {
      const kps = await api.knowledgePoints.list({ chapter_id: Number(params.kpId) });
      const kp = kps.data?.find((k: any) => k.id === Number(params.kpId));
      if (kp) {
        setKnowledgePoint(kp);
      }
    } catch (error) {
      console.error('Failed to fetch knowledge point:', error);
    }
  };

  // 获取待练习题目
  const fetchQuestions = async () => {
    if (!params.kpId) return;
    
    try {
      const res = await api.similarQuestions.pending(Number(params.kpId));
      setQuestions(res.data || []);
    } catch (error) {
      console.error('Failed to fetch questions:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchKnowledgePoint();
      fetchQuestions();
    }, [params.kpId])
  );

  // AI 生成同类题
  const handleGenerateQuestions = async () => {
    if (!knowledgePoint || !knowledgePoint.name) {
      Alert.alert('提示', '请先选择知识点');
      return;
    }

    setGenerating(true);
    try {
      await api.similarQuestions.generate({
        knowledge_point_id: knowledgePoint.id,
        knowledge_point_name: knowledgePoint.name,
        difficulty: selectedDifficulty,
        count: 3,
      });

      Alert.alert('成功', '已生成3道同类题');
      fetchQuestions();
    } catch (error) {
      console.error('Failed to generate questions:', error);
      Alert.alert('错误', '生成失败，请重试');
    } finally {
      setGenerating(false);
    }
  };

  // 提交答案
  const handleSubmit = async (isCorrect: boolean) => {
    if (!knowledgePoint || questions.length === 0) return;

    const currentQuestion = questions[currentIndex];

    try {
      // 记录练习结果
      await api.practiceRecords.create({
        knowledge_point_id: knowledgePoint.id,
        similar_question_id: currentQuestion.id,
        user_answer: userAnswer,
        is_correct: isCorrect,
        difficulty: currentQuestion.difficulty,
        used_hint: usedHint,
      });

      // 更新统计
      setResults(prev => ({
        correct: prev.correct + (isCorrect ? 1 : 0),
        total: prev.total + 1,
      }));

      // 检查是否搞定
      if (isCorrect) {
        const masteryRes = await api.knowledgePoints.checkMastery(knowledgePoint.id);
        if (masteryRes.data?.isMastered) {
          Alert.alert('太棒了！', `这个知识点搞定了！\n原因：${masteryRes.data?.reason}`, [
            { text: '继续', onPress: () => router.push('/mastered') }
          ]);
          return;
        }
      }

      // 下一题或完成
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setUserAnswer('');
        setShowAnswer(false);
        setUsedHint(false);
      } else {
        Alert.alert(
          results.correct + (isCorrect ? 1 : 0) >= (results.total + 1) / 2 ? '不错！' : '继续加油！',
          `本次练习：${results.correct + (isCorrect ? 1 : 0)}/${results.total + 1} 正确`,
          [
            { text: '继续练习', onPress: () => {
              setCurrentIndex(0);
              setUserAnswer('');
              setShowAnswer(false);
              setResults({ correct: 0, total: 0 });
            }},
            { text: '返回', onPress: () => router.back() }
          ]
        );
      }
    } catch (error) {
      console.error('Failed to submit:', error);
    }
  };

  const currentQuestion = questions[currentIndex];

  return (
    <Screen>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>← 返回</Text>
          </TouchableOpacity>
          <Text style={styles.title}>练习</Text>
        </View>

        {/* Knowledge Point Info */}
        {knowledgePoint && (
          <View style={styles.kpCard}>
            <Text style={styles.kpName}>{knowledgePoint.name}</Text>
            {knowledgePoint.chapter && (
              <Text style={styles.kpChapter}>{knowledgePoint.chapter.name}</Text>
            )}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{results.correct}</Text>
                <Text style={styles.statLabel}>正确</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{results.total}</Text>
                <Text style={styles.statLabel}>总计</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {results.total > 0 ? Math.round((results.correct / results.total) * 100) : 0}%
                </Text>
                <Text style={styles.statLabel}>正确率</Text>
              </View>
            </View>
          </View>
        )}

        {/* Question or Empty State */}
        {questions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>暂无练习题</Text>
            <Text style={styles.emptyHint}>点击下方按钮生成同类题</Text>

            {/* Difficulty Selection */}
            <View style={styles.difficultySection}>
              <Text style={styles.difficultyTitle}>选择难度</Text>
              <View style={styles.difficultyButtons}>
                {(['easy', 'medium', 'hard'] as const).map(diff => (
                  <TouchableOpacity
                    key={diff}
                    style={[
                      styles.difficultyButton,
                      selectedDifficulty === diff && { backgroundColor: DIFFICULTY_COLORS[diff] }
                    ]}
                    onPress={() => setSelectedDifficulty(diff)}
                  >
                    <Text style={[
                      styles.difficultyButtonText,
                      selectedDifficulty === diff && { color: '#FFFFFF' }
                    ]}>
                      {DIFFICULTY_LABELS[diff]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.generateButton, generating && styles.buttonDisabled]}
              onPress={handleGenerateQuestions}
              disabled={generating}
            >
              {generating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.generateButtonText}>AI 生成同类题</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Progress */}
            <View style={styles.progressSection}>
              <Text style={styles.progressText}>
                第 {currentIndex + 1} / {questions.length} 题
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${((currentIndex + 1) / questions.length) * 100}%` }
                  ]} 
                />
              </View>
            </View>

            {/* Question Card */}
            <View style={styles.questionCard}>
              <View style={styles.questionHeader}>
                <View style={[styles.difficultyBadge, { backgroundColor: DIFFICULTY_COLORS[currentQuestion.difficulty as keyof typeof DIFFICULTY_COLORS] || '#636E72' }]}>
                  <Text style={styles.difficultyBadgeText}>
                    {DIFFICULTY_LABELS[currentQuestion.difficulty as keyof typeof DIFFICULTY_LABELS] || '未知'}
                  </Text>
                </View>
              </View>

              <Text style={styles.questionText}>{currentQuestion.question_text}</Text>

              {/* Answer Input */}
              {!showAnswer ? (
                <>
                  <TextInput
                    style={styles.answerInput}
                    placeholder="请输入你的答案..."
                    placeholderTextColor="#B2BEC3"
                    value={userAnswer}
                    onChangeText={setUserAnswer}
                    multiline
                  />

                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.hintButton}
                      onPress={() => setShowAnswer(true)}
                    >
                      <Text style={styles.hintButtonText}>查看答案</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.submitButton, !userAnswer.trim() && styles.buttonDisabled]}
                      onPress={() => handleSubmit(false)}
                      disabled={!userAnswer.trim()}
                    >
                      <Text style={styles.submitButtonText}>提交</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={styles.answerSection}>
                  {/* Show Hint Button */}
                  {!usedHint && (
                    <TouchableOpacity
                      style={styles.hintButton}
                      onPress={() => setUsedHint(true)}
                    >
                      <Text style={styles.hintButtonText}>我需要看解析</Text>
                    </TouchableOpacity>
                  )}

                  {/* Correct Answer */}
                  <View style={styles.correctAnswerCard}>
                    <Text style={styles.correctAnswerLabel}>正确答案</Text>
                    <Text style={styles.correctAnswerText}>{currentQuestion.answer}</Text>
                  </View>

                  {/* Explanation */}
                  {usedHint && currentQuestion.explanation && (
                    <View style={styles.explanationCard}>
                      <Text style={styles.explanationLabel}>解析</Text>
                      <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
                    </View>
                  )}

                  {/* Judge Buttons */}
                  <View style={styles.judgeButtons}>
                    <TouchableOpacity
                      style={[styles.judgeButton, styles.wrongButton]}
                      onPress={() => handleSubmit(false)}
                    >
                      <Text style={styles.wrongButtonText}>✗ 错了</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.judgeButton, styles.correctButton]}
                      onPress={() => handleSubmit(true)}
                    >
                      <Text style={styles.correctButtonText}>✓ 做对了</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.bottomActions}>
              <TouchableOpacity
                style={styles.regenerateButton}
                onPress={handleGenerateQuestions}
              >
                <Text style={styles.regenerateButtonText}>再生成3道</Text>
              </TouchableOpacity>
            </View>
          </>
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
  kpCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#D1D9E6',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
  },
  kpName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3436',
  },
  kpChapter: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F3',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#6C63FF',
  },
  statLabel: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E8E8EB',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 32,
  },
  difficultySection: {
    width: '100%',
    marginBottom: 24,
  },
  difficultyTitle: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 12,
    textAlign: 'center',
  },
  difficultyButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  difficultyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#E8E8EB',
  },
  difficultyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#636E72',
  },
  generateButton: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressText: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E8E8EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6C63FF',
    borderRadius: 4,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#D1D9E6',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
  },
  questionHeader: {
    marginBottom: 16,
  },
  difficultyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  difficultyBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  questionText: {
    fontSize: 16,
    color: '#2D3436',
    lineHeight: 24,
  },
  answerInput: {
    backgroundColor: '#F0F0F3',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#2D3436',
    minHeight: 80,
    marginTop: 20,
    textAlignVertical: 'top',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  hintButton: {
    flex: 1,
    backgroundColor: '#E8E8EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  hintButtonText: {
    fontSize: 14,
    color: '#636E72',
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#6C63FF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  answerSection: {
    marginTop: 20,
  },
  correctAnswerCard: {
    backgroundColor: '#E8FDF5',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  correctAnswerLabel: {
    fontSize: 12,
    color: '#00B894',
    fontWeight: '600',
    marginBottom: 8,
  },
  correctAnswerText: {
    fontSize: 16,
    color: '#2D3436',
    fontWeight: '600',
  },
  explanationCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  explanationLabel: {
    fontSize: 12,
    color: '#FDCB6E',
    fontWeight: '600',
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 14,
    color: '#2D3436',
    lineHeight: 22,
  },
  judgeButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  judgeButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  wrongButton: {
    backgroundColor: '#FF6B6B',
  },
  correctButton: {
    backgroundColor: '#00B894',
  },
  wrongButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  correctButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bottomActions: {
    alignItems: 'center',
  },
  regenerateButton: {
    backgroundColor: '#F0F0F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  regenerateButtonText: {
    fontSize: 14,
    color: '#6C63FF',
    fontWeight: '600',
  },
});
