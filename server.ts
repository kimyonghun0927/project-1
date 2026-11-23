import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

function getGeminiClient(apiKey: string) {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface QuizGenerationRequest {
  subjectName?: string;
  unitName?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  count?: number;
  questionType?: 'multiple_choice' | 'short_answer' | 'mixed';
}

function getDifficultyKorean(difficulty: string): string {
  switch (difficulty) {
    case 'easy':
      return '기초 (핵심 개념 확인 수준)';
    case 'hard':
      return '심화 (응용 및 사고력 요구 수준)';
    default:
      return '보통 (표준 학습 및 시험 대비 수준)';
  }
}

function getQuestionTypeInstruction(questionType: string): string {
  switch (questionType) {
    case 'multiple_choice':
      return '모든 문제는 반드시 4개의 선택지를 가진 객관식(multiple_choice)으로 출제하세요.';
    case 'short_answer':
      return '모든 문제는 반드시 단답형(short_answer)으로 출제하세요. 객관식 선택지(choices)는 빈 배열([])로 두고 correctChoiceIndex는 -1로 설정하세요.';
    default:
      return '객관식(multiple_choice)과 단답형(short_answer)을 적절히 섞어서 출제하세요. 단답형일 때는 choices를 빈 배열([])로, correctChoiceIndex를 -1로 설정하세요.';
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.post('/api/quiz/generate', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.status(500).json({
        error: 'GEMINI_API_KEY가 설정되지 않았습니다. Settings > Secrets 패널에서 API 키를 확인해주세요.',
      });
      return;
    }

    const body = (req.body || {}) as QuizGenerationRequest;
    const subjectName = String(body.subjectName || '').trim();
    const unitName = String(body.unitName || '').trim();
    const difficulty = body.difficulty === 'easy' || body.difficulty === 'hard' ? body.difficulty : 'medium';
    const questionType =
      body.questionType === 'multiple_choice' || body.questionType === 'short_answer'
        ? body.questionType
        : 'multiple_choice';
    const count = Math.max(1, Math.min(10, Number(body.count) || 5));

    if (!subjectName || !unitName) {
      res.status(400).json({ error: '과목과 단원 이름을 모두 입력해주세요.' });
      return;
    }

    const prompt = `당신은 한국어 교육 전문가이자 출제 교사입니다.
다음 조건에 맞는 학습용 연습 문제 ${count}개를 정확하고 유익하게 출제해주세요.

- 과목: ${subjectName}
- 단원/주제: ${unitName}
- 난이도: ${getDifficultyKorean(difficulty)}
- 문제 유형: ${getQuestionTypeInstruction(questionType)}

규칙:
1. 모든 문제, 선택지, 정답, 풀이(해설), 힌트는 자연스럽고 명확한 한국어로 작성하세요. (단, 영어 과목 지문/단어나 코딩 코드 스니펫은 원문 표기 가능)
2. 객관식(multiple_choice) 문제는 반드시 4개의 보기(choices)를 제공하고, 헷갈릴 만한 오답 선지를 포함하되 정답은 오직 1개만 명확히 성립해야 합니다. correctChoiceIndex는 0~3 사이의 정수입니다.
3. 단답형(short_answer) 문제는 채점이 명확하도록 간결한 핵심 단어, 숫자, 또는 짧은 구문으로 답할 수 있게 출제하세요. shortAnswer에 대표 정답을 적고, acceptedAnswers에 띄어쓰기 차이나 동의어 등 인정 가능한 답안을 1~3개 포함하세요.
4. explanation(풀이)에는 왜 정답이 맞는지, 오답을 고르기 쉬운 함정이나 핵심 개념을 단계별로 친절하게 설명하세요.
5. 서로 중복되지 않는 다양한 관점의 문제를 출제하세요.`;

    try {
      const ai = getGeminiClient(apiKey);
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'You are an expert Korean tutor and exam question writer. Always return strictly valid JSON matching the schema with accurate answers and thorough step-by-step explanations in Korean.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: {
                      type: Type.STRING,
                      description: 'Must be "multiple_choice" or "short_answer"',
                    },
                    question: {
                      type: Type.STRING,
                      description: 'The problem statement in Korean',
                    },
                    choices: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: 'Exactly 4 choices for multiple_choice, or empty array [] for short_answer',
                    },
                    correctChoiceIndex: {
                      type: Type.INTEGER,
                      description: '0-3 for multiple_choice, -1 for short_answer',
                    },
                    shortAnswer: {
                      type: Type.STRING,
                      description: 'Canonical answer for short_answer, or empty string for multiple_choice',
                    },
                    acceptedAnswers: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: 'Acceptable answer variations for short_answer',
                    },
                    explanation: {
                      type: Type.STRING,
                      description: 'Step-by-step detailed solution and concept explanation in Korean',
                    },
                    hint: {
                      type: Type.STRING,
                      description: 'A brief 1-sentence hint without giving away the answer directly',
                    },
                  },
                  required: [
                    'type',
                    'question',
                    'choices',
                    'correctChoiceIndex',
                    'shortAnswer',
                    'acceptedAnswers',
                    'explanation',
                    'hint',
                  ],
                },
              },
            },
            required: ['questions'],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText) as {
        questions?: Array<{
          type?: string;
          question?: string;
          choices?: string[];
          correctChoiceIndex?: number;
          shortAnswer?: string;
          acceptedAnswers?: string[];
          explanation?: string;
          hint?: string;
        }>;
      };

      const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
      if (rawQuestions.length === 0) {
        res.status(502).json({ error: '문제를 생성하지 못했습니다. 다시 시도해주세요.' });
        return;
      }

      const normalized = rawQuestions.map((q, index) => {
        const isMC =
          q.type === 'multiple_choice' ||
          (Array.isArray(q.choices) && q.choices.length >= 2 && (q.correctChoiceIndex ?? -1) >= 0);

        if (isMC) {
          const choices = Array.isArray(q.choices) ? q.choices.slice(0, 4) : [];
          while (choices.length < 4) {
            choices.push(`보기 ${choices.length + 1}`);
          }
          const idx =
            typeof q.correctChoiceIndex === 'number' &&
            q.correctChoiceIndex >= 0 &&
            q.correctChoiceIndex < choices.length
              ? q.correctChoiceIndex
              : 0;
          return {
            id: `q-${Date.now()}-${index}`,
            type: 'multiple_choice' as const,
            question: String(q.question || '').trim(),
            choices,
            correctChoiceIndex: idx,
            shortAnswer: '',
            acceptedAnswers: [],
            explanation: String(q.explanation || '해설이 제공되지 않았습니다.').trim(),
            hint: String(q.hint || '').trim(),
          };
        }

        const canonical = String(q.shortAnswer || '').trim();
        const accepted = Array.isArray(q.acceptedAnswers)
          ? q.acceptedAnswers.map((a) => String(a).trim()).filter(Boolean)
          : [];
        if (canonical && !accepted.includes(canonical)) {
          accepted.unshift(canonical);
        }

        return {
          id: `q-${Date.now()}-${index}`,
          type: 'short_answer' as const,
          question: String(q.question || '').trim(),
          choices: [],
          correctChoiceIndex: -1,
          shortAnswer: canonical,
          acceptedAnswers: accepted,
          explanation: String(q.explanation || '해설이 제공되지 않았습니다.').trim(),
          hint: String(q.hint || '').trim(),
        };
      });

      res.json({ questions: normalized });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Gemini quiz generation error:', message);
      if (message.includes('API_KEY') || message.includes('403') || message.includes('400')) {
        res.status(500).json({
          error: 'API 키 인증에 실패했습니다. Settings > Secrets 패널에서 GEMINI_API_KEY를 확인해주세요.',
        });
        return;
      }
      if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
        res.status(429).json({
          error: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
        });
        return;
      }
      res.status(500).json({
        error: '문제 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      });
    }
  });

  app.post('/api/coach/chat', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.status(500).json({
        error: 'GEMINI_API_KEY가 설정되지 않았습니다. Settings > Secrets 패널에서 API 키를 확인해주세요.',
      });
      return;
    }

    const body = (req.body || {}) as {
      message?: string;
      history?: Array<{ role: 'user' | 'model'; text: string }>;
      studyContext?: {
        subjects?: string[];
        todayMinutes?: number;
        weekMinutes?: number;
        dailyGoalMinutes?: number;
        streakDays?: number;
        recentQuizzes?: Array<{ unit: string; subject: string; score: string }>;
      };
    };

    const userMessage = String(body.message || '').trim();
    if (!userMessage) {
      res.status(400).json({ error: '상담할 내용을 입력해주세요.' });
      return;
    }

    const ctx = body.studyContext || {};
    const subjectList = Array.isArray(ctx.subjects) && ctx.subjects.length > 0
      ? ctx.subjects.join(', ')
      : '설정된 과목 없음';
    const quizSummary =
      Array.isArray(ctx.recentQuizzes) && ctx.recentQuizzes.length > 0
        ? ctx.recentQuizzes
            .map((q) => `${q.subject}(${q.unit}): ${q.score}`)
            .join(', ')
        : '최근 푼 문제 기록 없음';

    const systemInstruction = `당신은 따뜻하고 실용적인 한국어 학습 코치이자 공부 상담 전문가입니다.
학생의 실제 공부 데이터를 참고하여 구체적이고 실행 가능한 학습 전략, 시간 관리법, 과목별 공부법, 멘탈/슬럼프 극복 조언을 해주세요.

[학생의 현재 학습 데이터]
- 등록된 과목: ${subjectList}
- 오늘 공부 시간: ${ctx.todayMinutes ?? 0}분 (하루 목표: ${ctx.dailyGoalMinutes ?? 240}분)
- 이번 주 누적 공부 시간: ${ctx.weekMinutes ?? 0}분
- 연속 학습 일수: ${ctx.streakDays ?? 0}일
- 최근 단원 문제 풀이 기록: ${quizSummary}

응답 가이드:
1. 공감과 함께 지금 당장 실천할 수 있는 현실적인 단계(1, 2, 3...)로 정리해 답하세요.
2. 불필요한 마크다운 특수기호(과도한 ** 남발 등)를 줄이고 모바일 화면에서도 읽기 편하게 문단을 짧고 명확하게 구성하세요.
3. 공부 시간 기록, 뽀모도로 타이머, 단원별 문제 풀이 기능을 어떻게 활용하면 좋을지 필요할 때 자연스럽게 연결해주세요.`;

    const formattedHistory = Array.isArray(body.history)
      ? body.history
          .filter((h) => h && (h.role === 'user' || h.role === 'model') && typeof h.text === 'string' && h.text.trim())
          .slice(-16)
          .map((h) => ({
            role: h.role,
            parts: [{ text: h.text }],
          }))
      : [];

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const ai = getGeminiClient(apiKey);
      const chat = ai.chats.create({
        model: 'gemini-4-hydrogen',
        history: formattedHistory,
        config: {
          systemInstruction,
        },
      });

      const stream = await chat.sendMessageStream({ message: userMessage });

      for await (const chunk of stream) {
        const text = chunk.text || '';
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Gemini coach chat error:', msg);
      const userFriendlyError =
        msg.includes('API_KEY') || msg.includes('403') || msg.includes('400')
          ? 'API 키 인증에 실패했습니다. Settings > Secrets 패널에서 GEMINI_API_KEY를 확인해주세요.'
          : msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')
            ? '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.'
            : 'AI 상담 응답 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      res.write(`data: ${JSON.stringify({ error: userFriendlyError })}\n\n`);
      res.end();
    }
  });

  const KOREAN_CITIES: Record<string, { name: string; lat: number; lon: number }> = {
    seoul: { name: '서울', lat: 37.5665, lon: 126.978 },
    incheon: { name: '인천', lat: 37.4563, lon: 126.7052 },
    suwon: { name: '수원', lat: 37.2636, lon: 127.0286 },
    daejeon: { name: '대전', lat: 36.3504, lon: 127.3845 },
    daegu: { name: '대구', lat: 35.8714, lon: 128.6014 },
    gwangju: { name: '광주', lat: 35.1595, lon: 126.8526 },
    busan: { name: '부산', lat: 35.1796, lon: 129.0756 },
    jeju: { name: '제주', lat: 33.4996, lon: 126.5312 },
  };

  function mapWmoWeather(code: number, isDay: boolean, temp: number) {
    if (code === 0) {
      return {
        condition: isDay ? '맑음' : '맑은 밤',
        iconKind: isDay ? 'sun' : 'moon',
        studyTip:
          temp < 8
            ? '맑지만 쌀쌀한 날씨예요. 따뜻한 음료와 함께 책상 집중력을 높여보세요.'
            : '쾌청한 날씨예요! 쉬는 시간에 잠깐 창문을 열어 환기하면 집중력이 살아납니다.',
      };
    }
    if (code === 1 || code === 2) {
      return {
        condition: '구름 조금',
        iconKind: 'partly',
        studyTip: '공부하기 딱 좋은 적당한 날씨입니다. 오늘 목표 1시간 출석도 가볍게 채워보세요!',
      };
    }
    if (code === 3) {
      return {
        condition: '흐림',
        iconKind: 'cloud',
        studyTip: '차분하게 흐린 날이에요. 방 조명을 밝게 켜고 깊은 몰입 학습에 집중하기 좋습니다.',
      };
    }
    if (code === 45 || code === 48) {
      return {
        condition: '안개',
        iconKind: 'fog',
        studyTip: '안개가 낀 날엔 백색소음이나 뽀모도로 타이머로 리듬을 잡아보세요.',
      };
    }
    if ((code >= 51 && code <= 57) || code === 80) {
      return {
        condition: '이슬비',
        iconKind: 'drizzle',
        studyTip: '잔잔한 이슬비가 내리는 날, 차분히 앉아 오답 정리와 개념 복습을 하기 좋습니다.',
      };
    }
    if ((code >= 61 && code <= 67) || code === 81 || code === 82) {
      return {
        condition: '비',
        iconKind: 'rain',
        studyTip: '비 오는 날은 실내 집중의 골든타임! 문제 풀이와 10분 예습 루틴을 달려보세요.',
      };
    }
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
      return {
        condition: '눈',
        iconKind: 'snow',
        studyTip: '눈 내리는 날엔 따뜻한 실내에서 꾸준히 경험치를 쌓아 등급을 올려보세요.',
      };
    }
    if (code >= 95) {
      return {
        condition: '천둥·번개',
        iconKind: 'storm',
        studyTip: '밖은 요란하지만 책상 앞은 안전해요. 외출 대신 뽀모도로 1세트 완주에 도전해보세요.',
      };
    }
    return {
      condition: '구름 많음',
      iconKind: 'cloud',
      studyTip: '오늘도 1시간 이상 공부해서 연속 출석을 이어가보세요!',
    };
  }

  app.get('/api/weather', async (req, res) => {
    try {
      const cityParam = String(req.query.city || 'seoul').toLowerCase();
      const rawLat = req.query.lat !== undefined ? Number(req.query.lat) : NaN;
      const rawLon = req.query.lon !== undefined ? Number(req.query.lon) : NaN;

      const hasCoords =
        Number.isFinite(rawLat) &&
        Number.isFinite(rawLon) &&
        rawLat >= -90 &&
        rawLat <= 90 &&
        rawLon >= -180 &&
        rawLon <= 180;

      const cityMeta = KOREAN_CITIES[cityParam] || KOREAN_CITIES.seoul;
      const lat = hasCoords ? rawLat : cityMeta.lat;
      const lon = hasCoords ? rawLon : cityMeta.lon;
      const locationName = hasCoords ? '현재 내 위치' : cityMeta.name;

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&wind_speed_unit=ms&timezone=Asia%2FSeoul&forecast_days=1`;

      const apiRes = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!apiRes.ok) {
        res.status(502).json({ error: '날씨 서버 응답이 원활하지 않습니다.' });
        return;
      }

      const data = (await apiRes.json()) as {
        current?: {
          temperature_2m?: number;
          relative_humidity_2m?: number;
          apparent_temperature?: number;
          is_day?: number;
          weather_code?: number;
          wind_speed_10m?: number;
        };
        daily?: {
          temperature_2m_max?: number[];
          temperature_2m_min?: number[];
          precipitation_probability_max?: number[];
        };
      };

      const cur = data.current || {};
      const daily = data.daily || {};
      const temperature = Number(cur.temperature_2m ?? 15);
      const weatherCode = Number(cur.weather_code ?? 0);
      const isDay = cur.is_day !== 0;
      const mapped = mapWmoWeather(weatherCode, isDay, temperature);

      res.json({
        locationName,
        cityKey: hasCoords ? 'gps' : cityParam,
        temperature,
        feelsLike: Number(cur.apparent_temperature ?? temperature),
        tempMin: Number(daily.temperature_2m_min?.[0] ?? temperature - 3),
        tempMax: Number(daily.temperature_2m_max?.[0] ?? temperature + 3),
        humidity: Number(cur.relative_humidity_2m ?? 50),
        windSpeed: Number(cur.wind_speed_10m ?? 1.5),
        precipProb: Number(daily.precipitation_probability_max?.[0] ?? 0),
        weatherCode,
        condition: mapped.condition,
        iconKind: mapped.iconKind,
        isDay,
        studyTip: mapped.studyTip,
        fetchedAt: Date.now(),
      });
    } catch (err) {
      console.error('Weather fetch error:', err);
      res.status(500).json({ error: '날씨 정보를 불러오는 중 오류가 발생했습니다.' });
    }
  });

  const httpServer = http.createServer(app);

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        ws: { server: httpServer },
        watch: process.env.DISABLE_HMR === 'true' ? null : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use('/api', (_req, res) => {
      res.status(404).json({ error: '요청한 API 경로를 찾을 수 없습니다.' });
    });
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`공부로그 server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
