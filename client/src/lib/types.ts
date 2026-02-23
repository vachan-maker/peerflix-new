export interface Channel {
  id: string;
  name: string;
  avatarUrl: string;
  subscribers: string;
  verified?: boolean;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  duration: string;
  channel: Channel;
  views: string;
  likes: string;
  uploadDate: string;
  categoryId: string;
}

export interface Comment {
  id: string;
  user: {
    name: string;
    avatarUrl: string;
  };
  text: string;
  likes: number;
  timestamp: string;
  replies?: Comment[];
}

export interface PlaylistItem {
  id: string;
  name: string;
  count: number;
}
