﻿using backend_aspdotnet.Database;
using backend_aspdotnet.DTOs;
using backend_aspdotnet.Models;
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

        private readonly DatasetService _datasetService;

        public DatasetController(AppDbContext postgeres, ElementDBConterxt mongo,DatasetService datasetService)
        {
            _postgresDb = postgeres;
            _mongoDb = mongo;
            _datasetService = datasetService;
        }

        [Authorize]
        [ApiExplorerSettings(IgnoreApi = true)]
        [HttpPost("upload-csv")]
        [RequestSizeLimit(100_000_000)]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadCsv(
            [FromForm] IFormFile file,
            [FromForm] string name,
            [FromForm] string columnTransform,
            [FromForm] string emptyTransform,
            [FromForm] bool isPublic
            )
        {
            // if file exists
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");

            // user exists
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString))
                return Unauthorized("User ID not found in token.");

            if (!Guid.TryParse(userIdString, out Guid userId))
                return Unauthorized("Invalid user ID format.");

            var fileName = Path.GetFileNameWithoutExtension(file.FileName);

            // if name in database
            var existingDataset = await _postgresDb.Datasets
                .Where(d => d.UserId == userId && d.Name == name)
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

            // if (lines.Length > 1000)
            //     return BadRequest("CSV too large. Max 1000 lines allowed.");

            // var header = lines[0].Trim().Split(',');
            // if (header.Length < 2 || header.Length > 10)
            //     return BadRequest("CSV must have between 2 and 10 columns.");
            ///
            var fileId = await _datasetService.SaveCsVDatasetAsync(file, columnTransform, emptyTransform);


            // Store metadata in Postgres
            var metadata = new DatasetMeta
            {
                Id = fileId,
                Name = name,
                UserId = userId,
                DataType = DatasetType.Csv,
                CreatedAt = DateTime.UtcNow,
                IsPublic = isPublic
            };

            _postgresDb.Datasets.Add(metadata);
            await _postgresDb.SaveChangesAsync();

            return Ok(new { message = "Dataset uploaded successfully", datasetId = metadata.Id });
        }
        
        [Authorize]
        [ApiExplorerSettings(IgnoreApi = true)]
        [HttpPost("upload-photo")]
        [RequestSizeLimit(5_000_000_000)]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadPhoto(
            [FromForm] IFormFile file,
            [FromForm] string name,
            [FromForm] bool isPublic
            )
        {
            // if file exists
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");

            // user exists
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString))
                return Unauthorized("User ID not found in token.");

            if (!Guid.TryParse(userIdString, out Guid userId))
                return Unauthorized("Invalid user ID format.");

            var fileName = Path.GetFileNameWithoutExtension(file.FileName);

            // if name in database
            var existingDataset = await _postgresDb.Datasets
                .Where(d => d.UserId == userId && d.Name == name)
                .FirstOrDefaultAsync();

            if (existingDataset != null)
                return BadRequest("Dataset with this name already exists.");

            // Count how many datasets user already has
            var datasetCount = await _postgresDb.Datasets
                .CountAsync(d => d.UserId == userId);

            if (datasetCount >= 5)
                return BadRequest("User has reached dataset limit (5).");



           
            ///
            var fileId = await _datasetService.SavePhotoDatasetAsync(file);
             
       
            var metadata = new DatasetMeta
            {
                Id = fileId,
                Name = name,
                UserId = userId,
                DataType = DatasetType.Photo,
                CreatedAt = DateTime.UtcNow,
                IsPublic = isPublic
            };

            _postgresDb.Datasets.Add(metadata);
            await _postgresDb.SaveChangesAsync();

            return Ok(new { message = "Dataset uploaded successfully", datasetId = metadata.Id });
        }



        [Authorize]
        [HttpGet("list")]
        public async Task<IActionResult> GetUserDatasets()
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString))
                return Unauthorized("User ID not found in token.");

            if (!Guid.TryParse(userIdString, out Guid userId))
                return Unauthorized("Invalid user ID format.");


            var datasets = await _postgresDb.Datasets
             .Where(d => d.UserId == userId)
               .Join(_postgresDb.Users,
                   dataset => dataset.UserId,
                   user => user.Id,
                   (dataset, user) => new
                   {
                       dataset.Id,
                       dataset.Name,
                       user.Username,
                       dataset.DataType,
                       dataset.CreatedAt,
                       dataset.IsPublic,
                       dataset.Likes
                   })
                   .ToListAsync();

            return Ok(datasets);
        }

        [HttpGet("dataset-public")]
        [AllowAnonymous] 
        public async Task<IActionResult> GetPublicDatasets()
        {
            Guid? userId = null;

            if (User.Identity?.IsAuthenticated == true)
            {
                var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (Guid.TryParse(userIdString, out Guid parsedId))
                {
                    userId = parsedId;
                }
            }

            var query = _postgresDb.Datasets
                .Join(_postgresDb.Users,
                    dataset => dataset.UserId,
                    user => user.Id,
                    (dataset, user) => new
                    {
                        dataset.Id,
                        dataset.Name,
                        dataset.DataType,
                        dataset.UserId,
                        dataset.IsPublic,
                        user.Username,
                        dataset.CreatedAt,
                        dataset.Likes,
                        IsLiked = userId.HasValue
                        ? _postgresDb.LikesDatasets.Any(lp => lp.DatasetId == dataset.Id && lp.UserId == userId.Value)
                        : false
                    })
                .Where(d => d.IsPublic);

            if (userId.HasValue)
            {
                query = query.Where(d => d.UserId != userId.Value);
            }
            

            var datasets = await query.ToListAsync();
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

            var dataType = dataset.DataType;
            // Delete from PostgreSQL
            _postgresDb.Datasets.Remove(dataset);
            await _postgresDb.SaveChangesAsync();

            if (dataType == DatasetType.Csv)
            {
                await _datasetService.DeleteCsvDatasetAsync(id);
            }
            else if (dataType == DatasetType.Photo)
            {
                await _datasetService.DeletePhotoDatasetAsync(id);
            }

            return Ok(new
            {
                message = "Dataset deleted successfully"

            });

        }

        [Authorize]
        [HttpGet("{id}")]
        public async Task<IActionResult> GetDataset(Guid id)
        {
            // Get user ID from JWT
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString))
                return Unauthorized("User ID not found in token.");

            if (!Guid.TryParse(userIdString, out Guid userId))
                return Unauthorized("Invalid user ID format.");

            // Find dataset by ID and check ownership
            var dataset = await _postgresDb.Datasets
                .FirstOrDefaultAsync(d => d.Id == id && (d.UserId == userId || d.IsPublic));

            if (dataset == null)
                return NotFound("Dataset not found or access denied.");

            var dataType = dataset.DataType;

            string datasetContent;

            if (dataType == DatasetType.Csv)
            {
                datasetContent = await _datasetService.GetCsvDatasetAsync(id);
                return File(
                System.Text.Encoding.UTF8.GetBytes(datasetContent),
                "text/csv",
                $"{id}.csv"
            );
            }
            else if (dataType == DatasetType.Photo)
            {
                 var zipBytes = await _datasetService.GetPhotoDatasetAsync(id);

                return File(
                    zipBytes,
                    "application/zip",
                    $"{id}.zip"
                );
            }
            else
            {
                return BadRequest("Unsupported dataset type.");
            }
        }

        [Authorize]
        [HttpGet("{id}/columns")]
        public async Task<IActionResult> GetDatasetColumnsList(Guid id)
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString))
                return Unauthorized("User ID not found in token.");

            if (!Guid.TryParse(userIdString, out Guid userId))
                return Unauthorized("Invalid user ID format.");

            // Find dataset by ID and check ownership
            var dataset = await _postgresDb.Datasets
                .FirstOrDefaultAsync(d => d.Id == id && (d.UserId == userId || d.IsPublic));

            if (dataset == null)
                return NotFound("Dataset not found or access denied.");


            if (dataset.DataType == DatasetType.Photo)
                return BadRequest("Unsupported dataset type.");

            var datasetContent = await _datasetService.GetCsvDatasetAsync(id);
            using var reader = new StringReader(datasetContent);
            var headerLine = await reader.ReadLineAsync();
            if (headerLine == null)
                return BadRequest("Dataset is empty.");

            var columns = headerLine.Split(',', StringSplitOptions.RemoveEmptyEntries)
                                    .Select(col => col.Trim())
                                    .ToList();

            return Ok(columns);
        }


        [HttpPut("{id}/like")]
        [Authorize]
        public async Task<IActionResult> LikeDataset(Guid id)
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString))
                return Unauthorized("User ID not found in token.");

            if (!Guid.TryParse(userIdString, out Guid userId))
                return Unauthorized("Invalid user ID format.");

            var datasets = await _postgresDb.Datasets.FirstOrDefaultAsync(p => p.Id == id);
            if (datasets == null) return NotFound("Dataset not found.");

            var like = await _postgresDb.LikesDatasets.FirstOrDefaultAsync(p => p.DatasetId == id && p.UserId == userId);
            if (like == null)
            {
                _postgresDb.LikesDatasets.Add(new LikeDatasets
                {
                    Id = Guid.NewGuid(),
                    DatasetId = id,
                    UserId = userId,
                });
                datasets.Likes++;
            }
            else
            {
                _postgresDb.LikesDatasets.Remove(like);
                datasets.Likes--;
            }
            await _postgresDb.SaveChangesAsync();

            return Ok();
        }
        

    }
}