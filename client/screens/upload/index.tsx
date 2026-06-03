import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Alert, ActivityIndicator } from 'react-native';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import api from '@/services/api';

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
  const [analysis, setAnalysis] = useState('');  // AI解析
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>('totally_wrong');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // 拍照后自动识别
  const handleImageSelected = async (uri: string) => {
    setImageUri(uri);
    setAnalyzing(true);
    
    try {
      // 读取图片并转为 base64
      const base64 = await (FileSystem as any).readAsStringAsync(uri, {
        encoding: (FileSystem as any).EncodingType.Base64,
      });

      // 调用 AI 识别接口
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/ai/ocr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: base64 }),
      });

      const data = await response.json();
      
      // 自动填入题目和答案
      if (data.questionText) {
        setQuestionText(data.questionText);
      }
      if (data.answer) {
        setAnswer(data.answer);
      }
      if (data.analysis) {
        setAnalysis(data.analysis);
      }
      
      // 设置知识点分析结果
      if (data.knowledgePointDetail) {
        setAnalysisResult({
          knowledgePoints: [{
            subject: data.knowledgePointDetail.subject || '数学',
            grade: data.knowledgePointDetail.grade || '高二',
            chapter: data.knowledgePointDetail.chapter || '待分类',
            point: data.knowledgePointDetail.point || '待分类'
          }],
          summary: data.summary || ''
        });
      }
      
      Alert.alert('识别成功', '题目和答案已自动填入，请检查是否正确！');
    } catch (error) {
      console.error('OCR error:', error);
      Alert.alert('提示', '图片识别失败，请手动输入题目和答案');
    } finally {
      setAnalyzing(false);
    }
  };

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
      handleImageSelected(result.assets[0].uri);
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
      handleImageSelected(result.assets[0].uri);
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
          <Text style={styles.sectionTitle}>拍照上传错题</Text>
          <Text style={styles.hint}>拍摄题目后，AI自动识别并生成答案解析</Text>
          <View style={styles.imageSection}>
            {imageUri ? (
              <TouchableOpacity onPress={pickImage}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
                <Text style={styles.changeImageText}>点击重新拍摄</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.imageButtons}>
                <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
                  <Text style={styles.imageButtonIcon}>📷</Text>
                  <Text style={styles.imageButtonText}>拍照</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                  <Text style={styles.imageButtonIcon}>🖼️</Text>
                  <Text style={styles.imageButtonText}>相册</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Analyzing Indicator */}
        {analyzing && (
          <View style={styles.analyzingCard}>
            <ActivityIndicator color="#6C63FF" size="large" />
            <Text style={styles.analyzingText}>AI正在识别题目...</Text>
          </View>
        )}

        {/* Question Input */}
        {questionText ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>题目内容</Text>
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
        ) : null}

        {/* AI Answer & Analysis */}
        {answer ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>标准答案（含解析）</Text>
            <TextInput
              style={[styles.textInput, styles.answerInput]}
              placeholder="AI生成的标准答案..."
              placeholderTextColor="#B2BEC3"
              value={answer}
              onChangeText={setAnswer}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>
        ) : null}

        {/* Analysis Detail */}
        {analysis ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI解析</Text>
            <TextInput
              style={[styles.textInput, styles.analysisInput]}
              placeholder="AI详细解析..."
              placeholderTextColor="#B2BEC3"
              value={analysis}
              onChangeText={setAnalysis}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        ) : null}

        {/* Wrong Reason Selection */}
        {analysisResult && analysisResult.knowledgePoints && analysisResult.knowledgePoints.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI 识别结果</Text>
            <View style={styles.resultCard}>
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
                <Text style={[styles.resultValue, { color: '#6C63FF', fontWeight: '700' }]}>
                  {analysisResult.knowledgePoints[0].point}
                </Text>
              </View>
              {analysisResult.summary && (
                <View style={[styles.resultItem, { marginTop: 8 }]}>
                  <Text style={styles.resultLabel}>建议：</Text>
                  <Text style={styles.resultValue}>{analysisResult.summary}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Wrong Reason Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>错因分析</Text>
          <Text style={styles.hint}>帮助AI了解你的薄弱环节</Text>
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

        {/* Submit Button */}
        <TouchableOpacity 
          style={[styles.submitButton, (submitting || !analysisResult) && styles.buttonDisabled]}
          onPress={submitWrongQuestion}
          disabled={submitting || !analysisResult}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>
              {analysisResult ? '保存错题' : '请先上传题目'}
            </Text>
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
  hint: {
    fontSize: 13,
    color: '#636E72',
    marginBottom: 12,
  },
  analyzingCard: {
    backgroundColor: '#E8E8EB',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginBottom: 24,
  },
  analyzingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#636E72',
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
  answerInput: {
    minHeight: 150,
  },
  analysisInput: {
    minHeight: 100,
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
  submitButton: {
    backgroundColor: '#00B894',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
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
