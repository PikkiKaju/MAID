using System;
using System.IO;
using System.IO.Compression;
using System.Threading.Tasks;
using MongoDB.Driver;
using MongoDB.Driver.GridFS;
using backend_aspdotnet.Models;
using backend_aspdotnet.Database;
using MongoDB.Bson;
using CsvHelper;
using System.Globalization;

namespace backend_aspdotnet.Services
{
    public interface IDatasetCsvService
    {
        Task<Guid> UploadCsvAsync(Stream fileStream, string fileName, Guid userId, bool isPublic);
        Task<Stream?> DownloadCsvAsync(Guid id);
        Task DeleteCsvAsync(Guid id);
    }
    public class DatasetCsvService : IDatasetCsvService
    {
        private readonly ElementDBConterxt _database;
        private readonly IGridFSBucket _bucket;

       
    public DatasetCsvService(ElementDBConterxt database)
    {
        _database = database;
        _bucket = new GridFSBucket(_database.GetDatabase());
    }


        public async Task<Guid> UploadCsvAsync(Stream fileStream, string fileName, Guid userId, bool isPublic)
        {
            string[] columns;
            using (var reader = new StreamReader(fileStream, leaveOpen: true))
            {
                var headerLine = await reader.ReadLineAsync();
                if (string.IsNullOrWhiteSpace(headerLine))
                    throw new InvalidDataException("CSV file is empty or missing headers.");

                // Split by comma (can adjust for semicolon, tab, etc.)
                columns = headerLine.Split(',').Select(c => c.Trim()).ToArray();
            }
            Console.WriteLine($"CSV Columns: {string.Join(", ", columns)}");

            using var compressedStream = new MemoryStream();
            using (var zlib = new ZLibStream(compressedStream, CompressionLevel.Optimal, leaveOpen: true))
            {
                await fileStream.CopyToAsync(zlib);
            }
            compressedStream.Position = 0;

            var fileId = Guid.NewGuid();
            var metadata = new CsvFileMetadata
            {
                FileId = fileId,
                FileName = fileName,
                UserId = userId,
                IsPublic = isPublic,
                CreatedAt = DateTime.UtcNow
            };

            await _bucket.UploadFromStreamAsync(fileId.ToString(), compressedStream, new GridFSUploadOptions
            {
                Metadata = metadata.ToBsonDocument()
            });

            return fileId;
        }

        public async Task<Stream?> DownloadCsvAsync(Guid id)
        {
            var filter = Builders<GridFSFileInfo>.Filter.Eq("metadata.FileId", id);
            var fileInfo = await _bucket.Find(filter).FirstOrDefaultAsync();

            if (fileInfo == null)
                return null;

            var output = new MemoryStream();
            await _bucket.DownloadToStreamAsync(fileInfo.Id, output);
            output.Position = 0;

            // Decompress before returning
            var decompressed = new MemoryStream();
            using (var zlib = new ZLibStream(output, CompressionMode.Decompress))
            {
                await zlib.CopyToAsync(decompressed);
            }
            decompressed.Position = 0;

            return decompressed;
        }
        
        public async Task<object> GetCsvColumnsAsync(Guid fileId, IEnumerable<string> selectedColumns)
        {
            // 1️⃣ Download file from GridFS
            using var downloadedStream = new MemoryStream();
            await _bucket.DownloadToStreamByNameAsync(fileId.ToString(), downloadedStream);
            downloadedStream.Position = 0;

            // 2️⃣ Decompress with Zlib
            using var decompressedStream = new MemoryStream();
            using (var zlib = new ZLibStream(downloadedStream, CompressionMode.Decompress))
            {
                await zlib.CopyToAsync(decompressedStream);
            }
            decompressedStream.Position = 0;

            // 3️⃣ Parse CSV
            using var reader = new StreamReader(decompressedStream);
            using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);

            // Read header
            csv.Read();
            csv.ReadHeader();
            var allHeaders = csv.HeaderRecord ?? throw new InvalidDataException("Missing header in CSV.");

            // Validate columns
            var columnsToRead = selectedColumns.Where(c => allHeaders.Contains(c)).ToList();
            if (!columnsToRead.Any())
                throw new ArgumentException("None of the specified columns were found in the CSV file.");

            // 4️⃣ Prepare column-wise data structure
            var columnData = columnsToRead.ToDictionary(c => c, c => new List<string>());

            // 5️⃣ Read rows and fill columns
            while (await csv.ReadAsync())
            {
                foreach (var col in columnsToRead)
                {
                    columnData[col].Add(csv.GetField(col));
                }
            }

            // 6️⃣ Prepare final response
            var response = new
            {
                FileId = fileId,
                Columns = columnsToRead,
                RowCount = columnData.First().Value.Count,
                Data = columnData
            };

            return response;
        }


        public async Task DeleteCsvAsync(Guid id)
        {
            var filter = Builders<GridFSFileInfo>.Filter.Eq("metadata.FileId", id);
            var fileInfo = await _bucket.Find(filter).FirstOrDefaultAsync();

            if (fileInfo != null)
                await _bucket.DeleteAsync(fileInfo.Id);
        }
    }
}
