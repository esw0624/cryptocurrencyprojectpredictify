import fs from 'node:fs';
import path from 'node:path';

export type Candle = {
  timestamp: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type DatasetRow = {
  timestamp: string | number;
  features: number[];
  target: number;
};

export type TrainResult = {
  runId: string;
  asset: string;
  timeframe: string;
  sampleCount: number;
  splitIndex: number;
  featureCount: number;
  metrics: {
    mae: number;
    rmse: number;
    directionalAccuracy: number;
  };
  modelPath: string;
};

export type PredictionResult = {
  predictionId: string;
  asset: string;
  horizon: number;
  timeframe: string;
  modelRunId: string;
  generatedAt: string;
  predictedReturn: number;
  latestClose: number;
  predictedClose: number;
  modelPath: string;
};

type StoredModel = {
  runId: string;
  asset: string;
  timeframe: string;
  trainedAt: string;
  featureSchema: string[];
  means: number[];
  stdDevs: number[];
  weights: number[];
  bias: number;
  metrics: {
    mae: number;
    rmse: number;
    directionalAccuracy: number;
  };
};

const ROOT = process.cwd();
const CANDLES_DIR = path.join(ROOT, 'data', 'candles');
const MODEL_RUNS_DIR = path.join(ROOT, 'model_runs');
const PREDICTIONS_DIR = path.join(ROOT, 'predictions');

const FEATURE_SCHEMA = [
  'lagClose1',
  'lagClose2',
  'lagClose3',
  'ret1',
  'ret3',
  'ma5',
  'ma10',
  'vol5',
];

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readCandles(asset: string, timeframe: string): Candle[] {
  const candidateNames = [
    `${asset}_${timeframe}.json`,
    `${asset}-${timeframe}.json`,
    `${asset}.${timeframe}.json`,
  ];

  const fileName = candidateNames.find((name) => fs.existsSync(path.join(CANDLES_DIR, name)));
  if (!fileName) {
    throw new Error(
      `No candle file found for ${asset}/${timeframe}. Expected one of: ${candidateNames.join(', ')}`,
    );
  }

  const filePath = path.join(CANDLES_DIR, fileName);
  const payload = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Candle[];

  if (!Array.isArray(payload) || payload.length < 30) {
    throw new Error('Historical candles must be an array with at least 30 records.');
  }

  return payload;
}

function mean(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

function stdDev(values: number[]): number {
  const avg = mean(values);
  const variance = values.reduce((acc, v) => acc + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function buildFeatures(candles: Candle[]): DatasetRow[] {
  const rows: DatasetRow[] = [];

  for (let i = 10; i < candles.length - 1; i += 1) {
    const close = candles[i].close;
    const lagClose1 = candles[i - 1].close;
    const lagClose2 = candles[i - 2].close;
    const lagClose3 = candles[i - 3].close;

    const ret1 = (close - lagClose1) / lagClose1;
    const ret3 = (close - lagClose3) / lagClose3;

    const ma5 = mean(candles.slice(i - 4, i + 1).map((c) => c.close));
    const ma10 = mean(candles.slice(i - 9, i + 1).map((c) => c.close));

    const returns5 = candles.slice(i - 4, i + 1).map((candle, idx, arr) => {
      if (idx === 0) return 0;
      return (candle.close - arr[idx - 1].close) / arr[idx - 1].close;
    });
    const vol5 = stdDev(returns5);

    const nextClose = candles[i + 1].close;
    const target = (nextClose - close) / close;

    rows.push({
      timestamp: candles[i].timestamp,
      features: [lagClose1, lagClose2, lagClose3, ret1, ret3, ma5, ma10, vol5],
      target,
    });
  }

  if (rows.length < 20) {
    throw new Error('Not enough rows after feature engineering. Provide more historical candles.');
  }

  return rows;
}

function standardizeFeatures(rows: DatasetRow[], means?: number[], stds?: number[]) {
  const featureCount = rows[0].features.length;
  const resolvedMeans = means ?? Array.from({ length: featureCount }, (_, i) => mean(rows.map((r) => r.features[i])));
  const resolvedStds = stds ?? Array.from({ length: featureCount }, (_, i) => {
    const value = stdDev(rows.map((r) => r.features[i]));
    return value === 0 ? 1 : value;
  });

  const normalized = rows.map((row) => ({
    ...row,
    features: row.features.map((value, i) => (value - resolvedMeans[i]) / resolvedStds[i]),
  }));

  return { normalized, means: resolvedMeans, stds: resolvedStds };
}

function trainLinearRegression(
  x: number[][],
  y: number[],
  iterations = 3000,
  learningRate = 0.01,
): { weights: number[]; bias: number } {
  const nSamples = x.length;
  const nFeatures = x[0].length;

  let weights = Array.from({ length: nFeatures }, () => 0);
  let bias = 0;

  for (let iter = 0; iter < iterations; iter += 1) {
    const preds = x.map((row) => row.reduce((acc, value, idx) => acc + value * weights[idx], bias));

    const weightGrads = Array.from({ length: nFeatures }, () => 0);
    let biasGrad = 0;

    for (let i = 0; i < nSamples; i += 1) {
      const error = preds[i] - y[i];
      biasGrad += error;
      for (let j = 0; j < nFeatures; j += 1) {
        weightGrads[j] += error * x[i][j];
      }
    }

    weights = weights.map((w, j) => w - (learningRate * 2 * weightGrads[j]) / nSamples);
    bias -= (learningRate * 2 * biasGrad) / nSamples;
  }

  return { weights, bias };
}

function infer(x: number[][], weights: number[], bias: number): number[] {
  return x.map((row) => row.reduce((acc, value, idx) => acc + value * weights[idx], bias));
}

function computeMetrics(yTrue: number[], yPred: number[]) {
  const mae = mean(yTrue.map((value, i) => Math.abs(value - yPred[i])));
  const rmse = Math.sqrt(mean(yTrue.map((value, i) => (value - yPred[i]) ** 2)));
  const directionalAccuracy =
    yTrue.filter((value, i) => Math.sign(value) === Math.sign(yPred[i])).length / yTrue.length;

  return { mae, rmse, directionalAccuracy };
}

function writeJson(dir: string, fileName: string, payload: unknown): string {
  ensureDir(dir);
  const filePath = path.join(dir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
  return filePath;
}

function loadLatestModel(asset: string): StoredModel {
  ensureDir(MODEL_RUNS_DIR);
  const files = fs
    .readdirSync(MODEL_RUNS_DIR)
    .filter((f) => f.endsWith('.json') && f.includes(`_${asset}_`))
    .sort();

  if (files.length === 0) {
    throw new Error(`No trained model runs found for asset ${asset}. Run trainModel first.`);
  }

  const latest = files[files.length - 1];
  return JSON.parse(fs.readFileSync(path.join(MODEL_RUNS_DIR, latest), 'utf8')) as StoredModel;
}

function deriveFeatureVector(candles: Candle[]): number[] {
  if (candles.length < 11) {
    throw new Error('At least 11 candles are required to build prediction features.');
  }

  const i = candles.length - 1;
  const close = candles[i].close;
  const lagClose1 = candles[i - 1].close;
  const lagClose2 = candles[i - 2].close;
  const lagClose3 = candles[i - 3].close;

  const ret1 = (close - lagClose1) / lagClose1;
  const ret3 = (close - lagClose3) / lagClose3;
  const ma5 = mean(candles.slice(i - 4, i + 1).map((c) => c.close));
  const ma10 = mean(candles.slice(i - 9, i + 1).map((c) => c.close));
  const returns5 = candles.slice(i - 4, i + 1).map((candle, idx, arr) => {
    if (idx === 0) return 0;
    return (candle.close - arr[idx - 1].close) / arr[idx - 1].close;
  });
  const vol5 = stdDev(returns5);

  return [lagClose1, lagClose2, lagClose3, ret1, ret3, ma5, ma10, vol5];
}

export function trainModel(asset: string, timeframe: string): TrainResult {
  const candles = readCandles(asset, timeframe);
  const dataset = buildFeatures(candles);

  const splitIndex = Math.floor(dataset.length * 0.8);
  const trainRows = dataset.slice(0, splitIndex);
  const valRows = dataset.slice(splitIndex);

  const { normalized: normTrain, means, stds } = standardizeFeatures(trainRows);
  const { normalized: normVal } = standardizeFeatures(valRows, means, stds);

  const xTrain = normTrain.map((r) => r.features);
  const yTrain = normTrain.map((r) => r.target);
  const xVal = normVal.map((r) => r.features);
  const yVal = normVal.map((r) => r.target);

  const { weights, bias } = trainLinearRegression(xTrain, yTrain);
  const preds = infer(xVal, weights, bias);
  const metrics = computeMetrics(yVal, preds);

  const runId = `${Date.now()}_${asset}_${timeframe}`;
  const modelPayload: StoredModel = {
    runId,
    asset,
    timeframe,
    trainedAt: new Date().toISOString(),
    featureSchema: FEATURE_SCHEMA,
    means,
    stdDevs: stds,
    weights,
    bias,
    metrics,
  };

  const modelPath = writeJson(MODEL_RUNS_DIR, `${runId}.json`, modelPayload);

  return {
    runId,
    asset,
    timeframe,
    sampleCount: dataset.length,
    splitIndex,
    featureCount: FEATURE_SCHEMA.length,
    metrics,
    modelPath,
  };
}

export function predict(asset: string, horizon: number): PredictionResult {
  if (horizon < 1) {
    throw new Error('horizon must be >= 1');
  }

  const model = loadLatestModel(asset);
  const candles = readCandles(asset, model.timeframe);

  const rawFeatures = deriveFeatureVector(candles);
  const normalizedFeatures = rawFeatures.map((value, i) => (value - model.means[i]) / model.stdDevs[i]);

  const predictedOneStepReturn = infer([normalizedFeatures], model.weights, model.bias)[0];
  const predictedReturn = (1 + predictedOneStepReturn) ** horizon - 1;

  const latestClose = candles[candles.length - 1].close;
  const predictedClose = latestClose * (1 + predictedReturn);

  const predictionId = `${Date.now()}_${asset}_h${horizon}`;
  const payload = {
    predictionId,
    generatedAt: new Date().toISOString(),
    asset,
    horizon,
    timeframe: model.timeframe,
    modelRunId: model.runId,
    predictedOneStepReturn,
    predictedReturn,
    latestClose,
    predictedClose,
  };

  writeJson(PREDICTIONS_DIR, `${predictionId}.json`, payload);

  return {
    predictionId,
    asset,
    horizon,
    timeframe: model.timeframe,
    modelRunId: model.runId,
    generatedAt: payload.generatedAt,
    predictedReturn,
    latestClose,
    predictedClose,
    modelPath: path.join(MODEL_RUNS_DIR, `${model.runId}.json`),
  };
}
