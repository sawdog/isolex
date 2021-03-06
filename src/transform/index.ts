import { BotServiceData } from 'src/BotService';
import { FilterData, FilterValue } from 'src/filter';
import { Service, ServiceDefinition } from 'src/Service';
import { TemplateScope } from 'src/utils/Template';

export interface TransformData extends BotServiceData {
  filters: Array<ServiceDefinition<FilterData>>;
}

export interface Transform extends Service {
  check(entity: FilterValue): Promise<boolean>;

  transform(entity: FilterValue, type: string, body: TemplateScope): Promise<TemplateScope>;
}
