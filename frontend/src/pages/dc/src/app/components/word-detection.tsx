import React, { useRef, useEffect, useState } from 'react';
import { Camera, CameraOff } from 'lucide-react';
import { Card } from './ui/card';
import {
  DrawingUtils,
  FilesetResolver,
  HandLandmarker,
  PoseLandmarker,
  FaceLandmarker,
} from '@mediapipe/tasks-vision';

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17]
];

const MODEL_URLS = {
  hand: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  pose: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  face: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
  wasm: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm',
};

const TF_SERVER_URL = 'http://localhost:5003/predict';
const FACE_INDICES = [1, 4, 10, 33, 61, 199, 263, 291, 152, 234, 454];
const DETECTION_THRESHOLD = 50;
const STABLE_FRAMES = 3;

interface WordDetectionProps {
  isActive: boolean;
  onToggle: () => void;
  className?: string;
  targetWord?: string | null;
  validWords?: string[];
  onFeedback?: (prediction: string, correct: boolean) => void;
}

const flattenLandmarks = (landmarks: any, count: number) => {
  if (!landmarks || landmarks.length === 0) return Array(count * 3).fill(0);
  return landmarks.slice(0, count).flatMap((lm: any) => [lm.x, lm.y, lm.z]);
};

export function WordDetection({
  isActive,
  onToggle,
  className = '',
  targetWord,
  validWords = [],
  onFeedback
}: WordDetectionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const drawingUtilsRef = useRef<DrawingUtils | null>(null);
  const rafRef = useRef<number | null>(null);
  const frameBufferRef = useRef<number[][]>([]);
  const stablePredictionRef = useRef<{ label: string; count: number }>({ label: '', count: 0 });

  const [isLoading, setIsLoading] = useState(false);
  const [prediction, setPrediction] = useState<string>('Waiting...');
  const [confidence, setConfidence] = useState<number>(0);
  const [lastResult, setLastResult] = useState<'none' | 'correct' | 'incorrect'>('none');
  const [handsDetected, setHandsDetected] = useState(false);
  const [serverHealthy, setServerHealthy] = useState(true);

  // Initialize MediaPipe models
  useEffect(() => {
    if (!isActive) return;

    const initModels = async () => {
      setIsLoading(true);
      try {
        const vision = await FilesetResolver.forVisionTasks(MODEL_URLS.wasm);

        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URLS.hand },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.3,
          minHandPresenceConfidence: 0.3,
          minTrackingConfidence: 0.3,
        });

        poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URLS.pose },
          runningMode: 'VIDEO',
          minPoseDetectionConfidence: 0.3,
          minPosePresenceConfidence: 0.3,
          minTrackingConfidence: 0.3,
        });

        faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URLS.face },
          runningMode: 'VIDEO',
          numFaces: 1,
          minFaceDetectionConfidence: 0.3,
          minFacePresenceConfidence: 0.3,
          minTrackingConfidence: 0.3,
        });

        console.log('✓ All models loaded successfully');
      } catch (error) {
        console.error('❌ Error loading models:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initModels();
  }, [isActive]);

  // Start camera
  useEffect(() => {
    if (!isActive) {
      stopCamera();
      return;
    }

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: 'user' }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('❌ Camera error:', error);
      }
    };

    startCamera();
    return () => stopCamera();
  }, [isActive]);

  // Detection loop
  useEffect(() => {
    if (!isActive || isLoading) return;

    const detectLoop = async () => {
      if (!videoRef.current || !canvasRef.current) return;
      if (!handLandmarkerRef.current || !poseLandmarkerRef.current || !faceLandmarkerRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (!drawingUtilsRef.current) {
        drawingUtilsRef.current = new DrawingUtils(ctx);
      }

      const timestamp = performance.now();

      // Detect landmarks
      const handsResult = handLandmarkerRef.current.detectForVideo(video, timestamp);
      const poseResult = poseLandmarkerRef.current.detectForVideo(video, timestamp);
      const faceResult = faceLandmarkerRef.current.detectForVideo(video, timestamp);

      // Update hand detection status
      const hasHands = handsResult.landmarks && handsResult.landmarks.length > 0;
      setHandsDetected(hasHands);

      // Draw landmarks
      if (handsResult.landmarks) {
        for (const landmarks of handsResult.landmarks) {
          drawingUtilsRef.current.drawConnectors(landmarks, HAND_CONNECTIONS as any, {
            color: '#00FF00',
            lineWidth: 2
          });
          drawingUtilsRef.current.drawLandmarks(landmarks, {
            color: '#FF0000',
            lineWidth: 1
          });
        }
      }

      // Build feature vector
      const poseVec = flattenLandmarks(poseResult.landmarks?.[0], 33);
      
      let leftHand = Array(21 * 3).fill(0);
      let rightHand = Array(21 * 3).fill(0);

      if (handsResult.landmarks && handsResult.handedness) {
        handsResult.landmarks.forEach((lm, idx) => {
          const label = handsResult.handedness[idx]?.[0]?.categoryName?.toLowerCase();
          if (label === 'left') leftHand = flattenLandmarks(lm, 21);
          if (label === 'right') rightHand = flattenLandmarks(lm, 21);
        });
      }

      let faceLandmarks = Array(11 * 3).fill(0);
      if (faceResult.faceLandmarks && faceResult.faceLandmarks[0]) {
        const allFace = faceResult.faceLandmarks[0];
        faceLandmarks = FACE_INDICES.flatMap(i => [
          allFace[i].x,
          allFace[i].y,
          allFace[i].z || 0
        ]);
      }

      const fullFeature = [...poseVec, ...leftHand, ...rightHand, ...faceLandmarks];

      // Add to frame buffer (30 frames)
      frameBufferRef.current.push(fullFeature);
      if (frameBufferRef.current.length > 30) {
        frameBufferRef.current.shift();
      }

      // Send to TensorFlow server when we have 30 frames AND hands are detected
      if (frameBufferRef.current.length === 30 && serverHealthy && hasHands) {
        sendToTensorFlowServer();
      } else if (!hasHands) {
        // Clear prediction when no hands detected
        setPrediction('');
        setConfidence(0);
        setLastResult('none');
        stablePredictionRef.current = { label: '', count: 0 };
      }

      rafRef.current = requestAnimationFrame(detectLoop);
    };

    detectLoop();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isActive, isLoading, serverHealthy]);

  const sendToTensorFlowServer = async () => {
    try {
      const response = await fetch(TF_SERVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequence: frameBufferRef.current })
      });

      if (!response.ok) {
        setServerHealthy(false);
        return;
      }

      setServerHealthy(true);
      const data = await response.json();
      const predictedWord = (data.label || '').toLowerCase().trim();
      const conf = Math.round(data.confidence || 0);

      // Only show predictions for words in the current course
      const isValidWord = validWords.length === 0 ||
        validWords.some(w => w.toLowerCase().trim() === predictedWord);
      const isAboveThreshold = conf >= DETECTION_THRESHOLD;
      const isStableCandidate = isAboveThreshold && isValidWord;

      if (isStableCandidate) {
        if (predictedWord === stablePredictionRef.current.label) {
          stablePredictionRef.current.count += 1;
        } else {
          stablePredictionRef.current = { label: predictedWord, count: 1 };
        }
      } else {
        stablePredictionRef.current = { label: '', count: 0 };
      }

      const isStable = stablePredictionRef.current.count >= STABLE_FRAMES;

      if (isStable && isValidWord) {
        if (targetWord) {
          const normalizedTarget = targetWord.toLowerCase().trim();
          const isCorrect = predictedWord === normalizedTarget;

          if (isCorrect) {
            setPrediction(predictedWord);
            setConfidence(conf);
            setLastResult('correct');
          } else {
            // Keep the UI clean: don't show random words when target doesn't match
            setPrediction('');
            setConfidence(conf);
            setLastResult('incorrect');
          }

          if (onFeedback) {
            onFeedback(predictedWord, isCorrect);
          }
        } else {
          setPrediction(predictedWord);
          setConfidence(conf);
          setLastResult('correct');
        }
      } else {
        // Not stable or invalid: show nothing
        setLastResult('none');
        setPrediction('');
        setConfidence(0);
      }
    } catch (error) {
      console.error('TensorFlow server error:', error);
      setServerHealthy(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    frameBufferRef.current = [];
  };

  const normalizedTarget = targetWord?.toLowerCase().trim() || '';
  const normalizedPrediction = prediction.toLowerCase().trim();
  const showResult = !!normalizedTarget && confidence >= DETECTION_THRESHOLD && lastResult !== 'none';
  const isCorrect = showResult && lastResult === 'correct' && normalizedPrediction === normalizedTarget;
  const displayWord = prediction || 'No match';

  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-4">
        {/* Camera View */}
        <div className="relative bg-gray-900 rounded-xl aspect-video overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
          />

          {/* Status Badge */}
          {isActive && (
            <div className="absolute top-4 left-4 px-3 py-1 bg-green-500/90 text-white text-sm font-medium rounded-full flex items-center gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              {isLoading ? 'Loading...' : 'Active'}
            </div>
          )}

          {/* Server Status */}
          {!serverHealthy && isActive && (
            <div className="absolute top-4 right-4 px-3 py-1 bg-red-500/90 text-white text-sm font-medium rounded-lg">
              Server Offline
            </div>
          )}
        </div>

        {/* Controls & Prediction */}
        <div className="flex items-center justify-between">
          <button
            onClick={onToggle}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              isActive
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {isActive ? (
              <>
                <CameraOff className="w-5 h-5 inline mr-2" />
                Stop Camera
              </>
            ) : (
              <>
                <Camera className="w-5 h-5 inline mr-2" />
                Start Detection
              </>
            )}
          </button>

          {isActive && (
            <div className="text-right">
              <div className="text-sm text-gray-500">Detected:</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {showResult ? displayWord : prediction}
              </div>
              {showResult && (
                <div className={`text-sm font-semibold ${
                  isCorrect ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isCorrect ? 'Correct' : 'Incorrect'}
                </div>
              )}
              <div className="text-sm text-gray-400">{confidence}% confidence</div>
            </div>
          )}
        </div>

        {/* Target Word Display */}
        {targetWord && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">Target Word:</div>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {targetWord}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
