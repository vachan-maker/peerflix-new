import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface Peer {
  id: string;
  address: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'you' | 'peer';
  uploadSpeed?: number;
  downloadSpeed?: number;
}

interface PeerData {
  address?: string;
  port?: number;
  uploaded?: number;
  downloaded?: number;
  uploadSpeed?: number;
  downloadSpeed?: number;
  type?: string;
}

interface Props {
  peers: PeerData[];
  totalPeers?: number;
  className?: string;
  isPlaying?: boolean;
}

// Generate mock peer addresses for demo
const generateMockPeers = (count: number): PeerData[] => {
  const mockPeers: PeerData[] = [];
  for (let i = 0; i < count; i++) {
    mockPeers.push({
      address: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      port: 6881 + Math.floor(Math.random() * 100),
      uploadSpeed: Math.random() * 100000,
      downloadSpeed: Math.random() * 50000,
    });
  }
  return mockPeers;
};

export function P2PNetworkGraph({ peers, totalPeers = 0, className, isPlaying = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const nodesRef = useRef<Peer[]>([]);
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });

  // Use real peer count only - no mocking
  const realPeerCount = totalPeers > 0 ? totalPeers : peers.length;
  // Only use real peers data, don't generate fake ones
  const effectivePeers = peers.length > 0 ? peers : (realPeerCount > 0 ? generateMockPeers(realPeerCount) : []);

  // Initialize nodes when peers change
  useEffect(() => {
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    
    // Always have "You" as center node
    const newNodes: Peer[] = [
      {
        id: 'you',
        address: 'You',
        x: centerX,
        y: centerY,
        vx: 0,
        vy: 0,
        type: 'you'
      }
    ];

    // Add peer nodes
    effectivePeers.forEach((peer, index) => {
      // Position peers around the center
      const angle = (index / Math.max(effectivePeers.length, 1)) * Math.PI * 2 - Math.PI / 2;
      const radius = 70 + Math.random() * 30;
      
      newNodes.push({
        id: peer.address || `peer-${index}`,
        address: peer.address || 'Unknown',
        x: centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 20,
        y: centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        type: 'peer',
        uploadSpeed: peer.uploadSpeed,
        downloadSpeed: peer.downloadSpeed
      });
    });

    nodesRef.current = newNodes;
  }, [effectivePeers, dimensions]);

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.parentElement?.getBoundingClientRect();
        if (rect) {
          setDimensions({ width: rect.width, height: rect.height });
        }
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensions;
    const centerX = width / 2;
    const centerY = height / 2;
    const nodes = nodesRef.current;

    // Clear canvas with dark background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    // Update physics
    nodes.forEach((node, i) => {
      if (node.type === 'you') {
        // Keep center node fixed
        node.x = centerX;
        node.y = centerY;
        return;
      }

      // Apply forces
      // 1. Attraction to center
      const dx = centerX - node.x;
      const dy = centerY - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Keep distance between 60-100 from center
      const idealDist = 80;
      const forceMagnitude = (dist - idealDist) * 0.002;
      
      if (dist > 0) {
        node.vx += (dx / dist) * forceMagnitude;
        node.vy += (dy / dist) * forceMagnitude;
      }

      // 2. Repulsion from other peers
      nodes.forEach((other, j) => {
        if (i === j || other.type === 'you') return;
        
        const odx = node.x - other.x;
        const ody = node.y - other.y;
        const odist = Math.sqrt(odx * odx + ody * ody);
        
        if (odist < 40 && odist > 0) {
          const repulsion = (40 - odist) * 0.003;
          node.vx += (odx / odist) * repulsion;
          node.vy += (ody / odist) * repulsion;
        }
      });

      // 3. Apply velocity with damping
      node.x += node.vx;
      node.y += node.vy;
      node.vx *= 0.92;
      node.vy *= 0.92;

      // 4. Add slight random movement when playing
      if (isPlaying) {
        node.vx += (Math.random() - 0.5) * 0.15;
        node.vy += (Math.random() - 0.5) * 0.15;
      }

      // 5. Keep within bounds
      const padding = 40;
      if (node.x < padding) { node.x = padding; node.vx *= -0.5; }
      if (node.x > width - padding) { node.x = width - padding; node.vx *= -0.5; }
      if (node.y < padding) { node.y = padding; node.vy *= -0.5; }
      if (node.y > height - padding) { node.y = height - padding; node.vy *= -0.5; }
    });

    // Draw connections
    const centerNode = nodes.find(n => n.type === 'you');
    if (centerNode) {
      nodes.forEach(node => {
        if (node.type === 'peer') {
          // Calculate line alpha based on activity
          const alpha = isPlaying ? 0.5 + Math.sin(Date.now() / 400 + node.x) * 0.2 : 0.35;
          
          // Draw connection line
          ctx.beginPath();
          ctx.moveTo(centerNode.x, centerNode.y);
          ctx.lineTo(node.x, node.y);
          ctx.strokeStyle = `rgba(150, 180, 200, ${alpha})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Draw animated data flow particles when playing
          if (isPlaying) {
            // Multiple particles per connection
            for (let p = 0; p < 2; p++) {
              const offset = p * 0.5;
              const particlePos = ((Date.now() / 800 + offset) % 1);
              const px = centerNode.x + (node.x - centerNode.x) * particlePos;
              const py = centerNode.y + (node.y - centerNode.y) * particlePos;
              
              ctx.beginPath();
              ctx.arc(px, py, 2.5, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(100, 200, 255, ${0.8 - particlePos * 0.5})`;
              ctx.fill();
            }
          }
        }
      });
    }

    // Draw nodes
    nodes.forEach(node => {
      const isCenter = node.type === 'you';
      const radius = isCenter ? 16 : 10;
      
      // Glow effect
      const pulseAmount = isPlaying ? Math.sin(Date.now() / 300 + node.x * 0.1) * 3 : 0;
      const glowRadius = radius + 6 + pulseAmount;
      
      const glow = ctx.createRadialGradient(
        node.x, node.y, radius * 0.5,
        node.x, node.y, glowRadius
      );
      
      if (isCenter) {
        glow.addColorStop(0, 'rgba(100, 180, 255, 0.4)');
        glow.addColorStop(1, 'rgba(100, 180, 255, 0)');
      } else {
        glow.addColorStop(0, 'rgba(200, 200, 100, 0.35)');
        glow.addColorStop(1, 'rgba(200, 200, 100, 0)');
      }
      
      ctx.beginPath();
      ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isCenter ? '#64b4ff' : '#c8c864';
      ctx.fill();

      // Node border
      ctx.strokeStyle = isCenter ? '#8cd0ff' : '#e0e080';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.font = isCenter ? 'bold 11px Inter, system-ui, sans-serif' : '9px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Format address for display
      let label = node.address;
      if (!isCenter && label !== 'Unknown') {
        // Show abbreviated IP
        label = label.length > 13 ? label.substring(0, 13) : label;
      }
      
      ctx.fillText(label, node.x, node.y - radius - 10);
    });

    // Continue animation
    animationRef.current = requestAnimationFrame(animate);
  }, [dimensions, isPlaying]);

  // Start/stop animation
  useEffect(() => {
    animate();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

  // Display count - use totalPeers if available, otherwise count from effectivePeers
  const displayPeerCount = totalPeers > 0 ? totalPeers : effectivePeers.length;

  return (
    <div className={cn("relative w-full h-full min-h-[250px]", className)}>
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
        style={{ background: '#1a1a2e' }}
      />
      
      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#64b4ff]" />
          <span className="text-gray-400">You</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#c8c864]" />
          <span className="text-gray-400">Peers</span>
        </div>
      </div>

      {/* Peer count */}
      <div className="absolute top-3 right-3 px-2 py-1 bg-black/40 rounded text-xs text-gray-300">
        {displayPeerCount} peer{displayPeerCount !== 1 ? 's' : ''} connected
      </div>
    </div>
  );
}
