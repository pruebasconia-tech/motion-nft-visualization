# Motion NFT - Cellular Automata Visualization

A Next.js + Three.js application that visualizes dance movement data as a cellular automaton and mints it as NFTs on Sepolia testnet.

## Features

- **3D Visualization**: 33 skeletal joints rendered as spheres with Three.js
- **Cellular Automaton**: Motion energy drives cellular rules with Conway-inspired logic
- **Timeline Controls**: Play/pause/reset controls with frame slider
- **NFT Minting**: Mint current frame visualization as ERC-721 NFT on Sepolia
- **Responsive Design**: Dark theme with cyan accents

## Architecture

### Core Files

1. **`lib/processor.ts`** - Parses pose data (712 frames), extracts joint visibility as energy
2. **`lib/automata.ts`** - Cellular automaton with 33 cells, 70% motion influence + 30% Conway rules
3. **`components/Visualization.tsx`** - Three.js scene with spheres, skeleton lines, energy-based coloring
4. **`contracts/MotionNFT.sol`** - ERC-721 contract for minting

### Data Pipeline

```
pose_data.json (712 frames) 
  → processor.ts (extract joint energy) 
  → automata.ts (cellular rules) 
  → Visualization.tsx (Three.js render) 
  → MotionNFT.sol (mint to blockchain)
```

## Quick Start

### Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build
```

Visit `http://localhost:3000`

### Deploy to Vercel

```bash
git add .
git commit -m "Initial deployment"
git push origin master
```

Connect your GitHub repo to Vercel for auto-deploys.

## NFT Minting

### 1. Setup Sepolia RPC & Private Key

Create `.env.local`:

```
NEXT_PUBLIC_CONTRACT_ADDRESS=0x... (after deployment)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=your_private_key_here
```

Get free RPC URL from [Infura](https://infura.io) or [Alchemy](https://alchemy.com)

### 2. Deploy Contract to Sepolia

```bash
# Install Hardhat (if not already)
pnpm add -D hardhat @nomiclabs/hardhat-ethers

# Deploy
npx hardhat run scripts/deploy.js --network sepolia
```

This will:
- Deploy `MotionNFT.sol` to Sepolia
- Save deployment info to `deployment.json`
- Print Etherscan link for verification

### 3. Update Contract Address

Copy the contract address from `deployment.json` to `.env.local`:

```
NEXT_PUBLIC_CONTRACT_ADDRESS=0x<address>
```

### 4. Mint NFTs

1. Open app at http://localhost:3000 or https://your-vercel-url
2. Select a frame with the timeline slider
3. Click "🎨 Mint NFT"
4. Connect MetaMask and switch to Sepolia testnet
5. Confirm transaction

View your NFT on [Sepolia Etherscan](https://sepolia.etherscan.io)

## Data Files

- `public/data/pose_data_20260306_145233.json` - 712 frames of pose keypoints (33 joints each)
- `public/data/laban_analysis_20260306_145233.json` - Laban effort/shape analysis per frame

Format:
```json
{
  "metadata": { "timestamp", "fps", "frame_size", "total_frames" },
  "frames": [
    {
      "timestamp": "2026-03-06T...",
      "pose": [
        { "x": 0.42, "y": 0.20, "z": 0.06, "visibility": 0.70 },
        ...
      ]
    }
  ]
}
```

## Cellular Automaton Rules

Each of 33 cells (joints) has state 0-1:

```
new_state = (0.7 * motion_energy) + (0.3 * conway_rules)
```

- **Motion Energy**: Joint visibility from pose data (0-1)
- **Conway Rules**: 
  - Birth if neighbors ∈ [2,4]
  - Survival if alive and neighbors ∈ [2,3]
  - Death otherwise

Colors: `rgb(r, g, b) = (energy, 1-energy, 1)` → cyan to magenta gradient

## Configuration

### Next.js

- TypeScript enabled
- Turbopack for fast builds (~12s)
- Tailwind CSS for styling

### Tailwind

See `tailwind.config.ts` - dark theme with cyan accent color

### Three.js

- Canvas auto-resizes to window
- 33 sphere meshes (1 per joint)
- Skeleton lines connecting joints
- Real-time frame updates

## Troubleshooting

**"Loading..." stuck**
- Check browser console for errors
- Verify `/public/data/pose_data_20260306_145233.json` exists
- Check network tab for failed data requests

**Mint fails**
- Ensure MetaMask is installed
- Switch to Sepolia testnet
- Check you have testnet ETH (get from [faucet](https://www.alchemy.com/faucets/ethereum-sepolia))
- Verify `NEXT_PUBLIC_CONTRACT_ADDRESS` is set

**Contract deploy fails**
- Check Sepolia RPC URL is correct
- Ensure private key has Sepolia ETH
- Verify `@openzeppelin/contracts` is installed

## Next Steps

- [ ] Load all 712 frames (currently showing first 100)
- [ ] Add IPFS metadata storage
- [ ] Integrate with OpenSea for NFT marketplace
- [ ] Add animation export (video download)
- [ ] Implement more Laban-based automaton rules

## License

MIT

## Support

For issues or questions:
- Check Vercel deployment logs: https://vercel.com/dashboard
- Review transaction on Etherscan: https://sepolia.etherscan.io
- Report bugs: GitHub Issues
