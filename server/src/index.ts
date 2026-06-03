import express from "express";
import cors from "cors";

// 路由
import subjectsRouter from "./routes/subjects";
import chaptersRouter from "./routes/chapters";
import knowledgePointsRouter from "./routes/knowledgePoints";
import wrongQuestionsRouter from "./routes/wrongQuestions";
import similarQuestionsRouter from "./routes/similarQuestions";
import practiceRecordsRouter from "./routes/practiceRecords";

// 服务
import { initSubjects } from "./services/aiService";

const app = express();
const port = process.env.PORT || 9091;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get('/api/v1/health', (req, res) => {
  console.log('Health check success');
  res.status(200).json({ status: 'ok' });
});

// 注册路由
app.use('/api/v1/subjects', subjectsRouter);
app.use('/api/v1/chapters', chaptersRouter);
app.use('/api/v1/knowledge-points', knowledgePointsRouter);
app.use('/api/v1/wrong-questions', wrongQuestionsRouter);
app.use('/api/v1/similar-questions', similarQuestionsRouter);
app.use('/api/v1/practice-records', practiceRecordsRouter);

// 初始化预置数据
initSubjects().catch(console.error);

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
});
