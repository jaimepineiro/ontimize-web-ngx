import { Directive, Optional, forwardRef, Inject } from '@angular/core';

import { OFilterBuilderComponent } from './o-filter-builder-components';
import { Util } from '../../utils';

@Directive({
  selector: '[oFilterBuilderClear]',
  inputs: [
    '_filterBuilder: oFilterBuilderClear'
  ],
  host: {
    '(click)': 'onClick($event)'
  },
  exportAs: 'oFilterBuilderClear'
})
export class OFilterBuilderClearDirective {

  protected _filterBuilder: OFilterBuilderComponent;

  constructor(
    @Optional() @Inject(forwardRef(() => OFilterBuilderComponent)) protected filterBuilder: OFilterBuilderComponent
  ) {
    if (Util.isDefined(filterBuilder)) {
      this._filterBuilder = filterBuilder;
    }
  }

  onClick(e?: Event): void {
    if (this._filterBuilder) {
      this._filterBuilder.clearFilter();
    }
  }

}
