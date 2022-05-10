const CHAIN_ID = '0x1';
const CHAIN_NAME = 'Mainnet';
const ETHERSCAN_BASE_URL = 'https://etherscan.io';

/**
 * MetaMask Onboarding
 */
class MetaMaskOnboardingHandler {
  constructor() {
    this.onboarding = new MetaMaskOnboarding();
    this.connectWalletButton = document.getElementById('connectWalletButton');
    this.mintButton = document.getElementById('mintButton');
    this.messageWrapper = document.getElementById('mintMessageWrapper');
    this.metaMaskWarning = document.getElementById('metaMaskWarning');
  }

  init() {
    setTimeout(() => {
      this.checkMetaMask();
      this.checkChainId();
      this.checkConnection();
      this.addEventHandlers();
    }, 2000);
  }

  connectWallet() {
    if (this.checkMetaMask()) {
      window.ethereum.request({ method: 'eth_requestAccounts' }).then(() => {
        this.setButtonAsConnected();
      });
    }
  }

  addEventHandlers() {
    this.connectWalletButton.addEventListener(
      'click',
      (e) => {
        e.preventDefault();

        if (this.connectWalletButton.getAttribute('data-state') === 'connect') {
          this.connectWallet();
        } else if (this.connectWalletButton.getAttribute('data-state') === 'install_metamask') {
          this.onboarding.startOnboarding();
        }
      },
      false
    );

    window.ethereum.on('accountsChanged', (accounts) => {
      this.messageWrapper.innerHTML = '';
      this.messageWrapper.style.display = 'none';

      if (accounts.length > 0) {
        this.setButtonAsConnected();
      } else {
        this.setButtonText('Connect Wallet');
        this.connectWalletButton.classList.add('button--ghost');
        this.mintButton.classList.add('disabled');
      }
    });

    window.ethereum.on('chainChanged', () => {
      window.location.reload();
    });
  }

  checkMetaMask() {
    if (!MetaMaskOnboarding.isMetaMaskInstalled()) {
      this.setButtonText('Install MetaMask');
      this.connectWalletButton.setAttribute('data-state', 'install_metamask');
      this.metaMaskWarning.style.display = 'block';

      return false;
    }
    return true;
  }

  checkConnection() {
    if (this.checkMetaMask()) {
      if (window.ethereum.chainId === CHAIN_ID && window.ethereum.selectedAddress) {
        this.setButtonAsConnected();
      }
    }
  }

  checkChainId() {
    if (this.checkMetaMask()) {
      console.log(window.ethereum.chainId);
      if (window.ethereum.chainId !== CHAIN_ID) {
        this.setButtonText(`Change MetaMask to ${CHAIN_NAME}`);
        this.connectWalletButton.disabled = true;
        return false;
      }
    }

    return true;
  }

  setButtonText(text) {
    this.connectWalletButton.innerText = text;
  }

  setButtonAsConnected() {
    this.setButtonText('Connected');
    this.connectWalletButton.classList.remove('button--ghost');
    this.mintButton.classList.remove('disabled');
  }
}

const metaMaskOnboardingHandler = new MetaMaskOnboardingHandler();
metaMaskOnboardingHandler.init();

/**
 * Mint
 */
class MintHandler {
  constructor() {
    this.web3 = new Web3(window.ethereum);
    this.CONTRACT_ADDRESS = '0xf345c83767ac38474561aef16039f17339b55917';
    this.CONTRACT_ABI = window.GIAW_ABI;
    this.CONTRACT = new this.web3.eth.Contract(this.CONTRACT_ABI, this.CONTRACT_ADDRESS);
    this.MERKLE_MAPPING = window.MERKLE_MAPPING;
    this.qtInput = document.getElementById('nftQt');
    this.mintButton = document.getElementById('mintButton');
    this.messageWrapper = document.getElementById('mintMessageWrapper');
    this.totalMinted = document.getElementById('totalMinted');
    this.totalMintedNum = document.getElementById('totalMintedNum');
    this.mintSection = document.getElementById('mintSection');
    this.timer = document.getElementById('timer');
  }

  init() {
    setTimeout(() => {
      this.isMintEnabled();
      this.getMintedTotal();
      this.addEventHandlers();
    }, 2000);
  }

  async isMintEnabled() {
    if (window.ethereum.chainId === CHAIN_ID) {
      const enabled = await this.CONTRACT.methods.saleStarted.call().call((error, result) => {
        if (error) {
          console.log(error);
        }
        return result;
      });

      if (enabled) {
        this.mintSection.style.display = 'block';
        this.totalMinted.style.display = 'block';
      }
    }
  }

  async getMintedTotal() {
    if (window.ethereum.chainId === CHAIN_ID) {
      const totalSupply = await this.CONTRACT.methods.totalSupply.call().call((error, result) => {
        if (error) {
          console.log(error);
        }
        return result;
      });
      this.totalMintedNum.innerText = totalSupply;
    }
  }

  async mintNFT(tokensNum) {
    const account = await window.ethereum.request({ method: 'eth_requestAccounts' }).then((accounts) => accounts[0]);
    const value = Web3.utils.toWei((0.06 * tokensNum).toString());

    this.CONTRACT.methods
      .mint(tokensNum)
      .send({
        from: account,
        value: value,
        gas: tokensNum * 200000,
        gasPrice: 0,
      })
      .on('transactionHash', (transactionHash) => {
        this.messageWrapper.innerHTML = `<a href="${ETHERSCAN_BASE_URL}/tx/${transactionHash}" target="_blank">Check transaction on Etherscan</a>`;
        this.messageWrapper.style.display = 'block';
      })
      .on('error', (error, receipt) => {
        console.log(error);
        console.log(receipt);
      });
  }

  async mintNFTPresale() {
    const account = await window.ethereum.request({ method: 'eth_requestAccounts' }).then((accounts) => accounts[0]);
    const value = Web3.utils.toWei((0.05).toString());
    const proof = this.MERKLE_MAPPING.find((v) => v.address === Web3.utils.toChecksumAddress(account))?.proof;

    if (proof) {
      this.CONTRACT.methods
        .mintPresale(proof)
        .send({
          from: account,
          value: value,
          gas: 300000,
          gasPrice: 0,
        })
        .on('transactionHash', (transactionHash) => {
          this.messageWrapper.innerHTML = `<a href="${ETHERSCAN_BASE_URL}/tx/${transactionHash}" target="_blank">Check transaction on Etherscan</a>`;
          this.messageWrapper.style.display = 'block';
        })
        .on('error', (error, receipt) => {
          console.log(error);
          console.log(receipt);
        });
    } else {
      this.messageWrapper.innerHTML = 'You are not in the whitelist.';
      this.messageWrapper.style.display = 'block';
    }
  }

  addEventHandlers() {
    this.mintButton.addEventListener(
      'click',
      (e) => {
        e.preventDefault();
        const qt = this.qtInput.value;
        const result = this.validateValue(qt);

        if (result.error) {
          this.messageWrapper.innerText = result.message;
          this.messageWrapper.style.display = 'block';
        } else {
          this.messageWrapper.style.display = 'none';
          this.mintNFT(parseInt(qt));
        }
      },
      false
    );
  }

  validateValue(value) {
    if (!/^\d+$/.test(value)) {
      return { error: true, message: 'Not a valid number.' };
    }

    if (value < 1 || value > 10) {
      return { error: true, message: 'Insert a value between 1 and 10.' };
    }

    return { error: false };
  }
}

const mintHandler = new MintHandler();
mintHandler.init();
