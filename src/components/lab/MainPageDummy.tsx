'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ChatBubble } from '@/components/ChatBubble';
import { Message } from '@/types';
import { createAssistantMessage, createErrorMessage, createUserMessage } from '@/lib/messageUtils';
import { createWavBlob, getAudioConstraints, checkMicrophonePermission, handleMicrophoneError, checkBrowserSupport } from '@/lib/audioUtils';
import { Button, Input, Textarea, Card, CardHeader, CardContent, CardFooter, Badge, SplitWords, ChatTypewriterV1, ChatTypewriterV2, ChatTypewriterV3, SplitText } from '@/components/ui';
import AnimatedLogo from '@/components/ui/AnimatedLogo';
import TextPressure from '@/components/ui/TextPressure';
import LetterColorAnimation from '@/components/ui/LetterColorAnimation';
import BlobBackground from '@/components/ui/BlobBackground';

// Mock useCoexTTS for dummy page
const useCoexTTS = () => {
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  
  const playFull = useCallback(async (text: string) => {
    console.log("Mock TTS Play Full:", text);
    setIsPlayingTTS(true);
    setTimeout(() => setIsPlayingTTS(false), 2000);
  }, []);

  const prepareAuto = useCallback(async (text: string) => {
    console.log("Mock TTS Prepare Auto:", text);
    return async () => {
        console.log("Mock TTS Play Auto");
        setIsPlayingTTS(true);
        setTimeout(() => setIsPlayingTTS(false), 2000);
    };
  }, []);

  return { isPlayingTTS, playFull, prepareAuto };
};

/**
 * 커스텀 훅: 채팅 상태 관리
 */
const useChatState = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoButtonDisabled, setIsGoButtonDisabled] = useState(false);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
    setChatHistory(prev => [...prev, message]);
  }, []);

  const addErrorMessage = useCallback((error: string) => {
    const errorMessage = createErrorMessage(error);
    addMessage(errorMessage);
  }, [addMessage]);

  return useMemo(() => ({
    messages,
    chatHistory,
    inputValue,
    setInputValue,
    systemPrompt,
    setSystemPrompt,
    isLoading,
    setIsLoading,
    isGoButtonDisabled,
    setIsGoButtonDisabled,
    addMessage,
    addErrorMessage
  }), [
    messages,
    chatHistory,
    inputValue,
    systemPrompt,
    isLoading,
    isGoButtonDisabled,
    addMessage,
    addErrorMessage
  ]);
};

/**
 * 커스텀 훅: 음성 녹음 상태 관리
 */
const useVoiceRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  return {
    isRecording,
    setIsRecording,
    isProcessingVoice,
    setIsProcessingVoice,
    isRequestingPermission,
    setIsRequestingPermission
  };
};

/**
 * API 요청 함수들 (Dummy Implementation)
 */
const apiRequests = {
  async sendChatRequest(question: string, systemPrompt: string, history: Message[]) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
        answer: "이것은 더미 데이터 응답입니다. API를 호출하지 않고 작동합니다.",
        tokens: 100,
        hits: [],
        defaultAnswer: "더미 응답입니다."
    };
  },

  async sendSTTRequest(audioBlob: Blob) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
        success: true,
        text: "더미 음성 인식 결과입니다."
    };
  }
};

// 추천 메시지 리스트 (기본 텍스트)
const recommendationMessages = [
  "친구와 함께 먹기 좋은 식당을 추천해줘",
  "컨퍼런스를 관람하며 쉬기 좋은 곳을 추천해줘",
  "KPOP 관련 구경거리를 추천해줘",
  "데이트하기 좋은 행사 추천해줘",
  "홀로 방문하기 좋은 곳 추천해줘",
  "쇼핑하기 좋은 곳을 찾고 있어",
  "조용히 작업할 수 있는 카페를 찾고 있어",
  "즐길 거리가 많은 핫플레이스를 알려줘",
  "문화적인 경험을 할 수 있는 곳을 추천해줘",
  "트렌디한 음식점을 찾고 있어"
];

// Lab 전용 추천 카드 (Figma 디자인 기준)
const labRecommendationCards = [
  {
    icon: '/icons/material-symbols_chair.svg',
    line1: '컨퍼런스를 관람하며',
    line2: '쉬기 좋은 곳',
    message: '컨퍼런스를 관람하며 쉬기 좋은 곳을 추천해줘',
  },
  {
    icon: '/icons/simple-icons_mealie.svg',
    line1: '가족과 가기',
    line2: '좋은 식당',
    message: '가족과 가기 좋은 식당을 추천해줘',
  },
  {
    icon: '/icons/group_mic.svg',
    line1: 'K-POP',
    line2: '구경거리',
    message: 'K-POP 관련 구경거리를 추천해줘',
  },
];

type TypewriterVariant = 'v1' | 'v2' | 'v3';

const typewriterComponentMap: Record<TypewriterVariant, React.ComponentType<any>> = {
  v1: ChatTypewriterV1,
  v2: ChatTypewriterV2,
  v3: ChatTypewriterV3,
  };

interface MainPageDummyProps {
  showBlob?: boolean;
}

export default function MainPageDummy({ showBlob = true }: MainPageDummyProps = { showBlob: true }) {
  const chatRef = useRef<HTMLDivElement>(null);
  const chatState = useChatState();
  const voiceState = useVoiceRecording();
  const { isPlayingTTS, playFull, prepareAuto } = useCoexTTS();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isConversationEnded, setIsConversationEnded] = useState(false);
  const [showEndMessage, setShowEndMessage] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [extractedKeywords, setExtractedKeywords] = useState<string[]>([]);
  const [keywordToTurnMap, setKeywordToTurnMap] = useState<Map<string, number>>(new Map());
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [selectedKeywordTurn, setSelectedKeywordTurn] = useState<number | null>(null);
  const [showFinalMessage, setShowFinalMessage] = useState(false);
  const [isKeywordsAnimatingOut, setIsKeywordsAnimatingOut] = useState(false);
  const [showFifthAnswerWarning, setShowFifthAnswerWarning] = useState(false);
  const [typewriterVariant, setTypewriterVariant] = useState<TypewriterVariant>('v1');
  const [showRecommendationChips, setShowRecommendationChips] = useState(false);

  const GreetingTypewriter = typewriterComponentMap[typewriterVariant];

  const createTypewriterProps = useCallback(
    (text: string, delay = 0) => {
      const baseProps: Record<string, any> = {
        text,
        speed: 50,
        delay,
        speedVariation: 0.3,
        minSpeed: 20,
        maxSpeed: 100,
      };

      if (typewriterVariant === 'v2') {
        baseProps.characterChangeInterval = 200;
      }

      return baseProps;
    },
    [typewriterVariant]
  );

  // SSR 일관성을 위해 고정된 3개만 사용 (랜덤 사용 시 hydration mismatch 발생)
  const getRandomRecommendations = useCallback(() => {
    return recommendationMessages.slice(0, 3);
  }, []);

  // 사용자 메시지 요약 상태
  const [userMessageSummaries, setUserMessageSummaries] = useState<Record<string, string>>({});

  // Fallback 요약 함수
  const getFallbackSummary = useCallback((text: string): string => {
    return text.length > 20 ? text.substring(0, 20) : text;
  }, []);

  // 사용자 메시지 요약 함수 (Dummy)
  const summarizeUserMessage = useCallback(async (text: string, messageId?: string) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return text.substring(0, 10) + "... (요약)";
  }, []);

  const randomRecommendations = useMemo(() => getRandomRecommendations(), [getRandomRecommendations]);

  const assistantMessages = useMemo(
    () => chatState.messages.filter((message) => message.role === 'assistant'),
    [chatState.messages]
  );

  const userMessages = useMemo(
    () => chatState.messages.filter((message) => message.role === 'user'),
    [chatState.messages]
  );

  const pushAssistantMessage = useCallback(
    async (response: { answer?: string; tokens?: any; hits?: any[]; defaultAnswer?: string }) => {
      const answerText = response.answer || response.defaultAnswer || '(응답 없음)';
      // TTS is optional in dummy, but keeping logic
      const playbackStarter = await prepareAuto(answerText);

      const assistantMessage = createAssistantMessage({
        answer: answerText,
        tokens: response.tokens,
        hits: response.hits,
        defaultAnswer: response.defaultAnswer,
      });

      chatState.addMessage(assistantMessage);

      if (playbackStarter) {
        playbackStarter().catch((error) => {
          console.error('Failed to start prepared TTS playback:', error);
        });
      }
    },
    [chatState.addMessage, prepareAuto],
  );

  // 스크롤을 맨 아래로 이동
  const scrollToBottom = useCallback(() => {
    if (chatRef.current) {
      chatRef.current.scroll({
        top: chatRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatState.messages, scrollToBottom]);

  // AI 답변 애니메이션 중 자동 스크롤
  useEffect(() => {
    if (!chatState.isLoading) return;

    const intervalId = setInterval(() => {
      scrollToBottom();
    }, 500);

    return () => clearInterval(intervalId);
  }, [chatState.isLoading, scrollToBottom]);

  // AI 답변 완료 시 추천 chips 애니메이션 트리거
  useEffect(() => {
    if (!chatState.isLoading && assistantMessages.length > 0) {
      setShowRecommendationChips(false);
      const timer = setTimeout(() => {
        setShowRecommendationChips(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [chatState.isLoading, assistantMessages.length]);

  // AI 답변 카운트 추적 및 6번째 답변 감지
  useEffect(() => {
    const assistantCount = assistantMessages.length;

    if (assistantCount >= 6 && !isConversationEnded && !chatState.isLoading) {
      const timer = setTimeout(() => {
        setIsConversationEnded(true);
        setShowFifthAnswerWarning(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [assistantMessages, isConversationEnded, chatState.isLoading]);

  // 대화 종료 후 3초 뒤에 자연스럽게 종료 안내 화면으로 전환
  useEffect(() => {
    if (isConversationEnded && !showEndMessage && !showSummary) {
      const timer = setTimeout(() => {
        setShowEndMessage(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isConversationEnded, showEndMessage, showSummary]);

  // 5번째 답변 완료 시 안내 메시지 표시
  useEffect(() => {
    const assistantCount = assistantMessages.length;

    if (assistantCount === 5 && !chatState.isLoading && !isConversationEnded && assistantCount < 6) {
      setShowFifthAnswerWarning(true);
      const timer = setTimeout(() => {
        setShowFifthAnswerWarning(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
    
    if (assistantCount >= 6) {
      setShowFifthAnswerWarning(false);
    }
  }, [assistantMessages, isConversationEnded, chatState.isLoading]);

  // 시스템 프롬프트 로드 (Dummy)
  useEffect(() => {
      chatState.setSystemPrompt("You are a dummy assistant.");
  }, [chatState.setSystemPrompt]);

  // 오디오 처리 및 STT
  const processAudio = useCallback(async (audioBlob: Blob) => {
    voiceState.setIsProcessingVoice(true);
    
    try {
      const result = await apiRequests.sendSTTRequest(audioBlob);

      if (result.success && result.text) {
        chatState.setInputValue(result.text);
        
        const userMessage = createUserMessage(result.text);
        chatState.addMessage(userMessage);

        // AI 응답 요청
        chatState.setIsLoading(true);
        try {
          const historyToSend = chatState.chatHistory.slice(-10);
          const chatData = await apiRequests.sendChatRequest(result.text, chatState.systemPrompt, historyToSend);

          // @ts-ignore
          if (chatData.error) {
            // @ts-ignore
            chatState.addErrorMessage(chatData.error);
          } else {
            await pushAssistantMessage({
              answer: chatData.answer,
              tokens: chatData.tokens,
              hits: chatData.hits,
              defaultAnswer: '(응답 없음)',
            });
          }
        } catch (error) {
          console.error('AI 응답 요청 실패:', error);
          chatState.addErrorMessage('서버와의 통신에 실패했습니다.');
        } finally {
          chatState.setIsLoading(false);
        }
      } else {
         alert('음성 인식에 실패했습니다.');
      }
    } catch (error) {
      console.error('STT 처리 오류:', error);
      alert('음성 처리 중 오류가 발생했습니다.');
    } finally {
      voiceState.setIsProcessingVoice(false);
    }
  }, [
    chatState.addErrorMessage,
    chatState.addMessage,
    chatState.chatHistory,
    chatState.setInputValue,
    chatState.setIsLoading,
    chatState.systemPrompt,
    voiceState.setIsProcessingVoice,
    pushAssistantMessage
  ]);

  // 음성 녹음 시작
  const startRecording = useCallback(async () => {
    try {
      if (!checkBrowserSupport()) return;

      const stream = await navigator.mediaDevices.getUserMedia(getAudioConstraints());
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass({
        sampleRate: 16000,
        latencyHint: 'interactive'
      });
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      const source = audioContext.createMediaStreamSource(stream);
      const bufferSize = 4096;
      const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
      const audioData: Float32Array[] = [];
      
      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        audioData.push(new Float32Array(inputData));
      };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      const stopRecording = () => {
        processor.disconnect();
        source.disconnect();
        audioContext.close();
        stream.getTracks().forEach(track => track.stop());
        
        const totalLength = audioData.reduce((sum, chunk) => sum + chunk.length, 0);
        const combinedAudio = new Float32Array(totalLength);
        let offset = 0;
        
        for (const chunk of audioData) {
          combinedAudio.set(chunk, offset);
          offset += chunk.length;
        }
        
        const wavBlob = createWavBlob(combinedAudio, 16000);
        processAudio(wavBlob);
        voiceState.setIsRecording(false);
      };
      
      (window as any).stopRecording = stopRecording;
      voiceState.setIsRecording(true);
      
    } catch (error) {
      console.error('마이크 접근 오류:', error);
      handleMicrophoneError(error);
    }
  }, [processAudio, voiceState.setIsRecording]);

  // 음성 녹음 중지
  const stopRecording = useCallback(() => {
    if (voiceState.isRecording && (window as any).stopRecording) {
      (window as any).stopRecording();
    }
  }, [voiceState.isRecording]);

  // 마이크 버튼 클릭 핸들러
  const handleMicClick = useCallback(async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (voiceState.isRecording) {
      stopRecording();
    } else {
      const hasPermission = await checkMicrophonePermission();
      if (hasPermission) {
        startRecording();
      }
    }
  }, [voiceState.isRecording, stopRecording, startRecording]);

  // 터치 이벤트 핸들러
  const handleTouchStart = useCallback(async (e: React.TouchEvent) => {
    e.preventDefault();
    if (!voiceState.isRecording) {
      const hasPermission = await checkMicrophonePermission();
      if (hasPermission) {
        startRecording();
      }
    }
  }, [voiceState.isRecording, startRecording]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (voiceState.isRecording) {
      stopRecording();
    }
  }, [voiceState.isRecording, stopRecording]);

  // 메시지 전송
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatState.inputValue.trim() || chatState.isLoading || isConversationEnded) return;

    const userMessage = createUserMessage(chatState.inputValue);
    chatState.addMessage(userMessage);
    chatState.setInputValue('');
    chatState.setIsLoading(true);

    try {
      const historyToSend = chatState.chatHistory.slice(-10);
      const data = await apiRequests.sendChatRequest(chatState.inputValue, chatState.systemPrompt, historyToSend);

      await pushAssistantMessage({
        answer: data.answer,
        tokens: data.tokens,
        hits: data.hits,
        defaultAnswer: '(응답 없음)',
      });
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      chatState.addErrorMessage('서버와의 통신에 실패했습니다.');
    } finally {
      chatState.setIsLoading(false);
    }
  }, [
    chatState.addErrorMessage,
    chatState.addMessage,
    chatState.chatHistory,
    chatState.inputValue,
    chatState.isLoading,
    chatState.setInputValue,
    chatState.setIsLoading,
    chatState.systemPrompt,
    isConversationEnded,
    pushAssistantMessage
  ]);

  // 대화 시작
  const handleGoButton = useCallback(async () => {
    chatState.setIsGoButtonDisabled(true);
    chatState.setIsLoading(true);

    try {
      const data = await apiRequests.sendChatRequest(
        "안녕하세요! 이솔이에요. 오늘 어떤 무드로 코엑스를 즐기고 싶으신가요?",
        chatState.systemPrompt,
        []
      );

      await pushAssistantMessage({
        answer: data.answer,
        tokens: data.tokens,
        hits: data.hits,
        defaultAnswer: '안녕하세요! COEX 이벤트 안내 AI입니다. 무엇을 도와드릴까요?',
      });
    } catch (error) {
      console.error('대화 시작 실패:', error);
      chatState.addErrorMessage('서버와의 통신에 실패했습니다.');
    } finally {
      chatState.setIsLoading(false);
      chatState.setIsGoButtonDisabled(false);
    }
  }, [
    chatState.addErrorMessage,
    chatState.addMessage,
    chatState.setIsGoButtonDisabled,
    chatState.setIsLoading,
    chatState.systemPrompt,
    pushAssistantMessage
  ]);

  // 키보드 이벤트 핸들러
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.nativeEvent as any).isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit]);

  // 정보 요구 질문인지 확인하는 함수
  const isInfoRequestQuestion = useCallback((question: string) => {
    return true; // Dummy: always true
  }, []);

  // 정보성 키워드 추출 함수 (각 turn별로 추출) - Dummy
  const extractInfoKeywords = useCallback(async () => {
    // Dummy keywords
    const keywords = ["코엑스", "맛집", "쇼핑", "영화", "아쿠아리움", "도서관"];
    const keywordMap = new Map();
    keywords.forEach((k, i) => keywordMap.set(k, i + 1));
    
    return {
      keywords: keywords,
      keywordMap: keywordMap
    };
  }, []);

  // 대화 요약 보러가기 버튼 클릭 핸들러 (종료 메시지 화면으로 이동)
  const handleShowSummary = useCallback(() => {
    setShowEndMessage(true);
  }, []);

  // 종료 메시지 화면에서 Next 버튼 클릭 핸들러 (키워드 요약 화면으로 이동)
  const handleNextToSummary = useCallback(async () => {
    const { keywords, keywordMap } = await extractInfoKeywords();
    setExtractedKeywords(keywords);
    setKeywordToTurnMap(keywordMap);
    setShowSummary(true);
  }, [extractInfoKeywords]);

  // 키워드 클릭 핸들러 (해당 turn의 AI 답변 보여주기)
  const handleKeywordClick = useCallback((keyword: string) => {
    const turnIndex = keywordToTurnMap.get(keyword);
    if (turnIndex !== undefined) {
      setSelectedKeyword(keyword);
      setSelectedKeywordTurn(turnIndex);
    }
  }, [keywordToTurnMap]);

  // 키워드 답변 화면에서 뒤로가기 핸들러
  const handleBackToKeywords = useCallback(() => {
    setSelectedKeyword(null);
    setSelectedKeywordTurn(null);
  }, []);

  // End 버튼 클릭 핸들러 (키워드 애니메이션 후 최종 메시지 표시)
  const handleEndButton = useCallback(() => {
    setIsKeywordsAnimatingOut(true);
    // 애니메이션 완료 후 최종 메시지 표시
    setTimeout(() => {
      setShowFinalMessage(true);
    }, 800); // ease 애니메이션 시간에 맞춤
  }, []);

  // 추천 버튼 클릭 핸들러
  const handleRecommendationClick = useCallback(async (recommendation: string) => {
    if (chatState.isLoading || isConversationEnded) return;
    
    const userMessage = createUserMessage(recommendation);
    chatState.addMessage(userMessage);
    chatState.setIsLoading(true);

    try {
      const historyToSend = chatState.chatHistory.slice(-10);
      const data = await apiRequests.sendChatRequest(recommendation, chatState.systemPrompt, historyToSend);

      // @ts-ignore
      if (data.error) {
        // @ts-ignore
        chatState.addErrorMessage(data.error);
      } else {
        await pushAssistantMessage({
          answer: data.answer,
          tokens: data.tokens,
          hits: data.hits,
          defaultAnswer: '(응답 없음)',
        });
      }
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      chatState.addErrorMessage('서버와의 통신에 실패했습니다.');
    } finally {
      chatState.setIsLoading(false);
    }
  }, [chatState, isConversationEnded, pushAssistantMessage]);

  // 중요한 단어 목록
  const importantKeywords = [
    '핫플레이스', '쉬기 좋은 곳', '카페', '식당', '데이트', '문화적인 경험', '경험', '장소', '행사', '이벤트', '쇼핑', '음식점', '구경거리', '레스토랑', '맛집', '전시', '체험', '활동', '프로그램',
  ];

  // 텍스트에서 중요한 단어에 LetterColorAnimation 적용하는 함수
  const renderTextWithAnimation = useCallback((text: string) => {
    // Simplified for dummy
    return <span>{text}</span>;
  }, []);

  // 추천 chips 렌더링 함수
  const renderRecommendationChips = useCallback((additionalMarginTop?: number, compact?: boolean, shouldAnimate?: boolean) => {
    if (isConversationEnded) return null;
    
    return (
      <div
        className="recommendation-scroll"
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          marginTop: additionalMarginTop ? `${additionalMarginTop}px` : (compact ? '0' : '8px'),
          padding: 0,
          width: '100%',
          overflowX: 'auto',
          opacity: shouldAnimate ? (showRecommendationChips ? 1 : 0) : 1,
          transition: shouldAnimate ? 'opacity 0.5s ease-in' : 'none',
        }}
      >
        {/** Figma 스타일의 카드형 추천 버튼 (아이콘 + 2줄 텍스트) */}
        {labRecommendationCards.map((card, index) => {
          return (
            <button
              key={index}
              onClick={() => handleRecommendationClick(card.message)}
              disabled={chatState.isLoading}
              className="touch-manipulation active:scale-95 disabled:opacity-50"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: 10,
                padding: '8px 16px',
                borderRadius: 18,
                border: '1px solid rgba(255, 255, 255, 0.8)',
                // 살짝 투명한 흰색 캡슐 (배경이 비치도록)
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.80) 0%, rgba(255,255,255,0.60) 100%)',
                // 그림자 제거 (하단 마스킹 이슈 방지)
                boxShadow: 'none',
                cursor: 'pointer',
                flexShrink: 0,
                // 텍스트 길이에 따라 박스가 자연스럽게 길어지도록 고정 폭 제한 제거
              }}
              type="button"
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 3px 8px rgba(0, 0, 0, 0.04)',
                  flexShrink: 0,
                }}
              >
                <img
                  src={card.icon}
                  alt=""
                  style={{
                    width: 16,
                    height: 16,
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                <span
                  style={{
                    fontFamily: 'Pretendard Variable',
                    fontSize: 13,
                    fontStyle: 'normal' as const,
                    fontWeight: 600,
                    lineHeight: '120%',
                    letterSpacing: '-0.6px',
                    color: '#707070',
                    textAlign: 'left' as const,
                    whiteSpace: 'nowrap' as const,
                  }}
                >
                  {card.line1}
                </span>
                <span
                  style={{
                    fontFamily: 'Pretendard Variable',
                    fontSize: 13,
                    fontStyle: 'normal' as const,
                    fontWeight: 600,
                    lineHeight: '120%',
                    letterSpacing: '-0.6px',
                    color: '#707070',
                    textAlign: 'left' as const,
                    whiteSpace: 'nowrap' as const,
                  }}
                >
                  {card.line2}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }, [isConversationEnded, randomRecommendations, handleRecommendationClick, chatState.isLoading, showRecommendationChips, renderTextWithAnimation]);

  return (
    <div className="min-h-screen flex flex-col safe-area-inset overscroll-contain relative" style={{ background: 'transparent' }}>
      {showBlob && !showSummary && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <BlobBackground isAnimating={false} />
        </div>
      )}
      
      <AnimatedLogo />

      {/* Lab Navigation Buttons */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <Link href="/lab/v1" className="w-8 h-8 flex items-center justify-center bg-white/50 hover:bg-white/80 backdrop-blur-md rounded-full text-gray-800 font-bold shadow-sm border border-white transition-all">1</Link>
        <Link href="/lab/v2" className="w-8 h-8 flex items-center justify-center bg-white/50 hover:bg-white/80 backdrop-blur-md rounded-full text-gray-800 font-bold shadow-sm border border-white transition-all">2</Link>
        <Link href="/lab/v3" className="w-8 h-8 flex items-center justify-center bg-white/50 hover:bg-white/80 backdrop-blur-md rounded-full text-gray-800 font-bold shadow-sm border border-white transition-all">3</Link>
      </div>

      {showFifthAnswerWarning && !showEndMessage && !showSummary && (
        <div className="fixed top-24 left-0 right-0 z-30 flex justify-center">
          <div
            style={{
              fontFamily: 'Pretendard Variable',
              fontSize: '16px',
              fontWeight: 500,
              color: '#4E5363',
              textAlign: 'center',
              padding: '12px 24px',
              background: 'rgba(255, 255, 255, 0.8)',
              borderRadius: '20px',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            }}
          >
            이제 앞으로 한 번 더 질문할 수 있습니다
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="relative flex-1 flex flex-col min-h-0 pb-32 pt-20" style={{ background: 'transparent' }}>
        <div className="flex-1 overflow-hidden">
          <div ref={chatRef} className="h-full overflow-y-auto px-6 pb-4 space-y-4 overscroll-contain">
            {chatState.messages.length === 0 && (
              <div className="flex flex-col items-center justify-center min-h-full text-center">
                <div 
                  style={{ 
                    color: '#000', 
                    textAlign: 'center', 
                    fontFamily: 'Pretendard Variable', 
                    fontSize: '22px', 
                    fontStyle: 'normal', 
                    fontWeight: 500, 
                    lineHeight: '110%', 
                    letterSpacing: '-0.88px' 
                  }}
                  className="p-6 w-full"
                >
                  <div className="flex justify-center">
                    <SplitText text="안녕하세요! 이솔이에요" delay={0} duration={1.2} stagger={0.05} animation="fadeIn" />
                  </div>
                  <div className="flex justify-center mt-2">
                    <SplitText text="코엑스 안내를 도와드릴게요" delay={1.2} duration={1.2} stagger={0.05} animation="fadeIn" />
                  </div>
                </div>
              </div>
            )}
            {chatState.messages.length > 0 && (
              <>
                {showSummary ? (
                  showFinalMessage ? (
                    <div 
                      className="fixed inset-0 flex flex-col justify-start pt-20 px-6"
                      style={{
                        background: '#D0ECE6',
                        zIndex: 10,
                      }}
                    >
                      <div className="text-left">
                        <TextPressure
                          text="COEX에서"
                          trigger="auto"
                          duration={1.2}
                          style={{
                            color: '#1f2937',
                            fontFamily: 'Pretendard Variable',
                            fontSize: '40pt',
                            fontStyle: 'normal',
                            fontWeight: 700,
                            lineHeight: '90%',
                            letterSpacing: '-1.8px',
                            display: 'block',
                            marginBottom: '0.2em',
                          }}
                        />
                        <TextPressure
                          text="즐거운 시간"
                          trigger="auto"
                          duration={1.2}
                          style={{
                            color: '#1f2937',
                            fontFamily: 'Pretendard Variable',
                            fontSize: '40pt',
                            fontStyle: 'normal',
                            fontWeight: 700,
                            lineHeight: '90%',
                            letterSpacing: '-1.8px',
                            display: 'block',
                            marginBottom: '0.2em',
                          }}
                        />
                        <TextPressure
                          text="보내세요!"
                          trigger="auto"
                          duration={1.2}
                          style={{
                            color: '#1f2937',
                            fontFamily: 'Pretendard Variable',
                            fontSize: '40pt',
                            fontStyle: 'normal',
                            fontWeight: 700,
                            lineHeight: '90%',
                            letterSpacing: '-1.8px',
                            display: 'block',
                          }}
                        />
                      </div>
                    </div>
                  ) : selectedKeyword && selectedKeywordTurn !== null ? (
                    <div 
                      className="fixed inset-0"
                      style={{
                        background: '#D0ECE6',
                        zIndex: 10,
                      }}
                    >
                      <div 
                        className="absolute inset-0"
                        style={{
                          paddingTop: '15vh',
                          paddingBottom: '20vh',
                          paddingLeft: '20px',
                          paddingRight: '20px',
                          overflowY: 'auto',
                        }}
                      >
                        <div className="mb-4">
                          <button
                            onClick={handleBackToKeywords}
                            className="touch-manipulation active:scale-95"
                            style={{
                              fontFamily: 'Pretendard Variable',
                              fontSize: '16px',
                              fontWeight: 500,
                              color: '#4E5363',
                              padding: '8px 16px',
                              background: 'rgba(255, 255, 255, 0.8)',
                              borderRadius: '20px',
                              border: 'none',
                            }}
                          >
                            ← 뒤로가기
                          </button>
                        </div>
                        
                         <ChatBubble 
                             message={{ role: 'assistant', content: "더미 상세 내용입니다." }}
                             onPlayTTS={playFull}
                             isPlayingTTS={isPlayingTTS}
                             isGlobalLoading={false}
                             typewriterVariant={typewriterVariant}
                         />
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="fixed inset-0"
                      style={{
                        background: '#D0ECE6',
                        zIndex: 10,
                      }}
                    >
                      <div 
                        className="absolute inset-0"
                        style={{
                          paddingTop: '15vh', 
                          paddingBottom: '20vh',
                          paddingLeft: '20px',
                          paddingRight: '20px',
                          transition: isKeywordsAnimatingOut ? 'transform 0.8s ease-out, opacity 0.8s ease-out' : 'none',
                          transform: isKeywordsAnimatingOut ? 'translateY(-100vh)' : 'translateY(0)',
                          opacity: isKeywordsAnimatingOut ? 0 : 1,
                        }}
                      >
                        {extractedKeywords.map((keyword, index) => {
                        const keywordLength = keyword.length;
                        const baseSize = 120;
                        const sizeMultiplier = Math.max(0.7, Math.min(1.8, keywordLength / 6));
                        const ellipseSize = baseSize * sizeMultiplier * 1.2;
                        const padding = Math.max(8, ellipseSize * 0.25);
                        
                        // Dummy positioning for simplicity
                        const topPercent = 20 + (index * 10);
                        const leftPercent = 50 + (index % 2 === 0 ? -20 : 20);
                        
                        return (
                          <div
                            key={index}
                            className="absolute cursor-pointer"
                            onClick={() => handleKeywordClick(keyword)}
                            style={{
                              top: `${topPercent}%`,
                              left: `${leftPercent}%`,
                              width: `${ellipseSize}px`,
                              height: `${ellipseSize}px`,
                              borderRadius: '297px',
                              opacity: isKeywordsAnimatingOut ? 0 : 0.65,
                              background: 'radial-gradient(50% 50% at 50% 50%, #DEE6FF 43.75%, #FFF 65.87%, rgba(255, 255, 255, 0.61) 100%)',
                              boxShadow: '0 -14px 20px 0 #FFEFFC, 0 20px 20px 0 #CBD7F3, 0 4px 100px 0 #CFE9FF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'absolute',
                              transform: isKeywordsAnimatingOut 
                                ? `translate(-50%, calc(-50% - ${topPercent + 50}vh))` 
                                : 'translate(-50%, -50%)',
                              transition: isKeywordsAnimatingOut 
                                ? `transform 0.8s ease-out ${index * 0.1}s, opacity 0.8s ease-out ${index * 0.1}s` 
                                : 'transform 0.2s ease-out',
                            }}
                          >
                            <span
                              style={{
                                fontFamily: 'Pretendard Variable',
                                fontSize: `${Math.max(14, Math.min(18, ellipseSize / 8))}px`,
                                fontWeight: 500,
                                color: '#1f2937',
                                textAlign: 'center',
                                lineHeight: '1.4',
                                padding: `${padding}px`,
                                whiteSpace: 'nowrap',
                                pointerEvents: 'none',
                              }}
                            >
                              {keyword}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    
                    {!selectedKeyword && !showFinalMessage && (
                      <div className="fixed bottom-0 left-0 right-0 z-20 safe-bottom">
                        {/* 하단 그라데이션은 화면 맨 아래에 고정 */}
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-white/90 to-transparent backdrop-blur-sm" />
                        {/* 버튼만 살짝 위로 올림 */}
                        <div className="relative px-6 pb-8 pt-4" style={{ bottom: '24px' }}>
                          <button
                            onClick={handleEndButton}
                            className="w-full touch-manipulation active:scale-95 flex justify-center items-center"
                            style={{
                              height: '56px',
                              padding: '15px 85px',
                              borderRadius: '68px',
                              background: 'rgba(135, 254, 200, 0.75)',
                              boxShadow: '0 0 50px 0 #EEE inset',
                              color: '#000',
                              textAlign: 'center',
                              fontFamily: 'Pretendard Variable',
                              fontSize: '16px',
                              fontWeight: 700,
                              lineHeight: '110%',
                              letterSpacing: '-0.64px',
                            }}
                          >
                            End
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  )
                ) : showEndMessage ? (
                  <div className="flex flex-col items-center justify-center min-h-full py-12">
                    <div
                      style={{
                        fontFamily: 'Pretendard Variable',
                        fontSize: '22px',
                        fontWeight: 600,
                        color: '#4E5363',
                        textAlign: 'center',
                        lineHeight: '140%',
                        letterSpacing: '-0.88px',
                        marginBottom: '40px',
                        padding: '0 24px',
                        whiteSpace: 'pre-line',
                      }}
                    >
                      <SplitWords
                        text="오늘의 대화가 모두 끝났어요. 제가 안내한 내용을 정리해드릴게요"
                        delay={0}
                        duration={1.2}
                        stagger={0.05}
                        animation="fadeIn"
                      />
                    </div>
                    
                    <div className="fixed bottom-0 left-0 right-0 z-30 safe-bottom">
                      {/* 하단 그라데이션은 화면 맨 아래에 고정 */}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-white/90 to-transparent backdrop-blur-sm" />
                      {/* 버튼만 살짝 위로 올림 (이전 단계와 동일 위치) */}
                      <div className="relative px-6 pb-8 pt-4" style={{ bottom: '24px' }}>
                        <button
                          onClick={handleNextToSummary}
                          className="w-full touch-manipulation active:scale-95 flex justify-center items-center"
                          style={{
                            height: '56px',
                            padding: '15px 85px',
                            borderRadius: '68px',
                            background: 'rgba(231, 245, 236, 0.9)',
                            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.06)',
                            color: '#000',
                            textAlign: 'center',
                            fontFamily: 'Pretendard Variable',
                            fontSize: '16px',
                            fontWeight: 700,
                            lineHeight: '110%',
                            letterSpacing: '-0.64px',
                          }}
                        >
                          대화 요약 보러가기
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    {(chatState.isLoading || voiceState.isProcessingVoice || chatState.messages.filter(msg => msg.role === 'assistant').length > 0) && (
                      <div 
                        className="space-y-4"
                        style={{
                          opacity: 1,
                          transition: 'opacity 0.5s ease-in-out',
                          animation: !chatState.isLoading && !voiceState.isProcessingVoice && chatState.messages.filter(msg => msg.role === 'assistant').length > 0 ? 'fadeIn 0.5s ease-in-out' : 'none',
                        }}
                      >
                        {(chatState.isLoading || voiceState.isProcessingVoice) ? (
                          <ChatBubble 
                            key="thinking-bubble"
                            message={{ role: 'assistant', content: '' }} 
                            isThinking={true}
                            onPlayTTS={playFull}
                            isPlayingTTS={isPlayingTTS}
                            isGlobalLoading={chatState.isLoading || voiceState.isProcessingVoice}
                            typewriterVariant={typewriterVariant}
                            isRecording={voiceState.isRecording}
                          />
                        ) : (
                          <>
                            {chatState.messages
                              .filter(msg => msg.role === 'assistant')
                              .slice(-1)
                              .map((message, index) => (
                                <ChatBubble 
                                  key={`${message.role}-${index}`}
                                  message={message} 
                                  isThinking={false}
                                  onPlayTTS={playFull}
                                  isPlayingTTS={isPlayingTTS}
                                  isGlobalLoading={chatState.isLoading}
                                  typewriterVariant={typewriterVariant}
                                />
                              ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {!showSummary && !showEndMessage && (
      <>
        {!isConversationEnded && (chatState.messages.length === 0 || assistantMessages.length > 0) && (
          <div 
            className="fixed left-0 right-0 z-20"
            style={{
              width: '100%',
              bottom: '0',
              height: '288px',
              background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.7) 30%, rgb(255,255,255) 100%)',
              pointerEvents: 'none',
            }}
          />
        )}
        {isConversationEnded ? (
          <div className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-white/90 to-transparent backdrop-blur-sm safe-bottom">
            <div className="px-6 pb-8 pt-4">
              <button
                onClick={handleShowSummary}
                className="w-full touch-manipulation active:scale-95 flex justify-center items-center"
                style={{
                  height: '56px',
                  padding: '15px 85px',
                  borderRadius: '68px',
                  background: 'rgba(231, 245, 236, 0.9)',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.06)',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  {[0, 1, 2].map((dot) => (
                    <span
                      key={dot}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: '#C4C4C4',
                      }}
                    />
                  ))}
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div
            className="fixed left-0 right-0 z-30 p-4 safe-bottom"
            style={{ bottom: '24px' }}  // 입력창과 추천 카드 전체를 화면 위로 조금 올림
          >
            <form onSubmit={handleSubmit} className="w-full">
          {(chatState.messages.length === 0 || assistantMessages.length > 0) && (
            <div style={{ marginBottom: '28px' }}>
              {renderRecommendationChips(0, true, assistantMessages.length > 0)}
            </div>
          )}
          <div 
            className="flex items-center"
            style={{
              borderRadius: '22px',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.58) 0%, rgba(255,255,255,0.18) 100%)',
              border: '1px solid rgba(255,255,255,0.65)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.78), 0 16px 34px rgba(60,34,88,0.16)',
              backdropFilter: 'blur(28px) saturate(1.6)',
              WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
            }}
          >
            <input
              type="text"
              value={chatState.inputValue}
              onChange={(e) => chatState.setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지 보내기..."
              disabled={chatState.isLoading || voiceState.isProcessingVoice}
              style={{
                color: '#878181',
                fontFamily: 'Pretendard Variable',
                fontSize: '14px',
                fontStyle: 'normal',
                fontWeight: 400,
                lineHeight: '150%',
                caretColor: '#FFF',
              }}
              className="flex-1 px-4 py-3 bg-transparent focus:outline-none placeholder-[#878181]"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
            <button
              type="button"
              onClick={handleMicClick}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              disabled={chatState.isLoading || voiceState.isProcessingVoice || voiceState.isRequestingPermission}
              className="px-4 py-3 touch-manipulation disabled:opacity-50"
              title={voiceState.isRecording ? '녹음 중지' : voiceState.isRequestingPermission ? '권한 요청 중...' : '음성 입력'}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {voiceState.isRecording ? (
                <img src="/pause.svg" alt="녹음 중지" className="w-5 h-5" />
              ) : (
                <svg className="w-5 h-5 text-[#878181]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
            </form>
          </div>
        )}
      </>
      )}
    </div>
  );
}

