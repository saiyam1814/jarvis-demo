
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FaceLandmarker, HandLandmarker, FilesetResolver, FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import BackgroundTerminal from './components/BackgroundTerminal';
import ExosuitOverlay from './components/ExosuitOverlay';
import HologramStage from './components/HologramStage';
import { AppState, GestureType, AppMode, DrawingPoint } from './types';
import { speechService } from './services/speechService';
import { soundService } from './services/soundService';

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const requestRef = useRef<number>(0);
  const fistHoldStartRef = useRef<number | null>(null);
  const victoryCooldownRef = useRef<number>(0);
  const lastHandYRef = useRef<number>(0.5);
  
  const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarker | null>(null);
  const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(null);
  const [faceResult, setFaceResult] = useState<FaceLandmarkerResult | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  
  const VIDEO_WIDTH = 320;
  const VIDEO_HEIGHT = 240;

  const [appState, setAppState] = useState<AppState>({
    mode: AppMode.LOCKED,
    scanProgress: 0,
    isSystemReady: false,
    fps: 0,
    telemetry: { rotation: { x: 0, y: 0, z: 0 }, detected: false },
    currentMessage: null,
    gesture: { type: GestureType.NONE, position: { x: 0.5, y: 0.5 } },
    selectedCity: null,
    drawingPath: [],
    userTypedText: "",
    hologramText: "",
    isMatrixActive: false,
    isSmiling: false,
    isProcessing: false,
    rawLandmarks: []
  });

  useEffect(() => {
    const initAI = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");
        
        const face = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task", delegate: "GPU" },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 1
        });

        const hand = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task", delegate: "GPU" },
          runningMode: "VIDEO",
          numHands: 2
        });

        setFaceLandmarker(face);
        setHandLandmarker(hand);
        setAppState(prev => ({ ...prev, isSystemReady: true }));
      } catch (error) { console.error("AI Init failed", error); }
    };
    initAI();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (appState.mode !== AppMode.ACTIVE) return;
      setAppState(prev => {
        if (e.key === 'Backspace') return { ...prev, userTypedText: prev.userTypedText.slice(0, -1), hologramText: prev.userTypedText.slice(0, -1) };
        if (e.key.length === 1) {
           soundService.playPhoenixSound();
           return { ...prev, userTypedText: prev.userTypedText + e.key, hologramText: e.key.toUpperCase() };
        }
        return prev;
      });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appState.mode]);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { width: VIDEO_WIDTH, height: VIDEO_HEIGHT, facingMode: "user" }, audio: false })
      .then((stream) => { if (videoRef.current) videoRef.current.srcObject = stream; });
  }, []);

  const analyzeShape = (points: DrawingPoint[]): string | null => {
    if (points.length < 10) return null; 
    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    points.forEach(p => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); });
    const w = maxX - minX;
    const h = maxY - minY;
    if (w < 0.03 && h < 0.03) return null;

    const start = points[0];
    const end = points[points.length - 1];
    const startEndDist = Math.hypot(start.x - end.x, start.y - end.y);
    
    if (startEndDist < 0.15 && Math.abs(w - h) < 0.2) return 'O';
    if (h > w * 2) return 'I';
    if (h > w && start.y < end.y && start.x < end.x) return 'L';
    if (startEndDist > 0.1 && Math.abs(w - h) < 0.2 && start.x > minX + w*0.5 && end.x > minX + w*0.5) return 'C';
    const midIdx = Math.floor(points.length / 2);
    const mid = points[midIdx];
    if (mid.y < start.y && mid.y < end.y && Math.abs(start.y - end.y) < 0.2) return 'A';

    if (points.length > 20) return 'UNKNOWN';
    return null;
  };

  const processFullDrawing = (fullPath: DrawingPoint[]): string => {
    if (fullPath.length === 0) return "";
    const segments: DrawingPoint[][] = [];
    let currentSegment: DrawingPoint[] = [];
    fullPath.forEach(p => {
       if (p.isGap) { if (currentSegment.length > 0) segments.push(currentSegment); currentSegment = []; }
       else currentSegment.push(p);
    });
    if (currentSegment.length > 0) segments.push(currentSegment);
    segments.sort((a, b) => Math.min(...a.map(p => p.x)) - Math.min(...b.map(p => p.x)));
    
    let word = "";
    segments.forEach(seg => {
       const char = analyzeShape(seg);
       if (char && char !== 'UNKNOWN') word += char;
       else if (char === 'UNKNOWN') word += '?';
    });
    return word;
  };

  // --- SIMULATED AI ANALYSIS ---
  const triggerAnalysis = (path: DrawingPoint[], currentText: string) => {
      setAppState(prev => ({ ...prev, isProcessing: true }));
      speechService.speak("Analyzing structural pattern...");
      soundService.playScanSound();

      setTimeout(() => {
          const detected = processFullDrawing(path);
          const result = detected || currentText || "UNKNOWN_ARTIFACT";

          let speech = `${result} Identified.`;
          if(result.startsWith('A')) speech = "A for Apple detected. Rendering schematic.";
          if(result.startsWith('O')) speech = "Orbular structure detected.";
          if(result.startsWith('B')) speech = "Box container detected.";

          setAppState(prev => ({ 
              ...prev, 
              isProcessing: false, 
              hologramText: result 
          }));
          
          speechService.speak(speech);
          soundService.playPhoenixSound();

      }, 1500); 
  };

  const detectGesture = (landmarks: any[]): GestureType => {
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    const indexPip = landmarks[6];
    const middlePip = landmarks[10];
    const ringPip = landmarks[14];
    const pinkyPip = landmarks[18];
    const wrist = landmarks[0];
    const handSize = Math.hypot(wrist.x - landmarks[9].x, wrist.y - landmarks[9].y);

    const isThumbUp = thumbTip.y < indexPip.y && thumbTip.y < middlePip.y;
    const fingersFolded = indexTip.y > indexPip.y && middleTip.y > middlePip.y && ringTip.y > ringPip.y && pinkyTip.y > pinkyPip.y;
    if (isThumbUp && fingersFolded) return GestureType.THUMBS_UP;

    const isIndexExtended = indexTip.y < indexPip.y; 
    const isMiddleExtended = middleTip.y < middlePip.y;
    const isRingFolded = ringTip.y > ringPip.y;
    const isPinkyFolded = pinkyTip.y > pinkyPip.y;
    if (isIndexExtended && isMiddleExtended && isRingFolded && isPinkyFolded) return GestureType.VICTORY;

    const thumbIndexDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
    if (thumbIndexDist < handSize * 0.25) return GestureType.PINCH;

    if (!isIndexExtended && !isMiddleExtended && isRingFolded && isPinkyFolded) return GestureType.CLOSED_FIST;

    return GestureType.OPEN_PALM;
  };

  const predictWebcam = useCallback(() => {
    const video = videoRef.current;
    if (!video || !faceLandmarker || !handLandmarker) return;
    const now = performance.now();

    if (video.currentTime > 0 && !video.paused && !video.ended) {
        const fResult = faceLandmarker.detectForVideo(video, now);
        setFaceResult(fResult);
        
        // Face Expressions
        let matrixActive = false;
        let smiling = false;
        if (fResult.faceBlendshapes && fResult.faceBlendshapes.length > 0) {
           const cats = fResult.faceBlendshapes[0].categories;
           const browInner = cats.find(c => c.categoryName === 'browInnerUp')?.score || 0;
           const browOuterL = cats.find(c => c.categoryName === 'browOuterUpLeft')?.score || 0;
           const browOuterR = cats.find(c => c.categoryName === 'browOuterUpRight')?.score || 0;
           if (browInner > 0.3 || browOuterL > 0.3 || browOuterR > 0.3) matrixActive = true;

           const smileL = cats.find(c => c.categoryName === 'mouthSmileLeft')?.score || 0;
           const smileR = cats.find(c => c.categoryName === 'mouthSmileRight')?.score || 0;
           if (smileL > 0.5 || smileR > 0.5) smiling = true;
        }

        const hResult = handLandmarker.detectForVideo(video, now);
        
        setAppState(prev => {
          if (prev.isProcessing) return prev;

          let next = { 
              ...prev, 
              isMatrixActive: matrixActive, 
              isSmiling: smiling,
              rawLandmarks: hResult.landmarks 
          };
          let gesture = GestureType.NONE;
          let handPos = { x: 0.5, y: 0.5 };

          if (hResult.landmarks.length === 2) {
             const g1 = detectGesture(hResult.landmarks[0]);
             const g2 = detectGesture(hResult.landmarks[1]);
             if (g1 === GestureType.OPEN_PALM && g2 === GestureType.OPEN_PALM) {
                if (prev.mode !== AppMode.MINECRAFT) {
                   speechService.speak("Entering Minecraft World Simulation.");
                   next.mode = AppMode.MINECRAFT;
                   next.hologramText = ""; 
                }
             }
          } else if (hResult.landmarks.length === 1) {
             const landmarks = hResult.landmarks[0];
             gesture = detectGesture(landmarks);
             handPos = { x: 1 - landmarks[8].x, y: landmarks[8].y };
             next.gesture = { type: gesture, position: handPos };

             if (gesture === GestureType.THUMBS_UP && prev.mode !== AppMode.SKELETON) {
                speechService.speak("Skeleton Mode Active. Music output enabled.");
                next.mode = AppMode.SKELETON;
                next.hologramText = "";
             }
             
             if (gesture === GestureType.CLOSED_FIST && (prev.mode === AppMode.MINECRAFT || prev.mode === AppMode.SKELETON)) {
                next.mode = AppMode.ACTIVE;
                speechService.speak("Modes disengaged. Standard interface active.");
             }

             if (prev.mode === AppMode.SKELETON) {
                 const diff = Math.abs(lastHandYRef.current - handPos.y);
                 if (diff > 0.05) { 
                    soundService.playTone(1 - handPos.y); 
                    lastHandYRef.current = handPos.y;
                 }
             }

             if (prev.mode === AppMode.LOCKED || prev.mode === AppMode.SCANNING) {
                if (gesture === GestureType.OPEN_PALM) {
                  next.mode = AppMode.SCANNING;
                  next.scanProgress = Math.min(100, prev.scanProgress + 2);
                  if (next.scanProgress >= 100) {
                     next.mode = AppMode.ACTIVE;
                     soundService.playSelectSound();
                     speechService.speak("Access Granted.");
                  } else if (Math.floor(now) % 10 === 0) soundService.playScanSound();
                } else {
                  next.mode = AppMode.LOCKED;
                  next.scanProgress = Math.max(0, prev.scanProgress - 5);
                }
             }

             if (prev.mode === AppMode.ACTIVE) {
                if (gesture === GestureType.VICTORY && now - victoryCooldownRef.current > 5000) {
                   triggerAnalysis(prev.drawingPath, prev.userTypedText);
                   victoryCooldownRef.current = now;
                }
                else if (gesture === GestureType.CLOSED_FIST) {
                    if (!fistHoldStartRef.current) fistHoldStartRef.current = now;
                    else if (now - fistHoldStartRef.current > 1500) {
                        next.drawingPath = [];
                        next.userTypedText = "";
                        next.hologramText = "";
                        speechService.speak("Canvas Cleared.");
                        fistHoldStartRef.current = now + 2000;
                    }
                } else {
                   fistHoldStartRef.current = null;
                }

                if (gesture === GestureType.PINCH) {
                   const newPoint = { x: handPos.x, y: handPos.y, isGap: false };
                   const last = prev.drawingPath[prev.drawingPath.length-1];
                   if (!last || last.isGap || Math.hypot(last.x - newPoint.x, last.y - newPoint.y) > 0.005) {
                      next.drawingPath = [...prev.drawingPath, newPoint];
                   }
                } else if (prev.drawingPath.length > 0 && !prev.drawingPath[prev.drawingPath.length-1].isGap) {
                   next.drawingPath = [...prev.drawingPath, { x: 0, y: 0, isGap: true }];
                }
             }
          } else {
             if (prev.mode === AppMode.SCANNING) {
                next.mode = AppMode.LOCKED;
                next.scanProgress = 0;
             }
          }
          return next;
        });
    }
    requestRef.current = requestAnimationFrame(predictWebcam);
  }, [faceLandmarker, handLandmarker]);

  useEffect(() => {
    if (isVideoReady && faceLandmarker && handLandmarker) {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        predictWebcam();
    }
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); }
  }, [isVideoReady, faceLandmarker, handLandmarker, predictWebcam]);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      <BackgroundTerminal 
        typedText={appState.userTypedText}
        drawingPath={appState.drawingPath}
        cursorPos={appState.gesture.position}
        isDrawing={appState.gesture.type === GestureType.PINCH}
        mode={appState.mode}
        isMatrixActive={appState.isMatrixActive}
        isSmiling={appState.isSmiling}
        isProcessing={appState.isProcessing}
        hologramText={appState.hologramText}
        rawLandmarks={appState.rawLandmarks}
      />
      
      {(appState.mode === AppMode.MINECRAFT) && (
        <HologramStage text={appState.hologramText} mode={appState.mode} />
      )}

      <div 
        className={`absolute bottom-5 right-5 z-20 bg-black/80 overflow-hidden rounded-xl border-2 border-cyan-500/50 shadow-[0_0_30px_rgba(0,255,255,0.3)] transition-all duration-500`}
        style={appState.mode !== AppMode.LOCKED && appState.mode !== AppMode.SCANNING ? { width: VIDEO_WIDTH, height: VIDEO_HEIGHT } : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 640, height: 480 }}
      >
        <video ref={videoRef} autoPlay playsInline muted onLoadedData={() => setIsVideoReady(true)} className="absolute top-0 left-0 w-full h-full object-cover transform -scale-x-100 opacity-90" />
        {appState.isSystemReady && <div className="absolute top-0 left-0 w-full h-full transform -scale-x-100"><ExosuitOverlay faceResult={faceResult} width={appState.mode === AppMode.LOCKED ? 640 : VIDEO_WIDTH} height={appState.mode === AppMode.LOCKED ? 480 : VIDEO_HEIGHT} /></div>}
        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] pointer-events-none opacity-50"></div>
        {(appState.mode === AppMode.LOCKED || appState.mode === AppMode.SCANNING) && (
           <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
              <div className="w-64 h-64 border-2 border-dashed border-cyan-500 rounded-full animate-spin-slow"></div>
              <h2 className="absolute text-cyan-500 font-mono-tech text-xl bg-black/80 px-2">BIOMETRIC SCAN</h2>
              <div className="absolute bottom-10 w-3/4 h-4 bg-gray-900 rounded overflow-hidden border border-cyan-800"><div className="h-full bg-cyan-400 transition-all duration-75" style={{ width: `${appState.scanProgress}%` }}></div></div>
              <p className="absolute bottom-4 text-cyan-400 text-xs font-mono-tech animate-pulse">{appState.scanProgress === 0 ? "RAISE HAND" : "SCANNING..."}</p>
           </div>
        )}
      </div>
    </div>
  );
};

export default App;