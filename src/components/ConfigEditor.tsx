import React, { ChangeEvent } from 'react';
import { DataSourceHttpSettings, InlineField, Input } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { MyDataSourceOptions, MySecureJsonData } from '../types';

interface Props extends DataSourcePluginOptionsEditorProps<MyDataSourceOptions, MySecureJsonData> {}

export function ConfigEditor(props: Props) {
  const { onOptionsChange, options } = props;
  const { jsonData } = options;


  return (
    <>
    <InlineField label="Max Parallel" tooltip="Max parallel requests">
      <Input
        type="number"
        value={jsonData.maxParallel || 10}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          onOptionsChange({
            ...options,
            jsonData: {
              ...jsonData,
              maxParallel: parseInt(event.target.value, 10),
            },
          });
        }
        }
        placeholder="Max parallel requests"
        width={40}
      />
    </InlineField>
      <DataSourceHttpSettings 
      defaultUrl='http://127.0.0.1:16686' dataSourceConfig={options} onChange={onOptionsChange} />
    </>
  );
}
