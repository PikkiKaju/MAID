using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Threading .Tasks;
using CsvHelper;
using Microsoft.AspNetCore.Http;

namespace backend_aspdotnet.Services
{
    public class DatasetCsvParser
    {
        public DatasetCsvParser()
        {
        }

        /// <summary>
        /// Main entry point: parses and preprocesses a CSV dataset.
        /// </summary>
        public async Task<List<List<string>>> ParseDatasetAsync(
            IFormFile file,
            string columnTransform,
            string emptyTransform)
        {
            using var reader = new StreamReader(file.OpenReadStream());
            var firstLine = await reader.ReadLineAsync();
            if (firstLine == null)
                throw new Exception("File is empty.");

            char separator = DetectSeparator(firstLine);

            reader.BaseStream.Seek(0, SeekOrigin.Begin);
            reader.DiscardBufferedData();

            var dataset = await LoadDatasetAsync(reader, separator);
            dataset = EnsureColumnNames(dataset);
            dataset = TransformNonNumericColumns(dataset, columnTransform);
            dataset = HandleEmptyValues(dataset, emptyTransform);
            
            return dataset;
        }

        /// <summary>
        /// Detects the column separator by analyzing the first line.
        /// </summary>
        private char DetectSeparator(string line)
        {
            var candidates = new[] { ',', ';', '\t', '|', ' ' };
            var detected = candidates
                .Select(c => new { c, count = line.Count(ch => ch == c) })
                .OrderByDescending(x => x.count)
                .First().c;

            return detected;
        }

        /// <summary>
        /// Loads dataset into a list of string lists using CsvHelper.
        /// </summary>
        private async Task<List<List<string>>> LoadDatasetAsync(StreamReader reader, char separator)
        {
            var config = new CsvHelper.Configuration.CsvConfiguration(CultureInfo.InvariantCulture)
            {
                Delimiter = separator.ToString(),
                IgnoreBlankLines = true,
                BadDataFound = null,
                HasHeaderRecord = false
            };

            using var csv = new CsvReader(reader, config);

            var dataset = new List<List<string>>();
            await foreach (var record in csv.GetRecordsAsync<dynamic>())
            {
                var row = ((IDictionary<string, object>)record)
                    .Values
                    .Select(v => v?.ToString()?.Trim() ?? string.Empty)
                    .ToList();
                dataset.Add(row);
            }

            return dataset;
        }

        /// <summary>
        /// Ensures column names exist; if not, generates A, B, C, ...
        /// </summary>
        private List<List<string>> EnsureColumnNames(List<List<string>> data)
        {
            if (data.Count == 0)
                return data;

            var header = data[0];
            bool hasHeader = header.All(name => !string.IsNullOrWhiteSpace(name));

            if (!hasHeader)
            {
                var columnCount = header.Count;
                var newHeader = Enumerable.Range(0, columnCount)
                    .Select(i => ((char)('A' + i)).ToString())
                    .ToList();

                data[0] = newHeader;
            }

            return data;
        }

        /// <summary>
        /// Checks if a given column is numeric (int, float, double, etc.)
        /// </summary>
        private bool IsNumericColumn(List<List<string>> data, int columnIndex)
        {
            if (data.Count <= 1)
                return false;

            foreach (var row in data.Skip(1))
            {
                if (columnIndex >= row.Count)
                    continue;

                var value = row[columnIndex];
                if (string.IsNullOrWhiteSpace(value))
                    continue;

                if (!double.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out _))
                    return false;
            }

            return true;
        }

        /// <summary>
        /// Removes non-numeric columns entirely from the dataset.
        /// </summary>
        private List<List<string>> RemoveNonNumericColumns(List<List<string>> data)
        {
            if (data.Count == 0)
                return data;

            var header = data[0];
            var rows = data.Skip(1).ToList();

            var numericColumns = Enumerable
                .Range(0, header.Count)
                .Where(i => IsNumericColumn(data, i))
                .ToList();

            var newHeader = numericColumns.Select(i => header[i]).ToList();
            var newRows = rows
                .Select(r => numericColumns.Select(i => r.ElementAtOrDefault(i) ?? "").ToList())
                .ToList();

            var cleaned = new List<List<string>> { newHeader };
            cleaned.AddRange(newRows);
            return cleaned;
        }

        /// <summary>
        /// Converts non-numeric columns into numeric form by mapping text values to integers.
        /// Includes special handling for "yes"/"no".
        /// </summary>
        /// <summary>
        /// Converts non-numeric columns into numeric form by mapping all unique text values to integer indices.
        /// </summary>
        private List<List<string>> ConvertNonNumericColumnsToNumeric(List<List<string>> data)
        {
            if (data.Count == 0)
                return data;

            var header = data[0];
            var rows = data.Skip(1).ToList();

            var nonNumericColumns = Enumerable
                .Range(0, header.Count)
                .Where(i => !IsNumericColumn(data, i))
                .ToList();

            foreach (var col in nonNumericColumns)
            {
                // Build a list of unique values in this column
                var uniqueValues = rows
                    .Select(r => r.ElementAtOrDefault(col)?.Trim().ToLower() ?? "")
                    .Where(v => !string.IsNullOrWhiteSpace(v))
                    .Distinct()
                    .ToList();

                // Replace all text values with their numeric index
                foreach (var row in rows)
                {
                    var val = row.ElementAtOrDefault(col)?.Trim().ToLower();
                    if (string.IsNullOrWhiteSpace(val))
                        continue;

                    int idx = uniqueValues.IndexOf(val);
                    row[col] = idx >= 0 ? idx.ToString() : "0";
                }
            }

            return data;
        }

        /// <summary>
        /// Controls non-numeric column handling based on the transform mode ("remove" or "convert").
        /// </summary>
        private List<List<string>> TransformNonNumericColumns(List<List<string>> data, string columnTransform)
        {
            if (data.Count == 0)
                return data;

            return columnTransform.ToLower() switch
            {
                "remove" => RemoveNonNumericColumns(data),
                "convert" => ConvertNonNumericColumnsToNumeric(data),
                _ => data
            };
        }

        /// <summary>
        /// Removes all rows that contain any empty (blank or whitespace) cell.
        /// </summary>
        private List<List<string>> RemoveRowsWithEmptyValues(List<List<string>> data)
        {
            if (data.Count <= 1)
                return data;

            var header = data[0];
            var rows = data.Skip(1)
                        .Where(row => row.All(cell => !string.IsNullOrWhiteSpace(cell)))
                        .ToList();

            var cleaned = new List<List<string>> { header };
            cleaned.AddRange(rows);
            return cleaned;
        }

        /// <summary>
        /// Replaces empty numeric cells with the average value of their column.
        /// Non-numeric columns are ignored.
        /// </summary>
        private List<List<string>> FillEmptyValuesWithAverage(List<List<string>> data)
        {
            if (data.Count <= 1)
                return data;

            var header = data[0];
            var rows = data.Skip(1).ToList();
            int columnCount = header.Count;

            // Calculate column averages for numeric columns
            var columnAverages = new Dictionary<int, double>();
            for (int i = 0; i < columnCount; i++)
            {
                if (!IsNumericColumn(data, i))
                    continue;

                var numericValues = rows
                    .Select(r => double.TryParse(r.ElementAtOrDefault(i), NumberStyles.Any, CultureInfo.InvariantCulture, out var v) ? v : double.NaN)
                    .Where(v => !double.IsNaN(v))
                    .ToList();

                if (numericValues.Any())
                    columnAverages[i] = numericValues.Average();
            }

            // Replace empty numeric cells with column averages
            foreach (var row in rows)
            {
                for (int i = 0; i < columnCount; i++)
                {
                    if (string.IsNullOrWhiteSpace(row.ElementAtOrDefault(i)) && columnAverages.ContainsKey(i))
                    {
                        row[i] = columnAverages[i].ToString(CultureInfo.InvariantCulture);
                    }
                }
            }

            var result = new List<List<string>> { header };
            result.AddRange(rows);
            return result;
        }


        /// <summary>
        /// Controls how empty values are handled based on the chosen transform mode ("remove" or "average").
        /// </summary>
        private List<List<string>> HandleEmptyValues(List<List<string>> data, string emptyTransform)
        {
            if (data.Count == 0)
                return data;

            return emptyTransform.ToLower() switch
            {
                "remove" => RemoveRowsWithEmptyValues(data),
                "average" => FillEmptyValuesWithAverage(data),
                _ => data
            };
        }
    }
}
