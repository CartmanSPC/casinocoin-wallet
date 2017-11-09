import { Component, OnInit, ViewChild } from '@angular/core';
import { InputText } from 'primeng/primeng';
import { Logger } from 'angular2-logger/core';
import { SelectItem, Dropdown, MenuItem, Message } from 'primeng/primeng';
import { MessageService } from 'primeng/components/common/messageservice';
import { CasinocoinService } from '../../../providers/casinocoin.service';
import { WalletService } from '../../../providers/wallet.service';
import { CSCUtil } from '../../../domain/csc-util';
import { AppConstants } from '../../../domain/app-constants';
import Big from 'big.js';

@Component({
  selector: 'app-send-coins',
  templateUrl: './send-coins.component.html',
  styleUrls: ['./send-coins.component.scss']
})
export class SendCoinsComponent implements OnInit {

  @ViewChild('receipientInput') receipientInput;
  @ViewChild('descriptionInput') descriptionInput;
  @ViewChild('amountInput') amountInput;
  @ViewChild('accountDropdown') accountDropdown: Dropdown;
  @ViewChild('passwordInput') passwordInput;
  @ViewChild('feesInput') feesInput;

  accounts: SelectItem[] = [];
  selectedAccount: string;
  receipient: string;
  description: string;
  amount: string;
  fees: string;
  minimalFee: string;
  walletPassword: string;
  showPasswordDialog:boolean = false;
  signAndSubmitIcon:string = "fa-check";
  
  constructor(private logger:Logger, 
              private casinocoinService: CasinocoinService,
              private walletService: WalletService,
              private messageService: MessageService ) { }

  ngOnInit() {
    // get accounts from wallet once its open
    this.walletService.openWalletSubject.subscribe( result => {
      if(result == AppConstants.KEY_LOADED){
        this.walletService.getAllAccounts().forEach( element => {
          if(new Big(element.balance) > 0){
            let accountLabel = element.accountID + " [Balance: " + CSCUtil.dropsToCsc(element.balance) + "]";
            this.accounts.push({label: accountLabel, value: element.accountID});
          }
        });
      }
    });
    // set the default fee
    this.logger.debug("### SendCoins - ledger: " + JSON.stringify(this.casinocoinService.ledgers[0]));
    this.fees = CSCUtil.dropsToCsc(this.casinocoinService.ledgers[0].fee_base.toString());
    this.minimalFee = this.fees;
    this.logger.debug("### SendCoins - minimalFee: " + this.minimalFee);
  }

  focusDescription(){
    this.descriptionInput.nativeElement.focus();
  }

  focusAmount(){
    this.amountInput.nativeElement.focus();
  }

  focusFees(){
    this.feesInput.nativeElement.focus();
  }

  doCancelSignAndSubmitTx(){
    this.showPasswordDialog = false;
  }

  doSignAndSubmitTx(){
    this.signAndSubmitIcon = "fa-refresh";
    let txObject = this.casinocoinService.createPaymentTx(
      this.selectedAccount, 
      this.receipient, 
      CSCUtil.cscToDrops(this.amount),
      this.description
    );
    this.logger.debug("### Sign: " + JSON.stringify(txObject));
    let txBlob:string = this.casinocoinService.signTx(txObject, this.walletPassword);
    if(txBlob == AppConstants.KEY_ERRORED){
      // probably a wrong password!
      this.messageService.add({severity:'error', summary:'Transaction Signing', detail:'There was an error signing the transactions. Verify your password.'});
    } else {
      this.casinocoinService.submitTx(txBlob);
      // reset form and dialog fields
      this.selectedAccount = "";
      this.receipient = "";
      this.description = "";
      this.walletPassword = "";
      this.amount = "";
      this.accountDropdown.resetFilter();
    }
    this.showPasswordDialog = false;
    this.signAndSubmitIcon = "fa-check";
  }

  doSendCoins(){
    this.logger.debug("### SendCoinsComponent - doSendCoins ###");
    this.showPasswordDialog = true;
    this.passwordInput.nativeElement.focus();
  }
}
