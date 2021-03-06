import { Component, Injector, ViewChild, TemplateRef, OnInit, ElementRef, ViewEncapsulation, ChangeDetectionStrategy } from '@angular/core';
import { DateAdapter, MatDatepicker, MatDatepickerInputEvent, MAT_DATE_LOCALE } from '@angular/material';
import moment from 'moment';

import { Util } from '../../../../../utils';
import { OntimizeMomentDateAdapter } from '../../../../../shared';
import { InputConverter } from '../../../../../decorators';
import { MomentService } from '../../../../../services';
import { DateFilterFunction, ODateValueType, ODateInputComponent } from '../../../../input/date-input/o-date-input.component';
import { OBaseTableCellEditor } from '../o-base-table-cell-editor.class';

export const DEFAULT_INPUTS_O_TABLE_CELL_EDITOR_DATE = [
  ...OBaseTableCellEditor.DEFAULT_INPUTS_O_TABLE_CELL_EDITOR,
  'format',
  'locale',
  'oStartView: start-view',
  'min',
  'max',
  'oTouchUi: touch-ui',
  'startAt: start-at',
  'filterDate: filter-date',
  // value-type [timestamp|string]: type must be defined to be able to save its value,
  // e.g. classic ontimize server dates come as timestamps (number), but to be able to save them they have to be send as strings with
  // the format 'YYYY-MM-DD HH:mm:ss'Default: timestamp.
  'dateValueType: date-value-type'
];

export const DEFAULT_OUTPUTS_O_TABLE_CELL_EDITOR_DATE = [
  ...OBaseTableCellEditor.DEFAULT_OUTPUTS_O_TABLE_CELL_EDITOR
];

@Component({
  moduleId: module.id,
  selector: 'o-table-cell-editor-date',
  templateUrl: './o-table-cell-editor-date.component.html',
  styleUrls: ['./o-table-cell-editor-date.component.scss'],
  inputs: DEFAULT_INPUTS_O_TABLE_CELL_EDITOR_DATE,
  outputs: DEFAULT_OUTPUTS_O_TABLE_CELL_EDITOR_DATE,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: DateAdapter, useClass: OntimizeMomentDateAdapter, deps: [MAT_DATE_LOCALE] }
  ]
})

export class OTableCellEditorDateComponent extends OBaseTableCellEditor implements OnInit {

  public static DEFAULT_INPUTS_O_TABLE_CELL_EDITOR_DATE = DEFAULT_INPUTS_O_TABLE_CELL_EDITOR_DATE;
  public static DEFAULT_OUTPUTS_O_TABLE_CELL_EDITOR_DATE = DEFAULT_OUTPUTS_O_TABLE_CELL_EDITOR_DATE;

  @ViewChild('templateref', { read: TemplateRef }) public templateref: TemplateRef<any>;
  @ViewChild('input') inputRef: ElementRef;

  format: string = 'L';
  protected locale: string;
  oStartView: 'month' | 'year' = 'month';
  protected min: string;
  protected max: string;
  @InputConverter()
  oTouchUi: boolean = false;
  protected startAt: string;
  filterDate: DateFilterFunction;
  _dateValueType: ODateValueType = 'timestamp';

  oStartAt: Date;
  oMinDate: Date;
  oMaxDate: Date;

  private momentSrv: MomentService;
  minDateString: string;
  maxDateString: string;

  protected datepicker: MatDatepicker<Date>;
  constructor(
    protected injector: Injector,
    protected momentDateAdapter: DateAdapter<OntimizeMomentDateAdapter>
  ) {
    super(injector);
    this.momentSrv = this.injector.get(MomentService);
  }

  ngOnInit(): void {
    super.ngOnInit();
    if (!this.locale) {
      this.locale = this.momentSrv.getLocale();
    }
    if (this.format) {
      (this.momentDateAdapter as any).oFormat = this.format;
    }

    this.momentDateAdapter.setLocale(this.locale);
    if (this.startAt) {
      this.oStartAt = new Date(this.startAt);
    }

    if (this.min) {
      let date = new Date(this.min);
      let momentD = moment(date);
      if (momentD.isValid()) {
        this.oMinDate = date;
        this.minDateString = momentD.format(this.format);
      }
    }

    if (this.max) {
      let date = new Date(this.max);
      let momentD = moment(date);
      if (momentD.isValid()) {
        this.oMaxDate = date;
        this.maxDateString = momentD.format(this.format);
      }
    }
  }

  protected handleKeyup(event: KeyboardEvent) {
    const oColumn = this.table.getOColumn(this.tableColumn.attr);
    if (!oColumn) {
      return;
    }
    if (!oColumn.editing && this.datepicker && this.datepicker.opened) {
      this.datepicker.close();
    } else {
      super.handleKeyup(event);
    }
  }

  startEdition(data: any) {
    super.startEdition(data);
    if (!this.startAt) {
      this.oStartAt = this.getCellData();
    }
  }

  getCellData(): any {
    let value = super.getCellData();
    if (Util.isDefined(value)) {
      let result = value;
      let m;
      switch (this.dateValueType) {
        case 'string':
          m = moment(value, this.format);
          break;
        case 'date':
          break;
        case 'iso-8601':
        case 'timestamp':
        default:
          m = moment(value);
          break;
      }
      if (Util.isDefined(m)) {
        result = m.toDate();
      }
      return result;
    }
    return value;
  }

  commitEdition() {
    // !this.datepicker.opened &&
    if (!this.formControl.invalid) {
      this.oldValue = this._rowData[this.tableColumnAttr];
      this._rowData[this.tableColumnAttr] = this.getValueByValyType();
      if (!this.isSilentControl()) {
        this.endEdition(true);
        this.editionCommitted.emit(this._rowData);
      }
    }
  }

  protected getValueByValyType(): any {
    let result = this.formControl.value;
    const m = moment(this.formControl.value);
    switch (this.dateValueType) {
      case 'string':
        result = m.format(this.format);
        break;
      case 'date':
        result = new Date(result);
        break;
      case 'iso-8601':
        result = m.toISOString();
        break;
      case 'timestamp':
      default:
        result = m.valueOf();
        break;
    }
    return result;
  }

  onDateChange(event: MatDatepickerInputEvent<any>) {
    var isValid = event.value && event.value.isValid && event.value.isValid();
    if (isValid) {
      var dateVal = new Date(event.value.valueOf());
      this.formControl.setValue(dateVal, {
        emitModelToViewChange: false,
        emitEvent: false
      });
      this.commitEdition();
    }
  }

  openDatepicker(d: MatDatepicker<Date>) {
    this.datepicker = d;
    d.open();
  }

  set dateValueType(val: any) {
    this._dateValueType = ODateInputComponent.convertToODateValueType(val);
  }

  get dateValueType(): any {
    return this._dateValueType;
  }

  onClosed() {
    this.inputRef.nativeElement.focus();
  }
}
