import { BotService, BotServiceOptions } from 'src/BotService';
import { Filter, FilterBehavior, FilterData, FilterValue } from 'src/filter';

export type BaseFilterOptions<TData extends FilterData> = BotServiceOptions<TData>;

/**
 * Most filters are stateless, this implements methods for them.
 */
export abstract class BaseFilter<TData extends FilterData> extends BotService<TData> implements Filter {
  public abstract check(val: FilterValue): Promise<FilterBehavior>;
}
