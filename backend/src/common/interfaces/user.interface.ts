export interface IUser {
  id: number;
  walletAddress: string;
  nonce: string;
  kntBalance: number;
  twitterId?: string;
  discordId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAuthResponse {
  accessToken: string;
  user: Omit<IUser, 'nonce'>;
}

export interface IWalletAuth {
  address: string;
  signature: string;
  message: string;
}

export interface ISocialAuth {
  oauthToken: string;
  platform: 'twitter' | 'discord';
}
