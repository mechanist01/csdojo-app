import React from 'react';

const CallTimeline = ({ apiResponses }) => {
  const getTopEmotions = (prosody, count = 3) => {
    if (!prosody || !prosody.scores) return [];
    return Object.entries(prosody.scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([emotion, score]) => ({ emotion, percentage: (score * 100).toFixed(2) }));
  };

  const totalDuration = apiResponses.reduce((max, response) => {
    const end = response.time?.end || 0;
    return Math.max(max, end);
  }, 0);

  return (
    <div className="mt-8 p-4 bg-white rounded-lg shadow-md w-full max-w-2xl">
      <h3 className="text-xl font-semibold mb-4">Call Timeline</h3>
      <div className="relative" style={{ height: `${apiResponses.length * 40 + 20}px` }}>
        {apiResponses.map((response, index) => {
          const startTime = response.time?.begin || 0;
          const endTime = response.time?.end || startTime;
          const startPercentage = (startTime / totalDuration) * 100;
          const widthPercentage = ((endTime - startTime) / totalDuration) * 100;
          const topEmotions = getTopEmotions(response.models?.prosody);

          return (
            <div 
              key={index}
              className={`absolute h-8 ${response.type === 'user_message' ? 'bg-blue-200' : 'bg-green-200'}`}
              style={{
                left: `${startPercentage}%`,
                width: `${widthPercentage}%`,
                top: `${index * 40}px`
              }}
            >
              <div className="text-xs mt-1 ml-1">{response.type === 'user_message' ? 'User' : 'Assistant'}</div>
              <div className="absolute top-full left-0 mt-1 text-xs">
                {topEmotions.map((emotion, i) => (
                  <span key={i} className="mr-2">{emotion.emotion}: {emotion.percentage}%</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex justify-between text-sm text-gray-600">
        <span>0s</span>
        <span>{(totalDuration / 1000).toFixed(1)}s</span>
      </div>
    </div>
  );
};

export default CallTimeline;