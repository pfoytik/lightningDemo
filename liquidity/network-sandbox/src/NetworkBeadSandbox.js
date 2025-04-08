import React, { useState, useRef, useEffect } from 'react';
import './NetworkBeadSandbox.css';

const NetworkBeadSandbox = () => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [connectingMode, setConnectingMode] = useState(false);
  const [beadSize, setBeadSize] = useState(10);
  const [selectedEdge, setSelectedEdge] = useState(null);
  
  const canvasRef = useRef(null);
  const nodeRadius = 20;
  const edgeWidth = 4;
  
  // Add a new node at the specified position
  const addNode = (x, y) => {
    const newNode = {
      id: Date.now(),
      x,
      y,
      label: `Node ${nodes.length + 1}`
    };
    setNodes([...nodes, newNode]);
    return newNode;
  };
  
  // Start connecting from a node
  const startConnecting = (nodeId) => {
    setSelectedNode(nodeId);
    setConnectingMode(true);
  };
  
  // Complete the connection between two nodes
  const completeConnection = (targetNodeId) => {
    if (selectedNode && selectedNode !== targetNodeId) {
      const newEdge = {
        id: `edge-${Date.now()}`,
        source: selectedNode,
        target: targetNodeId,
        beadsLeft: [],
        beadsRight: []
      };
      setEdges([...edges, newEdge]);
    }
    setConnectingMode(false);
    setSelectedNode(null);
  };
  
  // Add a bead to the selected edge
  const addBeadToEdge = (side) => {
    if (!selectedEdge) return;
    
    setEdges(edges.map(edge => {
      if (edge.id === selectedEdge) {
        if (side === 'left') {
          return { ...edge, beadsLeft: [...edge.beadsLeft, Date.now()] };
        } else {
          return { ...edge, beadsRight: [...edge.beadsRight, Date.now()] };
        }
      }
      return edge;
    }));
  };
  
  // Move a bead from one side to the other
  const moveBeadAcrossEdge = (side) => {
    if (!selectedEdge) return;
    
    setEdges(edges.map(edge => {
      if (edge.id === selectedEdge) {
        if (side === 'leftToRight' && edge.beadsLeft.length > 0) {
          const beadToMove = edge.beadsLeft[0];
          const newBeadsLeft = edge.beadsLeft.slice(1);
          return { 
            ...edge, 
            beadsLeft: newBeadsLeft,
            beadsRight: [...edge.beadsRight, beadToMove]
          };
        } else if (side === 'rightToLeft' && edge.beadsRight.length > 0) {
          const beadToMove = edge.beadsRight[0];
          const newBeadsRight = edge.beadsRight.slice(1);
          return { 
            ...edge, 
            beadsRight: newBeadsRight,
            beadsLeft: [...edge.beadsLeft, beadToMove]
          };
        }
      }
      return edge;
    }));
  };
  
  // Handle canvas click
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate the scaling factors between canvas DOM size and its internal dimensions
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Apply scaling to get accurate coordinates
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // Check if clicked on a node
    const clickedNode = nodes.find(node => 
      Math.sqrt(Math.pow(node.x - x, 2) + Math.pow(node.y - y, 2)) < nodeRadius
    );
    
    if (clickedNode) {
      if (connectingMode) {
        completeConnection(clickedNode.id);
      } else {
        startConnecting(clickedNode.id);
      }
      return;
    }
    
    // Check if clicked on an edge
    const clickedEdge = edges.find(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      
      if (!sourceNode || !targetNode) return false;
      
      // Distance from point to line segment calculation
      const lineLengthSquared = Math.pow(targetNode.x - sourceNode.x, 2) + 
                               Math.pow(targetNode.y - sourceNode.y, 2);
      
      if (lineLengthSquared === 0) return false;
      
      const t = Math.max(0, Math.min(1, (
        (x - sourceNode.x) * (targetNode.x - sourceNode.x) + 
        (y - sourceNode.y) * (targetNode.y - sourceNode.y)
      ) / lineLengthSquared));
      
      const closestX = sourceNode.x + t * (targetNode.x - sourceNode.x);
      const closestY = sourceNode.y + t * (targetNode.y - sourceNode.y);
      
      const distance = Math.sqrt(
        Math.pow(x - closestX, 2) + 
        Math.pow(y - closestY, 2)
      );
      
      return distance < 10; // detection threshold
    });
    
    if (clickedEdge) {
      setSelectedEdge(clickedEdge.id);
      return;
    }
    
    // If not clicked on a node or edge, add a new node
    if (!connectingMode) {
      addNode(x, y);
    } else {
      setConnectingMode(false);
      setSelectedNode(null);
    }
  };
  
  // Draw everything on the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw edges
    edges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      
      if (!sourceNode || !targetNode) return;
      
      // Calculate edge vector
      const dx = targetNode.x - sourceNode.x;
      const dy = targetNode.y - sourceNode.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      // Adjust start and end points to be on the node boundaries
      const startX = sourceNode.x + (dx / length) * nodeRadius;
      const startY = sourceNode.y + (dy / length) * nodeRadius;
      const endX = targetNode.x - (dx / length) * nodeRadius;
      const endY = targetNode.y - (dy / length) * nodeRadius;
      
      // Draw the edge line
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.lineWidth = edgeWidth;
      ctx.strokeStyle = edge.id === selectedEdge ? '#FF5722' : '#666';
      ctx.stroke();
      
      // Calculate midpoint
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      
      // Draw beads on the left half
      const unitX = dx / length;
      const unitY = dy / length;
      
      // Draw beads on left side (source to mid)
      edge.beadsLeft.forEach((_, index) => {
        const ratio = (index + 1) / (edge.beadsLeft.length + 1);
        const beadX = startX + ratio * (midX - startX);
        const beadY = startY + ratio * (midY - startY);
        
        ctx.beginPath();
        ctx.arc(beadX, beadY, beadSize, 0, 2 * Math.PI);
        ctx.fillStyle = '#4CAF50';
        ctx.fill();
      });
      
      // Draw beads on right side (mid to target)
      edge.beadsRight.forEach((_, index) => {
        const ratio = (index + 1) / (edge.beadsRight.length + 1);
        const beadX = midX + ratio * (endX - midX);
        const beadY = midY + ratio * (endY - midY);
        
        ctx.beginPath();
        ctx.arc(beadX, beadY, beadSize, 0, 2 * Math.PI);
        ctx.fillStyle = '#2196F3';
        ctx.fill();
      });
    });
    
    // Draw connecting line when in connecting mode
    if (connectingMode && selectedNode) {
      const sourceNode = nodes.find(n => n.id === selectedNode);
      if (sourceNode) {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        
        // Use the scaled canvas coordinates
        const mouseX = mousePosition.canvasX || 0;
        const mouseY = mousePosition.canvasY || 0;
        
        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(mouseX, mouseY);
        ctx.strokeStyle = '#999';
        ctx.setLineDash([5, 3]);
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    
    // Draw nodes
    nodes.forEach(node => {
      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI);
      ctx.fillStyle = node.id === selectedNode ? '#FFD700' : '#FFF';
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
      
      // Node label
      ctx.fillStyle = '#000';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.label, node.x, node.y);
    });
  }, [nodes, edges, selectedNode, connectingMode, selectedEdge, beadSize]);
  
  // Track mouse position for drawing connecting line
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Apply the same scaling as in handleCanvasClick
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    setMousePosition({ x: e.clientX, y: e.clientY, canvasX: x, canvasY: y });
  };
  
  // Resize canvas to match its container
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const parent = canvas.parentElement;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      
      // Redraw after resize
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    
    // Initial size
    resizeCanvas();
    
    // Add listener for window resize
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);
  
  return (
    <div className="network-container">
      <div className="control-panel">
        <h2 className="title">Network Bead Sandbox</h2>
        <p className="instruction">Click anywhere to add nodes. Click a node to start connecting, then click another node to create an edge.</p>
        <p className="instruction">Click on an edge to select it, then use the buttons below to add or move beads.</p>
        
        <div className="controls">
          <div className="control-group">
            <label className="block text-sm font-medium mb-1">Bead Size:</label>
            <input 
              type="range" 
              min="5" 
              max="15" 
              value={beadSize} 
              onChange={(e) => setBeadSize(parseInt(e.target.value))}
              className="w-32"
            />
          </div>
          
          <div className="control-group divider">
            <h3 className="font-medium mb-1">Selected Edge:</h3>
            <div className="text-sm">{selectedEdge ? selectedEdge : 'None'}</div>
          </div>
          
          <div className="button-group">
            <button 
              onClick={() => addBeadToEdge('left')} 
              disabled={!selectedEdge}
              className="btn-green"
            >
              Add Left Bead
            </button>
            <button 
              onClick={() => addBeadToEdge('right')} 
              disabled={!selectedEdge}
              className="btn-blue"
            >
              Add Right Bead
            </button>
          </div>
          
          <div className="button-group">
            <button 
              onClick={() => moveBeadAcrossEdge('leftToRight')} 
              disabled={!selectedEdge || !edges.find(e => e.id === selectedEdge)?.beadsLeft.length}
              className="btn-yellow"
            >
              Move Left → Right
            </button>
            <button 
              onClick={() => moveBeadAcrossEdge('rightToLeft')} 
              disabled={!selectedEdge || !edges.find(e => e.id === selectedEdge)?.beadsRight.length}
              className="btn-orange"
            >
              Move Right → Left
            </button>
          </div>
        </div>
      </div>
      
      <div className="canvas-container">
        <canvas 
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          className="canvas"
          style={{ touchAction: 'none' }}
        />
      </div>
      
      <div className="stats-panel">
        <h3 className="stats-title">Network Stats:</h3>
        <div className="stats-grid">
          <div>
            <p>Nodes: {nodes.length}</p>
            <p>Edges: {edges.length}</p>
          </div>
          <div>
            <p>Total Left Beads: {edges.reduce((sum, edge) => sum + edge.beadsLeft.length, 0)}</p>
            <p>Total Right Beads: {edges.reduce((sum, edge) => sum + edge.beadsRight.length, 0)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkBeadSandbox;
