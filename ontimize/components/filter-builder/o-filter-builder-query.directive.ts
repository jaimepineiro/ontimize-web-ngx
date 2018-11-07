import { Directive, Optional, Inject, forwardRef } from '@angular/core';

import { OFilterBuilderComponent } from './o-filter-builder-components';
import { Util } from '../../utils';

@Directive({
  selector: '[oFilterBuilderQuery]',
  inputs: [
    '_filterBuilder: oFilterBuilderQuery'
  ],
  host: {
    '(click)': 'onClick($event)'
  },
  exportAs: 'oFilterBuilderQuery'
})
export class OFilterBuilderQueryDirective {

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
      this._filterBuilder.triggerReload();
    }
  }

}
