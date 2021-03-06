'use strict';

const Web3 = require('web3');
const Contracts = require('../Contracts');
const AbiBinProvider = require('../AbiBinProvider');
const Utils = require('../../utils/Utils');
const logger = require('../../logger');

const ContractName = 'BrandedToken';

/**
 * Contract interact for Branded token.
 */
class BrandedToken {
  /**
   * Constructor for Branded token.
   *
   * @param {Object} web3 Web3 object.
   * @param {string} address BrandedToken contract address.
   */
  constructor(web3, address) {
    if (!(web3 instanceof Web3)) {
      const message = "Mandatory Parameter 'web3' is missing or invalid";
      logger.error(message);
      throw new TypeError(message);
    }
    if (!Web3.utils.isAddress(address)) {
      const message = `Mandatory Parameter 'address' is missing or invalid: ${address}`;
      logger.error(message);
      throw new TypeError(
        message,
      );
    }

    this.web3 = web3;
    this.address = address;

    this.contract = Contracts.getBrandedToken(this.web3, this.address);

    if (!this.contract) {
      const message = `Could not load branded token contract for: ${this.address}`;
      logger.error(message);
      throw new TypeError(
        message,
      );
    }

    this.convertToBrandedTokens = this.convertToBrandedTokens.bind(this);
    this.requestStake = this.requestStake.bind(this);
    this.requestStakeRawTx = this.requestStakeRawTx.bind(this);
    this.acceptStakeRequest = this.acceptStakeRequest.bind(this);
    this.acceptStakeRequestRawTx = this.acceptStakeRequestRawTx.bind(this);
    this.liftRestriction = this.liftRestriction.bind(this);
    this.liftRestrictionRawTx = this.liftRestrictionRawTx.bind(this);
    this.isUnrestricted = this.isUnrestricted.bind(this);
    this.rejectStakeRequest = this.rejectStakeRequest.bind(this);
    this.rejectStakeRequestRawTx = this.rejectStakeRequestRawTx.bind(this);
    this.redeem = this.redeem.bind(this);
    this.redeemRawTx = this.redeemRawTx.bind(this);
    this.convertToValueTokens = this.convertToValueTokens.bind(this);
  }

  /**
   * Deploys a Branded token contract.
   *
   * @dev Conversion parameters provide the conversion rate and its scale.
   *      For example, if 1 value token is equivalent to 3.5 branded
   *      tokens (1:3.5), _conversionRate == 35 and
   *      _conversionRateDecimals == 1.
   *
   *      Constructor requires:
   *          - valueToken address is not zero
   *          - conversionRate is not zero
   *          - conversionRateDecimals is not greater than 5
   *
   * @param {Web3} web3 Origin chain web3 object.
   * @param {string} valueToken The address of valueToken.
   * @param {string} symbol The value to which tokenSymbol, defined in
   *                        EIP20Token, is set.
   * @param {string} name The value to which tokenName, defined in EIP20Token,
   *                      is set.
   * @param {string} decimals The value to which tokenDecimals, defined in
   *                          EIP20Token, is set.
   * @param {number} conversionRate The value to which conversionRate is set.
   * @param {number} conversionRateDecimals The value to which
   *                                        conversionRateDecimals is set.
   * @param {string} organization Organization contract address.
   * @param {Object} txOptions Transaction options.
   *
   * @returns {Promise<BrandedToken>} Promise containing the Branded token
   *                                  instance that has been deployed.
   */
  static async deploy(
    web3,
    valueToken,
    symbol,
    name,
    decimals,
    conversionRate,
    conversionRateDecimals,
    organization,
    txOptions,
  ) {
    if (!txOptions) {
      const err = new TypeError('Invalid transaction options.');
      logger.error(`Invalid transaction options: ${txOptions}`);
      return Promise.reject(err);
    }
    if (!Web3.utils.isAddress(txOptions.from)) {
      const message = `Invalid from address: ${txOptions.from}.`;
      logger.error(message);
      const err = new TypeError(message);
      return Promise.reject(err);
    }

    const tx = BrandedToken.deployRawTx(
      web3,
      valueToken,
      symbol,
      name,
      decimals,
      conversionRate,
      conversionRateDecimals,
      organization,
    );

    return Utils.sendTransaction(tx, txOptions).then((txReceipt) => {
      const address = txReceipt.contractAddress;
      return new BrandedToken(web3, address);
    });
  }

  /**
   * Raw transaction for {@link BrandedToken#deploy}.
   *
   * @dev Conversion parameters provide the conversion rate and its scale.
   *      For example, if 1 value token is equivalent to 3.5 branded
   *      tokens (1:3.5), _conversionRate == 35 and
   *      _conversionRateDecimals == 1.
   *
   *      Constructor requires:
   *          - valueToken address is not zero
   *          - conversionRate is not zero
   *          - conversionRateDecimals is not greater than 5
   *
   * @param {Web3} web3 Origin chain web3 object.
   * @param {string} valueToken The address of valueToken.
   * @param {string} symbol The value to which tokenSymbol, defined in
   *                        EIP20Token, is set.
   * @param {string} name The value to which tokenName, defined in EIP20Token,
   *                      is set.
   * @param {string} decimals The value to which tokenDecimals, defined in
   *                          EIP20Token, is set.
   * @param {number} conversionRate The value to which conversionRate is set.
   * @param {number} conversionRateDecimals The value to which
   *                                        conversionRateDecimals is set.
   * @param {string} organization Organization contract address.
   *
   * @returns {Object} Raw transaction.
   */
  static deployRawTx(
    web3,
    valueToken,
    symbol,
    name,
    decimals,
    conversionRate,
    conversionRateDecimals,
    organization,
  ) {
    if (!(web3 instanceof Web3)) {
      const message = `Mandatory Parameter 'web3' is missing or invalid: ${web3}`;
      logger.error(message);
      throw new TypeError(
        message,
      );
    }
    if (!Web3.utils.isAddress(valueToken)) {
      const message = `Invalid valueToken address: ${valueToken}.`;
      logger.error(message);
      throw new TypeError(message);
    }
    if (!Web3.utils.isAddress(organization)) {
      const message = `Invalid organization address: ${organization}.`;
      logger.error(message);
      throw new TypeError(message);
    }
    if (!(conversionRate > 0)) {
      const message = `Invalid conversion rate: ${conversionRate}. It should be greater than zero`;
      logger.error(message);
      throw new TypeError(message);
    }
    if (!(conversionRateDecimals <= 5)) {
      const message = `Invalid conversion rate decimal: ${conversionRateDecimals}. It should be less than 5`;
      logger.error(message);
      throw new TypeError(message);
    }

    const abiBinProvider = new AbiBinProvider();
    const bin = abiBinProvider.getBIN(ContractName);

    const args = [
      valueToken,
      symbol,
      name,
      decimals,
      conversionRate,
      conversionRateDecimals,
      organization,
    ];

    const contract = Contracts.getBrandedToken(web3);

    return contract.deploy(
      {
        data: bin,
        arguments: args,
      },
    );
  }

  /**
   * This calculates branded tokens equivalent to given value tokens.
   *
   * @param {string} valueTokens Amount of value token.
   *
   * @return {Promise<string>} Promise that resolves to amount of branded token.
   */
  convertToBrandedTokens(valueTokens) {
    return this.contract.methods
      .convertToBrandedTokens(valueTokens)
      .call();
  }

  /**
   * Request stake for given amount. Approval for stake amount to branded
   * token is required before calling this method.
   *
   * @param {string} stakeAmount Stake amount.
   * @param {Object} txOptions Transaction options.
   *
   * @return {Promise<Object>} Promise that resolves to transaction receipt.
   */
  async requestStake(stakeAmount, txOptions) {
    if (!txOptions) {
      const message = `Invalid transaction options: ${txOptions}.`;
      logger.error(message);
      const err = new TypeError(message);
      return Promise.reject(err);
    }
    if (!Web3.utils.isAddress(txOptions.from)) {
      const message = `Invalid from address ${txOptions.from} in transaction options.`;
      logger.error(message);
      const err = new TypeError(
        message,
      );
      return Promise.reject(err);
    }

    const mintedAmount = await this.convertToBrandedTokens(stakeAmount);
    const tx = await this.requestStakeRawTx(stakeAmount, mintedAmount);
    return Utils.sendTransaction(tx, txOptions);
  }

  /**
   * Raw tx for request stake.
   *
   * @param {string} stakeAmount Stake amount.
   * @param {string} mintAmount Amount that will be minted after staking.
   *
   * @return Promise<Object> Raw transaction object.
   */
  requestStakeRawTx(stakeAmount, mintAmount) {
    return Promise.resolve(this.contract.methods.requestStake(stakeAmount, mintAmount));
  }

  /**
   * Accept open stake request identified by request hash.
   *
   * @param {string} stakeRequestHash Hash of stake request information
   *                                  calculated per EIP 712.
   * @param {string} r R of signature received from worker.
   * @param {string} s s of signature received from worker.
   * @param {string} v v of signature received from worker.
   * @param {Object} txOptions Transaction options
   *
   * @return {Promise<Object>} Promise that resolves to transaction receipt.
   */
  async acceptStakeRequest(stakeRequestHash, r, s, v, txOptions) {
    if (!txOptions) {
      const message = `Invalid transaction options: ${txOptions}.`;
      logger.error(message);
      const err = new TypeError(message);
      return Promise.reject(err);
    }
    if (!Web3.utils.isAddress(txOptions.from)) {
      const message = `Invalid from address ${txOptions.from} in transaction options.`;
      logger.error(message);
      const err = new TypeError(
        message,
      );
      return Promise.reject(err);
    }

    const tx = await this.acceptStakeRequestRawTx(stakeRequestHash, r, s, v);
    return Utils.sendTransaction(tx, txOptions);
  }

  /**
   * Raw transaction for accept stake request.
   *
   * @param {string} stakeRequestHash Hash of stake request information
   *                                  calculated per EIP 712.
   * @param {string} r R of signature received from worker.
   * @param {string} s s of signature received from worker.
   * @param {string} v v of signature received from worker.
   *
   * @return {Promise<Object>} Raw transaction object.
   */
  acceptStakeRequestRawTx(stakeRequestHash, r, s, v) {
    if (!stakeRequestHash) {
      const message = `Invalid stakeRequestHash: ${stakeRequestHash}.`;
      logger.error(message);
      const err = new TypeError(message);
      return Promise.reject(err);
    }
    if (!r) {
      const message = `Invalid r of signature: ${r}.`;
      logger.error(message);
      const err = new TypeError(message);
      return Promise.reject(err);
    }
    if (!s) {
      const message = `Invalid s of signature: ${s}.`;
      logger.error(message);
      const err = new TypeError(message);
      return Promise.reject(err);
    }
    if (!v) {
      const message = `Invalid v of signature: ${v}.`;
      logger.error(message);
      const err = new TypeError(message);
      return Promise.reject(err);
    }

    return Promise.resolve(
      this.contract.methods.acceptStakeRequest(
        stakeRequestHash,
        r,
        s,
        v,
      ),
    );
  }

  /**
   * Lift restriction for given list of addresses.
   *
   * @param {string} addresses Addresses for which to lift restrictions.
   * @param {Object} txOptions Transaction options.
   *
   * @return {Promise<Object>} Promise that resolves to transaction receipt.
   */
  async liftRestriction(addresses, txOptions) {
    if (!txOptions) {
      const message = `Invalid transaction options: ${txOptions}.`;
      logger.error(message);
      const err = new TypeError(message);
      return Promise.reject(err);
    }
    if (!Web3.utils.isAddress(txOptions.from)) {
      const message = `Invalid from address ${txOptions.from} in transaction options.`;
      logger.error(message);
      const err = new TypeError(
        message,
      );
      return Promise.reject(err);
    }

    const tx = await this.liftRestrictionRawTx(addresses);
    return Utils.sendTransaction(tx, txOptions);
  }

  /**
   * Raw tx for lift restriction.
   *
   * @param {Array} addresses Addresses for which to lift restrictions.
   *
   * @return {Promise<Object>} Raw transaction object.
   */
  liftRestrictionRawTx(addresses) {
    if (!addresses || addresses.length === 0) {
      const message = `At least one addresses must be defined : ${addresses}`;
      logger.error(message);
      const err = new TypeError(
        message,
      );
      return Promise.reject(err);
    }
    return Promise.resolve(this.contract.methods.liftRestriction(addresses));
  }

  /**
   * Checks if given address is unrestricted.
   *
   * @param {string} address Address that should be checked.
   *
   * @returns {Promise<boolean>} Promise that resolves to `true` if
   *                             unrestricted.
   */
  isUnrestricted(address) {
    return this.contract.methods
      .isUnrestricted(address)
      .call();
  }

  /**
   * This rejects a stake request, must be called by organization worker.
   *
   * @param {string} stakeRequestHash Hash of stake request information
   *                                  calculated per EIP 712.
   * @param {Object} txOptions Transaction options.
   *
   * @return {Promise<Object>} Promise that resolves to transaction receipt.
   */
  async rejectStakeRequest(stakeRequestHash, txOptions) {
    if (!txOptions) {
      const message = `Invalid transaction options: ${txOptions}.`;
      logger.error(message);
      const err = new TypeError(message);
      return Promise.reject(err);
    }
    if (!Web3.utils.isAddress(txOptions.from)) {
      const err = new TypeError(
        `Invalid from address ${txOptions.from} in transaction options.`,
      );
      return Promise.reject(err);
    }

    const tx = await this.rejectStakeRequestRawTx(stakeRequestHash);
    return Utils.sendTransaction(tx, txOptions);
  }

  /**
   * This returns raw tx for reject stake request.
   *
   * @param {string} stakeRequestHash Hash of stake request information
   *                                  calculated per EIP 712.
   *
   * @return Promise<Object> Raw transaction object.
   */
  rejectStakeRequestRawTx(stakeRequestHash) {
    if (!stakeRequestHash) {
      const message = `Invalid stakeRequestHash: ${stakeRequestHash}.`;
      logger.error(message);
      const err = new TypeError(message);
      return Promise.reject(err);
    }

    return Promise.resolve(
      this.contract.methods.rejectStakeRequest(stakeRequestHash),
    );
  }

  /**
   * Redeems an amount of BrandedToken and returns the equivalent amount staked value tokens
   * to the same address.
   *
   * @param {string} amount Amount of brandedTokens to redeem.
   *                        Amount unit is wei i.e.1 BT = 10^18 wei.
   * @param {Object} txOptions Transaction options.
   *
   * @return {Promise<Object>} Promise that resolves to transaction receipt.
   */
  async redeem(amount, txOptions) {
    if (!txOptions) {
      const err = new TypeError(`Invalid transaction options: ${txOptions}.`);
      return Promise.reject(err);
    }
    if (!Web3.utils.isAddress(txOptions.from)) {
      const err = new TypeError(
        `Invalid from address ${txOptions.from} in transaction options.`,
      );
      return Promise.reject(err);
    }

    const txObject = await this.redeemRawTx(amount);
    return Utils.sendTransaction(txObject, txOptions);
  }

  /**
   * This method returns redeem raw tx object.
   *
   * @param {string} amount Amount of brandedTokens to redeem.
   *                        Amount unit is wei i.e.1 BT = 10^18 wei.
   *
   * @return Promise<Object> Raw transaction object.
   */
  redeemRawTx(amount) {
    if (!amount) {
      const err = new TypeError(`Invalid redeemAmount: ${amount}.`);
      return Promise.reject(err);
    }

    return Promise.resolve(
      this.contract.methods.redeem(amount),
    );
  }

  /**
   * This calculates values tokens equivalent to given branded tokens.
   *
   * @param {string} brandedTokens Amount of branded tokens.
   *
   * @return {Promise<string>} Promise that resolves to amount of value tokens.
   */
  convertToValueTokens(brandedTokens) {
    return this.contract.methods
      .convertToValueTokens(brandedTokens)
      .call();
  }
}

module.exports = BrandedToken;
