

# Smarter-Jaeger
This plugin is designed to solve the common issue encountered when querying large datasets or wide time ranges from a Jaeger datasource. Under such conditions, the Jaeger backend may struggle to return complete results due to timeouts or memory constraints. The Jaeger Query Splitter Plugin helps mitigate this by breaking down large queries into smaller, more manageable requests and aggregating the results.

## ✨ Features

- Automatically splits large time-range queries into smaller intervals
- Executes multiple parallel or sequential sub-queries
- Aggregates and merges trace data for complete visibility
- Reduces the chance of timeouts or partial responses
- Configurable split interval and request behavior
- Add tags value to data

## Screenshots
### Datasource
![datasource](https://github.com/Bohatman/bohat-smarterjaeger-datasource/blob/main/src/img/screenshot/datasource.png)
### Config
![config](https://github.com/Bohatman/bohat-smarterjaeger-datasource/blob/main/src/img/screenshot/config.png)
### Query
![query](https://github.com/Bohatman/bohat-smarterjaeger-datasource/blob/main/src/img/screenshot/query.png)
### Data
![query](https://github.com/Bohatman/bohat-smarterjaeger-datasource/blob/main/src/img/screenshot/data.png)
