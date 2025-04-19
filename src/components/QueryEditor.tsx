import React, { ChangeEvent, useState } from 'react';
import { Combobox, ComboboxOption, InlineField, TagsInput } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { MyDataSourceOptions, MyQuery } from '../types';
import { getBackendSrv } from '@grafana/runtime';


type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;



export function QueryEditor({ query, onChange, onRunQuery }: Props) {
  const [selectedService, setSelectedService] = useState<string>(query.service);
  const [tags, setTags] = useState<string[]>(query.tags || []);
  const [tagError, setTagError] = useState<boolean>(false);

  const handleServiceChange = (v: ComboboxOption<string>) => {
    onChange({ ...query, service: v?.value || '' });
    onRunQuery();
    setSelectedService(v?.value);
  };
  const handleOperationChange = (v: ComboboxOption<string>) => {
    onChange({ ...query, operation: v?.value || '' });
    onRunQuery();
  };
  const handleTagsChanges = (v: string[]) => {
    if(v.length > 0){
      let lastValue = v[v.length-1];
      // validate lastValue with logfmt format
      let regex = new RegExp("^[a-zA-Z0-9._-]+=[a-zA-Z0-9._-]+$");
      if(!regex.test(lastValue)){
        v.pop();
        setTagError(true);
        return;
      }else{
        setTagError(false);
      }
    }
    onChange({ ...query, tags: v });
    onRunQuery();
    setTags(v);
  };

  const loadServices = async (): Promise<Array<ComboboxOption<string>>> => {
    const response = await getBackendSrv().get("/api/datasources/proxy/uid/"+query.datasource?.uid+"/api/services");
    let serviceOptions: ComboboxOption[] = [];
    response?.data.map((item: string) => {
      let _o: ComboboxOption<string> = {
        value: item
      };
      serviceOptions.push(_o);
    });
    return serviceOptions;
  }
  const loadOperation = async (): Promise<Array<ComboboxOption<string>>> => {
    let serviceOptions: ComboboxOption[] = [{value: "ALL"}];
    if(selectedService === undefined){
        return serviceOptions;
    }
    const response = await getBackendSrv().get("/api/datasources/proxy/uid/"+query.datasource?.uid+"/api/services/" + selectedService + "/operations");
    if(response.data === null){
      return serviceOptions;
    }
    response?.data.map((item: string) => {
      let _o: ComboboxOption<string> = {
        value: item
      };
      serviceOptions.push(_o);
    });
    return serviceOptions;
  }

  return <>
      <InlineField label="Service">
      <Combobox
       options={loadServices}
       onChange={handleServiceChange}
       value={query.service}
       width={100}
      />
      </InlineField>
      <InlineField label="Operation">
        <Combobox
        options={loadOperation}
        onChange={handleOperationChange}
        width={100}
        value={query.operation}
        />
      </InlineField>
      <InlineField label="Tags" 
      invalid={tagError} 
      error={tagError ? "Invalid tag format" : undefined} 
      tooltip='Values should be in the logfmt format. Example: "key=value"'>
        <TagsInput
          id="query-editor-tags"
          onChange={handleTagsChanges}
          tags={tags}
          width={100}
        />
      </InlineField>
      <InlineField label="Extract Tags">
        <TagsInput
          id="query-editor-extract-tags"
          onChange={(v: string[]) => {
            onChange({ ...query, extractTags: v });
            onRunQuery();
          }}
          tags={query.extractTags}
          width={100}
        />
      </InlineField>
      <InlineField label="Max Duration">
        <input
          type="number"
          value={query.maxDuration}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            onChange({ ...query, maxDuration: e.target.value });
            onRunQuery();
          }}
        />
      </InlineField>
      <InlineField label="Min Duration">
        <input
          type="number"
          value={query.minDuration}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            onChange({ ...query, minDuration: e.target.value });
            onRunQuery();
          }}
        />
      </InlineField>
      <InlineField label="Limit" tooltip={"Max number of results to return (maxParallel=10 and limit=10 mean total data points = 100)"} >
        <input
          type="number"
          value={query.limit}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            onChange({ ...query, limit: parseInt(e.target.value, 10) });
            onRunQuery();
          }}
        />
      </InlineField>
  </>;
}
