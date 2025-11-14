using System;
using System.IO;
using System.IO.Compression;
using System.Text;
using System.Threading.Tasks;
using backend_aspdotnet.Database;
using Microsoft.AspNetCore.Http;
using MongoDB.Bson;
using MongoDB.Driver;
using MongoDB.Driver.GridFS;

namespace backend_aspdotnet.Services
{
    public class DatasetService
    {
        private readonly ElementDBConterxt _database;
        private readonly IGridFSBucket _bucket;
        private readonly DatasetCsvParser _parser;
        public DatasetService(ElementDBConterxt database, DatasetCsvParser parser)
        {
            _parser = parser;
            _database = database;
            _bucket = new GridFSBucket(_database.GetDatabase());

        }

        /// <summary>
        /// Saves and processes an uploaded CSV dataset.
        /// </summary>
        public async Task<Guid> SaveCsVDatasetAsync(
            IFormFile file,
            string columnTransform,
            string emptyTransform)


        {
            if (file == null || file.Length == 0)
                throw new ArgumentException("No CSV file uploaded");

            var parsedData = await _parser.ParseDatasetAsync(file, columnTransform, emptyTransform);

            using var csvStream = new MemoryStream();
            using (var writer = new StreamWriter(csvStream, leaveOpen: true))
            {
                foreach (var row in parsedData)
                {
                    await writer.WriteLineAsync(string.Join(",", row));
                }
                await writer.FlushAsync();
            }
            csvStream.Position = 0;

            using var compressedStream = new MemoryStream();
            using (var gzip = new GZipStream(compressedStream, CompressionLevel.Optimal, leaveOpen: true))
            {
                await csvStream.CopyToAsync(gzip);
            }
            await compressedStream.FlushAsync();
            compressedStream.Position = 0;

            // --- Prepare metadata ---
            var fileId = Guid.NewGuid();

            await _bucket.UploadFromStreamAsync(
                fileId.ToString(),
                compressedStream
                );

            return fileId;
        }


        public async Task DeleteCsvDatasetAsync(Guid fileId)
        {
            // Convert GUID to string, since that's how you stored it
            var filter = Builders<GridFSFileInfo>.Filter.Eq(f => f.Filename, fileId.ToString());

            // Find the file in GridFS
            var fileInfo = await _bucket.Find(filter).FirstOrDefaultAsync();

            if (fileInfo == null)
            {
                throw new FileNotFoundException($"File with ID {fileId} not found in GridFS.");
            }

            // Delete by ObjectId
            await _bucket.DeleteAsync(fileInfo.Id);
        }

        /// <summary>
        /// Saves and processes an uploaded CSV dataset.
        /// </summary>

        public async Task<string> GetCsvDatasetAsync(Guid datasetId)
        {
            try
            {
                using var downloadStream = await _bucket.OpenDownloadStreamByNameAsync(datasetId.ToString());
                using var gzip = new GZipStream(downloadStream, CompressionMode.Decompress);
                using var reader = new StreamReader(gzip, Encoding.UTF8);

                return await reader.ReadToEndAsync();
            }
            catch (GridFSFileNotFoundException)
            {
                throw new FileNotFoundException($"Dataset with ID {datasetId} not found in MongoDB.");
            }
            catch (Exception ex)
            {
                throw new Exception($"Error retrieving dataset: {ex.Message}", ex);
            }
        }

        public async Task<double[]> GetCsvNumericColumnAsync(Guid datasetId, string columnName)
        {
            try
            {
                using var downloadStream = await _bucket.OpenDownloadStreamByNameAsync(datasetId.ToString());
                using var gzip = new GZipStream(downloadStream, CompressionMode.Decompress);
                using var reader = new StreamReader(gzip, Encoding.UTF8);

                var content = await reader.ReadToEndAsync();
                var lines = content.Split('\n', StringSplitOptions.RemoveEmptyEntries);

                var headers = lines[0].Split(',');
                int columnIndex = Array.IndexOf(headers, columnName);

                if (columnIndex == -1)
                    throw new Exception($"Column '{columnName}' not found.");

                var values = new List<double>();

                for (int i = 1; i < lines.Length; i++)
                {
                    var row = lines[i].Trim();
                    if (string.IsNullOrWhiteSpace(row)) continue;

                    var cells = row.Split(',');
                    if (cells.Length <= columnIndex) continue;

                    var raw = cells[columnIndex].Trim();

                    if (double.TryParse(
                        raw,
                        System.Globalization.NumberStyles.Float,
                        System.Globalization.CultureInfo.InvariantCulture,
                        out double num))
                    {
                        values.Add(num);
                    }
                }

                return values.ToArray();
            }
            catch (GridFSFileNotFoundException)
            {
                throw new FileNotFoundException($"Dataset {datasetId} not found.");
            }
        }


        public async Task<Guid> SavePhotoDatasetAsync(IFormFile zipFile)
        {
            if (zipFile == null || zipFile.Length == 0)
                throw new ArgumentException("No ZIP file uploaded");

            if (!zipFile.FileName.EndsWith(".zip", StringComparison.OrdinalIgnoreCase))
                throw new ArgumentException("Uploaded file must be a ZIP archive");

            using var zipStream = new MemoryStream();
            await zipFile.CopyToAsync(zipStream);
            zipStream.Position = 0;

            using var archive = new ZipArchive(zipStream, ZipArchiveMode.Read, leaveOpen: true);

            if (archive.Entries.Count == 0)
                throw new ArgumentException("ZIP archive is empty");

            var allowedExtensions = new HashSet<string> { ".png", ".jpg", ".jpeg" };

            foreach (var entry in archive.Entries)
            {
                // Skip directory entries
                if (entry.FullName.EndsWith("/"))
                    continue;

                // Check for nested folders deeper than 1 level (Folder/File)
                if (entry.FullName.Count(c => c == '/') > 1)
                    throw new ArgumentException($"Nested folders are not allowed: {entry.FullName}");

                // Ensure file is in a folder (no root files)
                if (!entry.FullName.Contains("/"))
                    throw new ArgumentException($"Files must be inside folders: {entry.FullName}");

                var ext = Path.GetExtension(entry.FullName).ToLowerInvariant();

                if (!allowedExtensions.Contains(ext))
                    throw new ArgumentException($"Invalid file type: {entry.FullName}. Allowed: PNG, JPG");
            }
            zipStream.Position = 0;
            var fileId = Guid.NewGuid();

            await _bucket.UploadFromStreamAsync(
                fileId.ToString(),
                zipStream
            );

            return fileId;
        }

        /// <summary>
        /// Deletes a dataset by its UUID key.
        /// </summary>
        public async Task DeletePhotoDatasetAsync(Guid fileId)
        {
            // Convert GUID to string, since that's how you stored it
            var filter = Builders<GridFSFileInfo>.Filter.Eq(f => f.Filename, fileId.ToString());

            // Find the file in GridFS
            var fileInfo = await _bucket.Find(filter).FirstOrDefaultAsync();

            if (fileInfo == null)
                throw new FileNotFoundException($"File with ID {fileId} not found in GridFS.");

            // Delete by ObjectId
            await _bucket.DeleteAsync(fileInfo.Id);
        }

        /// <summary>
        /// Saves and processes an uploaded CSV dataset.
        /// </summary>

        public async Task<byte[]> GetPhotoDatasetAsync(Guid datasetId)
        {
            try
            {
                using var downloadStream = await _bucket.OpenDownloadStreamByNameAsync(datasetId.ToString());
                using var memoryStream = new MemoryStream();
                await downloadStream.CopyToAsync(memoryStream);
                return memoryStream.ToArray();
            }
            catch (GridFSFileNotFoundException)
            {
                throw new FileNotFoundException($"ZIP dataset {datasetId} not found in MongoDB.");
            }
        }

    }
}
