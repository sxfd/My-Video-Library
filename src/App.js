import React from 'react';
import logo from './logo.svg';
import './App.css';
import 'semantic-ui-css/semantic.min.css'
import { Grid, Dimmer, Loader, Modal, Button, List, Icon} from 'semantic-ui-react'
import ReadWalletFile from './utils/ReadWalletFile';
import Arweave from 'arweave/web';
import ReadVideo from './utils/ReadVideo';
import CryptoJS from "crypto-js"
import jwkToPem from 'jwk-to-pem'

const arweave = Arweave.init({
    host: 'arweave.net',// Hostname or IP address for an Arweave node
    port: 443,           // Port, defaults to 1984
    protocol: 'https',  // Network protocol http or https, defaults to http
    timeout: 20000,     // Network request timeouts in milliseconds
    logging: false,     // Enable network request logging
})

const getVideosTxList = async(arAddress) => {
  try{
    const query = {
      op: 'and',
      expr1: {
          op: 'equals',
          expr1: 'from',
          expr2: arAddress
      },
      expr2: {
          op: 'equals',
          expr1: 'App-Name',
          expr2: 'my-video-library'
      }     
    }
    const result = await arweave.arql(query);
    return result
  }catch(err){
    console.log(err)
    return []
  }  
}


class App extends React.Component{
  state = {
    loading:false,
    walletLoad:false,
    userAddress:'',
    walletFile:'',
    arBalance:'',
    fee:'',
    transaction:'',
    txView:'',
    vidDataView:'',
    openModalView:false
  }

  isFileVideo = (file) => {
    return file && file['type'].split('/')[0] === 'video';
}

  WalletUpload = async(e) => {
    try{    
      this.setState({loading:true})
      const rawWallet = await ReadWalletFile(e.target.files[0])
      const walletFile = JSON.parse(rawWallet)
      const userAddress = await arweave.wallets.jwkToAddress(walletFile)
      const winstonBalance =  await arweave.wallets.getBalance(userAddress)
      const arBalance = await arweave.ar.winstonToAr(winstonBalance)
      const listTxImg = await getVideosTxList(userAddress)
      this.setState({walletLoad:true, walletFile, userAddress, arBalance, loading:false, listTxImg})
    }catch(err){
      this.setState({loading:false})
      alert('Error Loading Wallet')
    }
  }

  loadVideo = async(e) => {
    try{
      this.setState({loading:true})
      const vidData = await ReadVideo(e.target.files[0])
      if(vidData){
        const pvKey = await jwkToPem(this.state.walletFile,{private:true})
        const vidEncrypted = await CryptoJS.AES.encrypt(vidData, pvKey)
        const ImgEcryptedString = await vidEncrypted.toString()
        const data = ImgEcryptedString   
        let transaction = await arweave.createTransaction({
            data
        }, this.state.walletFile);
        transaction.addTag('App-Name', 'my-video-library');
		transaction.addTag('Content-Type', 'video/mp4');
        const fee = await arweave.ar.winstonToAr(transaction.reward)
        this.setState({fee, transaction, vidData, openModalTx:true, loading:false })   


      }else{
        this.setState({loading:false})
        alert('Videos Only')
      }
    }catch(err){
      console.log(err)
      this.setState({loading:false})
      alert('Error Loading Video')
    }
}

close = () => {
  if(this.state.loading){
    return 
  }else{
    this.setState({ open: false })
  }
}

closeView = () => this.setState({openModalView:false})

  confirmUploadVideo = async() => {
    try{
      this.setState({loading:true})
      const transaction = this.state.transaction
      await arweave.transactions.sign(transaction, this.state.walletFile);
      const response = await arweave.transactions.post(transaction);
      console.log(transaction.id)
      let {status} = await arweave.transactions.getStatus(transaction.id)
      this.setState({loading:false, openModalTx:false, fee:'', transaction:'', vidData:''})
      alert('Transaction Send, after the confirmation you will view this')
    }catch(err){
      this.setState({loading:false, openModalTx:false, fee:'', transaction:'', vidData:''})
      alert('Error')
    }
  }

  decryptVideo = async(txHash) => {
     try{
      this.setState({loading:true})
      const transaction = await arweave.transactions.get(txHash)
      const encryptData = await transaction.get('data', {decode: true, string: true})
      const pvKey = await jwkToPem(this.state.walletFile,{private:true})
      var decryptResult  = await CryptoJS.AES.decrypt(encryptData, pvKey);
      const vidString = await decryptResult.toString(CryptoJS.enc.Utf8)
      this.setState({loading:false, txView:txHash, vidDataView:vidString, openModalView:true})
     }catch(err){
       console.log(err)
       this.setState({loading:false})
       alert('Error')
   }
  }

  render(){
    return(
      <React.Fragment>
      <Grid padded>
        <Grid.Row color={"red"} key={"red"}>
          <Grid.Column>My Video Library</Grid.Column>
        </Grid.Row>
       </Grid>
        <Grid centered> 
        {this.state.walletLoad ?
        <React.Fragment>
            <Grid centered>
            <Grid.Row style={{padding:0}}><p>{this.state.userAddress}</p></Grid.Row>
            <Grid.Row style={{padding:0}}> <p>{this.state.arBalance} AR</p></Grid.Row>
           
            <Grid.Row>
            <label style={{padding:20}} for="upload-vid" class="ui icon button">
              <i class="upload icon"></i>
              Upload Video
            </label>
            <input type="file" accept="video/mp4" onChange={ e => this.loadVideo(e)} id="upload-vid" style={{display: "none"}}/>
            </Grid.Row>
            <Grid.Row>
              <p style={{fontWeight:800, fontSize:18}}>My Videos</p>
            </Grid.Row>
            {(this.state.listTxImg.length === 0) && <Grid.Row><p>No Videos</p></Grid.Row>}
            <Grid.Row>
              <List>
                {this.state.listTxImg.map(url => (
                      <List.Item>
                        <List.Content>
                          <List.Header onClick={() => this.decryptVideo(url)} as='a'>{url}</List.Header>
                        </List.Content>
                    </List.Item>
                ))}
              </List>
            </Grid.Row>
            </Grid>
        </React.Fragment>
          :
          <React.Fragment>
            <label style={{padding:20}} for="hidden-new-file" class="ui icon button">
              <i class="key icon"></i>
              Log In
            </label>
            <input type="file" onChange={ e => this.WalletUpload(e)} id="hidden-new-file" style={{display: "none"}}/>
          </React.Fragment>

        }     
        </Grid>
        {this.state.loading && 
          <Dimmer active>
            <Loader size='large'>Loading</Loader>
          </Dimmer>
        }

        <Modal size={"small"} open={this.state.openModalTx} onClose={this.close}>
        {this.state.loading && 
          <Dimmer active>
            <Loader size='large'>Loading</Loader>
          </Dimmer>
        }
          <Modal.Header>Upload Video</Modal.Header>
          <Modal.Content>
            <Grid centered>
                <Grid.Row>
                  <p>Transaction Fee: {this.state.fee}</p>
                </Grid.Row>
                <Grid.Row>
                  <video src={this.state.vidData} style={{maxWidth:350, maxHeight:350}} />
                </Grid.Row>
            </Grid>
          </Modal.Content>
          <Modal.Actions>
            <Button onClick={() => this.setState({openModalTx:false, fee:'' , transaction:'', vidData:''})} negative>Cancel</Button>
            <Button onClick={this.confirmUploadVideo} positive icon='checkmark' labelPosition='right' content='Upload Video' />
          </Modal.Actions>
        </Modal>

        <Modal size={"small"} open={this.state.openModalView} onClose={this.closeView}>
          <Modal.Header>Video</Modal.Header>
          <Modal.Content>
            <Grid centered>
              <Grid.Row>
                <p>Tx: {this.state.txView}</p>
              </Grid.Row>
              <Grid.Row>
                <embed src={this.state.vidDataView} style={{maxWidth:350, maxHeight:350}} />
              </Grid.Row>
            </Grid>
          </Modal.Content>
        </Modal>
      </React.Fragment>
    )
  }
}

export default App;
