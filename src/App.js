import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import StatisticsView from './StatisticsView';

const App = () => {
  const [selectedBrand, setSelectedBrand] = useState('Nooro');
  const [selectedCustomerProfile, setSelectedCustomerProfile] = useState('Angry about returning foot massagers');
  const [selectedReturnReason, setSelectedReturnReason] = useState('Broken product');
  const [isCallActive, setIsCallActive] = useState(false);
  const [havePermissions, setHavePermissions] = useState(false);
  const [socket, setSocket] = useState(null);
  const [apiKey] = useState('________INSERT API KEY_________');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [apiResponses, setApiResponses] = useState([]);
  const [logs, setLogs] = useState([]);
  const [audioStream, setAudioStream] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const audioContext = useRef(null);
  const audioBufferSource = useRef(null);
  const dialogueBoxRef = useRef(null);

  const MAX_RETRIES = 3;
  let retryCount = 0;

  const configId = 'd5de592f-dd08-40c1-9288-1488018f0337';
  const encodedApiKey = encodeURIComponent(apiKey);
  const wsUrl = `wss://api.hume.ai/v0/evi/chat?config_id=${configId}&api_key=${encodedApiKey}`;

  const [audioQueue, setAudioQueue] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);

  const navigate = useNavigate();
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (audioQueue.length > 0 && !isPlaying) {
      playNextAudio();
    }
  }, [audioQueue, isPlaying]);

  const playNextAudio = async () => {
    if (audioQueue.length === 0) {
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    const nextAudio = audioQueue[0];
    await playAudioResponse(nextAudio);
    setAudioQueue(prevQueue => prevQueue.slice(1));
  };

  const playAudioResponse = async (base64Audio) => {
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    const audioData = atob(base64Audio);
    const arrayBuffer = new ArrayBuffer(audioData.length);
    const view = new Uint8Array(arrayBuffer);
    for (let i = 0; i < audioData.length; i++) {
      view[i] = audioData.charCodeAt(i);
    }

    const audioBuffer = await audioContext.current.decodeAudioData(arrayBuffer);
    
    if (audioBufferSource.current) {
      audioBufferSource.current.stop();
    }

    audioBufferSource.current = audioContext.current.createBufferSource();
    audioBufferSource.current.buffer = audioBuffer;
    audioBufferSource.current.connect(audioContext.current.destination);
    audioBufferSource.current.onended = () => {
      setIsPlaying(false);
    };
    audioBufferSource.current.start();
  };

  const handleCallStart = async () => {
    setIsCallActive(true);
    setConnectionStatus('connecting');
    
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);

      // Create MediaRecorder
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);

      // Set up WebSocket connection
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connection opened');
        addLog('WebSocket connection opened');
        setSocket(ws);
        setConnectionStatus('connected');
        startRecording(recorder, ws);
      };

      ws.onmessage = handleWebSocketMessage;

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        addLog(`WebSocket error: ${JSON.stringify(error)}`);
        setConnectionStatus('error');
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed. Code:', event.code, 'Reason:', event.reason);
        addLog(`WebSocket closed. Code: ${event.code}, Reason: ${event.reason}`);
        setConnectionStatus('disconnected');
      };

    } catch (error) {
      console.error('Error starting call:', error);
      addLog(`Error starting call: ${error.message}`);
      setConnectionStatus('error');
    }
  };

  const startRecording = (recorder, ws) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
        const reader = new FileReader();
        reader.onload = () => {
          const base64Audio = reader.result.split(',')[1];
          ws.send(JSON.stringify({
            type: "audio_input",
            data: base64Audio
          }));
        };
        reader.readAsDataURL(event.data);
      }
    };

    recorder.start(100); // Capture in 100ms intervals
  };

  const handleCallEnd = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      setIsCallActive(false);
      navigate('/statistics');
    }, 500); // Adjust timing as needed
  };

  const checkPermissions = () => {
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then((stream) => {
        alert('Accepted the permissions');
        setHavePermissions(true);
        stream.getTracks().forEach(track => track.stop());
        handleCallStart();
      })
      .catch((err) => {
        setHavePermissions(false);
        console.log(`${err.name} : ${err.message}`);
        alert('Microphone access is required to make a call. Please grant permission and try again.');
      });
  };

  const handleCall = () => {
    if (!isCallActive) {
      checkPermissions();
    } else {
      handleCallEnd();
    }
    setIsCallActive(!isCallActive);
  };

  const addLog = (message) => {
    setLogs(prev => [...prev, { time: new Date().toISOString(), message }]);
  };

  const getTopSentiments = (prosody) => {
    if (!prosody || !prosody.scores) return [];
    return Object.entries(prosody.scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([sentiment, score]) => `${sentiment}: ${Math.round(score * 100)}%`);
  };

  const handleWebSocketMessage = async (event) => {
    console.log('Received message:', event.data);
    const response = JSON.parse(event.data);
    
    if (response.type === 'chat_metadata') {
      console.log('Chat Group ID:', response.chat_group_id);
      addLog(`Chat Group ID: ${response.chat_group_id}`);
    }
    
    if (response.type === 'user_message' || response.type === 'assistant_message') {
      setApiResponses(prevResponses => [...prevResponses, response]);
    }
    
    addLog(`WebSocket message: ${event.data}`);

    if (response.type === 'audio_output') {
      setAudioQueue(prevQueue => [...prevQueue, response.data]);
    }
  };

  const getStoredResponses = () => {
    return apiResponses;
  };

  useEffect(() => {
    if (dialogueBoxRef.current) {
      dialogueBoxRef.current.scrollTop = dialogueBoxRef.current.scrollHeight;
    }
  }, [apiResponses]);

  return (
    <div className={`transition-opacity duration-500 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
      {isCallActive ? (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 font-sans bg-gray-100">
          <div className="w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-lg">
            <div className="bg-gray-50 text-gray-800 p-4 flex flex-col items-center justify-center border-b border-gray-200">
              <span 
                className="font-bold tracking-tight text-center"
                style={{ 
                  fontSize: '1.3em',
                  lineHeight: '1',
                  fontFamily: "'Inter', sans-serif"
                }}
              >
                CS Dojo
              </span>
            </div>
            <div className="p-6 relative" style={{ minHeight: '500px' }}>
              <div className={`space-y-6 transition-all duration-500 ${isCallActive ? 'opacity-0 absolute inset-0 pointer-events-none' : 'opacity-100'}`}>
                <div>
                  <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                  <div className="relative">
                    <select
                      id="brand"
                      value={selectedBrand}
                      onChange={(e) => setSelectedBrand(e.target.value)}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-md appearance-none bg-white"
                      disabled={isCallActive}
                    >
                      <option value="Nooro">VitalityNow</option>
                    </select>
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">▼</span>
                  </div>
                </div>
              </div>
              <div className={`mt-6 transition-all duration-500 ${isCallActive ? 'opacity-100' : 'opacity-0'}`}>
                {isCallActive && (
                  <div className="text-gray-600 text-lg text-center animate-pulse">
                    <div className="flex items-center justify-center space-x-2">
                      <span className="animate-pulse">Call in progress...</span>
                      <span className={`w-3 h-3 rounded-full ${
                        connectionStatus === 'connected' ? 'bg-green-500' :
                        connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-gray-500'
                      }`}></span>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-8 flex justify-center">
                <button
                  onClick={handleCallEnd}
                  className="w-16 h-16 rounded-full focus:outline-none transition-all duration-300 bg-red-500 hover:bg-red-600"
                >
                  <span className="sr-only">End Call</span>
                  <svg className="w-8 h-8 mx-auto text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div 
                ref={dialogueBoxRef}
                className={`mt-6 bg-gray-50 rounded-2xl p-4 overflow-y-auto text-sm space-y-4 transition-all duration-500 ${
                  isCallActive ? 'h-96' : 'h-48'
                }`}
              >
                {apiResponses.map((response, index) => {
                  const topSentiments = getTopSentiments(response.models?.prosody);
                  const delay = index * 0.1;
                  if (response.type === 'user_message') {
                    return (
                      <div key={index} className="flex flex-col items-end message-fade-in" style={{animationDelay: `${delay}s`}}>
                        <span className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg inline-block max-w-[70%]">
                          {response.message.content}
                        </span>
                        <div className="text-xs text-gray-500 mt-1 space-x-2">
                          {topSentiments.map((sentiment, i) => (
                            <span key={i} className="inline-block bg-gray-100 rounded px-1 py-0.5">{sentiment}</span>
                          ))}
                        </div>
                      </div>
                    );
                  } else if (response.type === 'assistant_message') {
                    return (
                      <div key={index} className="flex flex-col items-start message-fade-in" style={{animationDelay: `${delay}s`}}>
                        <span className="bg-gray-200 text-gray-800 px-3 py-2 rounded-lg inline-block max-w-[70%]">
                          {response.message.content}
                        </span>
                        <div className="text-xs text-gray-500 mt-1 space-x-2">
                          {topSentiments.map((sentiment, i) => (
                            <span key={i} className="inline-block bg-gray-100 rounded px-1 py-0.5">{sentiment}</span>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Routes>
          <Route path="/statistics" element={<StatisticsView />} />
          <Route path="/" element={
            <div className="min-h-screen flex flex-col items-center justify-center p-4 font-sans bg-gray-100">
              <div className="w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-lg">
                <div className="bg-gray-50 text-gray-800 p-4 flex flex-col items-center justify-center border-b border-gray-200">
                  <span 
                    className="font-bold tracking-tight text-center"
                    style={{ 
                      fontSize: '1.3em',
                      lineHeight: '1',
                      fontFamily: "'Inter', sans-serif"
                    }}
                  >
                    CS Dojo
                  </span>
                </div>
                <div className="p-6 relative" style={{ minHeight: '500px' }}>
                  <div className={`space-y-6 transition-all duration-500 ${isCallActive ? 'opacity-0 absolute inset-0 pointer-events-none' : 'opacity-100'}`}>
                    <div>
                      <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                      <div className="relative">
                        <select
                          id="brand"
                          value={selectedBrand}
                          onChange={(e) => setSelectedBrand(e.target.value)}
                          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-md appearance-none bg-white"
                          disabled={isCallActive}
                        >
                          <option value="Nooro">Vitality Now</option>
                        </select>
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">▼</span>
                      </div>
                    </div>
                  </div>
                  <div className={`mt-6 transition-all duration-500 ${isCallActive ? 'opacity-100' : 'opacity-0'}`}>
                    {isCallActive && (
                      <div className="text-gray-600 text-lg text-center animate-pulse">
                        <div className="flex items-center justify-center space-x-2">
                          <span className="animate-pulse">Call in progress...</span>
                          <span className={`w-3 h-3 rounded-full ${
                            connectionStatus === 'connected' ? 'bg-green-500' :
                            connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-gray-500'
                          }`}></span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-8 flex justify-center">
                    <button
                      onClick={handleCall}
                      className={`w-16 h-16 rounded-full focus:outline-none transition-all duration-300 ${
                        isCallActive
                          ? 'bg-red-500 hover:bg-red-600'
                          : 'bg-green-500 hover:bg-green-600'
                      }`}
                    >
                      <span className="sr-only">{isCallActive ? 'End Call' : 'Start Call'}</span>
                      {isCallActive ? (
                        <svg className="w-8 h-8 mx-auto text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        <svg className="w-8 h-8 mx-auto text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <div 
                    ref={dialogueBoxRef}
                    className={`mt-6 bg-gray-50 rounded-2xl p-4 overflow-y-auto text-sm space-y-4 transition-all duration-500 ${
                      isCallActive ? 'h-96' : 'h-48'
                    }`}
                  >
                    {apiResponses.map((response, index) => (
                      <div key={index} className={response.type === 'user_message' ? 'text-right' : 'text-left'}>
                        <span className={`inline-block p-2 rounded-lg ${
                          response.type === 'user_message' ? 'bg-blue-100' : 'bg-gray-200'
                        }`}>
                          {response.message.content}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          } />
        </Routes>
      )}
    </div>
  );
};

const AppWrapper = () => (
  <Router>
    <App />
  </Router>
);

export default AppWrapper;
