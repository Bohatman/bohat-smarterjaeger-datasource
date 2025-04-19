import { FetchResponse, getBackendSrv, isFetchError } from '@grafana/runtime';
import {
  CoreApp,
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  createDataFrame,
  FieldType,
} from '@grafana/data';

import { MyQuery, MyDataSourceOptions, DEFAULT_QUERY, DataSourceResponse } from './types';
import { lastValueFrom } from 'rxjs';
import defaults from 'lodash/defaults';
export class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
  baseUrl: string;
  maxParallel: number;

  constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);
    this.baseUrl = instanceSettings.url!;
    this.maxParallel = instanceSettings.jsonData?.maxParallel || 10;
  }

  getDefaultQuery(_: CoreApp): Partial<MyQuery> {
    return DEFAULT_QUERY;
  }

  filterQuery(query: MyQuery): boolean {
    // if no query has been provided, prevent the query from being executed
    return !!query.service;
  }
  splitTimeRange(fromMs: number, toMs: number, parts = 10) {
    if (toMs <= fromMs) {
      throw new Error("End time must be greater than start time");
    }
  
    const totalDuration = toMs - fromMs;
    const interval = Math.floor(totalDuration / parts);
    const ranges = [];
  
    for (let i = 0; i < parts; i++) {
      const start = fromMs + i * interval;
      const end = (i < parts - 1) ? start + interval : toMs; // Ensure the last range ends exactly at toMs
      ranges.push({ start, end });
    }
    return ranges;
  }
  processTages(tags: string[]) {
    let tagMap: any = {};
    tags.forEach((tag) => {
      let parts = tag.split('=');
      if (parts.length === 2) {
        let key = parts[0].trim();
        let value = parts[1].trim();
        tagMap[key] = value;
      }
    });
    return tagMap;
  }
  filterUndifineFromMap(map: any) {
    let filteredMap: any = {};
    for (let key in map) {
      if (map[key] !== undefined) {
        filteredMap[key] = map[key];
      }
    }
    return filteredMap;
  }
  arrayToMap(array: string[]) {
    let map: any= {};
    if(array === undefined){
      return map;
    }
    array.forEach((item) => {
      map[item] = null;
    });
    return map;
  }
  processQueryParams(query: NonNullable<Partial<MyQuery> & MyQuery>) {
    let params: any = {};
    if (query.service) {
      params['service'] = query.service;
    }
    if (query.operation && query.operation !== 'ALL') {
      params['operation'] = query.operation;
    }
    if (query.maxDuration) {
      params['maxDuration'] = query.maxDuration;
    }
    if (query.minDuration) {
      params['minDuration'] = query.minDuration;
    }
    let tags = this.processTages(query.tags);
    params["tags"] = JSON.stringify(tags);
    if(query.limit){
      params['limit'] = query.limit;
    }
    return params;
  }
  createCustomDataFrame(refId: string,results: any[], extractTags={}){
    let tagsValues: any = {};
    let tags = Object.keys(extractTags);
    let traceIds: any = [];
    let spandIds: any = [];
    let durations: any = [];
    let startTimes: any = [];
    let operationNames: any = [];
    for(let i = 0; i < tags.length; i++) {
      let tag = tags[i];
      tagsValues[tag] = [];
    }
    for(let i = 0; i < results.length; i++) {
      let g: any[] = results[i]
      for(let i = 0; i < g.length; i++) {
        let result: any = g[i];
        traceIds.push(result.traceID);
        spandIds.push(result.spanID);
        durations.push(result.duration);
        startTimes.push(result.startTime);
        operationNames.push(result.operationName);
        for(let j = 0; j < tags.length; j++){
          let tag = tags[j];
          tagsValues[tag].push(result[tag] ? result[tag] : null);
        }
      }
    }
    const fields = [];
    fields.push({name: "traceID", type: FieldType.string, values: traceIds});
    fields.push({name: "spanID", type: FieldType.string, values: spandIds});
    fields.push({name: "duration", type: FieldType.number, values: durations});
    fields.push({name: "startTime", type: FieldType.time, values: startTimes});
    fields.push({name: "operationName", type: FieldType.string, values: operationNames});
    for(let i = 0; i < tags.length; i++){
      let tag = tags[i];
      fields.push({name: tag, type: FieldType.string, values: tagsValues[tag]});
    }
    return createDataFrame({
      refId: refId,
      fields: fields
  });
  }
  async randomSleep() {
    return new Promise((resolve, reject) => {
      setTimeout(resolve, 100, "foo");
    });
  }
  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    const { range } = options;
    const from = range!.from.valueOf();
    const to = range!.to.valueOf();
    let parts = this.splitTimeRange(from, to, this.maxParallel);

    // 1744563600000000
    // 1744618527930
    const callJaegerApi = async (params: any,fromNanos: number,toNanos: number, extractTags: any={}) => {
      let retry = 2;
      let cloneParams = JSON.parse(JSON.stringify(params));
      cloneParams['start'] = fromNanos;
      cloneParams['end'] = toNanos;
      const queryString = new URLSearchParams(cloneParams as any).toString();
      console.log(queryString);
      let response: FetchResponse<DataSourceResponse> | null = null;
      const results: any[] = [];
      let isSuccess = false;
      for(let i = 0; i < retry; i++){
        response = await this.request("/api/traces", queryString);
        if (response.status === 200) {
          isSuccess = true;
          break;
        }
      }
      if(isSuccess === false || response == null){
        return results;
      }
      const service = params['service'];
      const operation = params['operation'];
      const dataModel: any = response.data;
      const traces: any[] = dataModel.data;
      
      for(let i = 0; i < traces.length; i++) {
        let trace = traces[i];
        let processes = trace.processes;
        let processKeys = Object.keys(processes);
        let focusProcess = new Set<string>();
        for(let j =0; j < processKeys.length; j++){
          if(processes[processKeys[j]]["serviceName"] === service){
            focusProcess.add(processKeys[j]);
          }
        }
        let spans = trace.spans;
        for(let s = 0; s < spans.length; s++){
          let span = spans[s];
          if(!span["operationName"] === operation || !operation === undefined){
            continue;
          }
          if(!focusProcess.has(span["processID"])){
            continue;
          }
          let tags = span["tags"];
          let spanExtractTags: any = {...extractTags};
          for(let k = 0; k < tags.length; k++){
            let tag = tags[k];
            let tagKey = tag["key"] as string;
            let isExtractTag = extractTags[tagKey] === undefined ? false : true;
            let tagValue = tag["value"] as string;
            if(isExtractTag){
              spanExtractTags[tagKey] = tagValue;
            }
          }
          let spanData = {
            traceID: trace.traceID,
            spanID: span.spanID,
            operationName: span.operationName,
            startTime: span.startTime / 1_000,
            duration: span.duration,
          };
          let spanIncludedTags: any = {...spanData, ...spanExtractTags};
          results.push(spanIncludedTags);
        }
      }
      return results;
    }
    const targetMapper: any = {};
    for (let i = 0; i < options.targets.length; i++) {
      const target = options.targets[i];
      const query = defaults(target, DEFAULT_QUERY);
      let baseParams = this.processQueryParams(query);
      console.log(baseParams)
      baseParams['lookback'] = "custom";
      const extractTags = this.arrayToMap(query.extractTags);
      let allPromises: any = [];

      for(let j = 0; j < parts.length; j++){
        let part = parts[j];
        let start = part.start;
        let end = part.end;
        let fromNanos = start * 1_000;
        let toNanos = end * 1_000;
        allPromises.push(callJaegerApi(baseParams, fromNanos, toNanos, extractTags));
      }
      const all = await Promise.all(allPromises);
      targetMapper[target.refId] = this.createCustomDataFrame(target.refId, all, extractTags);
    }
    
    const data = options.targets.map((target) => {
      return targetMapper[target.refId];
    });
    return { data };
  }

  async request(url: string, params?: string) {
    const response = getBackendSrv().fetch<DataSourceResponse>({
      url: `${this.baseUrl}${url}${params?.length ? `?${params}` : ''}`,
    });
    return lastValueFrom(response);
  }

  /**
   * Checks whether we can connect to the API.
   */
  async testDatasource() {
    const defaultErrorMessage = 'Cannot connect to API';

    try {
      const response = await this.request('/search');
      if (response.status === 200) {
        return {
          status: 'success',
          message: 'Success',
        };
      } else {
        return {
          status: 'error',
          message: response.statusText ? response.statusText : defaultErrorMessage,
        };
      }
    } catch (err) {
      let message = '';
      if (typeof err === 'string') {
        message = err;
      } else if (isFetchError(err)) {
        message = 'Fetch error: ' + (err.statusText ? err.statusText : defaultErrorMessage);
        if (err.data && err.data.error && err.data.error.code) {
          message += ': ' + err.data.error.code + '. ' + err.data.error.message;
        }
      }
      return {
        status: 'error',
        message,
      };
    }
  }
}
