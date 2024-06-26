import { ethers } from 'ethers';
import { FlashbotsBundleProvider } from '@flashbots/ethers-provider-bundle';
import 'dotenv/config';

const addresses = {
  'exitQueue': '0x8d6fd650500f82c7d978a440348e5a9b886943bf',
};

const CHAIN_ID = 1;
const provider = new ethers.providers.JsonRpcProvider(process.env.RPCE);

const compromised_wallet = new ethers.Wallet(process.env.COMPROMISED_WALLET, provider)
const new_wallet = new ethers.Wallet(process.env.NEW_WALLET, provider)

console.log(`compomised wallet : ${compromised_wallet.address}`)
console.log(`new wallet : ${new_wallet.address}`)

recover();

async function recover() {
  const flashbotsProvider = await FlashbotsBundleProvider.create(provider, ethers.Wallet.createRandom())
  provider.on('block', async (blockNumber) => {
    console.log(blockNumber)

      const bundle = [
        // transaction to fund hacked wallet (from new wallet)
        {
          transaction: {
            chainId: CHAIN_ID,
            to:compromised_wallet.address,
            value: ethers.utils.parseEther('0.02'),
            type: 2,
            gasLimit: 21000,
            maxFeePerGas: ethers.utils.parseUnits('35', 'gwei'),
            maxPriorityFeePerGas: ethers.utils.parseUnits('30', 'gwei'),
          },
          signer: new_wallet 
        },

        // transaction to claim ETH
        {
          transaction: {
            chainId: CHAIN_ID,
            to: addresses.exitQueue,
            data: '0xadcf1163000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000ffff00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000196000000000000000001b9ada6122674540000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000b8',
            type: 2,
            gasLimit: 130000,
            maxFeePerGas: ethers.utils.parseUnits('35', 'gwei'),
            maxPriorityFeePerGas: ethers.utils.parseUnits('30', 'gwei'),
          },
          signer: compromised_wallet
        },

        // transfer all unused ETH out of compromised wallet
        {
          transaction: {
            chainId: CHAIN_ID,
            to: new_wallet.address,
            value: ethers.utils.parseEther('2.02'),
            type: 2,
            gasLimit: 21000,
            maxFeePerGas: ethers.utils.parseUnits('35', 'gwei'),
            maxPriorityFeePerGas: ethers.utils.parseUnits('30', 'gwei'),
          },
          signer: compromised_wallet
        },
      ]

      //console.log("bundle", bundle)
      //const signedTransactions = await flashbotsProvider.signBundle(bundle)
      //const simulation = await flashbotsProvider.simulate(signedTransactions, blockNumber + 1)
      //console.log(JSON.stringify(simulation, null, 2))

      const flashbotsTransactionResponse = await flashbotsProvider.sendBundle(
        bundle,
        blockNumber + 1,
      );
    
      // in event of error produce error msg
      if ('error' in flashbotsTransactionResponse) {
        console.warn(flashbotsTransactionResponse.error.message)
        return
      } else {
        console.log("resp", flashbotsTransactionResponse.bundle)
      }

      // simulate transaction
      console.log("sim", await flashbotsTransactionResponse.simulate())
  })
}
