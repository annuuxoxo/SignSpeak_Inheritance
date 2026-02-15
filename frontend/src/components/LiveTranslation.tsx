import { useEffect, useRef, useState } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Video, Volume2, MessageSquare, Activity } from "lucide-react";
import { Progress } from "./ui/progress";
import Webcam from "react-webcam";
import { DrawingUtils, FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17]
];

const LETTER_RANGES: Record<string, Record<string, [number, number] | string>> = {
  A: { index: [15, 45], middle: [10, 40], ring: [3, 30], pinky: [0, 25], thumb: [0.09, 0.18], thumb_dx: [0.025, 0.055] },
  B: { index: [170, 180], middle: [170, 180], ring: [170, 180], pinky: [170, 180], thumb: [0.05, 0.07] },
  C: { index: [85, 120], middle: [70, 110], ring: [70, 110], pinky: [90, 145], thumb: [0.07, 0.16], ti_dist: [0.1, 0.3] },
  D: { index: [168, 180], middle: [30, 55], ring: [20, 100], pinky: [5, 50], thumb: [0.06, 0.16] },
  E: { index: [28, 50], middle: [15, 32], ring: [5, 28], pinky: [10, 36], thumb: [0.06, 0.095], thumb_dx: [-0.11, -0.02] },
  F: { index: [58, 160], middle: [155, 180], ring: [155, 180], pinky: [155, 180], thumb: [0.07, 0.125] },
  G: { index: [160, 180], middle: [0, 60], ring: [25, 70], pinky: [15, 110], thumb: [0.028, 0.15], dir: "horizontal" },
  H: { index: [170, 180], middle: [165, 180], ring: [0, 80], pinky: [60, 120], thumb: [0.03, 0.25], dir: "horizontal", im_dist: [0.01, 0.05] },
  I: { index: [20, 45], middle: [20, 50], ring: [10, 45], pinky: [165, 180], thumb: [0.03, 0.08] },
  K: { index: [165, 180], middle: [149, 180], ring: [60, 125], pinky: [40, 140], thumb: [0.03, 0.12], ti_dist: [0.11, 0.19], tp_dist: [0.19, 0.3] },
  L: { index: [170, 180], middle: [45, 120], ring: [40, 110], pinky: [25, 80], thumb: [0.085, 0.3] },
  M: { index: [40, 90], middle: [30, 60], ring: [20, 50], thumb: [0.07, 0.18], tm_dist: [0.01, 0.3], ti_dist: [0.04, 0.25], thumb_dx: [-0.12, 0.16], tr_dist: [0.03, 0.155], tp_dist: [0.05, 0.3] },
  N: { index: [30, 85], middle: [20, 70], ring: [35, 125], thumb: [0.1, 0.145], tm_dist: [0.05, 0.16], ti_dist: [0.07, 0.2], thumb_dx: [-0.11, 0.08], tp_dist: [0.15, 0.25], tr_dist: [0.12, 0.25] },
  O: { index: [75, 120], middle: [70, 115], ring: [70, 110], pinky: [80, 140], thumb: [0.09, 0.2], ti_dist: [0.015, 0.085] },
  P: { index: [150, 168], middle: [100, 170], ring: [65, 100], pinky: [52, 110], thumb: [0.055, 0.09] },
  Q: { index: [125, 165], middle: [50, 90], ring: [40, 80], pinky: [55, 90], thumb: [0.15, 0.25] },
  R: { index: [160, 180], middle: [160, 175], ring: [20, 90], pinky: [40, 110], thumb: [0.085, 0.135], im_dist: [0.035, 0.085] },
  S: { index: [15, 45], middle: [10, 30], ring: [0, 20], thumb: [0.02, 0.1], thumb_dx: [-0.075, -0.01], tm_dist: [0.025, 0.07], ti_dist: [0.03, 0.09], tr_dist: [0.04, 0.12], tp_dist: [0.07, 0.15] },
  T: { index: [35, 55], middle: [48, 120], ring: [45, 120], thumb: [0.085, 0.14], tm_dist: [0.19, 0.25], ti_dist: [0.11, 0.16], thumb_dx: [-0.07, -0.02], tp_dist: [0.165, 0.25], tr_dist: [0.18, 0.26] },
  U: { index: [170, 180], middle: [170, 180], ring: [45, 105], pinky: [55, 140], thumb: [0.089, 0.15], im_dist: [0.019, 0.04] },
  V: { index: [165, 180], middle: [165, 180], ring: [35, 130], pinky: [25, 145], thumb: [0.06, 0.2], im_dist: [0.06, 0.145] },
  W: { index: [170, 180], middle: [170, 180], ring: [170, 180], pinky: [28, 125], thumb: [0.085, 0.17] },
  X: { index: [45, 110], middle: [50, 110], ring: [40, 115], pinky: [45, 115], thumb: [0.06, 0.4] },
  Y: { index: [30, 70], middle: [35, 85], ring: [35, 80], pinky: [160, 180], thumb: [0.09, 0.145] },
  Space: { index: [100, 145], middle: [90, 135],
    ring: [90, 135],
    pinky: [100, 150],
    thumb: [0.11, 0.25]
  },

  Delete: { 
    index: [160, 180],
    middle: [160, 180],
    ring: [160, 180],
    pinky: [160, 180],
    thumb: [0.06, 0.25]
    // thumb_dx: [-0.07, -0.02]  // Uncomment if you want stricter detection
  },

};

const MODEL_URL = "https://storage.googleapis.com/mediapipe-assets/hand_landmarker.task";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm";

const getAngle = (a: number[], b: number[], c: number[]) => {
  const ba = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const bc = [c[0] - b[0], c[1] - b[1], c[2] - b[2]];
  const dot = ba[0] * bc[0] + ba[1] * bc[1] + ba[2] * bc[2];
  const mag = Math.sqrt(ba[0] ** 2 + ba[1] ** 2 + ba[2] ** 2) * Math.sqrt(bc[0] ** 2 + bc[1] ** 2 + bc[2] ** 2);
  const cos = Math.min(Math.max(dot / mag, -1), 1);
  return (Math.acos(cos) * 180) / Math.PI;
};

const getDistance = (p1: number[], p2: number[]) =>
  Math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2 + (p1[2] - p2[2]) ** 2);

const inRange = (val: number, low: number, high: number) => val >= low && val <= high;

const computeConfidence = (letter: string, angles: Record<string, number>) => {
  const ranges = LETTER_RANGES[letter];
  if (!ranges) return 0;
  const entries = Object.entries(ranges).filter(([, range]) => Array.isArray(range));
  if (entries.length === 0) return 0;
  const matched = entries.filter(([key, range]) => {
    const value = angles[key];
    if (value === undefined || !Array.isArray(range)) return false;
    return inRange(value, range[0], range[1]);
  });
  return matched.length / entries.length;
};

export function LiveTranslation() {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const drawingUtilsRef = useRef<DrawingUtils | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastCandidateRef = useRef<string>("");
  const lastCandidateTimeRef = useRef<number>(0);

  const [isActive, setIsActive] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<string>("Waiting...");
  const [confidence, setConfidence] = useState(0);
  const [outputText, setOutputText] = useState("");
  const [detectedText, setDetectedText] = useState("");


  useEffect(() => {
    if (!isActive) {
      stopDetectionLoop();
      setPrediction("Waiting...");
      setConfidence(0);
      return;
    }
    void ensureLandmarker();
    startDetectionLoop();
    return () => stopDetectionLoop();
  }, [isActive]);

  const ensureLandmarker = async () => {
    if (landmarkerRef.current) return;
    setIsModelLoading(true);
    setError(null);
    try {
      const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
      landmarkerRef.current = await HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.3,
        minHandPresenceConfidence: 0.3,
        minTrackingConfidence: 0.3,
      });
    } catch (err: any) {
      console.error("Failed to load hand landmarker:", err);
      setError("Failed to load hand tracking model.");
    } finally {
      setIsModelLoading(false);
    }
  };

  const stopDetectionLoop = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const updateStableWord = (candidate: string) => {
  const now = Date.now();
  const lastCandidate = lastCandidateRef.current;

  if (candidate !== lastCandidate) {
    lastCandidateRef.current = candidate;
    lastCandidateTimeRef.current = now;
    return;
  }

  if (now - lastCandidateTimeRef.current >= 700) {
    setOutputText(candidate); // only stabilize, don't append
  }
};



  const startDetectionLoop = () => {
    if (rafRef.current) return;

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);

      if (!isActive || !landmarkerRef.current || !webcamRef.current) {
        return;
      }

      const video = webcamRef.current.video as HTMLVideoElement | undefined;
      if (!video || video.readyState < 2) {
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const result = landmarkerRef.current.detectForVideo(video, performance.now());

        if (result.landmarks && result.landmarks.length > 0) {
        if (!drawingUtilsRef.current) {
          drawingUtilsRef.current = new DrawingUtils(ctx);
        }
        const drawingUtils = drawingUtilsRef.current;
        drawingUtils.drawConnectors(result.landmarks[0], HAND_CONNECTIONS, { color: "#00ff9d", lineWidth: 2 });
        drawingUtils.drawLandmarks(result.landmarks[0], { color: "#ff1a1a", lineWidth: 1 });

        const lm = result.landmarks[0];
        const indexAngle = getAngle([lm[5].x, lm[5].y, lm[5].z], [lm[6].x, lm[6].y, lm[6].z], [lm[8].x, lm[8].y, lm[8].z]);
        const middleAngle = getAngle([lm[9].x, lm[9].y, lm[9].z], [lm[10].x, lm[10].y, lm[10].z], [lm[12].x, lm[12].y, lm[12].z]);
        const ringAngle = getAngle([lm[13].x, lm[13].y, lm[13].z], [lm[14].x, lm[14].y, lm[14].z], [lm[16].x, lm[16].y, lm[16].z]);
        const pinkyAngle = getAngle([lm[17].x, lm[17].y, lm[17].z], [lm[18].x, lm[18].y, lm[18].z], [lm[20].x, lm[20].y, lm[20].z]);

        const thumbTip = [lm[4].x, lm[4].y, lm[4].z];
        const indexTip = [lm[8].x, lm[8].y, lm[8].z];
        const indexMcp = [lm[5].x, lm[5].y, lm[5].z];
        const middleTip = [lm[12].x, lm[12].y, lm[12].z];
        const ringTip = [lm[16].x, lm[16].y, lm[16].z];
        const pinkyTip = [lm[20].x, lm[20].y, lm[20].z];

        const angles: Record<string, number> = {
          index: Math.round(indexAngle),
          middle: Math.round(middleAngle),
          ring: Math.round(ringAngle),
          pinky: Math.round(pinkyAngle),
          thumb: Number(getDistance(thumbTip, indexMcp).toFixed(3)),
          thumb_dx: Number((lm[4].x - lm[5].x).toFixed(3)),
          im_dist: Number(getDistance(middleTip, indexTip).toFixed(3)),
          ti_dist: Number(getDistance(thumbTip, indexTip).toFixed(3)),
          tm_dist: Number(getDistance(thumbTip, middleTip).toFixed(3)),
          tp_dist: Number(getDistance(thumbTip, pinkyTip).toFixed(3)),
          tr_dist: Number(getDistance(thumbTip, ringTip).toFixed(3)),
        };

        let nextPrediction = "Unknown";
        let nextConfidence = 0;
        const indexDx = lm[8].x - lm[5].x;
        const indexDy = lm[8].y - lm[5].y;

        for (const [letter, ranges] of Object.entries(LETTER_RANGES)) {
          const keys = Object.keys(ranges) as Array<keyof typeof angles>;
          const valid = keys.every(key => {
            const value = angles[key];
            const range = ranges[key];
            if (!Array.isArray(range)) return true;
            return inRange(value, range[0], range[1]);
          });

          if (valid) {
            if (ranges.dir === "horizontal" && Math.abs(indexDx) < Math.abs(indexDy)) {
              continue;
            }
            nextPrediction = letter;
            nextConfidence = computeConfidence(letter, angles);
            break;
          }
        }

        setPrediction(nextPrediction);
        setConfidence(Math.round(nextConfidence * 100));

        if (nextPrediction !== "Unknown") {
      updateStableWord(nextPrediction);
    }

      } else {
        setPrediction("No hand");
        setConfidence(0);
      }
    };

    rafRef.current = requestAnimationFrame(loop);
  };

  const handleSpeak = () => {
  const text = detectedText.trim();
  if (!text) return;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
};


const handleNextLetter = () => {
  if (prediction === "Space") {
    setDetectedText(prev => prev + " ");
  } 
  else if (prediction === "Delete") {
    setDetectedText(prev => prev.slice(0, -1));
  } 
  else if (/^[A-Z]$/.test(prediction)) {
    setDetectedText(prev => prev + prediction);
  }
};




  return (
    <section id="features" className="py-20 bg-white dark:bg-gray-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-200 hover:bg-teal-100 dark:hover:bg-teal-900">
            Real-Time Translation
          </Badge>
          <h2 className="text-gray-900 dark:text-white mb-4">
            See Your Signs Come to Life
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-lg max-w-2xl mx-auto">
            Our AI-powered system recognizes your gestures and converts them into text and speech in real time.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <Card className="p-6 shadow-xl border-2 border-blue-100 dark:border-blue-900 dark:bg-gray-800">
            <div className="space-y-4">
              <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl aspect-video overflow-hidden">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  className="absolute inset-0 w-full h-full object-cover webcam-mirror"
                  videoConstraints={{ width: 1280, height: 720, facingMode: "user" }}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none webcam-mirror"
                />

                {isActive && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    LIVE
                  </div>
                )}

                <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg p-3">
                  <div className="flex items-center justify-between text-white text-sm">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-green-400" />
                      <span>
                        {error
                          ? error
                          : isModelLoading
                          ? "Loading model..."
                          : isActive
                          ? `Detected: ${prediction}`
                          : "Click Start Live Translation"}
                      </span>
                    </div>
                    <Badge className="bg-teal-500 hover:bg-teal-600">
                      {confidence}% confidence
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-sm">Text Output</span>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-gray-900 dark:text-white text-lg">
                    {detectedText || "—"}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Volume2 className="w-4 h-4" />
                  <span className="text-sm">Speech Output</span>
                </div>
                <div
                  className="bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 rounded-lg p-4 flex items-center justify-between cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onClick={handleSpeak}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleSpeak();
                    }
                  }}
                >
                  <p className="text-gray-900 dark:text-white">"{outputText || ""}"</p>
                  <Button size="sm" variant="ghost" className="gap-2 dark:hover:bg-teal-800" onClick={handleSpeak}>
                    <Volume2 className="w-4 h-4" />
                    Play
                  </Button>
                </div>
              </div>

              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                onClick={() => setIsActive(prev => !prev)}
              >
                {isActive ? "Stop Live Translation" : "Start Live Translation"}
              </Button>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                onClick={handleNextLetter}
          >   
            Next Letter
          </Button>

            </div>
          </Card>

          <div className="space-y-6">
            <Card className="p-6 border-l-4 border-l-blue-600 dark:bg-gray-800 dark:border-l-blue-400">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Video className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-gray-900 dark:text-white mb-2">Real-Time Recognition</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    The model runs directly in your browser for fast, private recognition.
                  </p>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600 dark:text-gray-400">Processing Speed</span>
                      <span className="text-gray-900 dark:text-white">60 FPS</span>
                    </div>
                    <Progress value={95} className="h-2" />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-l-4 border-l-teal-600 dark:bg-gray-800 dark:border-l-teal-400">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <h3 className="text-gray-900 dark:text-white mb-2">Dual Output Format</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Instant text output with optional speech playback for accessibility.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Badge variant="secondary" className="dark:bg-gray-700 dark:text-gray-200">Text</Badge>
                    <Badge variant="secondary" className="dark:bg-gray-700 dark:text-gray-200">Speech</Badge>
                    <Badge variant="secondary" className="dark:bg-gray-700 dark:text-gray-200">Captions</Badge>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-l-4 border-l-purple-600 dark:bg-gray-800 dark:border-l-purple-400">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Activity className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-gray-900 dark:text-white mb-2">Confidence Scoring</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Confidence reflects how closely your hand matches the expected ranges.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

