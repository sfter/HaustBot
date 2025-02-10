import axios from 'axios';
import fs from 'fs/promises';
import log from "./utils/logger.js";
import iniBapakBudi from "./utils/banner.js";
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import {mintNFT1, mintNFT2} from './utils/mintNFT.js';
const RPC_URL = 'https://rpc-testnet.haust.app';

export async function readWallets() {
    try {
        await fs.access("wallets.json");

        const data = await fs.readFile("wallets.json", "utf-8");
        return JSON.parse(data);
    } catch (err) {
        if (err.code === 'ENOENT') {
            log.info("No wallets found in wallets.json");
            return [];
        }
        throw err;
    }
}

export async function readProxies() {
    try {
        await fs.access("proxy.txt");

        const data = await fs.readFile("proxy.txt", "utf-8");
        return data.split('\n').map(line => line.trim()).filter(Boolean);
    } catch (err) {
        if (err.code === 'ENOENT') {
            log.warn("No proxies found in proxy.txt. Requests will proceed without a proxy.");
            return [];
        }
        throw err;
    }
}

const claimFaucet = async (address, proxies) => {
    const maxRetries = 3;
    let attempt = 0;
    let currentProxy = getRandomProxy(proxies);

    while (attempt < maxRetries) {
        try {
            const axiosConfig = {
                method: 'post',
                url: 'https://faucet.haust.app/api/claim',
                data: { address },
                headers: {
                    'Content-Type': 'application/json',
                },
            };

            if (currentProxy) {
                axiosConfig.proxy = false;
                if (currentProxy.startsWith('socks5://')) {
                    axiosConfig.httpsAgent = new SocksProxyAgent(currentProxy);
                    //log.info(`Using SOCKS5 proxy: ${currentProxy} for wallet: ${address}`);
                } else if (currentProxy.startsWith('socks4://')) {
                    axiosConfig.httpsAgent = new SocksProxyAgent(currentProxy);
                    //log.info(`Using SOCKS4 proxy: ${currentProxy} for wallet: ${address}`);
                } else if (currentProxy.startsWith('http://') || currentProxy.startsWith('https://')) {
                    axiosConfig.httpsAgent = new HttpsProxyAgent(currentProxy);
                    //log.info(`Using HTTP/HTTPS proxy: ${currentProxy} for wallet: ${address}`);
                }
            } else {
                log.warn(`No proxy available for wallet: ${address}. Proceeding without a proxy.`);
            }

            const response = await axios(axiosConfig);
            log.info(`Claim successful for ${address}:`, response.data);
            return;
        } catch (error) {
            attempt++;
            log.error(`Failed to claim faucet for ${address} error ${error.message}`);
            if (attempt < maxRetries) {
                currentProxy = getRandomProxy(proxies);
                await new Promise((resolve) => setTimeout(resolve, 1000));
            } else {
                log.error(`Failed to claim faucet for ${address} after ${maxRetries} attempts.`);
            }
        }
    }
};

function getRandomProxy(proxies) {
    if (proxies.length === 0) {
        return null;
    }
    const randomIndex = Math.floor(Math.random() * proxies.length);
    return proxies[randomIndex];
}

const main = async () => {
    log.info(iniBapakBudi);
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const wallets = await readWallets();
    const proxies = await readProxies();

    if (wallets.length === 0) {
        log.warn("No wallets to process.");
        return;
    }

    for (let i=0; i < 3; i++) {

        for (const wallet of wallets) {
            await claimFaucet(wallet.address, proxies);
            await sleep(60 * 1000)
            await mintNFT1(wallet.privateKey, RPC_URL);
            await sleep(60 * 1000)
            await mintNFT2(wallet.privateKey, RPC_URL);
            await sleep(5 * 60 * 1000)
        }

    }

    // const tasks = wallets.map((wallet) => {
    //     if (proxies.length > 0) {
    //         log.info(`Starting claim process for wallet: ${wallet.address}`);
    //     } else {
    //         log.warn(`No proxies available for wallet: ${wallet.address}. Proceeding without a proxy.`);
    //     }

    //     return claimFaucet(wallet.address, proxies);
    // });

    // try {
    //     await Promise.all(tasks);
    //     log.info("All wallet claims processed.");
    // } catch (error) {
    //     log.error("Error processing wallet claims:", error.message);
    // }
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

main();
