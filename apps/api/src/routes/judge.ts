import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { z } from 'zod';

import {
  callGeminiAPI,
  type CallGeminiAPIParams,
} from '../services/google/gemini-api';
import { callVisionAPI } from '../services/google/vision-api';
import { DIFFICULTY, type Env } from '../types';

const JudgeRequestSchema = z.object({
  theme: z.string().openapi({
    example: '赤いコップ',
    description: '判定するお題',
  }),
  imageData: z.string().openapi({
    example: 'data:image/jpeg;base64,/9j/4AAQ...',
    description: 'Base64エンコードされた画像データ',
  }),
  difficulty: z.enum(DIFFICULTY).openapi({
    example: 'HARD',
    description: '難易度',
  }),
});

const JudgeResponseSchema = z.object({
  success: z.boolean().openapi({ example: true }),
  theme: z.string().openapi({ example: '赤いコップ' }),
  score: z.number().openapi({ example: 0.85 }),
  reason: z.string().openapi({
    example: '写真からは、赤いコップが写っていることがわかったよ！',
  }),
  isMatch: z.boolean().openapi({ example: true }),
  scoreEffect: z.number().openapi({ example: 1.0 }),
  detectedLabels: z
    .array(z.string())
    .openapi({ example: ['Cup', 'Red', 'Dish'] }),
  dominantColors: z
    .array(
      z.object({
        red: z.number(),
        green: z.number(),
        blue: z.number(),
      }),
    )
    .optional()
    .openapi({
      description: '画像の主要な色のRGB',
      example: [{ red: 256, green: 0, blue: 0 }],
    }),
});

const ErrorResponseSchema = z.object({
  error: z.string().openapi({
    example: 'エラーが発生しました',
    description: 'エラーの内容',
  }),
});

// NOTE: 判定結果がこれより高い場合は、お題に近いと判定する
const CLEAR_THRESHOLD = 0.7;

const app = new OpenAPIHono<{ Bindings: Env }>();

const judgeRoute = createRoute({
  method: 'post',
  path: '/judge',
  request: {
    body: {
      content: {
        'application/json': {
          schema: JudgeRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: JudgeResponseSchema,
        },
      },
      description: '判定成功時のレスポンス',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'サーバー内でエラーが発生した場合',
    },
  },
});

/**
 * 画像を判定し、お題に対してどのくらい似ているかを判定する
 * @param c base64 の画像データとお題を受け取る
 * @returns 判定結果
 */
app.openapi(judgeRoute, async (c) => {
  try {
    const { imageData, theme, difficulty } = c.req.valid('json');

    const serviceAccountKey = c.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY;
    const projectId = c.env.GOOGLE_CLOUD_PROJECT_ID;
    const geminiApiKey = c.env.GEMINI_API_KEY;

    if (!serviceAccountKey || !projectId || !geminiApiKey) {
      return c.json(
        {
          error: 'Google Cloud の認証情報が設定されていません',
        },
        500,
      );
    }

    const base64Image = imageData.split(',')[1];
    const visionResult = await callVisionAPI({
      image: base64Image,
      serviceAccountKey,
    });

    const labels =
      visionResult.responses[0].labelAnnotations?.map((l) => l.description) ??
      [];
    const colors =
      visionResult.responses[0].imagePropertiesAnnotation?.dominantColors.colors.map(
        (c) => c.color,
      ) ?? [];

    const geminiParams: CallGeminiAPIParams = {
      apiKey: geminiApiKey,
      difficulty,
      theme,
      labels,
      colors,
    };
    const judgeResult = await callGeminiAPI(geminiParams);

    const isMatch = judgeResult.score >= CLEAR_THRESHOLD;
    const scoreEffect = isMatch ? judgeResult.score : -1.0;

    const responseData: z.infer<typeof JudgeResponseSchema> = {
      success: true,
      theme,
      score: judgeResult.score,
      reason: judgeResult.reason,
      isMatch,
      scoreEffect,
      detectedLabels: labels,
      dominantColors: colors,
    };

    return c.json(responseData, 200);
  } catch (e) {
    return c.json(
      { error: 'エラーが発生しました: ' + (e as Error).message },
      500,
    );
  }
});

export const judgeRoutes = app;
