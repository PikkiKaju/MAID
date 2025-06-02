
using backend_aspdotnet.Database;
using backend_aspdotnet.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MongoDB.Driver;
using System.Security.Claims;

namespace backend_aspdotnet.Controllers
{
  
        // set baza
        // set data
        // set nazwa
        // set funcja
        [ApiController]
        [Route("api/[controller]")]
        [Authorize]
        public class ProjectController : ControllerBase
        {
            private readonly AppDbContext _context;
            private readonly ElementDBConterxt _mongo;

            public ProjectController(AppDbContext context, ElementDBConterxt mongo)
            {
                _context = context;
                _mongo = mongo;
            }

            [HttpGet]
            public async Task<IActionResult> GetAll()
            {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString))
                return Unauthorized("User ID not found in token.");

            if (!Guid.TryParse(userIdString, out Guid userId))
                return Unauthorized("Invalid user ID format.");

            var projects = await _context.Projects
                    .Where(p => p.UserId == userId)
                    .ToListAsync();
                return Ok(projects);
            }
            [HttpPost]
            public async Task<IActionResult> Create([FromBody] CreateProjectDto dto)
            {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString))
                return Unauthorized("User ID not found in token.");

            if (!Guid.TryParse(userIdString, out Guid userId))
                return Unauthorized("Invalid user ID format.");

            if (string.IsNullOrWhiteSpace(dto.Name))
                    return BadRequest("Project name is required.");

                var exists = await _context.Projects.AnyAsync(p => p.UserId == userId && p.Name == dto.Name);
                if (exists) return BadRequest("Project with this name already exists.");

                var projectId = Guid.NewGuid();

                // Set defaults here:
                var meta = new ProjectMeta
                {
                    Id = projectId,
                    UserId = userId!,
                    Name = dto.Name,
                    DatasetId = Guid.Empty,  // no dataset selected yet
                    CreatedAt = DateTime.UtcNow,
                    LastModifiedAt = DateTime.UtcNow
                };

                var detail = new ProjectDetails
                {
                    Id = projectId,
                    Algorithm = "linear",    // default algorithm
                    XColumn = string.Empty,  // no columns selected yet
                    YColumn = string.Empty,
                    Parameters = new Dictionary<string, string>()
                };

                _context.Projects.Add(meta);
                await _mongo.ProjectDetails.InsertOneAsync(detail);
                await _context.SaveChangesAsync();

                return Ok(new { id = projectId });
            }

            [HttpPut("{id}/details")]
            public async Task<IActionResult> UpdateDetails(Guid id, [FromBody] UpdateProjectDetailsDto dto)
            {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString))
                return Unauthorized("User ID not found in token.");

            if (!Guid.TryParse(userIdString, out Guid userId))
                return Unauthorized("Invalid user ID format.");

            var projectMeta = await _context.Projects.FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);
                if (projectMeta == null) return NotFound("Project not found.");

                var filter = Builders<ProjectDetails>.Filter.Eq(p => p.Id, id);
                var update = Builders<ProjectDetails>.Update
                    .Set(p => p.Algorithm, dto.Algorithm ?? "linear")
                    .Set(p => p.XColumn, dto.XColumn ?? string.Empty)
                    .Set(p => p.YColumn, dto.YColumn ?? string.Empty)
                    .Set(p => p.Parameters, dto.Parameters ?? new Dictionary<string, string>());

                await _mongo.ProjectDetails.UpdateOneAsync(filter, update);

                projectMeta.LastModifiedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                return Ok();
            }


            [HttpPut("{id}/dataset")]
            public async Task<IActionResult> UpdateDataset(Guid id, [FromBody] Guid newDatasetId)
            {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString))
                return Unauthorized("User ID not found in token.");

            if (!Guid.TryParse(userIdString, out Guid userId))
                return Unauthorized("Invalid user ID format.");

            var project = await _context.Projects.FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);
                if (project == null) return NotFound("Project not found.");

                project.DatasetId = newDatasetId;
                project.LastModifiedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                return Ok();
            }

            [HttpDelete("{id}")]
            public async Task<IActionResult> Delete(Guid id)
            {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString))
                return Unauthorized("User ID not found in token.");

            if (!Guid.TryParse(userIdString, out Guid userId))
                return Unauthorized("Invalid user ID format.");

            var project = await _context.Projects.FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);
                if (project == null) return NotFound();

                _context.Projects.Remove(project);
                await _mongo.ProjectDetails.DeleteOneAsync(Builders<ProjectDetails>.Filter.Eq(p => p.Id, id));
                await _context.SaveChangesAsync();

                return NoContent();
            }

            [HttpGet("{id}")]
            public async Task<IActionResult> GetProject(Guid id)
            {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString))
                return Unauthorized("User ID not found in token.");

            if (!Guid.TryParse(userIdString, out Guid userId))
                return Unauthorized("Invalid user ID format.");

            var meta = await _context.Projects.FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);
                if (meta == null) return NotFound();

                var detail = await _mongo.ProjectDetails.Find(p => p.Id == id).FirstOrDefaultAsync();
                if (detail == null) return NotFound("Details not found.");

                return Ok(new { meta, detail });
            }
        }

}
