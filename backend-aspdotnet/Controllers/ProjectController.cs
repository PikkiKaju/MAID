
using backend_aspdotnet.Database;
using backend_aspdotnet.DTOs;
using backend_aspdotnet.Models;
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
        public class ProjectController : ControllerBase
        {
            private readonly AppDbContext _context;
            private readonly ElementDBConterxt _mongo;

            public ProjectController(AppDbContext context, ElementDBConterxt mongo)
            {
                _context = context;
                _mongo = mongo;
            }

            [Authorize]
            [HttpGet("My")]
            public async Task<IActionResult> GetAllMy()
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


            [HttpGet("All")]
            [AllowAnonymous]
            public async Task<IActionResult> GetAllPublic()
        {
            /*
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString))
                return Unauthorized("User ID not found in token.");

            if (!Guid.TryParse(userIdString, out Guid userId))
                return Unauthorized("Invalid user ID format.");
            */
            var projects = await _context.Projects
                    .Where(p => p.IsPublic == true)
                    .ToListAsync();
            return Ok(projects);
        }

     
        [HttpGet("New")]
        [AllowAnonymous]
        public async Task<IActionResult> GetNew()
        {
            Guid? userId = null;

            // ✅ Detect logged-in user
            if (User.Identity?.IsAuthenticated == true)
            {
                var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (Guid.TryParse(userIdString, out Guid parsedId))
                {
                    userId = parsedId;
                }
            }

            // ✅ Base query for public projects
            var query = _context.Projects
                .Where(p => p.IsPublic)
                .OrderByDescending(p => p.LastModifiedAt)
                .Select(p => new
                {
                    p.Id,
                    p.Name,
                    p.LastModifiedAt,
                    p.UserId,
                    p.IsPublic,

                    // ✅ Add IsLiked field only if user is logged in
                    IsLiked = userId.HasValue
                        ? _context.LikesProjects.Any(lp => lp.ProjectId == p.Id && lp.UserId == userId.Value)
                        : false
                });

            // ✅ Exclude the logged-in user's own projects if desired
            if (userId.HasValue)
            {
                query = query.Where(p => p.UserId != userId.Value);
            }

            var projects = await query.ToListAsync();
            return Ok(projects);
        }

            [HttpGet("Popular")]
            [AllowAnonymous]
            public async Task<IActionResult> GetPopular()
          {
            Guid? userId = null;

            // ✅ Detect logged-in user
            if (User.Identity?.IsAuthenticated == true)
            {
                var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (Guid.TryParse(userIdString, out Guid parsedId))
                {
                    userId = parsedId;
                }
            }

            // ✅ Base query for public projects
            var query = _context.Projects
                .Where(p => p.IsPublic)
                .OrderByDescending(p => p.Likes)
                .Select(p => new
                {
                    p.Id,
                    p.Name,
                    p.LastModifiedAt,
                    p.UserId,
                    p.IsPublic,

                    // ✅ Add IsLiked field only if user is logged in
                    IsLiked = userId.HasValue
                        ? _context.LikesProjects.Any(lp => lp.ProjectId == p.Id && lp.UserId == userId.Value)
                        : false
                });

            // ✅ Exclude the logged-in user's own projects if desired
            if (userId.HasValue)
            {
                query = query.Where(p => p.UserId != userId.Value);
            }

            var projects = await query.ToListAsync();
            return Ok(projects);
        }

            [HttpPost]
            [Authorize]
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
            [Authorize]
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
    var updateDefs = new List<UpdateDefinition<ProjectDetails>>();

    if (dto.Algorithm != null)
        updateDefs.Add(Builders<ProjectDetails>.Update.Set(p => p.Algorithm, dto.Algorithm));

    if (dto.XColumn != null)
        updateDefs.Add(Builders<ProjectDetails>.Update.Set(p => p.XColumn, dto.XColumn));

    if (dto.YColumn != null)
        updateDefs.Add(Builders<ProjectDetails>.Update.Set(p => p.YColumn, dto.YColumn));

    if (dto.Parameters != null)
        updateDefs.Add(Builders<ProjectDetails>.Update.Set(p => p.Parameters, dto.Parameters));

    if (updateDefs.Count > 0)
    {
        var combinedUpdate = Builders<ProjectDetails>.Update.Combine(updateDefs);
        await _mongo.ProjectDetails.UpdateOneAsync(filter, combinedUpdate);
    }

    if (dto.isPublic != null)
    {
        projectMeta.IsPublic = dto.isPublic.Value;
    }

    projectMeta.LastModifiedAt = DateTime.UtcNow;
    await _context.SaveChangesAsync();

    return Ok();
}


            [HttpPut("{id}/dataset")]
            [Authorize]
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
            [Authorize]
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
            [Authorize]
            public async Task<IActionResult> GetProject(Guid id)
            {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString))
                return Unauthorized("User ID not found in token.");

            if (!Guid.TryParse(userIdString, out Guid userId))
                return Unauthorized("Invalid user ID format.");

            var meta = await _context.Projects.FirstOrDefaultAsync(p => p.Id == id && (p.UserId == userId || p.IsPublic == true));
            if (meta == null) return NotFound();

            var detail = await _mongo.ProjectDetails.Find(p => p.Id == id).FirstOrDefaultAsync();
            if (detail == null) return NotFound("Details not found.");

            return Ok(new { meta, detail });
        }

            [HttpPut("{id}/like")]
            [Authorize]
            public async Task<IActionResult> LikeProject(Guid id)
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString))
                return Unauthorized("User ID not found in token.");

            if (!Guid.TryParse(userIdString, out Guid userId))
                return Unauthorized("Invalid user ID format.");

            var project = await _context.Projects.FirstOrDefaultAsync(p => p.Id == id);
            if (project == null) return NotFound("Project not found.");

            var like = await _context.LikesProjects.FirstOrDefaultAsync(p => p.ProjectId == id && p.UserId == userId);
            if (like == null)
            {
                _context.LikesProjects.Add(new LikeProjects
                {
                    Id = Guid.NewGuid(),
                    ProjectId = id,
                    UserId = userId,
                });
                project.Likes++;
            }
            else
            {
                _context.LikesProjects.Remove(like);
                project.Likes--;
            }
            await _context.SaveChangesAsync();

            return Ok();
        }
        }

}
