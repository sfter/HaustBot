import log from "./logger.js"
import { ethers } from 'ethers';

const NFT_CONTRACT_ADDRESS = '0x6B3f185C4c9246c52acE736CA23170801D636c8E';
const NFT_CONTRACT_ADDRESS2 = '0x28e50a3632961da179b2afca4675714ea22e7bb7';
const NFT_CONTRACT_ADDRESS3 = '0xdaF34a049EfAa3cc9ad4635D8A710Fae819aca5c';


const NFT_ABI = [
    {
        "inputs": [],
        "name": "safeMint",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

const MAX_RETRIES = 3;
const TIMEOUT_MS = 60000;

async function mintNFT1(privateKey, rpcUrl) {
    await mintNFT(NFT_CONTRACT_ADDRESS, privateKey, rpcUrl)
}

async function mintNFT2(privateKey, rpcUrl) {
    await mintNFT(NFT_CONTRACT_ADDRESS2, privateKey, rpcUrl)
}

async function mintNFT3(privateKey, rpcUrl) {
    await mintNFT(NFT_CONTRACT_ADDRESS3, privateKey, rpcUrl)
}

async function mintNFT(nft_contract_address, privateKey, rpcUrl) {
    try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const wallet = new ethers.Wallet(privateKey, provider);
        const contract = new ethers.Contract(nft_contract_address, NFT_ABI, wallet);

        log.info(`Starting NFT minting process...  ${nft_contract_address}`);

        const feeData = await provider.getFeeData();
        if (!feeData.gasPrice) throw new Error("Failed to fetch gas price");

        let gasPrice = feeData.gasPrice * BigInt(125) / BigInt(100);
        let attempts = 0;

        while (attempts < MAX_RETRIES) {
            try {
                log.info(`Processing Minting NFT On Attempt ( ${attempts + 1}/${MAX_RETRIES} )...`);

                const tx = await contract.safeMint({
                    gasPrice: gasPrice
                });

                log.info(`Transaction sent: ${tx.hash}`);

                const receipt = await Promise.race([
                    tx.wait(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error("Transaction Timeout")), TIMEOUT_MS))
                ]);

                if (receipt && receipt.status === 1) {
                    log.info(`✅ NFT Minted Successfully! Tx: ${tx.hash}`);
                    return tx.hash;
                } else {
                    log.warn(`❌ Transaction Failed! Retrying...`);
                }
            } catch (err) {
                log.error(`❌ Error when minting NFT:`, err.message);
            }

            attempts++;
            gasPrice = gasPrice * BigInt(110) / BigInt(100);
            await new Promise(res => setTimeout(res, 5000));
        }

        log.error(`❌ All retries failed - NFT minting unsuccessful.`);
    } catch (error) {
        log.error(`❌ Unexpected error in mintNFT:`, error.message);
    }
}

export { mintNFT1, mintNFT2, mintNFT3 };
