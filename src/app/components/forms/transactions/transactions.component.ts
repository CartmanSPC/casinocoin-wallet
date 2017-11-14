import { Component, OnInit, ViewChild } from '@angular/core';
import { InputText } from 'primeng/primeng';
import { Logger } from 'angular2-logger/core';
import { SelectItem, Dropdown, MenuItem, Message } from 'primeng/primeng';
import { MessageService } from 'primeng/components/common/messageservice';
import { CasinocoinService } from '../../../providers/casinocoin.service';
import { WalletService } from '../../../providers/wallet.service';
import { LedgerStreamMessages } from '../../../domain/websocket-types';
import { CSCUtil } from '../../../domain/csc-util';
import { AppConstants } from '../../../domain/app-constants';
import { LokiTransaction } from '../../../domain/lokijs';
import { ElectronService } from '../../../providers/electron.service';
import { Menu as ElectronMenu, MenuItem as ElectronMenuItem } from 'electron';
import Big from 'big.js';

@Component({
  selector: 'app-transactions',
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.scss']
})
export class TransactionsComponent implements OnInit {

  @ViewChild('receipientInput') receipientInput;
  @ViewChild('descriptionInput') descriptionInput;
  @ViewChild('amountInput') amountInput;
  @ViewChild('accountDropdown') accountDropdown: Dropdown;
  @ViewChild('passwordInput') passwordInput;

  transactions: Array<LokiTransaction>;
  accounts: SelectItem[] = [];
  ledgers: LedgerStreamMessages[] = [];
  selectedAccount: string;
  selectedTxRow: LokiTransaction;
  receipient: string;
  description: string;
  amount: string;
  walletPassword: string;
  showPasswordDialog:boolean = false;
  showLedgerDialog:boolean = false;
  signAndSubmitIcon:string = "fa-check";
  tx_context_menu: ElectronMenu;
  
  constructor(private logger:Logger, 
              private casinocoinService: CasinocoinService,
              private walletService: WalletService,
              private messageService: MessageService ) { }

  ngOnInit() {
    // get transactions from wallet
    this.walletService.openWalletSubject.subscribe( result => {
      if(result == AppConstants.KEY_LOADED){
        this.transactions = this.walletService.getAllTransactions();
        // add empty item to accounts dropdown
        this.accounts.push({label:'Select Account ...', value:null});
        this.walletService.getAllAccounts().forEach( element => {
          if(new Big(element.balance) > 0){
            let accountLabel = element.label + "(" + element.accountID.substring(0,8)+ "...) [Balance: " + CSCUtil.dropsToCsc(element.balance) + "]";
            this.accounts.push({label: accountLabel, value: element.accountID});
          }
        });
        // subscribe to transaction updates
        this.casinocoinService.transactionSubject.subscribe( tx => {
          let updateTxIndex = this.transactions.findIndex( item => item.txID == tx.txID);
          if( updateTxIndex >= 0 ){
            this.transactions[updateTxIndex] = tx;
          } else {
            this.transactions.splice(0,0,tx);
          }
        });
      }
    });
    // get network ledgers
    this.ledgers = this.casinocoinService.ledgers;
  }

  getTXTextColor(cell, rowData){
    if(rowData.direction == AppConstants.KEY_WALLET_TX_OUT){
      // outgoing tx
      cell.parentNode.parentNode.style.color = "#901119";
    } else if(rowData.direction == AppConstants.KEY_WALLET_TX_IN){
      // incomming tx
      cell.parentNode.parentNode.style.color = "#119022";
    } else {
      // wallet tx
      cell.parentNode.parentNode.style.color = "#114490";
    }
  }

  getDirectionIconClasses(rowData){
    if(rowData.direction == AppConstants.KEY_WALLET_TX_OUT){
      // outgoing tx
      return ["fa", "fa-minus", "color_red", "text-large"];
    } else if(rowData.direction == AppConstants.KEY_WALLET_TX_IN){
      // incomming tx
      return ["fa", "fa-plus", "color_green", "text-large"];
    } else {
      // wallet tx
      return ["fa", "fa-minus", "color_blue", "text-large"];
    }
  }

  getValidatedIconClasses(validated: boolean){
    if(validated){
      return ["fa", "fa-check", "color_green"];
    } else {
      return ["fa", "fa-times", "color_red"];
    }
  }

  getDescription(rowData){
    if(rowData.memos && rowData.memos.length > 0){
      return rowData.memos[0].memo.memoData;
    } else {
      return"-";
    }
  }

  accountSelected(event){
    this.logger.debug("value selected: " + JSON.stringify(event));
    if(event.value == null){
      this.transactions = this.walletService.getAllTransactions();
    } else {
      this.transactions = this.walletService.getAccountTransactions(event.value);
    }
  }

  doShowLedgers(){
    this.showLedgerDialog = true;
  }

  convertCscTimestamp(inputTime) {
    return CSCUtil.casinocoinToUnixTimestamp(inputTime);
  }

  showTxContextMenu(event){
    this.logger.debug("### showTxContextMenu: " + JSON.stringify(event));
    if(this.selectedTxRow){
      this.logger.debug("### showTxContextMenu - row: " + JSON.stringify(this.selectedTxRow));
    }
  }

  onTxRowClick(event){
    this.logger.debug("### onTxRowClick: " + JSON.stringify(event));
  }
}