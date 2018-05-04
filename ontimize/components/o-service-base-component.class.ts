import { Injector, NgZone, HostListener } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';

import { Util, Codes } from '../utils';
import { InputConverter } from '../decorators';
import { OntimizeService, OTranslateService, LocalStorageService, DialogService, ILocalStorageComponent } from '../services';
import { OFormComponent } from './form/o-form.component';
import { ServiceUtils } from './service.utils';

export const DEFAULT_INPUTS_O_SERVICE_BASE_COMPONENT = [
  // attr [string]: list identifier. It is mandatory if data are provided through the data attribute. Default: entity (if set).
  'oattr: attr',

  // service [string]: JEE service path. Default: no value.
  'service',

  'serviceType : service-type',

  // entity [string]: entity of the service. Default: no value.
  'entity',

  // query-on-init [no|yes]: query on init. Default: yes.
  'queryOnInit: query-on-init',

  // query-on-init [no|yes]: query on bind. Default: yes.
  'queryOnBind: query-on-bind',

  'pageable',

  // columns [string]: columns of the entity, separated by ';'. Default: no value.
  'columns',

  // keys [string]: entity keys, separated by ';'. Default: no value.
  'keys',

  // parent-keys [string]: parent keys to filter, separated by ';'. Default: no value.
  'parentKeys: parent-keys',

  //static-data [Array<any>] : way to populate with static data. Default: no value.
  'staticData: static-data',

  // query-method [string]: name of the service method to perform queries. Default: query.
  'queryMethod: query-method',

  // paginated-query-method [string]: name of the service method to perform paginated queries. Default: advancedQuery.
  'paginatedQueryMethod : paginated-query-method',

  // query-rows [number]: number of rows per page. Default: 10.
  'queryRows: query-rows',

  // insert-method [string]: name of the service method to perform inserts. Default: insert.
  'insertMethod: insert-method',

  // update-method [string]: name of the service method to perform updates. Default: update.
  'updateMethod: update-method',

  // delete-method [string]: name of the service method to perform deletions. Default: delete.
  'deleteMethod: delete-method'
];

export class OServiceBaseComponent implements ILocalStorageComponent {

  public static DEFAULT_INPUTS_O_SERVICE_BASE_COMPONENT = DEFAULT_INPUTS_O_SERVICE_BASE_COMPONENT;

  protected translateService: OTranslateService;
  protected localStorageService: LocalStorageService;
  protected dialogService: DialogService;

  /* inputs variables */
  oattr: string;
  service: string;
  serviceType: string;
  entity: string;
  @InputConverter()
  queryOnInit: boolean = true;
  @InputConverter()
  queryOnBind: boolean = true;
  @InputConverter()
  pageable: boolean = false;
  columns: string;
  keys: string;
  parentKeys: string;
  staticData: Array<any>;
  queryMethod: string = Codes.QUERY_METHOD;
  paginatedQueryMethod: string = Codes.PAGINATED_QUERY_METHOD;
  queryRows: any = Codes.DEFAULT_QUERY_ROWS;
  insertMethod: string = Codes.INSERT_METHOD;
  updateMethod: string = Codes.UPDATE_METHOD;
  deleteMethod: string = Codes.DELETE_METHOD;
  /* end of inputs variables */

  /*parsed inputs variables */
  protected colArray: Array<string> = [];
  protected keysArray: Array<string> = [];
  protected _pKeysEquiv = {};
  protected dataArray: Array<any> = [];
  protected parentItem: any;
  protected oattrFromEntity: boolean = false;
  /* end of parsed inputs variables */

  protected onLanguageChangeSubscribe: any;
  protected onRouteChangeStorageSubscribe: any;
  protected onFormDataSubscribe: any;

  protected loaderSubscription: Subscription;
  protected querySubscription: Subscription;
  protected dataService: any;
  protected state: any;
  loading: boolean = false;

  protected form: OFormComponent;

  constructor(
    protected injector: Injector
  ) {
    this.translateService = this.injector.get(OTranslateService);
    this.dialogService = this.injector.get(DialogService);
    this.localStorageService = this.injector.get(LocalStorageService);
    const self = this;
    this.onLanguageChangeSubscribe = this.translateService.onLanguageChanged.subscribe(res => {
      self.onLanguageChangeCallback(res);
    });
    this.onRouteChangeStorageSubscribe = this.localStorageService.onRouteChange.subscribe(res => {
      self.localStorageService.updateComponentStorage(self);
    });
    try {
      this.form = this.injector.get(OFormComponent);
    } catch (e) {
      // no parent form
    }
  }

  initialize(): void {
    if (!Util.isDefined(this.oattr) && Util.isDefined(this.entity)) {
      this.oattr = this.entity.replace('.', '_');
      this.oattrFromEntity = true;
    }
    this.keysArray = Util.parseArray(this.keys);
    this.colArray = Util.parseArray(this.columns, true);
    let pkArray = Util.parseArray(this.parentKeys);
    this._pKeysEquiv = Util.parseParentKeysEquivalences(pkArray, Codes.COLUMNS_ALIAS_SEPARATOR);

    if (this.form) {
      this.setFormComponent(this.form);
    }

    if (this.staticData) {
      this.queryOnBind = false;
      this.queryOnInit = false;
      this.setDataArray(this.staticData);
    } else {
      this.configureService();
    }
  }

  afterViewInit() {
    //
  }

  destroy() {
    this.onLanguageChangeSubscribe.unsubscribe();
    if (this.onFormDataSubscribe) {
      this.onFormDataSubscribe.unsubscribe();
    }
    if (this.querySubscription) {
      this.querySubscription.unsubscribe();
      this.loaderSubscription.unsubscribe();
    }
    this.localStorageService.updateComponentStorage(this);
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeunloadHandler(event) {
    if (this.localStorageService) {
      this.localStorageService.updateComponentStorage(this);
    }
  }

  getAttribute(): string {
    return this.oattr;
  }

  getComponentKey(): string {
    return this.getAttribute();
  }

  getDataToStore(): Object {
    return this.state;
  }

  onLanguageChangeCallback(res: any) {
    //
  }

  getKeys() {
    return this.keysArray;
  }

  configureService() {
    let loadingService: any = OntimizeService;
    if (this.serviceType) {
      loadingService = this.serviceType;
    }
    try {
      this.dataService = this.injector.get(loadingService);
      if (Util.isDataService(this.dataService)) {
        let serviceCfg = this.dataService.getDefaultServiceConfiguration(this.service);
        if (this.entity) {
          serviceCfg['entity'] = this.entity;
        }
        this.dataService.configureService(serviceCfg);
      }
    } catch (e) {
      console.error(e);
    }
  }

  getDataArray() {
    return this.dataArray;
  }

  setDataArray(data: any): void {
    if (Util.isArray(data)) {
      this.dataArray = data;
    } else if (Util.isObject(data)) {
      this.dataArray = [data];
    } else {
      console.warn('Component has received not supported service data. Supported data are Array or Object');
      this.dataArray = [];
    }
  }

  setFormComponent(form: OFormComponent) {
    var self = this;
    this.onFormDataSubscribe = this.form.onFormDataLoaded.subscribe(data => {
      self.parentItem = data;
      if (self.queryOnBind) {
        self.queryData(data);
      }
    });

    let dataValues = this.form.getDataValues();
    if (Util.isDefined(dataValues) && Object.keys(dataValues).length > 0) {
      self.parentItem = dataValues;
      self.queryData(dataValues);
    }
  }

  queryData(parentItem: any = undefined, ovrrArgs?: any) {
    let queryMethodName = this.pageable ? this.paginatedQueryMethod : this.queryMethod;
    if (!this.dataService || !(queryMethodName in this.dataService) || !this.entity) {
      return;
    }
    parentItem = ServiceUtils.getParentItemFromForm(parentItem, this._pKeysEquiv, this.form);

    if ((Object.keys(this._pKeysEquiv).length > 0) && parentItem === undefined) {
      this.setData([], []);
    } else {
      let filter = ServiceUtils.getFilterUsingParentKeys(parentItem, this._pKeysEquiv);
      let queryArguments = this.getQueryArguments(filter, ovrrArgs);
      if (this.querySubscription) {
        this.querySubscription.unsubscribe();
        this.loaderSubscription.unsubscribe();
      }
      this.loaderSubscription = this.load();
      const self = this;
      this.querySubscription = this.dataService[queryMethodName].apply(this.dataService, queryArguments).subscribe(res => {
        let data = undefined;
        let sqlTypes = undefined;
        if (Util.isArray(res)) {
          data = res;
          sqlTypes = [];
        } else if ((res.code === 0) && Util.isArray(res.data)) {
          data = res.data;
          sqlTypes = res.sqlTypes;
          if (this.pageable) {
            this.updatePaginationInfo(res);
          }
        }
        self.setData(data, sqlTypes);
        self.loaderSubscription.unsubscribe();
      }, err => {
        self.setData([], []);
        self.loaderSubscription.unsubscribe();
        if (err && typeof err !== 'object') {
          self.dialogService.alert('ERROR', err);
        } else {
          self.dialogService.alert('ERROR', 'MESSAGES.ERROR_QUERY');
        }
      });
    }
  }

  reloadData() {
    console.log('reloadData');
  }

  load(): any {
    var self = this;
    var zone = this.injector.get(NgZone);
    var loadObservable = new Observable(observer => {
      var timer = window.setTimeout(() => {
        observer.next(true);
      }, 250);

      return () => {
        window.clearTimeout(timer);
        zone.run(() => {
          self.loading = false;
        });
      };

    });
    var subscription = loadObservable.subscribe(val => {
      zone.run(() => {
        self.loading = val as boolean;
      });
    });
    return subscription;
  }

  getQueryArguments(filter: Object, ovrrArgs?: any): Array<any> {
    let compFilter = this.getComponentFilter(filter);
    let queryArguments = [compFilter, this.colArray, this.entity];
    if (this.pageable) {
      let queryOffset = (ovrrArgs && ovrrArgs.hasOwnProperty('offset')) ? ovrrArgs.offset : this.state.queryRecordOffset;
      let queryRowsN = (ovrrArgs && ovrrArgs.hasOwnProperty('length')) ? ovrrArgs.length : this.queryRows;
      queryArguments = queryArguments.concat([undefined, queryOffset, queryRowsN, undefined]);
    }
    return queryArguments;
  }

  updatePaginationInfo(queryRes: any) {
    let resultEndIndex = queryRes.startRecordIndex + (queryRes.data ? queryRes.data.length : 0);
    if (queryRes.startRecordIndex !== undefined) {
      this.state.queryRecordOffset = resultEndIndex;
    }
    if (queryRes.totalQueryRecordsNumber !== undefined) {
      this.state.totalQueryRecordsNumber = queryRes.totalQueryRecordsNumber;
    }
  }

  getTotalRecordsNumber(): number {
    return (this.state && this.state.totalQueryRecordsNumber !== undefined) ? this.state.totalQueryRecordsNumber : undefined;
  }

  getComponentFilter(existingFilter: any = {}): any {
    return existingFilter;
  }

  protected setData(data: any, sqlTypes?: any) {
    //
  }
}
