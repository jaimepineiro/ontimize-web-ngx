
import { Injector, EventEmitter } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { ObservableWrapper } from '../util/async';
import { AppConfig, Config } from '../config/app-config';
import { SessionInfo } from '../services';
import { LoginService } from './login.service';
import { Util } from '../util/util';

export interface ILocalStorageComponent {
  storeState?: boolean;
  getDataToStore(): Object;
  getComponentKey(): string;
}

export class LocalStorageService {
  static COMPONENTS_STORAGE_KEY: string = 'components';
  static USERS_STORAGE_KEY: string = 'users';
  static SESSION_STORAGE_KEY: string = 'session';

  public onRouteChange: EventEmitter<any> = new EventEmitter();
  public onSetLocalStorage: EventEmitter<any> = new EventEmitter();

  private _config: Config;
  private _router: Router;
  private loginService: LoginService;

  constructor(protected injector: Injector) {
    this._config = this.injector.get(AppConfig).getConfiguration();
    this._router = this.injector.get(Router);
    this.loginService = this.injector.get(LoginService);

    var self = this;
    this._router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        ObservableWrapper.callEmit(self.onRouteChange, {});
      }
    });
  }

  getComponentStorage(comp: ILocalStorageComponent, useRouteOnKey: boolean = true): Object {
    var componentKey = comp.getComponentKey();
    var completeKey = componentKey;
    if (useRouteOnKey) {
      completeKey += '_' + this._router.url;
    }
    return this.getAppComponentData(completeKey) || {};
  }

  updateComponentStorage(comp: ILocalStorageComponent, useRouteOnKey: boolean = true) {
    var dataToStore = comp.getDataToStore();
    var componentKey = comp.getComponentKey();
    var completeKey = componentKey;
    if (useRouteOnKey) {
      completeKey += '_' + this._router.url;
    }
    let storedObject = {};
    for (var prop in dataToStore) {
      if (dataToStore.hasOwnProperty(prop)) {
        storedObject[prop] = dataToStore[prop];
      }
    }
    this.updateAppComponentStorage(completeKey, storedObject);
  }

  private getAppComponentData(key: string): Object {
    let componentData = undefined;
    let storedComponents: Object = this.getSessionUserComponentsData() || {};
    if (storedComponents[key]) {
      let decoded = atob(storedComponents[key]);
      try {
        componentData = JSON.parse(decoded);
      } catch (e) {
        componentData = undefined;
      }
    }
    return componentData;
  }

  updateAppComponentStorage(componentKey: string, componentData: Object) {
    let componentDataB64: Object = undefined;
    try {
      componentDataB64 = btoa(JSON.stringify(componentData));
    } catch (e) {
      componentDataB64 = undefined;
    }
    this.storeComponentInSessionUser(componentKey, componentDataB64);
  }

  public getSessionUserComponentsData(): Object {
    let storedComponentsByUser = {};
    let appData = this.getStoredData();
    let session: SessionInfo = appData[LocalStorageService.SESSION_STORAGE_KEY] || {};
    let users = appData[LocalStorageService.USERS_STORAGE_KEY] || {};
    storedComponentsByUser = (users[session.user] || {})[LocalStorageService.COMPONENTS_STORAGE_KEY] || {};
    return storedComponentsByUser;
  }

  public storeSessionUserComponentsData(componentsData: object) {
    let appData = this.getStoredData();
    let session: SessionInfo = appData[LocalStorageService.SESSION_STORAGE_KEY] || {};
    if (!Util.isDefined(appData[LocalStorageService.USERS_STORAGE_KEY])) {
      appData[LocalStorageService.USERS_STORAGE_KEY] = {};
    }
    let userData = appData[LocalStorageService.USERS_STORAGE_KEY][session.user] || {};
    userData[LocalStorageService.COMPONENTS_STORAGE_KEY] = componentsData;
    appData[LocalStorageService.USERS_STORAGE_KEY][session.user] = userData;
    this.setLocalStorage(appData);
  }

  private storeComponentInSessionUser(componentKey, componentDataB64) {
    let appData = this.getStoredData();
    let session = appData[LocalStorageService.SESSION_STORAGE_KEY] || {}; // uuid -> session
    if (!Util.isDefined(session) || !Util.isDefined(session.user)) {
      return;
    }
    let users = appData[LocalStorageService.USERS_STORAGE_KEY] || {}; // uuid -> users
    const idUser = session.user || this.loginService.getSessionInfo().user;
    let user = users[idUser] || {}; //uuid -> users-> user

    let componentData = {};
    if (users[idUser]) {
      componentData = users[idUser][LocalStorageService.COMPONENTS_STORAGE_KEY];
    }
    componentData[componentKey] = componentDataB64 || {};

    user[LocalStorageService.COMPONENTS_STORAGE_KEY] = componentData;
    users[idUser] = user;
    appData[LocalStorageService.USERS_STORAGE_KEY] = users;

    this.setLocalStorage(appData);
  }

  public getStoredData(): Object {
    let appData = {};
    let appStoredData = localStorage.getItem(this._config['uuid']);
    if (appStoredData) {
      try {
        appData = JSON.parse(appStoredData);
      } catch (e) {
        appData = {};
      }
    }
    return appData;
  }

  public setBackwardCompatibility() {
    let appData = this.getStoredData();
    let session = appData[LocalStorageService.SESSION_STORAGE_KEY];
    if (!Util.isDefined(session) || !Util.isDefined(session.user)) {
      return;
    }
    let componentsInfo = appData[LocalStorageService.COMPONENTS_STORAGE_KEY] || {};
    let usersObject = {};
    const existsUsersTag = Util.isDefined(appData[LocalStorageService.USERS_STORAGE_KEY]);
    let createUserInfo = existsUsersTag;
    if (existsUsersTag) {
      usersObject = appData[LocalStorageService.USERS_STORAGE_KEY];
      createUserInfo = !Util.isDefined(appData[LocalStorageService.USERS_STORAGE_KEY][session.user]);
    }
    if (createUserInfo) {
      usersObject[session.user] = {};
      usersObject[session.user][LocalStorageService.COMPONENTS_STORAGE_KEY] = componentsInfo;

      appData[LocalStorageService.USERS_STORAGE_KEY] = usersObject;
      localStorage.setItem(this._config['uuid'], JSON.stringify(appData));
    }
  }

  protected setLocalStorage(appData: any) {
    this.onSetLocalStorage.emit();
    localStorage.setItem(this._config['uuid'], JSON.stringify(appData));
  }
}

