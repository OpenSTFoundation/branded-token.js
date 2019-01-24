'use strict';

const AbiBinProvider = require('./../AbiBinProvider'),
  gatewayComposerContractName = 'GatewayComposer',
  brandedTokenContractName = 'BrandedToken';

/**
 * Performs BrandedToken requestStake through GatewayComposer.
 */
class Staker {
  /**
   * StakeHelper constructor object.
   *
   * @param originWeb3 Origin chain web3 address.
   * @param valueToken Value token contract address.
   * @param brandedToken Branded Token contract address.
   * @param gatewayComposer Gateway composer contract address.
   * @param txOptions - Tx options.
   */
  constructor(originWeb3, valueToken, brandedToken, gatewayComposer, txOptions) {
    const oThis = this;
    oThis.originWeb3 = originWeb3;
    oThis.valueToken = valueToken;
    oThis.gatewayComposer = gatewayComposer;
    oThis.brandedToken = brandedToken;
    oThis.txOptions = txOptions;
    oThis.abiBinProvider = new AbiBinProvider();
  }

  async stake(
    valueTokenAbi,
    owner,
    stakeVTAmountInWei,
    mintBTAmountInWei,
    gatewayAddress,
    gasPrice,
    gasLimit,
    beneficiary,
    stakerGatewayNonce
  ) {
    await oThis.approveForValueToken(valueTokenAbi, stakeVTAmountInWei);
    await oThis.requestStake(
      owner,
      stakeVTAmountInWei,
      mintBTAmountInWei,
      gatewayAddress,
      gasPrice,
      gasLimit,
      beneficiary,
      stakerGatewayNonce,
      oThis.originWeb3,
      oThis.txOptions
    );
  }

  /**
   * Returns the amount of branded tokens equivalent to a given amount of value tokens.
   *
   * @param vtAmountInWei ValueToken amount to convert.
   * @param brandedTokenContractAddress BrandedToken contract address.
   * @param originWeb3 Origin chain web3 address.
   * @param txOptions Tx options.
   */
  convertToBTToken(vtAmountInWei, brandedTokenContractAddress, originWeb3, txOptions) {
    const oThis = this;

    const web3 = originWeb3 || oThis.originWeb3;
    const brandedToken = brandedTokenContractAddress || oThis.brandedToken;
    const abi = oThis.abiBinProvider.getABI(brandedTokenContractName);
    const contract = new web3.eth.Contract(abi, brandedToken, txOptions);

    console.log('Getting Branded tokens equivalent to Value tokens');
    return contract.methods.convertToBrandedTokens(vtAmountInWei).call();
  }

  /**
   * Approve gateway composer for ValueToken.
   *
   * @param valueTokenAbi Value token ABI.
   * @param stakeAmountInWei Amount to approve.
   * @param originWeb3 Origin chain web3.
   * @param txOptions Tx options.
   */
  approveForValueToken(valueTokenAbi, stakeAmountInWei) {
    const oThis = this;

    const web3 = originWeb3 || oThis.originWeb3;

    if (valueTokenAbi.length == 0) {
      throw Error('Value token abi is not provided');
    }
    const contract = new web3.eth.Contract(valueTokenAbi, oThis.valueToken, txOptions);
    return contract.methods.approve(oThis.gatewayComposer, stakeAmountInWei);
  }

  /**
   * Performs request stake on GatewayComposer.
   *
   * @param owner Owner of GatewayComposer contract.
   * @param stakeVTAmountInWei ValueToken amount which is staked.
   * @param mintBTAmountInWei Amount of BT amount which will be minted.
   * @param gatewayAddress Gateway contract address.
   * @param beneficiary The address in the auxiliary chain where the utility
   *                     tokens will be minted.
   * @param gasPrice Gas price that staker is ready to pay to get the stake
   *                  and mint process done.
   * @param gasLimit Gas limit that staker is ready to pay.
   * @param stakerGatewayNonce Nonce of the staker address stored in Gateway.
   * @param originWeb3 Origin chain web3 object.
   * @param txOptions Tx options.
   */
  requestStake(
    owner,
    stakeVTAmountInWei,
    mintBTAmountInWei,
    gatewayAddress,
    gasPrice,
    gasLimit,
    beneficiary,
    stakerGatewayNonce,
    originWeb3,
    txOptions
  ) {
    const oThis = this;
    const txObject = oThis._requestStakeRawTx(
      owner,
      stakeVTAmountInWei,
      mintBTAmountInWei,
      gatewayAddress,
      beneficiary,
      gasPrice,
      gasLimit,
      stakerGatewayNonce,
      originWeb3,
      txOptions
    );

    let txReceipt = null;

    return txObject
      .send(txOptions)
      .on('transactionHash of request stake', function(transactionHash) {
        console.log('\t - transaction hash:', transactionHash);
      })
      .on('receipt of request stake', function(receipt) {
        txReceipt = receipt;
        console.log('\t - Receipt:\n\x1b[2m', JSON.stringify(txReceipt), '\x1b[0m\n');
      })
      .on('error', function(error) {
        console.log('\t !! Error !!', error, '\n\t !! ERROR !!\n');
        return Promise.reject(error);
      });
  }

  /**
   * Performs request stake on GatewayComposer.
   *
   * @param owner Owner of GatewayComposer contract.
   * @param stakeVTAmountInWei ValueToken amount which is staked.
   * @param mintBTAmountInWei Amount of BT amount which will be minted.
   * @param gatewayAddress Gateway contract address.
   * @param beneficiary The address in the auxiliary chain where the utility
   *                     tokens will be minted.
   * @param gasPrice Gas price that staker is ready to pay to get the stake
   *                  and mint process done.
   * @param gasLimit Gas limit that staker is ready to pay.
   * @param nonce Nonce of the staker address.
   * @param originWeb3 Origin chain web3 object.
   * @param txOptions Tx options.
   * @private
   */
  _requestStakeRawTx(
    owner,
    stakeVTAmountInWei,
    mintBTAmountInWei,
    gatewayAddress,
    beneficiary,
    gasPrice,
    gasLimit,
    nonce,
    originWeb3,
    txOptions
  ) {
    const oThis = this;

    const web3 = originWeb3 || oThis.originWeb3;
    const abiBinProvider = oThis.abiBinProvider;
    const abi = abiBinProvider.getABI(gatewayComposerContractName);

    let defaultOptions = {
      from: owner,
      to: oThis.gatewayComposer,
      gas: '8000000'
    };

    if (txOptions) {
      Object.assign(defaultOptions, txOptions);
    }
    txOptions = defaultOptions;

    const contract = new web3.eth.Contract(abi, oThis.gatewayComposer, txOptions);

    console.log('Constructed txObject for GatewayComposer.requestStake.');
    const txObject = contract.methods.requestStake(
      stakeVTAmountInWei,
      mintBTAmountInWei,
      gatewayAddress,
      beneficiary,
      gasPrice,
      gasLimit,
      nonce
    );

    return txObject;
  }

  /**
   * Returns stakeRequestHash for staker address.
   *
   * @param staker Staker address.
   * @param originWeb3 Origin chain web3 object.
   * @param txOptions Tx options.
   * @returns {String} Request hash for the staker.
   * @private
   */
  _getStakeRequestHashForStakerRawTx(staker, originWeb3, txOptions) {
    const oThis = this;

    const web3 = originWeb3 || oThis.web3;

    const abi = oThis.abiBinProvider.getABI(brandedTokenContractName);

    const contract = new web3.eth.Contract(abi, oThis.brandedToken, txOptions);

    return contract.methods.stakeRequestHashes(staker).call();
  }

  /**
   * Returns StakeRequest for a given StakeRequestHash.
   *
   * @param stakeRequestHash Hash of the requests done by the staker.
   * @param originWeb3 Origin chain web3 object.
   * @param txOptions Tx options.
   * @returns {Object} Struct containing stake information.
   * @private
   */
  _getStakeRequestRawTx(stakeRequestHash, originWeb3, txOptions) {
    const oThis = this;

    const web3 = originWeb3 || oThis.web3;

    const abi = oThis.abiBinProvider.getABI(brandedTokenContractName);
    const contract = new web3.eth.Contract(abi, oThis.brandedToken, txOptions);

    return contract.methods.stakeRequests(stakeRequestHash).call();
  }

  /**
   * Returns StakeRequest for a given StakeRequestHash.
   *
   * @param stakeRequestHash Hash of the requests done by the staker.
   * @param originWeb3 Origin chain web3 object.
   * @param txOptions Tx options.
   * @returns {Object} Struct containing stake information.
   * @private
   */
  _getGCStakeRequestRawTx(stakeRequestHash, originWeb3, txOptions) {
    const oThis = this;

    const web3 = originWeb3 || oThis.web3;

    const abi = oThis.abiBinProvider.getABI(gatewayComposerContractName);
    const contract = new web3.eth.Contract(abi, oThis.gatewayComposer, txOptions);

    return contract.methods.stakeRequests(stakeRequestHash).call();
  }
}

module.exports = Staker;