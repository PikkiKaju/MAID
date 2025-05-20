using backend_aspdotnet.Database;
using backend_aspdotnet.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MongoDB.Bson;
using MongoDB.Driver;
using System.Data;
using System.Security.Claims;

namespace backend_aspdotnet.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DatasetController : ControllerBase
    {

        private readonly AppDbContext _postgresDb;
        private readonly ElementDBConterxt _mongoDb;

        public DatasetController(AppDbContext postgeres, ElementDBConterxt mongo)
        {
            _postgresDb = postgeres;
            _mongoDb = mongo;
        }

        [Authorize]
        [HttpPost("upload-csv")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadCsv([FromForm] IFormFile file)
        {
            // if file exists
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");

            // user exists
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized("User ID not found in token.");

            var fileName = Path.GetFileNameWithoutExtension(file.FileName);

            // if name in database
            var existingDataset = await _postgresDb.Datasets
                .Where(d => d.UserId == userId && d.Name == fileName)
                .FirstOrDefaultAsync();

            if (existingDataset != null)
                return BadRequest("Dataset with this name already exists.");

            // Count how many datasets user already has
            var datasetCount = await _postgresDb.Datasets
                .CountAsync(d => d.UserId == userId);

            if (datasetCount >= 5)
                return BadRequest("User has reached dataset limit (5).");

            using var reader = new StreamReader(file.OpenReadStream());
            var content = await reader.ReadToEndAsync();
            var lines = content.Split('\n', StringSplitOptions.RemoveEmptyEntries);

            if (lines.Length > 1000)
                return BadRequest("CSV too large. Max 1000 lines allowed.");

            var header = lines[0].Trim().Split(',');
            if (header.Length < 2 || header.Length > 10)
                return BadRequest("CSV must have between 2 and 10 columns.");

            // Parse data into Mongo format
            var dataDict = new Dictionary<string, List<string>>();
            foreach (var col in header)
                dataDict[col] = new List<string>();

            for (int i = 1; i < lines.Length; i++)
            {
                var values = lines[i].Trim().Split(',');
                for (int j = 0; j < header.Length && j < values.Length; j++)
                {
                    dataDict[header[j]].Add(values[j]);
                }
            }

            // Store metadata in Postgres
            var metadata = new DatasetMeta
            {
                Id = Guid.NewGuid(),
                Name = fileName,
                UserId = userId,
                CreatedAt = DateTime.UtcNow
            };

            // Store in Mongo
            RawDataset datasetDoc = new RawDataset()
            {
                Id = metadata.Id,
                Columns = header.ToList(),
                Data = dataDict
            };
            await _mongoDb.Datasets.InsertOneAsync(datasetDoc);

            _postgresDb.Datasets.Add(metadata);
            await _postgresDb.SaveChangesAsync();

            return Ok(new { message = "Dataset uploaded successfully", datasetId = metadata.Id });
        }

        [Authorize]
        [HttpGet("list")]
        public async Task<IActionResult> GetUserDatasets()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var datasets = await _postgresDb.Datasets
                .Where(d => d.UserId == userId)
                .Select(d => new { d.Id, d.Name, d.CreatedAt })
                .ToListAsync();

            return Ok(datasets);
        }

        [Authorize]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDataset(Guid id)
        {
            // Get user ID from JWT
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized("User ID not found.");

            // Find dataset by ID and check ownership
            var dataset = await _postgresDb.Datasets
                .FirstOrDefaultAsync(d => d.Id == id && d.UserId == userId);

            if (dataset == null)
                return NotFound("Dataset not found or access denied.");

            // Delete from PostgreSQL
            _postgresDb.Datasets.Remove(dataset);
            await _postgresDb.SaveChangesAsync();

            // Delete from MongoDB
            var filter = Builders<RawDataset>.Filter.Eq(d => d.Id, id);
            var deleteResult = await _mongoDb.Datasets.DeleteOneAsync(filter);


            return Ok(new
            {
                message = "Dataset deleted successfully",
                postgresDeleted = true,
                mongoDeleted = deleteResult.DeletedCount > 0
            });

        }
    }
}
