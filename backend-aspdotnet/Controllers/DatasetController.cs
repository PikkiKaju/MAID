using backend_aspdotnet.Database;
using backend_aspdotnet.DTOs;
using backend_aspdotnet.Services;
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
        private readonly IDatasetCsvService _csvDataset;

        public DatasetController(AppDbContext postgeres, ElementDBConterxt mongo, IDatasetCsvService csvDataset)
        {
            _postgresDb = postgeres;
            _mongoDb = mongo;
            _csvDataset = csvDataset;
        }

        [Authorize]
        [ApiExplorerSettings(IgnoreApi = true)]
        [HttpPost("upload-csv")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadCsv([FromForm] IFormFile file, [FromForm] string name, [FromForm] bool isPublic)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");

            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out Guid userId))
                return Unauthorized("Invalid user ID.");

            var existingDataset = await _postgresDb.Datasets
                .FirstOrDefaultAsync(d => d.UserId == userId && d.Name == name);

            if (existingDataset != null)
                return BadRequest("Dataset name already exists.");

            var datasetCount = await _postgresDb.Datasets.CountAsync(d => d.UserId == userId);
            if (datasetCount >= 5)
                return BadRequest("Dataset limit reached (5).");

            var datasetId = await _csvDataset.UploadCsvAsync(file.OpenReadStream(), name, userId, isPublic);

            var metadata = new DatasetMeta
            {
                Id = datasetId,
                Name = name,
                UserId = userId,
                CreatedAt = DateTime.UtcNow,
                IsPublic = isPublic
            };

            _postgresDb.Datasets.Add(metadata);
            await _postgresDb.SaveChangesAsync();

            return Ok(new { message = "Dataset uploaded successfully", datasetId });
        }



        [Authorize]
        [HttpGet("list")]
        public async Task<IActionResult> GetUserDatasets()
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out Guid userId))
                return Unauthorized("Invalid user ID.");

            var query = _postgresDb.Datasets
                .Where(d => d.UserId == userId)
                .OrderByDescending(d => d.CreatedAt);

            var total = await query.CountAsync();
            var datasets = await query
                .Select(d => new
                {
                    d.Id,
                    d.Name,
                    d.CreatedAt,
                    d.IsPublic
                })
                .ToListAsync();

            return Ok(datasets);
        }

        [HttpGet("dataset-public")]
        public async Task<IActionResult> GetPublicDatasets()
         
        {
            var datasets = await _postgresDb.Datasets
            .Where(d => d.IsPublic) // optional: keep only public datasets
            .Join(
                _postgresDb.Users,
                dataset => dataset.UserId,
                user => user.Id,
                (dataset, user) => new
                {
                    dataset.Id,
                    dataset.Name,
                    dataset.CreatedAt,
                    user.Username
                })
            .OrderByDescending(x => x.CreatedAt) 
            .Take(20)
            .ToListAsync();

        return Ok(datasets);
        }


        [Authorize]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDataset(Guid id)
        {
            // Get user ID from JWT
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString))
                return Unauthorized("User ID not found in token.");

            if (!Guid.TryParse(userIdString, out Guid userId))
                return Unauthorized("Invalid user ID format.");

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