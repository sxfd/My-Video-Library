const ReadWalletFile = (walletFile) => {
    const readAsDataURL = (walletFile) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => {
          reader.abort()
          reject()
        }
        reader.addEventListener("load", () => {resolve(reader.result)}, false)
        reader.readAsText(walletFile)
      })
    }
    return readAsDataURL(walletFile);
}

export default ReadWalletFile