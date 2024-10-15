import React from 'react';
import './App.css';

const StatisticsView = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 font-sans bg-gray-100">
      <div className="w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">R Statistics</h2>
        
        {/* Graph */}
        <div className="bg-gray-100 h-64 mb-4 rounded">
          <p className="text-center pt-28">Graph Placeholder</p>
        </div>
        
        {/* Circular Progress */}
        <div className="flex justify-end mb-4">
          <div className="w-24 h-24 rounded-full border-4 border-blue-500 flex items-center justify-center">
            <span className="text-2xl font-bold">69</span>
          </div>
        </div>
        
        {/* Activity Boxes */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-blue-100 p-4 rounded">
            <h3 className="font-bold">Active</h3>
            <p>43%</p>
          </div>
          <div className="bg-yellow-100 p-4 rounded">
            <h3 className="font-bold">Rest</h3>
            <p>43%</p>
          </div>
        </div>
        
        {/* Feed Section */}
        <div className="mb-4">
          <h3 className="font-bold mb-2">R Feed</h3>
          <div className="flex items-center mb-2">
            <div className="w-10 h-10 bg-gray-300 rounded-full mr-2"></div>
            <div>
              <p className="font-bold">John Doe</p>
              <p className="text-sm text-gray-500">2 min ago</p>
            </div>
          </div>
        </div>
        
        {/* Product Section */}
        <div>
          <h3 className="font-bold mb-2">Product</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-purple-100 p-2 rounded">
              <p className="font-bold">Purple</p>
              <p className="text-sm">Product A</p>
            </div>
            <div className="bg-yellow-100 p-2 rounded">
              <p className="font-bold">Yellow</p>
              <p className="text-sm">Product B</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsView;