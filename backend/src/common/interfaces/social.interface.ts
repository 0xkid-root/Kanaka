export interface IForumPost {
  id: number;
  userId: number;
  title: string;
  content: string;
  ipfsHash: string;
  upvotes: number;
  downvotes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IForumComment {
  id: number;
  postId: number;
  userId: number;
  content: string;
  ipfsHash: string;
  upvotes: number;
  downvotes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISocialPost {
  platform: 'twitter' | 'discord';
  message: string;
  imageUrl?: string;
}

export interface IReward {
  userId: number;
  amount: number;
  reason: 'governance' | 'forum' | 'referral';
  transactionHash?: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
}
