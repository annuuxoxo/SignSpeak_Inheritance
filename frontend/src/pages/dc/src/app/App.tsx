import React, { useState, useEffect, useRef, useCallback } from 'react';

import {
  Moon,
  Sun,
  User,
  ChevronLeft,
  ChevronRight,
  Check,
  Play,
  Pause,
  Volume2,
  Maximize,
  CheckCircle2,
  AlertCircle,
  Info,
  Camera,
  CameraOff,
  ArrowLeft,
} from 'lucide-react';

import { Button } from './components/ui/button';
import { Switch } from './components/ui/switch';
import { Progress } from './components/ui/progress';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import { Card } from './components/ui/card';
import { Badge } from './components/ui/badge';

import { VideoPlayer } from './components/video-player';
import { CameraFeed } from './components/camera-feed';
import { WordDetection } from './components/word-detection';
import { apiFetch } from './api';

interface Lecture {
  _id: string;
  title: string;
  duration?: string;
  description?: string;
  contentType: string;
  videoPublicId?: string;
  imagePublicId?: string;
  mediaUrl?: string;
}

interface Section {
  _id: string;
  title: string;
  lectures: Lecture[];
}

interface Course {
  _id: string;
  title: string;
  description: string;
  complexity: string;
  sections: Section[];
}

interface CourseProgress {
  completedLectures: string[];
  lastWatchedLecture: string | null;
}

interface AppProps {
  courseId: string;
}

export default function App({ courseId }: AppProps) {
  const [darkMode, setDarkMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showCamera, setShowCamera] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);
  const [course, setCourse] = useState<Course | null>(null);
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentLectureId, setCurrentLectureId] = useState<string | null>(null);
  const [allLectures, setAllLectures] = useState<Array<Lecture & { sectionId: string; sectionTitle: string; completed: boolean }>>([]);
  const [isReading, setIsReading] = useState(false);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiPrediction, setAiPrediction] = useState<string>('Waiting...');

  // Fetch course data and progress
  useEffect(() => {
    const fetchCourseData = async () => {
      if (!courseId) return;
      
      try {
        setLoading(true);
        
        // Fetch course data
        const courseData = await apiFetch(`/courses/${courseId}`);
        
        // Fetch progress
        let progressData: CourseProgress = { completedLectures: [], lastWatchedLecture: null };
        try {
          const progressResponse = await apiFetch(`/progress/course/${courseId}`);
          progressData = progressResponse.progress;
        } catch (error) {
          console.log('No progress found for this course');
        }

        setCourse(courseData);
        setProgress(progressData);

        // Flatten all lectures with section info
        const lectures: Array<Lecture & { sectionId: string; sectionTitle: string; completed: boolean }> = [];
        courseData.sections.forEach((section: Section) => {
          section.lectures.forEach((lecture: Lecture) => {
            lectures.push({
              ...lecture,
              sectionId: section._id,
              sectionTitle: section.title,
              completed: progressData.completedLectures.includes(lecture._id)
            });
          });
        });

        setAllLectures(lectures);

        // Set current lecture to last watched or first lecture
        if (progressData.lastWatchedLecture && lectures.find(l => l._id === progressData.lastWatchedLecture)) {
          setCurrentLectureId(progressData.lastWatchedLecture);
        } else if (lectures.length > 0) {
          setCurrentLectureId(lectures[0]._id);
        }
      } catch (error) {
        console.error('Error fetching course data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseData();
  }, [courseId]);

  const currentLecture = allLectures.find(l => l._id === currentLectureId);
  const completedLectures = allLectures.filter(l => l.completed).length;
  const totalLectures = allLectures.length;
  const progressPercentage = totalLectures > 0 ? (completedLectures / totalLectures) * 100 : 0;
  const isAlphabetCourse = !!course && /^Alphabet\s+[12]$/i.test(course.title.trim());
  const isCommonWordsCourse = !!course && /^Common Words\s*[12]?$/i.test(course.title.trim());
  const targetLetterMatch = currentLecture?.title?.match(/Letter\s+([A-Z])/i);
  const targetLetter = targetLetterMatch?.[1]?.toUpperCase() || null;
  
  // Extract target word for Common Words courses (e.g., "Word: family" or just "family")
  const targetWordMatch = isCommonWordsCourse ? currentLecture?.title?.match(/(?:Word:\s*)?([a-z\s]+)/i) : null;
  const targetWord = targetWordMatch?.[1]?.trim().toLowerCase() || null;

  // Extract all valid words from the course for filtering predictions
  const validWords = isCommonWordsCourse 
    ? allLectures.map(lec => {
        const match = lec.title?.match(/(?:Word:\s*)?([a-z\s]+)/i);
        return match?.[1]?.trim().toLowerCase();
      }).filter(Boolean) as string[]
    : [];

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const aiFeedback = [
    { type: 'success', message: 'Hand position is correct', icon: CheckCircle2 },
    { type: 'warning', message: 'Straighten your forefinger slightly', icon: AlertCircle },
    { type: 'info', message: 'Raise your hand slightly higher', icon: Info },
  ];

  const handleAiFeedback = useCallback((prediction: string, suggestions: string[]) => {
    setAiPrediction(prediction || 'Waiting...');
    setAiSuggestions(suggestions || []);
  }, []);

  const handleMarkComplete = async () => {
    if (!currentLectureId || !courseId) return;

    try {
      await apiFetch('/progress/complete', {
        method: 'POST',
        body: JSON.stringify({
          courseId,
          lectureId: currentLectureId
        })
      });

      // Update local state
      setProgress(prev => ({
        completedLectures: [...(prev?.completedLectures || []), currentLectureId],
        lastWatchedLecture: currentLectureId
      }));

      setAllLectures(prev => prev.map(lecture => 
        lecture._id === currentLectureId 
          ? { ...lecture, completed: true }
          : lecture
      ));

      // Move to next lecture if available
      const currentIndex = allLectures.findIndex(l => l._id === currentLectureId);
      if (currentIndex < allLectures.length - 1) {
        setCurrentLectureId(allLectures[currentIndex + 1]._id);
      }
    } catch (error) {
      console.error('Error marking lecture as complete:', error);
    }
  };

  const handleLectureClick = (lectureId: string) => {
    setCurrentLectureId(lectureId);
  };

  const handlePrevious = () => {
    if (!currentLectureId) return;
    const currentIndex = allLectures.findIndex(l => l._id === currentLectureId);
    if (currentIndex > 0) {
      setCurrentLectureId(allLectures[currentIndex - 1]._id);
    }
  };

  const handleNext = () => {
    if (!currentLectureId) return;
    const currentIndex = allLectures.findIndex(l => l._id === currentLectureId);
    if (currentIndex < allLectures.length - 1) {
      setCurrentLectureId(allLectures[currentIndex + 1]._id);
    }
  };

  const handleReadAloud = () => {
    if (!currentLecture?.description) return;

    // Stop any ongoing speech
    if (isReading && speechSynthesisRef.current) {
      window.speechSynthesis.cancel();
      setIsReading(false);
      return;
    }

    // Check if browser supports speech synthesis
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in your browser.');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(currentLecture.description);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      setIsReading(true);
    };

    utterance.onend = () => {
      setIsReading(false);
      speechSynthesisRef.current = null;
    };

    utterance.onerror = () => {
      setIsReading(false);
      speechSynthesisRef.current = null;
    };

    speechSynthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Cleanup speech on unmount or lecture change
  useEffect(() => {
    return () => {
      if (speechSynthesisRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentLectureId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-teal-50/30 dark:from-gray-900 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading course...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-teal-50/30 dark:from-gray-900 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Course not found</p>
      </div>
    );
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-teal-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 transition-colors">
        <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
          <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.location.href = '/'}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Go back to home"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-500 rounded-lg flex items-center justify-center">
                <span className="text-xl">👋</span>
              </div>
              <span className="font-semibold text-xl text-gray-900 dark:text-white">SignSpeak</span>
            </div>

            <div className="hidden md:block text-center">
              <h1 className="font-semibold text-gray-900 dark:text-white">
                {course.title} {currentLecture ? `– ${currentLecture.title}` : ''}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {currentLecture?.description || course.description}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {completedLectures} / {totalLectures} lectures completed
                </span>
              </div>

              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {darkMode ? (
                  <Sun className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                )}
              </button>

              <Avatar>
                <AvatarFallback className="bg-blue-500 text-white">
                  <User className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        <div className="max-w-screen-2xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <VideoPlayer
                  title="Instructor Video"
                  isPlaying={isPlaying}
                  onTogglePlay={() => setIsPlaying(!isPlaying)}
                  className="md:col-span-2"
                  mediaUrl={currentLecture?.mediaUrl || null}
                  contentType={currentLecture?.contentType}
                />

                <div className="space-y-4">
                  {isCommonWordsCourse ? (
                    <WordDetection
                      isActive={showCamera}
                      onToggle={() => setShowCamera(!showCamera)}
                      targetWord={targetWord}
                      validWords={validWords}
                      onFeedback={handleAiFeedback}
                    />
                  ) : (
                    <CameraFeed
                      isActive={showCamera}
                      onToggle={() => setShowCamera(!showCamera)}
                      targetLetter={isAlphabetCourse ? targetLetter : null}
                      enableFeedback={isAlphabetCourse}
                      onFeedback={handleAiFeedback}
                    />
                  )}
                  
                  {currentLecture?.description && (
                    <Card className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          Lecture Description
                        </h3>
                        <button
                          onClick={handleReadAloud}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isReading
                              ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}
                          aria-label={isReading ? 'Stop reading' : 'Read aloud'}
                        >
                          <Volume2 className={`w-4 h-4 ${isReading ? 'animate-pulse' : ''}`} />
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        {currentLecture.description}
                      </p>
                    </Card>
                  )}
                </div>
              </div>

              {!isCommonWordsCourse && (
                <Card className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-lg text-gray-900 dark:text-white">AI Feedback & Suggestions</h2>
                  {isAlphabetCourse ? (
                    <div className="flex items-center gap-2 px-3 py-1 bg-teal-50 dark:bg-teal-900/30 rounded-lg">
                      <span className="text-sm font-medium text-teal-700 dark:text-teal-400">Target Letter</span>
                      <span className="font-bold text-lg text-teal-600 dark:text-teal-400">
                        {targetLetter || '—'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-1 bg-teal-50 dark:bg-teal-900/30 rounded-lg">
                      <span className="text-sm font-medium text-teal-700 dark:text-teal-400">Accuracy Score</span>
                      <span className="font-bold text-lg text-teal-600 dark:text-teal-400">82%</span>
                    </div>
                  )}
                </div>

                {isAlphabetCourse ? (
                  <div className="mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-medium">Detected:</span>
                    <span className="text-gray-900 dark:text-white">{aiPrediction}</span>
                  </div>
                ) : (
                  <div className="mb-4">
                    <Progress value={82} className="h-2" />
                  </div>
                )}

                <div className="space-y-3">
                  {isAlphabetCourse ? (
                    <>
                      {aiSuggestions.length === 0 && (
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                          <CheckCircle2 className="w-5 h-5 mt-0.5 text-green-600 dark:text-green-400" />
                          <span className="text-sm text-green-800 dark:text-green-300">
                            {aiPrediction === targetLetter ? 'Great job! Your handshape matches.' : 'Make the target handshape to get tips.'}
                          </span>
                        </div>
                      )}
                      {aiSuggestions.map((message, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                          <Info className="w-5 h-5 mt-0.5 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm text-blue-800 dark:text-blue-300">{message}</span>
                        </div>
                      ))}
                    </>
                  ) : (
                    aiFeedback.map((feedback, index) => {
                      const Icon = feedback.icon;
                      return (
                        <div
                          key={index}
                          className={`flex items-start gap-3 p-3 rounded-lg ${
                            feedback.type === 'success'
                              ? 'bg-green-50 dark:bg-green-900/20'
                              : feedback.type === 'warning'
                              ? 'bg-yellow-50 dark:bg-yellow-900/20'
                              : 'bg-blue-50 dark:bg-blue-900/20'
                          }`}
                        >
                          <Icon
                            className={`w-5 h-5 mt-0.5 ${
                              feedback.type === 'success'
                                ? 'text-green-600 dark:text-green-400'
                                : feedback.type === 'warning'
                                ? 'text-yellow-600 dark:text-yellow-400'
                                : 'text-blue-600 dark:text-blue-400'
                            }`}
                          />
                          <span
                            className={`text-sm ${
                              feedback.type === 'success'
                                ? 'text-green-800 dark:text-green-300'
                                : feedback.type === 'warning'
                                ? 'text-yellow-800 dark:text-yellow-300'
                                : 'text-blue-800 dark:text-blue-300'
                            }`}
                          >
                            {feedback.message}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
                </Card>
              )}

              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={!currentLectureId || allLectures.findIndex(l => l._id === currentLectureId) === 0}
                  className="flex items-center justify-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Previous Lecture</span>
                  <span className="sm:hidden">Previous</span>
                </Button>

                <Button 
                  className="bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white px-6 sm:px-8 shadow-lg hover:shadow-xl transition-all" 
                  onClick={handleMarkComplete}
                  disabled={!currentLectureId || currentLecture?.completed}
                >
                  <Check className="w-4 h-4 mr-2" />
                  {currentLecture?.completed ? 'Completed' : 'Mark as Complete'}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleNext}
                  disabled={!currentLectureId || allLectures.findIndex(l => l._id === currentLectureId) === allLectures.length - 1}
                  className="flex items-center justify-center gap-2"
                >
                  <span className="hidden sm:inline">Next Lecture</span>
                  <span className="sm:hidden">Next</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="lg:col-span-1">
              <Card className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg sticky top-24 border border-gray-200 dark:border-gray-700">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">Course Content</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{course.title}</p>
                </div>

                <div className="p-4 max-h-[600px] overflow-y-auto">
                  <div className="space-y-4">
                    {course.sections.map((section) => {
                      const sectionLectures = allLectures.filter(l => l.sectionId === section._id);
                      if (sectionLectures.length === 0) return null;
                      
                      return (
                        <div key={section._id} className="space-y-2">
                          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            {section.title}
                          </h3>
                          {sectionLectures.map((lecture) => (
                            <button
                              key={lecture._id}
                              onClick={() => handleLectureClick(lecture._id)}
                              className={`w-full text-left p-4 rounded-xl transition-all ${
                                lecture._id === currentLectureId
                                  ? 'bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-900/30 dark:to-teal-900/30 border-2 border-blue-500 shadow-sm'
                                  : lecture.completed
                                  ? 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <h3
                                    className={`font-medium mb-1 ${
                                      lecture._id === currentLectureId
                                        ? 'text-gray-900 dark:text-white'
                                        : 'text-gray-700 dark:text-gray-300'
                                    }`}
                                  >
                                    {lecture.title}
                                  </h3>
                                  {lecture.duration && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">{lecture.duration}</span>
                                  )}
                                </div>
                                <div>
                                  {lecture.completed ? (
                                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                      <Check className="w-4 h-4 text-white" />
                                    </div>
                                  ) : lecture._id === currentLectureId ? (
                                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                      <Play className="w-3 h-3 text-white ml-0.5" />
                                    </div>
                                  ) : (
                                    <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-600 rounded-full"></div>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Overall Progress</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {Math.round(progressPercentage)}%
                    </span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}