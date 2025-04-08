import React, { useState, useEffect, useCallback } from 'react';
import './LightningSimulation.css';

// Simplified hash function for simulation purposes
function sha256(message) {
  // This is a simplified hash function for demonstration purposes only
  // In a real Lightning Network, this would be a proper SHA-256 hash
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    const char = message.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convert to hexadecimal string and add some randomness to make it look more realistic
  return Math.abs(hash).toString(16).padStart(8, '0') + 
         Math.random().toString(16).substring(2, 10) +
         Math.random().toString(16).substring(2, 10);
}

// Arrow icon component
const ArrowRight = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12h14"></path>
    <path d="m12 5 7 7-7 7"></path>
  </svg>
);

// Clock icon component
const Clock = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

// Lock icon component
const Lock = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);

// Unlock icon component
const Unlock = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
  </svg>
);

// CheckCircle icon component
const CheckCircle = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

// AlertCircle icon component
const AlertCircle = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" x2="12" y1="8" y2="12"></line>
    <line x1="12" x2="12.01" y1="16" y2="16"></line>
  </svg>
);

// Hash icon component
const Hash = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="4" x2="20" y1="9" y2="9"></line>
    <line x1="4" x2="20" y1="15" y2="15"></line>
    <line x1="10" x2="8" y1="3" y2="21"></line>
    <line x1="16" x2="14" y1="3" y2="21"></line>
  </svg>
);

const LightningHTLCSimulation = () => {
  // State for the simulation
  const [step, setStep] = useState(0);
  const [preimage, setPreimage] = useState("");
  const [hashValue, setHashValue] = useState("");
  const [aliceToBobHTLC, setAliceToBobHTLC] = useState(null);
  const [bobToCharlieHTLC, setBobToCharlieHTLC] = useState(null);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [error, setError] = useState(null);
  const [autoProgress, setAutoProgress] = useState(false);
  
  // Payment amount and fees
  const paymentAmount = 1000;
  const bobFee = 10;
  
  // Generate a random preimage on first render
  useEffect(() => {
    generateNewPreimage();
  }, []);
  
  // Generate a new random preimage and hash
  const generateNewPreimage = () => {
    const newPreimage = Math.random().toString(36).substring(2, 15);
    setPreimage(newPreimage);
    setHashValue(sha256(newPreimage));
  };

  // Reset the simulation
  const resetSimulation = () => {
    setStep(0);
    generateNewPreimage();
    setAliceToBobHTLC(null);
    setBobToCharlieHTLC(null);
    setPaymentComplete(false);
    setError(null);
  };

  // Progress to the next step (wrapped in useCallback to avoid linting warnings)
  const nextStep = useCallback(() => {
    if (step < 7) {
      setStep(prevStep => prevStep + 1);
      
      // Simulate the HTLC creation and resolution
      if (step === 1) {
        // Alice creates HTLC with Bob
        setAliceToBobHTLC({
          sender: "Alice",
          receiver: "Bob",
          amount: paymentAmount + bobFee,
          hashLock: hashValue,
          timeLock: 24, // hours
          status: "locked"
        });
      } 
      else if (step === 2) {
        // Bob creates HTLC with Charlie
        setBobToCharlieHTLC({
          sender: "Bob",
          receiver: "Charlie",
          amount: paymentAmount,
          hashLock: hashValue,
          timeLock: 12, // hours (less than Alice-Bob)
          status: "locked"
        });
      }
      else if (step === 3) {
        // Charlie reveals preimage to Bob
        setBobToCharlieHTLC(prevHTLC => ({
          ...prevHTLC,
          status: "revealed",
          preimageRevealed: preimage
        }));
      }
      else if (step === 4) {
        // Bob claims payment from Charlie
        setBobToCharlieHTLC(prevHTLC => ({
          ...prevHTLC,
          status: "completed"
        }));
      }
      else if (step === 5) {
        // Bob reveals preimage to Alice
        setAliceToBobHTLC(prevHTLC => ({
          ...prevHTLC,
          status: "revealed",
          preimageRevealed: preimage
        }));
      }
      else if (step === 6) {
        // Alice completes payment to Bob
        setAliceToBobHTLC(prevHTLC => ({
          ...prevHTLC,
          status: "completed"
        }));
        setPaymentComplete(true);
      }
    }
  }, [step, hashValue, paymentAmount, bobFee, preimage]);

  // Auto progress through steps if enabled
  useEffect(() => {
    if (autoProgress && step < 7) {
      const timer = setTimeout(() => {
        nextStep();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step, autoProgress, nextStep]);

  // Simulate timelock expiration (error scenario)
  const simulateTimelockExpiration = () => {
    setError("Timelock expired before preimage was revealed. Payment failed and funds returned to sender.");
    
    // Reset the HTLCs
    if (bobToCharlieHTLC) {
      setBobToCharlieHTLC(prevHTLC => ({
        ...prevHTLC,
        status: "refunded"
      }));
    }
    
    if (aliceToBobHTLC) {
      setAliceToBobHTLC(prevHTLC => ({
        ...prevHTLC,
        status: "refunded"
      }));
    }
  };

  // Render an HTLC
  const renderHTLC = (htlc) => {
    if (!htlc) return null;
    
    return (
      <div className="htlc-card">
        <h3 className="htlc-title">{htlc.sender} → {htlc.receiver} HTLC</h3>
        <div className="mt-2">
          <p><span className="font-semibold">Amount:</span> {htlc.amount} sats</p>
          <p className="flex">
            <Hash className="mr-1" />
            <span className="font-semibold">Hash Lock:</span> 
            <span className="ml-1 mono truncate">{htlc.hashLock.substring(0, 16)}...</span>
          </p>
          <p className="flex">
            <Clock className="mr-1" />
            <span className="font-semibold">Time Lock:</span> {htlc.timeLock} hours
          </p>
          <p className="status-label mt-2">
            <span className="font-semibold mr-1">Status:</span> 
            {htlc.status === "locked" && <Lock className="mr-1 locked" />}
            {htlc.status === "revealed" && <Unlock className="mr-1 revealed" />}
            {htlc.status === "completed" && <CheckCircle className="mr-1 completed" />}
            {htlc.status === "refunded" && <AlertCircle className="mr-1 refunded" />}
            <span className={htlc.status}>
              {htlc.status.charAt(0).toUpperCase() + htlc.status.slice(1)}
            </span>
          </p>
          {htlc.preimageRevealed && (
            <p className="mt-2 flex">
              <span className="font-semibold">Preimage Revealed:</span> 
              <span className="ml-1 mono">{htlc.preimageRevealed}</span>
            </p>
          )}
        </div>
      </div>
    );
  };

  // Render network visualization
  const renderNetworkVisualization = () => {
    return (
      <div className="network-visualization">
        <div className={`node ${step >= 1 ? 'node-active' : 'node-inactive'}`}>
          Alice
        </div>
        <div className="connection">
          {aliceToBobHTLC && (
            <div className={`amount-label ${aliceToBobHTLC.status === "completed" ? 'completed' : ''}`}>
              {aliceToBobHTLC.amount} sats
            </div>
          )}
          <ArrowRight className={`arrow ${step >= 2 ? 'arrow-active' : 'arrow-inactive'}`} />
        </div>
        <div className={`node ${step >= 2 ? 'node-active' : 'node-inactive'}`}>
          Bob
        </div>
        <div className="connection">
          {bobToCharlieHTLC && (
            <div className={`amount-label ${bobToCharlieHTLC.status === "completed" ? 'completed' : ''}`}>
              {bobToCharlieHTLC.amount} sats
            </div>
          )}
          <ArrowRight className={`arrow ${step >= 3 ? 'arrow-active' : 'arrow-inactive'}`} />
        </div>
        <div className={`node ${step >= 3 ? 'node-active' : 'node-inactive'}`}>
          Charlie
        </div>
      </div>
    );
  };

  // Descriptions for each step of the process
  const stepDescriptions = [
    "Charlie generates a random preimage and computes its hash. Charlie shares the hash with Alice.",
    "Alice creates an HTLC with Bob, locking 1010 sats (1000 + 10 fee) with the hash and a 24-hour timelock.",
    "Bob creates an HTLC with Charlie, locking 1000 sats with the same hash but with a shorter 12-hour timelock.",
    "Charlie reveals the preimage to Bob to claim the payment.",
    "Bob verifies the preimage against the hash and releases the funds to Charlie.",
    "Bob reveals the same preimage to Alice to claim his payment.",
    "Alice verifies the preimage and releases the funds to Bob, completing the payment.",
    "Payment completed successfully through the Lightning Network!"
  ];

  return (
    <div className="container">
      <h1 className="heading">Lightning Network HTLC Simulation</h1>
      
      {/* Network Visualization */}
      {renderNetworkVisualization()}
      
      {/* Preimage and Hash Information */}
      <div className="info-card">
        <h2 className="font-bold">Payment Information</h2>
        <p className="mt-1"><span className="font-semibold">Amount:</span> {paymentAmount} sats (+ {bobFee} sats fee to Bob)</p>
        <p className="mt-1"><span className="font-semibold">Preimage (R):</span> <span className="mono">{preimage}</span></p>
        <p className="mt-1"><span className="font-semibold">Hash (H):</span> <span className="mono truncate">{hashValue.substring(0, 20)}...</span></p>
      </div>
      
      {/* HTLCs */}
      <div className="grid-container">
        <div>
          {renderHTLC(aliceToBobHTLC)}
        </div>
        <div>
          {renderHTLC(bobToCharlieHTLC)}
        </div>
      </div>
      
      {/* Current Step Description */}
      <div className="step-description">
        <h3 className="font-bold">Step {step + 1}: {stepDescriptions[step]}</h3>
        {error && (
          <div className="error-message">
            <AlertCircle className="mr-1" />
            {error}
          </div>
        )}
        {paymentComplete && (
          <div className="success-message">
            <CheckCircle className="mr-1" />
            Payment successfully completed through the Lightning Network!
          </div>
        )}
      </div>
      
      {/* Controls */}
      <div className="controls">
        <button
          onClick={nextStep}
          disabled={step >= 7 || !!error}
          className={`button ${step >= 7 || !!error ? '' : 'button-primary'}`}
        >
          Next Step
        </button>
        
        <button
          onClick={resetSimulation}
          className="button button-secondary"
        >
          Reset Simulation
        </button>
        
        <button
          onClick={() => setAutoProgress(!autoProgress)}
          className={`button ${autoProgress ? 'button-warning' : 'button-primary'}`}
        >
          {autoProgress ? 'Pause Auto-Progress' : 'Auto-Progress'}
        </button>
        
        <button
          onClick={simulateTimelockExpiration}
          disabled={step < 2 || step > 6 || !!error || paymentComplete}
          className={`button ${step < 2 || step > 6 || !!error || paymentComplete ? '' : 'button-danger'}`}
        >
          Simulate Timelock Expiration
        </button>
      </div>
      
      {/* Technical Explanation */}
      <div className="explanation">
        <h2 className="font-bold mb-2">How Hashed Timelock Contracts (HTLCs) Work</h2>
        <p className="mb-2">HTLCs enable secure multi-hop payments on the Lightning Network through two key mechanisms:</p>
        <ol className="list-decimal space-y-2">
          <li><strong>Hash Lock:</strong> Payment can only be claimed by revealing a preimage that hashes to a specific value</li>
          <li><strong>Time Lock:</strong> Sender can reclaim funds after a specified time if the payment isn't completed</li>
        </ol>
        <p className="mt-2">In a multi-hop payment:</p>
        <ul className="list-disc space-y-1">
          <li>Each node in the path creates an HTLC with the next node</li>
          <li>Timelocks decrease along the path (e.g., 24 hours → 12 hours) to protect intermediaries</li>
          <li>Payment is atomic: either all hops complete or none do</li>
          <li>Preimage revelation flows backward through the path, unlocking each payment</li>
        </ul>
      </div>
    </div>
  );
};

export default LightningHTLCSimulation;
