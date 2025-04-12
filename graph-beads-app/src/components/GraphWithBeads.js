import React, { useState, useEffect, useMemo } from 'react';

const GraphWithBeads = () => {
  // Define the graph structure: nodes and edges with adjusted positions and fees
  const nodes = [
    { id: 0, label: 'Start', x: 80, y: 150, fee: 10 },
    { id: 1, label: 'Node 1', x: 200, y: 75, fee: 5 },
    { id: 2, label: 'Node 2', x: 200, y: 225, fee: 8 },
    { id: 3, label: 'Node 3', x: 320, y: 75, fee: 12 },
    { id: 4, label: 'Node 4', x: 320, y: 225, fee: 7 },
    { id: 5, label: 'Exit', x: 440, y: 150, fee: 15 }
  ];

  const initialEdges = [
    { id: 0, source: 0, target: 1 },
    { id: 1, source: 0, target: 2 },
    { id: 2, source: 1, target: 3 },
    { id: 3, source: 1, target: 4 },
    { id: 4, source: 2, target: 3 },
    { id: 5, source: 2, target: 4 },
    { id: 6, source: 3, target: 5 },
    { id: 7, source: 4, target: 5 }
  ];

  // Initialize edges state with persistent beads
  const [edges, setEdges] = useState(
    initialEdges.map(edge => ({
      ...edge,
      beads: Array(8).fill(0).map((_, i) => ({ 
        id: i, 
        side: 'source', 
        active: false,
        path: null,  // Track which path moved this bead
        transactionId: null // Track which transaction moved this bead
      }))
    }))
  );
  
  // State for node fee earnings
  const [nodeEarnings, setNodeEarnings] = useState(
    nodes.map(node => ({ nodeId: node.id, earnedFees: 0 }))
  );
  
  // State for tracking remaining beads at each node
  const [nodeBeadCounts, setNodeBeadCounts] = useState(
    nodes.map(node => ({ nodeId: node.id, beadCount: node.id === 0 ? 8 : 0 }))
  );

  // State for selected path
  const [selectedPathIndex, setSelectedPathIndex] = useState(null);
  
  // State for amount being transferred
  const [transferAmount, setTransferAmount] = useState(0);
  
  // State to track transaction count for unique IDs
  const [transactionCount, setTransactionCount] = useState(0);
  
  // State to track transaction history
  const [transactionHistory, setTransactionHistory] = useState([]);

  // Function to find all paths from start to end nodes (with node IDs)
  const findAllPaths = (startNodeId, endNodeId) => {
    const result = [];
    const visited = new Set();
    const path = [];
    
    function dfs(currentNodeId) {
      // Add current node to path
      path.push(currentNodeId);
      visited.add(currentNodeId);
      
      // If we reached the target node, add the path to results
      if (currentNodeId === endNodeId) {
        result.push([...path]);
      } else {
        // Try all possible next nodes (connected by edges)
        const outgoingEdges = initialEdges.filter(edge => edge.source === currentNodeId);
        for (const edge of outgoingEdges) {
          if (!visited.has(edge.target)) {
            dfs(edge.target);
          }
        }
      }
      
      // Backtrack
      path.pop();
      visited.delete(currentNodeId);
    }
    
    dfs(startNodeId);
    return result;
  };
  
  // Calculate all paths with their node IDs, labels, and total fees
  const allPathsData = useMemo(() => {
    const pathsWithIds = findAllPaths(0, 5);
    
    return pathsWithIds.map(nodePath => {
      // For displaying in the table
      const pathStr = nodePath.map(nodeId => {
        const node = nodes.find(n => n.id === nodeId);
        return node.label;
      }).join(' → ');
      
      // Calculate total fee for this path
      const totalFee = nodePath.reduce((sum, nodeId) => {
        const node = nodes.find(n => n.id === nodeId);
        return sum + node.fee;
      }, 0);
      
      // Calculate fees at each step of the path
      const feeBreakdown = [];
      let remainingAmount = totalFee;
      
      for (let i = 0; i < nodePath.length; i++) {
        const nodeId = nodePath[i];
        const node = nodes.find(n => n.id === nodeId);
        
        feeBreakdown.push({
          nodeId,
          label: node.label,
          fee: node.fee,
          amountBefore: remainingAmount,
          amountAfter: i === nodePath.length - 1 ? 0 : remainingAmount - node.fee
        });
        
        remainingAmount -= node.fee;
      }
      
      return {
        nodeIds: nodePath,          // Array of node IDs in the path
        path: pathStr,              // Formatted path string
        totalFee,                   // Total fee for the path
        feeBreakdown,               // Detailed fee breakdown at each hop
        edges: getEdgesInPath(nodePath)  // Array of edge IDs in this path
      };
    }).sort((a, b) => a.totalFee - b.totalFee);
  }, []);
  
  // Helper to get all edge IDs in a path
  function getEdgesInPath(nodePath) {
    const edgeIds = [];
    for (let i = 0; i < nodePath.length - 1; i++) {
      const source = nodePath[i];
      const target = nodePath[i + 1];
      const edge = initialEdges.find(e => e.source === source && e.target === target);
      if (edge) {
        edgeIds.push(edge.id);
      }
    }
    return edgeIds;
  }

  // Handle path selection
  const selectPath = (index) => {
    setSelectedPathIndex(index);
    
    // Set the transfer amount to the total fee of the selected path
    const selectedPath = allPathsData[index];
    setTransferAmount(selectedPath.totalFee);
  };
  
  // Handle transaction execution
  const executeTransaction = () => {
    if (selectedPathIndex === null) return;
    
    // Check if start node has enough beads
    const startNodeCount = nodeBeadCounts.find(n => n.nodeId === 0);
    if (startNodeCount.beadCount <= 0) {
      alert("Start node has no more beads to send!");
      return;
    }
    
    const txId = transactionCount + 1;
    setTransactionCount(txId);
    
    const selectedPath = allPathsData[selectedPathIndex];
    const selectedEdgeIds = selectedPath.edges;
    
    // Update beads for each edge in the path
    setEdges(prevEdges => 
      prevEdges.map(edge => {
        if (selectedEdgeIds.includes(edge.id)) {
          // Find the first available bead on the source side
          const updatedBeads = [...edge.beads];
          const sourceBeadIndex = updatedBeads.findIndex(bead => bead.side === 'source');
          
          if (sourceBeadIndex !== -1) {
            updatedBeads[sourceBeadIndex] = { 
              ...updatedBeads[sourceBeadIndex], 
              side: 'target', 
              active: true,
              path: selectedPathIndex,
              transactionId: txId
            };
          }
          
          return { ...edge, beads: updatedBeads };
        }
        return edge;
      })
    );
    
    // Update node earnings based on the path
    setNodeEarnings(prevEarnings => 
      prevEarnings.map(earning => {
        // Find if this node is in the path (except start and end nodes)
        const nodeInPath = selectedPath.nodeIds.includes(earning.nodeId) && 
                           earning.nodeId !== 0 && earning.nodeId !== 5;
        
        if (nodeInPath) {
          // Add the node's fee to its earnings
          const node = nodes.find(n => n.id === earning.nodeId);
          return {
            ...earning,
            earnedFees: earning.earnedFees + node.fee
          };
        }
        return earning;
      })
    );
    
    // Update node bead counts
    setNodeBeadCounts(prevCounts => {
      const updatedCounts = [...prevCounts];
      
      // Decrease count at start node
      const startNodeIndex = updatedCounts.findIndex(n => n.nodeId === 0);
      if (startNodeIndex !== -1) {
        updatedCounts[startNodeIndex] = {
          ...updatedCounts[startNodeIndex],
          beadCount: updatedCounts[startNodeIndex].beadCount - 1
        };
      }
      
      // Increase count at end node
      const endNodeIndex = updatedCounts.findIndex(n => n.nodeId === 5);
      if (endNodeIndex !== -1) {
        updatedCounts[endNodeIndex] = {
          ...updatedCounts[endNodeIndex],
          beadCount: updatedCounts[endNodeIndex].beadCount + 1
        };
      }
      
      return updatedCounts;
    });
    
    // Add to transaction history
    setTransactionHistory(prev => [...prev, {
      id: txId,
      pathIndex: selectedPathIndex,
      path: selectedPath.path,
      amount: selectedPath.totalFee,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  // Calculate positions for beads along an edge
  const calculateBeadPositions = (sourceX, sourceY, targetX, targetY, side, beads) => {
    // Calculate direction vector
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize direction vector
    const nx = dx / length;
    const ny = dy / length;
    
    // Perpendicular vector (rotate 90 degrees)
    const px = -ny;
    const py = nx;
    
    // Calculate start position along the edge
    const alongRatio = side === 'source' ? 0.25 : 0.75;
    const alongPoint = {
      x: sourceX + dx * alongRatio,
      y: sourceY + dy * alongRatio
    };
    
    // Calculate positions for beads in a small stack
    const beadPositions = [];
    const count = beads.length;
    
    for (let i = 0; i < count; i++) {
      // Add a small offset perpendicular to the edge, and stack beads
      const offsetX = px * 14; // Perpendicular distance from edge
      const offsetY = py * 14;
      
      // Stack the beads by adding a small offset in the perpendicular direction
      const stackOffsetX = px * (i * 2.5);
      const stackOffsetY = py * (i * 2.5);
      
      beadPositions.push({
        x: alongPoint.x + offsetX + stackOffsetX,
        y: alongPoint.y + offsetY + stackOffsetY,
        bead: beads[i]
      });
      
      // If more than 4 beads, start a new row
      if (i === 3 && count > 4) {
        // Reset for new row
        alongPoint.x += nx * 10;
        alongPoint.y += ny * 10;
      }
    }
    
    return beadPositions;
  };

  return (
    <div className="flex flex-col items-center w-full h-full bg-gray-100 p-4 overflow-auto" style={{ maxHeight: '100vh' }}>
      {/* Header with transfer amount and transaction button */}
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg p-4 mb-4 flex justify-between items-center sticky top-0 z-10">
        <div className="text-xl font-bold">
          {selectedPathIndex !== null ? (
            <>Transfer Amount: <span className="text-green-600">{transferAmount}</span></>
          ) : (
            <>Select a path to simulate bead transfer</>
          )}
        </div>
        
        <div className="flex items-center">
          <div className="mr-4 text-gray-600">
            Total Transactions: <span className="font-bold">{transactionCount}</span>
          </div>
          
          <button
            onClick={executeTransaction}
            disabled={selectedPathIndex === null || nodeBeadCounts.find(n => n.nodeId === 0).beadCount <= 0}
            className={`px-4 py-2 rounded text-white ${
              selectedPathIndex === null || nodeBeadCounts.find(n => n.nodeId === 0).beadCount <= 0
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            Transact
          </button>
        </div>
      </div>
      
      {/* Graph container */}
      <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-lg p-4 mb-4">
        <svg viewBox="0 0 520 300" width="100%" height="300" preserveAspectRatio="xMidYMid meet">
          {/* Draw edges */}
          {edges.map(edge => {
            const source = nodes.find(n => n.id === edge.source);
            const target = nodes.find(n => n.id === edge.target);
            
            // Split beads by side
            const sourceBeads = edge.beads.filter(b => b.side === 'source');
            const targetBeads = edge.beads.filter(b => b.side === 'target');
            
            // Check if this edge is in the selected path
            const isInSelectedPath = selectedPathIndex !== null && 
                                    allPathsData[selectedPathIndex].edges.includes(edge.id);
            
            // Calculate positions for individual beads
            const sourceBeadPositions = calculateBeadPositions(
              source.x, source.y, target.x, target.y, 'source', sourceBeads
            );
            
            const targetBeadPositions = calculateBeadPositions(
              source.x, source.y, target.x, target.y, 'target', targetBeads
            );
            
            return (
              <g key={`edge-${edge.id}`}>
                {/* Edge line */}
                <line
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={isInSelectedPath ? "#3b82f6" : "gray"}
                  strokeWidth={isInSelectedPath ? "3" : "2"}
                />
                
                {/* Direction indicator (small arrow) */}
                <polygon 
                  points={`${(source.x + target.x) / 2},${(source.y + target.y) / 2} 
                          ${(source.x + target.x) / 2 - 5},${(source.y + target.y) / 2 - 5} 
                          ${(source.x + target.x) / 2 - 5},${(source.y + target.y) / 2 + 5}`} 
                  fill={isInSelectedPath ? "#3b82f6" : "gray"} 
                  transform={`rotate(${Math.atan2(target.y - source.y, target.x - source.x) * 180 / Math.PI}, 
                                   ${(source.x + target.x) / 2}, ${(source.y + target.y) / 2})`}
                />
                
                {/* Source node beads */}
                {sourceBeadPositions.map((pos, index) => {
                  return (
                    <circle
                      key={`source-bead-${edge.id}-${pos.bead.id}`}
                      cx={pos.x}
                      cy={pos.y}
                      r="5"
                      fill="#3b82f6"
                      stroke="#1e40af"
                      strokeWidth="1"
                      opacity={isInSelectedPath ? "1" : "0.7"}
                    />
                  );
                })}
                
                {/* Target node beads */}
                {targetBeadPositions.map((pos, index) => {
                  const isNewestTransaction = pos.bead.transactionId === transactionCount;
                  return (
                    <circle
                      key={`target-bead-${edge.id}-${pos.bead.id}`}
                      cx={pos.x}
                      cy={pos.y}
                      r="5"
                      fill={isNewestTransaction ? "#10b981" : "#34d399"}
                      stroke={isNewestTransaction ? "#065f46" : "#059669"}
                      strokeWidth="1"
                      opacity={isInSelectedPath || pos.bead.path === selectedPathIndex ? "1" : "0.7"}
                    />
                  );
                })}
              </g>
            );
          })}
          
          {/* Draw nodes */}
          {nodes.map(node => {
            // Check if this node is in the selected path
            const isInSelectedPath = selectedPathIndex !== null && 
                                    allPathsData[selectedPathIndex].nodeIds.includes(node.id);
            
            // Find the fee breakdown for this node if in selected path
            let feeBreakdown = null;
            if (selectedPathIndex !== null && isInSelectedPath) {
              feeBreakdown = allPathsData[selectedPathIndex].feeBreakdown.find(fb => fb.nodeId === node.id);
            }
            
            // Get node earnings
            const nodeEarning = nodeEarnings.find(e => e.nodeId === node.id);
            const earnedFees = nodeEarning ? nodeEarning.earnedFees : 0;
            
            // Get node bead count
            const nodeBeadCount = nodeBeadCounts.find(n => n.nodeId === node.id);
            const beadCount = nodeBeadCount ? nodeBeadCount.beadCount : 0;
            
            return (
              <g key={`node-${node.id}`}>
                {/* Node circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="15"
                  fill={
                    isInSelectedPath 
                      ? (node.id === 0 ? "#ef4444" : node.id === 5 ? "#8b5cf6" : "#f59e0b")
                      : "#d1d5db" // Gray if not in selected path
                  }
                  stroke={isInSelectedPath ? "black" : "#9ca3af"}
                  strokeWidth={isInSelectedPath ? "2" : "1"}
                />
                
                {/* Node label */}
                <text
                  x={node.x}
                  y={node.y + 35}
                  textAnchor="middle"
                  style={{ 
                    fontSize: '14px', 
                    fontWeight: isInSelectedPath ? 'bold' : 'normal',
                    fill: isInSelectedPath ? 'black' : '#6b7280'
                  }}
                >
                  {node.label}
                </text>
                
                {/* Fee display */}
                <g>
                  {/* Fee background */}
                  <circle
                    cx={node.x}
                    cy={node.y - 25}
                    r="12"
                    fill="white"
                    stroke={isInSelectedPath ? "#4B5563" : "#9ca3af"}
                    strokeWidth={isInSelectedPath ? "1.5" : "1"}
                  />
                  
                  {/* Fee text */}
                  <text
                    x={node.x}
                    y={node.y - 21}
                    textAnchor="middle"
                    style={{ 
                      fontSize: '10px', 
                      fontWeight: 'bold',
                      fill: isInSelectedPath ? '#4B5563' : '#6b7280'
                    }}
                  >
                    {node.fee}
                  </text>
                </g>
                
                {/* Earned fees display (only for internal nodes) */}
                {earnedFees > 0 && node.id !== 0 && node.id !== 5 && (
                  <g>
                    <rect 
                      x={node.x - 22} 
                      y={node.y - 65} 
                      width="44" 
                      height="16" 
                      rx="4"
                      fill="#dcfce7"
                      stroke="#10b981"
                      strokeWidth="1"
                    />
                    <text
                      x={node.x}
                      y={node.y - 54}
                      textAnchor="middle"
                      style={{ 
                        fontSize: '10px', 
                        fontWeight: 'bold',
                        fill: '#059669'
                      }}
                    >
                      +{earnedFees}
                    </text>
                  </g>
                )}
                
                {/* Bead count display for start and end nodes */}
                {(node.id === 0 || node.id === 5 || beadCount > 0) && (
                  <g>
                    <rect 
                      x={node.x - 20} 
                      y={node.y - 90} 
                      width="40" 
                      height="20" 
                      rx="4"
                      fill="#dbeafe"
                      stroke="#3b82f6"
                      strokeWidth="1"
                    />
                    <text
                      x={node.x}
                      y={node.y - 75}
                      textAnchor="middle"
                      style={{ 
                        fontSize: '10px', 
                        fontWeight: 'bold',
                        fill: '#1d4ed8'
                      }}
                    >
                      {node.id === 0 ? "Beads: " : node.id === 5 ? "Recv: " : "Beads: "}{beadCount}
                    </text>
                  </g>
                )}
                
                {/* Amount being transferred (only shown if node is in selected path and in most recent transaction) */}
                {isInSelectedPath && feeBreakdown && transactionCount > 0 && (
                  <g>
                    <rect 
                      x={node.x + 25} 
                      y={node.y - 15} 
                      width="40" 
                      height="20" 
                      rx="4"
                      fill="#e0f2fe"
                      stroke="#0369a1"
                      strokeWidth="1"
                    />
                    <text
                      x={node.x + 45}
                      y={node.y}
                      textAnchor="middle"
                      style={{ 
                        fontSize: '10px', 
                        fontWeight: 'bold',
                        fill: '#0369a1'
                      }}
                    >
                      {feeBreakdown.amountBefore}
                    </text>
                    
                    {/* If not the final node, show amount after fee */}
                    {node.id !== 5 && (
                      <>
                        <line
                          x1={node.x + 45}
                          y1={node.y + 5}
                          x2={node.x + 45}
                          y2={node.y + 10}
                          stroke="#0369a1"
                          strokeWidth="1"
                          strokeDasharray="2,2"
                        />
                        <rect 
                          x={node.x + 25} 
                          y={node.y + 10} 
                          width="40" 
                          height="15" 
                          rx="3"
                          fill="#dcfce7"
                          stroke="#059669"
                          strokeWidth="1"
                        />
                        <text
                          x={node.x + 45}
                          y={node.y + 21}
                          textAnchor="middle"
                          style={{ 
                            fontSize: '8px', 
                            fontWeight: 'bold',
                            fill: '#059669'
                          }}
                        >
                          {feeBreakdown.amountAfter}
                        </text>
                      </>
                    )}
                  </g>
                )}
              </g>
            );
          })}
        </svg>
        
        <div className="absolute bottom-2 left-2 text-sm text-gray-700">
          {selectedPathIndex !== null 
            ? "Path selected: Click 'Transact' to move beads along this path." 
            : "Select a path from the table below to visualize bead transfer."}
        </div>
      </div>
      
      {/* Path Fees Table */}
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg p-4 mb-4">
        <h2 className="text-xl font-bold mb-4 text-center">All Possible Paths from Start to Exit</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2">Path</th>
                <th className="border border-gray-300 px-4 py-2 w-32">Total Fee</th>
                <th className="border border-gray-300 px-4 py-2 w-32">Action</th>
              </tr>
            </thead>
            <tbody>
              {allPathsData.map((pathInfo, index) => (
                <tr 
                  key={index} 
                  className={selectedPathIndex === index ? "bg-blue-50" : index === 0 ? "bg-green-50" : ""}
                >
                  <td className="border border-gray-300 px-4 py-2 font-medium">{pathInfo.path}</td>
                  <td className="border border-gray-300 px-4 py-2 text-center">{pathInfo.totalFee}</td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    <button
                      onClick={() => selectPath(index)}
                      className={`px-3 py-1 rounded text-white ${
                        selectedPathIndex === index 
                          ? "bg-blue-600 hover:bg-blue-700" 
                          : "bg-gray-500 hover:bg-gray-600"
                      }`}
                    >
                      {selectedPathIndex === index ? "Selected" : "Select"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Transaction History */}
      {transactionHistory.length > 0 && (
        <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg p-4 mb-4">
          <h2 className="text-xl font-bold mb-4 text-center">Transaction History</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 w-16">ID</th>
                  <th className="border border-gray-300 px-4 py-2">Path</th>
                  <th className="border border-gray-300 px-4 py-2 w-32">Amount</th>
                  <th className="border border-gray-300 px-4 py-2 w-32">Time</th>
                </tr>
              </thead>
              <tbody>
                {[...transactionHistory].reverse().map(tx => (
                  <tr key={tx.id}>
                    <td className="border border-gray-300 px-4 py-2 text-center">{tx.id}</td>
                    <td className="border border-gray-300 px-4 py-2">{tx.path}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">{tx.amount}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">{tx.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphWithBeads;
