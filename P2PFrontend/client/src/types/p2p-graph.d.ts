declare module 'p2p-graph' {
  interface PeerOptions {
    id: string;
    me?: boolean;
    name?: string;
  }

  class P2PGraph {
    constructor(element: HTMLElement | string);
    
    /**
     * Add a peer to the graph
     */
    add(peer: PeerOptions): void;
    
    /**
     * Connect two peers
     */
    connect(id1: string, id2: string): void;
    
    /**
     * Disconnect two peers
     */
    disconnect(id1: string, id2: string): void;
    
    /**
     * Remove a peer from the graph
     */
    remove(id: string): void;
    
    /**
     * Mark a peer as seeding (changes color to green)
     */
    seed(id: string, isSeeding: boolean): void;
    
    /**
     * Get the list of peers
     */
    list(): PeerOptions[];
    
    /**
     * Check if peer exists
     */
    hasPeer(id: string): boolean;
    
    /**
     * Check if two peers are connected
     */
    areConnected(id1: string, id2: string): boolean;
    
    /**
     * Destroy the graph and clean up
     */
    destroy(): void;
  }

  export = P2PGraph;
}
