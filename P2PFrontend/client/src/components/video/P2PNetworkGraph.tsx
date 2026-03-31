import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { formatSpeed } from '@/lib/statsTracker';

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
  uploaded?: number;
  downloaded?: number;
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

/**
 * Deterministic hash of a string → stable float in [0, 1).
 * Same string always yields the same number on every device.
 */
function deterministicHash(str: string, seed = 0): number {
  let hash = seed;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  // Bring into [0, 1)
  return ((hash >>> 0) % 1000) / 1000;
}

export function P2PNetworkGraph({ peers, totalPeers = 0, className, isPlaying = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const nodesRef = useRef<Peer[]>([]);
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });

  // Only use real peers — no mock generation.
  // If peers array is empty but totalPeers > 0, build placeholder nodes with
  // deterministic addresses so every device shows the same placeholders.
  const effectivePeers: PeerData[] = peers.length > 0
    ? peers
    : Array.from({ length: Math.min(totalPeers, 12) }, (_, i) => ({
        address: `peer-placeholder-${i}`,
        uploadSpeed: 0,
        downloadSpeed: 0,
      }));

  // Initialize nodes deterministically when peer list changes.
  // Key rule: a peer's position is derived ONLY from its address string,
  // never from Math.random(), so every device computes the same layout.
  useEffect(() => {
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    const newNodes: Peer[] = [
      {
        id: 'you',
        address: 'You',
        x: centerX,
        y: centerY,
        vx: 0,
        vy: 0,
        type: 'you',
      },
    ];

    effectivePeers.forEach((peer, index) => {
      const key = peer.address || `peer-${index}`;

      // Deterministic angle: spread peers evenly, offset by a stable per-peer nudge
      const baseAngle = (index / Math.max(effectivePeers.length, 1)) * Math.PI * 2 - Math.PI / 2;
      const angleNudge = (deterministicHash(key, 1) - 0.5) * 0.3; // ±0.15 rad
      const angle = baseAngle + angleNudge;

      // Deterministic radius: 70–100
      const radius = 70 + deterministicHash(key, 2) * 30;

      newNodes.push({
        id: key,
        address: `Peer${index + 1}`,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        type: 'peer',
        uploadSpeed: peer.uploadSpeed || 0,
        downloadSpeed: peer.downloadSpeed || 0,
        uploaded: peer.uploaded || 0,
        downloaded: peer.downloaded || 0,
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

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    // Physics — NO random jitter so animation is smooth and reproducible
    nodes.forEach((node, i) => {
      if (node.type === 'you') {
        node.x = centerX;
        node.y = centerY;
        return;
      }

      // Attraction toward ideal orbit radius
      const dx = centerX - node.x;
      const dy = centerY - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const idealDist = 80;
      const forceMagnitude = (dist - idealDist) * 0.002;

      if (dist > 0) {
        node.vx += (dx / dist) * forceMagnitude;
        node.vy += (dy / dist) * forceMagnitude;
      }

      // Peer-peer repulsion
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

      // Apply & damp
      node.x += node.vx;
      node.y += node.vy;
      node.vx *= 0.92;
      node.vy *= 0.92;

      // Slow deterministic orbit when playing (uses time + stable per-peer seed, not Math.random)
      if (isPlaying) {
        const peerSeed = deterministicHash(node.id, 3);
        const t = Date.now() / 4000 + peerSeed * Math.PI * 2;
        node.vx += Math.cos(t) * 0.05;
        node.vy += Math.sin(t) * 0.05;
      }

      // Bounds
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
        if (node.type !== 'peer') return;

        const alpha = isPlaying ? 0.5 + Math.sin(Date.now() / 400 + node.x) * 0.2 : 0.35;

        ctx.beginPath();
        ctx.moveTo(centerNode.x, centerNode.y);
        ctx.lineTo(node.x, node.y);
        ctx.strokeStyle = `rgba(150, 180, 200, ${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Data-flow particles when playing
        if (isPlaying) {
          for (let p = 0; p < 2; p++) {
            const particlePos = ((Date.now() / 800 + p * 0.5) % 1);
            const px = centerNode.x + (node.x - centerNode.x) * particlePos;
            const py = centerNode.y + (node.y - centerNode.y) * particlePos;
            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(100, 200, 255, ${0.8 - particlePos * 0.5})`;
            ctx.fill();
          }
        }
      });
    }

    // Draw nodes
    nodes.forEach(node => {
      const isCenter = node.type === 'you';
      const radius = isCenter ? 16 : 10;

      const pulseAmount = isPlaying ? Math.sin(Date.now() / 300 + node.x * 0.1) * 3 : 0;
      const glowRadius = radius + 6 + pulseAmount;

      const glow = ctx.createRadialGradient(node.x, node.y, radius * 0.5, node.x, node.y, glowRadius);
      if (isCenter) {
        glow.addColorStop(0, 'rgba(100, 180, 255, 0.4)');
        glow.addColorStop(1, 'rgba(100, 180, 255, 0)');
      } else {
        const totalSpeed = (node.uploadSpeed || 0) + (node.downloadSpeed || 0);
        const alpha = totalSpeed > 0 ? 0.5 : 0.35;
        glow.addColorStop(0, `rgba(200, 200, 100, ${alpha})`);
        glow.addColorStop(1, 'rgba(200, 200, 100, 0)');
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isCenter ? '#64b4ff' : '#c8c864';
      ctx.fill();

      ctx.strokeStyle = isCenter ? '#8cd0ff' : '#e0e080';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = isCenter ? 'bold 11px Inter, system-ui, sans-serif' : '9px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.address, node.x, node.y - radius - 10);

      if (!isCenter) {
        const uploadSpeed = node.uploadSpeed || 0;
        const downloadSpeed = node.downloadSpeed || 0;

        if (uploadSpeed > 0) {
          ctx.font = 'bold 8px Inter, system-ui, sans-serif';
          ctx.fillStyle = '#34d399';
          ctx.textAlign = 'center';
          ctx.fillText(`↑ ${formatSpeed(uploadSpeed)}`, node.x, node.y + radius + 12);
        }

        if (downloadSpeed > 0) {
          ctx.font = 'bold 8px Inter, system-ui, sans-serif';
          ctx.fillStyle = '#60a5fa';
          ctx.textAlign = 'center';
          ctx.fillText(`↓ ${formatSpeed(downloadSpeed)}`, node.x, node.y + radius + (uploadSpeed > 0 ? 22 : 12));
        }

        if (uploadSpeed === 0 && downloadSpeed === 0) {
          ctx.font = '7px Inter, system-ui, sans-serif';
          ctx.fillStyle = '#6b7280';
          ctx.textAlign = 'center';
          ctx.fillText('idle', node.x, node.y + radius + 12);
        }
      }
    });

    animationRef.current = requestAnimationFrame(animate);
  }, [dimensions, isPlaying]);

  // Start/stop animation
  useEffect(() => {
    animate();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [animate]);

  const displayPeerCount = totalPeers > 0 ? totalPeers : effectivePeers.length;

  return (
    <div className={cn('relative w-full h-full min-h-[250px]', className)}>
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

      {/* Peer count + live indicator */}
      <div className="absolute top-3 right-3 flex items-center gap-2 px-2 py-1 bg-black/40 rounded text-xs text-gray-300">
        {isPlaying && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
        {displayPeerCount} peer{displayPeerCount !== 1 ? 's' : ''} connected
      </div>
    </div>
  );
}
