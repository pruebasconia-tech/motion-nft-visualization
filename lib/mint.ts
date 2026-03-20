import { ethers } from 'ethers'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || ''
const CONTRACT_ABI = [
  'function mint(address to, string memory metadata) public returns (uint256)',
]

declare global {
  interface Window {
    ethereum?: any
  }
}

export async function mintNFT(frameData: string): Promise<string> {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract address not configured')
  }

  // Request wallet connection
  const ethereum = (typeof window !== 'undefined' && window.ethereum) || null
  if (!ethereum) {
    throw new Error('MetaMask or compatible wallet not found')
  }

  const provider = new ethers.BrowserProvider(ethereum)
  const signer = await provider.getSigner()
  
  // Ensure user is on Sepolia
  const network = await provider.getNetwork()
  if (network.chainId !== 11155111n) { // Sepolia chain ID
    throw new Error('Please switch to Sepolia testnet')
  }

  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)
  const userAddress = await signer.getAddress()

  // Create metadata
  const metadata = JSON.stringify({
    name: `Motion NFT #${Date.now()}`,
    description: 'Cellular automata visualization of dance movement',
    frameData,
    timestamp: new Date().toISOString(),
  })

  console.log('Minting NFT...', metadata)
  
  try {
    const tx = await contract.mint(userAddress, metadata)
    const receipt = await tx.wait()
    return receipt.transactionHash
  } catch (error) {
    console.error('Mint failed:', error)
    throw error
  }
}
