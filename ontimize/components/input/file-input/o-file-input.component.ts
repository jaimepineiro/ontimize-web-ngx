import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, forwardRef, Inject, Injector, NgModule, OnInit, Optional, ViewChild } from '@angular/core';
import { FormControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { InputConverter } from '../../../decorators';
import { OntimizeFileService } from '../../../services';
import { OSharedModule } from '../../../shared';
import { OFormComponent } from '../../form/o-form.component';
import { DEFAULT_INPUTS_O_FORM_DATA_COMPONENT, OFormDataComponent, OValueChangeEvent } from '../../o-form-data-component.class';
import { OFileItem } from './o-file-item.class';
import { OFileUploader } from './o-file-uploader.class';

export const DEFAULT_INPUTS_O_FILE_INPUT = [
  'oattr: attr',
  'olabel: label',
  'floatLabel: float-label',
  'oplaceholder: placeholder',
  'tooltip',
  'tooltipPosition: tooltip-position',
  'tooltipShowDelay: tooltip-show-delay',
  'tooltipHideDelay: tooltip-hide-delay',
  'enabled',
  'orequired: required',
  'service',
  'entity',
  'serviceType : service-type',
  'width',
  'readOnly: read-only',
  'clearButton: clear-button',

  // accept-file-type [string]: file types allowed on the file input, separated by ';'. Default: no value.
  // file_extension, audio/*, video/*, image/*, media_type. See https://www.w3schools.com/tags/att_input_accept.asp
  'acceptFileType: accept-file-type',

  // max-file-size [number]: maximum file size allowed, in bytes. Default: no value.
  'maxFileSize: max-file-size',

  // multiple [boolean]: multiple file selection allowed. Default: no.
  'multiple',

  // max-files [number]: maximum number of files allowed. Default: -1.
  'maxFiles: max-files',

  // show-info [boolean]: show files information. Default: no.
  'showInfo: show-info',

  // split-upload [boolean]: each file is uploaded in a request (true) or all files are uploaded in a single request (false). Default: yes.
  'splitUpload: split-upload',

  // additional-data [JSON]: used to send aditional information in the upload request.
  'additionalData: additional-data',
  'appearance'
];

export const DEFAULT_OUTPUTS_O_FILE_INPUT = [
  ...DEFAULT_INPUTS_O_FORM_DATA_COMPONENT,
  'onBeforeUpload',
  'onBeforeUploadFile',
  'onProgress',
  'onProgressFile',
  'onCancel',
  'onCancelFile',
  'onUpload',
  'onUploadFile',
  'onComplete',
  'onCompleteFile',
  'onError',
  'onErrorFile'
];

@Component({
  moduleId: module.id,
  selector: 'o-file-input',
  templateUrl: './o-file-input.component.html',
  styleUrls: ['./o-file-input.component.scss'],
  inputs: DEFAULT_INPUTS_O_FILE_INPUT,
  outputs: DEFAULT_OUTPUTS_O_FILE_INPUT
})
export class OFileInputComponent extends OFormDataComponent implements OnInit {

  public static DEFAULT_INPUTS_O_FILE_INPUT = DEFAULT_INPUTS_O_FILE_INPUT;
  public static DEFAULT_OUTPUTS_O_FILE_INPUT = DEFAULT_OUTPUTS_O_FILE_INPUT;

  public uploader: OFileUploader;
  public fileService: OntimizeFileService;
  @ViewChild('inputFile')
  public inputFile: ElementRef;

  public autoBinding: boolean = false;
  public autoRegistering: boolean = false;
  @InputConverter()
  public showInfo: boolean = false;
  @InputConverter()
  public multiple: boolean = false;
  @InputConverter()
  public splitUpload: boolean = true;
  public acceptFileType: string;
  public maxFileSize: number;
  @InputConverter()
  public maxFiles: number = -1;

  public onBeforeUpload: EventEmitter<any> = new EventEmitter<any>();
  public onBeforeUploadFile: EventEmitter<any> = new EventEmitter<any>();
  public onProgress: EventEmitter<any> = new EventEmitter<any>();
  public onProgressFile: EventEmitter<any> = new EventEmitter<any>();
  public onCancel: EventEmitter<any> = new EventEmitter<any>();
  public onCancelFile: EventEmitter<any> = new EventEmitter<any>();
  public onUpload: EventEmitter<any> = new EventEmitter<any>();
  public onUploadFile: EventEmitter<any> = new EventEmitter<any>();
  public onComplete: EventEmitter<any> = new EventEmitter<any>();
  public onCompleteFile: EventEmitter<any> = new EventEmitter<any>();
  public onError: EventEmitter<any> = new EventEmitter<any>();
  public onErrorFile: EventEmitter<any> = new EventEmitter<any>();

  protected service: string;
  protected entity: string;
  protected serviceType: string;

  constructor(
    @Optional() @Inject(forwardRef(() => OFormComponent)) form: OFormComponent,
    elRef: ElementRef,
    injector: Injector,
  ) {
    super(form, elRef, injector);
  }

  public ngOnInit(): void {
    this.initialize();

    this.uploader.onBeforeUploadAll = () => this.onBeforeUpload.emit();
    this.uploader.onBeforeUploadItem = item => this.onBeforeUploadFile.emit(item);
    this.uploader.onProgressAll = progress => this.onProgress.emit(progress);
    this.uploader.onProgressItem = (item, progress) => this.onProgressFile.emit({ item: item, progress: progress });
    this.uploader.onCancelAll = () => this.onCancel.emit();
    this.uploader.onCancelItem = item => this.onCancelFile.emit();
    this.uploader.onSuccessAll = response => this.onUpload.emit({ response: response });
    this.uploader.onSuccessItem = (item, response) => this.onUploadFile.emit({ item: item, response: response });
    this.uploader.onCompleteAll = () => this.onComplete.emit();
    this.uploader.onCompleteItem = item => this.onCompleteFile.emit(item);
    this.uploader.onErrorAll = error => this.onError.emit(error);
    this.uploader.onErrorItem = (item, error) => this.onErrorFile.emit({ item: item, error: error });
  }

  public initialize(): void {
    super.initialize();

    if (!this.service) {
      this.service = this.form.service;
    }
    if (!this.entity) {
      this.entity = this.form.entity;
    }

    this.configureService();
    this.uploader = new OFileUploader(this.fileService, this.entity);
    this.uploader.splitUpload = this.splitUpload;
  }

  public configureService(): void {
    let loadingService: any = OntimizeFileService;
    if (this.serviceType) {
      loadingService = this.serviceType;
    }
    try {
      this.fileService = this.injector.get(loadingService);

      if (this.fileService) {
        const serviceCfg: any = this.fileService.getDefaultServiceConfiguration(this.service);
        if (this.entity) {
          serviceCfg.entity = this.entity;
        }
        this.fileService.configureService(serviceCfg);
      }
    } catch (e) {
      console.error(e);
    }
  }

  public resolveValidators(): ValidatorFn[] {
    const validators: ValidatorFn[] = super.resolveValidators();
    if (this.acceptFileType) {
      validators.push(this.filetypeValidator.bind(this));
    }
    if (this.maxFileSize) {
      validators.push(this.maxFileSizeValidator.bind(this));
    }
    if (this.multiple && this.maxFiles !== -1) {
      validators.push(this.maxFilesValidator.bind(this));
    }
    return validators;
  }

  public innerOnChange(event: any): void {
    this.ensureOFormValue(event);
    if (this._fControl && this._fControl.touched) {
      this._fControl.markAsDirty();
    }
    this.onChange.emit(event);
  }

  public fileSelected(event: Event): void {
    let value: string = '';
    if (event) {
      const target: any = event.target || event.srcElement;
      if (target.files.length > 0) {
        const files: FileList = target.files;
        if (!this.multiple) {
          this.uploader.clear();
        }
        for (let i = 0, f: File; i < files.length; i++) {
          f = files[i];
          const fileItem: OFileItem = new OFileItem(f, this.uploader);
          this.uploader.addFile(fileItem);
        }
        value = this.uploader.files.map(file => file.name).join(', ');

        window.setTimeout(() => {
          this.setValue(value !== '' ? value : undefined, { changeType: OValueChangeEvent.USER_CHANGE });
          if (this._fControl) {
            this._fControl.markAsTouched();
          }
        }, 0);
      }
    }
  }

  /**
   * Override super.onClickClearValue();
   * super.clearValue() vs super.onClickClearValue()
   *  * super.clearValue() emit OValueChangeEvent.PROGRAMMATIC_CHANGE
   *  * super.onClickClearValue() emit OValueChangeEvent.USER_CHANGE
   */
  public onClickClearValue(e: Event): void {
    super.onClickClearValue(e);
    this.uploader.clear();
  }

  /**
   * Override super.clearValue();
   */
  public clearValue(): void {
    super.clearValue();
    this.uploader.clear();
  }

  public onClickUpload(e: Event): void {
    e.stopPropagation();
    if (this.isValid) {
      this.upload();
    }
  }

  public upload(): void {
    this.uploader.upload();
  }

  get files(): OFileItem[] {
    return this.uploader.files;
  }

  get additionalData(): any {
    if (this.uploader) {
      return this.uploader.data;
    }
    return null;
  }

  set additionalData(data: any) {
    if (this.uploader) {
      this.uploader.data = data;
    }
  }

  protected filetypeValidator(control: FormControl): ValidationErrors {
    if (control.value && control.value.length > 0 && this.acceptFileType) {
      const regex: RegExp = new RegExp(this.acceptFileType.replace(';', '|'));
      if (!this.files.every(file => file.type.match(regex) !== null || file.name.substr(file.name.lastIndexOf('.')).match(regex) !== null)) {
        return {
          fileType: {
            allowedFileTypes: this.acceptFileType.replace(';', ', ')
          }
        };
      }
    }
    return {};
  }

  protected maxFileSizeValidator(control: FormControl): ValidationErrors {
    if (control.value && control.value.length > 0 && this.maxFileSize) {
      if (!this.files.every(file => file.size < this.maxFileSize)) {
        return {
          fileSize: {
            maxFileSize: this.maxFileSize
          }
        };
      }
    }
    return {};
  }

  protected maxFilesValidator(control: FormControl): ValidationErrors {
    if (control.value && control.value.length > 0 && this.multiple && this.maxFiles !== -1) {
      if (this.maxFiles < this.files.length) {
        return {
          numFile: {
            maxFiles: this.maxFiles
          }
        };
      }
    }
    return {};
  }

}

@NgModule({
  declarations: [OFileInputComponent],
  imports: [CommonModule, OSharedModule],
  exports: [OFileInputComponent]
})
export class OFileInputModule { }
