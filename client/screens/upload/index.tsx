import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Alert, ActivityIndicator } from 'react-native';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import api, { analyzeQuestion } from '@/services/api';

const WRONG_REASONS = [
  { id: 'concept', label: '概念不清', color: '#6C63FF' },
  { id: 'misread', label: '审题不清', color: '#FDCB6E' },
  { id: 'calculation', label: '计算错误', color: '#FF6B6B' },
  { id: 'totally_wrong', label: '完全不会', color: '#636E72' },
];

export default function UploadScreen() {
  const router = useSafeRouter();
  const [questionText, setQuestionText] = useState('');
  const [answer, setAnswer] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>('totally_wrong');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // 拍照
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('提示', '需要相机权限才能拍照');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  // 选择图片
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('提示', '需要相册权限');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  // 分析错题
  const analyzeQuestion = async () => {
    if (!questionText.trim()) {
      Alert.alert('提示', '请输入题目内容');
      return;
    }

    setAnalyzing(true);
    try {
      // 调用 AI 分析
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/ai/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          questionText: questionText,
          questionImageUrl: imageUri
        }),
      });
      
      const data = await response.json();
      setAnalysisResult(data);
      
      if (data.knowledgePoints && data.knowledgePoints.length > 0) {
        const firstPoint = data.knowledgePoints[0];
        Alert.alert(
          'AI 分析结果',
          `科目：${firstPoint.subject}\n年级：${firstPoint.grade}\n章节：${firstPoint.chapter}\n知识点：${firstPoint.point}\n\n建议：${data.summary || '无'}`,
          [{ text: '确定' }]
        );
      }
    } catch (error) {
      console.error('Analysis error:', error);
      // 如果 AI 分析失败，使用默认结构
      setAnalysisResult({
        knowledgePoints: [{
          subject: '数学',
          grade: '高二',
          chapter: '待分类',
          point: '待分类'
        }],
        wrongReason: 'totally_wrong',
        summary: '请手动选择知识点'
      });
    } finally {
      setAnalyzing(false);
    }
  };

  // 提交错题
  const submitWrongQuestion = async () => {
    if (!questionText.trim() || !answer.trim()) {
      Alert.alert('提示', '题目和答案不能为空');
      return;
    }

    if (!analysisResult?.knowledgePoints || analysisResult.knowledgePoints.length === 0) {
      Alert.alert('提示', '请先分析题目');
      return;
    }

    setSubmitting(true);
    try {
      // 1. 确保科目存在
      const kp = analysisResult.knowledgePoints[0];
      let subjects = await api.subjects.list();
      let subject = subjects.data?.find((s: any) => s.name === kp.subject);
      
      if (!subject) {
        const newSubject = await api.subjects.create(kp.subject);
        subject = newSubject.data;
      }

      // 2. 确保章节存在
      let chapters = await api.chapters.list(subject.id);
      let chapter = chapters.data?.find((c: any) => c.name === kp.chapter);
      
      if (!chapter) {
        const newChapter = await api.chapters.create({
          subject_id: subject.id,
          name: kp.chapter,
        });
        chapter = newChapter.data;
      }

      // 3. 确保知识点存在
      let knowledgePoints = await api.knowledgePoints.list({ chapter_id: chapter.id });
      let kpRecord = knowledgePoints.data?.find((k: any) => k.name === kp.point);
      
      if (!kpRecord) {
        const newKp = await api.knowledgePoints.create({
          chapter_id: chapter.id,
          name: kp.point,
        });
        kpRecord = newKp.data;
      }

      // 4. 创建错题记录
      await api.wrongQuestions.create({
        knowledge_point_id: kpRecord.id,
        question_text: questionText,
        answer: answer,
        wrong_reason: selectedReason,
        question_image_url: imageUri || undefined,
      });

      Alert.alert('成功', '错题已保存', [
        { text: '继续添加', onPress: () => {
          setQuestionText('');
          setAnswer('');
          setImageUri(null);
          setAnalysisResult(null);
        }},
        { text: '查看知识点', onPress: () => router.push('/knowledge') }
      ]);
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('错误', '保存失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>← 返回</Text>
          </TouchableOpacity>
          <Text style={styles.title}>上传错题</Text>
        </View>

        {/* Image Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>题目图片（可选）</Text>
          <View style={styles.imageSection}>
            {imageUri ? (
              <TouchableOpacity onPress={pickImage}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
                <Text style={styles.changeImageText}>点击更换</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.imageButtons}>
                <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
                  <Text style={styles.imageButtonIcon}>[  ]</Text>
                  <Text style={styles.imageButtonText}>拍照</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                  <Text style={styles.imageButtonIcon}>[  ]</Text>
                  <Text style={styles.imageButtonText}>相册</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Question Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>题目内容 *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="请输入或粘贴题目内容..."
            placeholderTextColor="#B2BEC3"
            value={questionText}
            onChangeText={setQuestionText}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Answer Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>正确答案 *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="请输入正确答案..."
            placeholderTextColor="#B2BEC3"
            value={answer}
            onChangeText={setAnswer}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
        </View>

        {/* Wrong Reason Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>错因选择 *</Text>
          <View style={styles.reasonGrid}>
            {WRONG_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                style={[
                  styles.reasonButton,
                  selectedReason === reason.id && { backgroundColor: reason.color }
                ]}
                onPress={() => setSelectedReason(reason.id)}
              >
                <Text style={[
                  styles.reasonButtonText,
                  selectedReason === reason.id && { color: '#FFFFFF' }
                ]}>
                  {reason.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Analyze Button */}
        <TouchableOpacity 
          style={[styles.analyzeButton, analyzing && styles.buttonDisabled]}
          onPress={analyzeQuestion}
          disabled={analyzing}
        >
          {analyzing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.analyzeButtonText}>AI 分析题目</Text>
          )}
        </TouchableOpacity>

        {/* Analysis Result */}
        {analysisResult && analysisResult.knowledgePoints && analysisResult.knowledgePoints.length > 0 && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>AI 识别结果</Text>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>科目：</Text>
              <Text style={styles.resultValue}>{analysisResult.knowledgePoints[0].subject}</Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>年级：</Text>
              <Text style={styles.resultValue}>{analysisResult.knowledgePoints[0].grade}</Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>章节：</Text>
              <Text style={styles.resultValue}>{analysisResult.knowledgePoints[0].chapter}</Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>知识点：</Text>
              <Text style={styles.resultValue}>{analysisResult.knowledgePoints[0].point}</Text>
            </View>
            {analysisResult.summary && (
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>建议：</Text>
                <Text style={styles.resultValue}>{analysisResult.summary}</Text>
              </View>
            )}
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity 
          style={[styles.submitButton, submitting && styles.buttonDisabled]}
          onPress={submitWrongQuestion}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>保存错题</Text>
          )}
        </TouchableOpacity>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 12,
  },
  imageSection: {
    backgroundColor: '#F0F0F3',
    borderRadius: 16,
    padding: 20,
  },
  imageButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  imageButton: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#E8E8EB',
    borderRadius: 16,
    width: 100,
  },
  imageButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  imageButtonText: {
    fontSize: 14,
    color: '#636E72',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  changeImageText: {
    textAlign: 'center',
    color: '#6C63FF',
    marginTop: 8,
    fontSize: 14,
  },
  textInput: {
    backgroundColor: '#E8E8EB',
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: '#2D3436',
    minHeight: 80,
  },
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  reasonButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#E8E8EB',
  },
  reasonButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#636E72',
  },
  analyzeButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  submitButton: {
    backgroundColor: '#00B894',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  analyzeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  resultCard: {
    backgroundColor: '#F0F0F3',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#D1D9E6',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6C63FF',
    marginBottom: 12,
  },
  resultItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  resultLabel: {
    fontSize: 14,
    color: '#636E72',
    width: 70,
  },
  resultValue: {
    fontSize: 14,
    color: '#2D3436',
    flex: 1,
  },
});
