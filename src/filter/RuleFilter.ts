import { Filter, FilterBehavior, FilterData, FilterValue } from 'src/filter';
import { BaseFilter, BaseFilterOptions } from 'src/filter/BaseFilter';
import { Match, MatchData } from 'src/utils/match';

export interface RuleFilterData extends FilterData {
  match: MatchData;
}

export abstract class RuleFilter extends BaseFilter<RuleFilterData> implements Filter {
  protected matcher: Match;

  constructor(options: BaseFilterOptions<RuleFilterData>, schemaPath: string) {
    super(options, schemaPath);

    this.matcher = new Match(options.data.match);
  }

  public abstract async check(value: FilterValue): Promise<FilterBehavior>;
}
