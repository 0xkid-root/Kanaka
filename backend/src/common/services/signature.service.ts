import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';

@Injectable()
export class SignatureService {
  /**
   * Verify an Ethereum signature
   * @param message The message that was signed
   * @param signature The signature to verify
   * @param address The address to verify against
   * @returns Whether the signature is valid
   */
  async verifyEthereumSignature(
    message: string,
    signature: string,
    address: string,
  ): Promise<boolean> {
    try {
      const recoveredAddress = ethers.utils.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
      return false;
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  async verifySignature(
    message: string,
    signature: string,
    address: string,
  ): Promise<boolean> {
    return this.verifyEthereumSignature(message, signature, address);
  }

  /**
   * Generate a random nonce
   * @returns A random nonce
   */
  generateNonce(): string {
    return ethers.utils.hexlify(ethers.utils.randomBytes(32));
  }

  /**
   * Generate an authentication message
   * @param nonce The nonce to include in the message
   * @returns The authentication message
   */
  generateAuthMessage(nonce: string): string {
    return `Sign this message to authenticate with Kanaka Protocol: nonce=${nonce}`;
  }
}
