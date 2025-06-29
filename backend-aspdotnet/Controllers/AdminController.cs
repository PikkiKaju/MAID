using backend_aspdotnet.Database;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MongoDB.Driver;
using backend_aspdotnet.DTOs;
using backend_aspdotnet.Services;
using backend_aspdotnet.Models;
namespace backend_aspdotnet.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AdminController : ControllerBase
    {
        private readonly AppDbContext _postgers;
        private readonly ElementDBConterxt _mongo;
        private readonly AuthService _authService;

        public AdminController(AppDbContext context, ElementDBConterxt mongo, AuthService authService)
        {
            _postgers = context;
            _mongo = mongo;
            _authService = authService;
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("admin-data")]
        public async Task<ActionResult> AdminGet()
        {
             var now = DateTime.UtcNow;

            var users = await _postgers.Users
            .GroupJoin(
                _postgers.Blocked,
                user => user.Id,
                blocked => blocked.UserId,
                (user, blockedEntries) => new { user, blockedEntries }
            )
            .Select(x => new
            {
                x.user.Id,
                x.user.Username,
                x.user.Role,
                IsBlocked = x.blockedEntries.Any(b => b.BlockedUntil > now)
            })
            .ToListAsync();

             var projects = await _postgers.Projects
            .Join(_postgers.Users,
                dataset => dataset.UserId,
                user => user.Id,
                (dataset, user) => new
                {
                    dataset.Id,
                    dataset.Name,
                    user.Username,
                    dataset.CreatedAt,
                    dataset.IsPublic
                })
                .ToListAsync();

              var datasets = await _postgers.Datasets
            .Join(_postgers.Users,
                dataset => dataset.UserId,
                user => user.Id,
                (dataset, user) => new
                {
                    dataset.Id,
                    dataset.Name,
                    user.Username,
                    dataset.CreatedAt,
                    dataset.IsPublic
                })
                .ToListAsync();


            return Ok(new
            {
                Users = users,
                Projects = projects,
                Datasets = datasets
            });
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("users")]
        public async Task<ActionResult> AdminGetUsers()
        {
            var now = DateTime.UtcNow;

            var users = await _postgers.Users
            .GroupJoin(
                _postgers.Blocked,
                user => user.Id,
                blocked => blocked.UserId,
                (user, blockedEntries) => new { user, blockedEntries }
            )
            .Select(x => new
            {
                x.user.Id,
                x.user.Username,
                x.user.Role,
                IsBlocked = x.blockedEntries.Any(b => b.BlockedUntil > now)
            })
            .ToListAsync();
            
            return Ok(new
            {
                Users = users
            });
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("projects")]
        public async Task<ActionResult> AdminGetProjects()
        {
          
            var projects = await _postgers.Projects
            .Join(_postgers.Users,
                dataset => dataset.UserId,
                user => user.Id,
                (dataset, user) => new
                {
                    dataset.Id,
                    dataset.Name,
                    user.Username,
                    dataset.CreatedAt,
                    dataset.IsPublic
                })
                .ToListAsync();

            return Ok(new
            {
                Projects = projects
            });
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("datasets")]
        public async Task<ActionResult> AdminGetDatasets()
        {


            var datasets = await _postgers.Datasets
            .Join(_postgers.Users,
                dataset => dataset.UserId,
                user => user.Id,
                (dataset, user) => new
                {
                    dataset.Id,
                    dataset.Name,
                    user.Username,
                    dataset.CreatedAt,
                    dataset.IsPublic
                })
                .ToListAsync();

            return Ok(new
            {
                Datasets = datasets
            });
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("user/{id}")]
        public async Task<IActionResult> DeleteUser(Guid id)
        {
            var user = await _postgers.Users.FindAsync(id);
            if (user == null) return NotFound();

            _postgers.Users.Remove(user);
            await _postgers.SaveChangesAsync();
            return Ok("User deleted.");
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("project/{id}")]
        public async Task<IActionResult> DeleteProject(Guid id)
        {
            var project = await _postgers.Projects.FindAsync(id);
            if (project == null) return NotFound();

            _postgers.Projects.Remove(project);
            await _postgers.SaveChangesAsync();
            return Ok("Project deleted.");
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("dataset/{id}")]
        public async Task<IActionResult> DeleteDataset(Guid id)
        {
            var dataset = await _postgers.Datasets.FindAsync(id);
            if (dataset == null) return NotFound();

            _postgers.Datasets.Remove(dataset);
            await _postgers.SaveChangesAsync();
            return Ok("Dataset deleted.");
        }



        [Authorize(Roles = "Admin")]
        [HttpPost("newAdmin")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            var exists = await _postgers.Users.AnyAsync(u => u.Username == dto.Username);
            if (exists)
                return BadRequest("User already exists.");

            var user = new User
            {
                Id = Guid.NewGuid(),
                Username = dto.Username,
                Email = dto.Email,
                Password = _authService.HashPassword(dto.Password),
                Role = "Admin"
            };

            _postgers.Users.Add(user);
            await _postgers.SaveChangesAsync();

            var token = _authService.GenerateJwt(user);
            return Ok("New admin created");
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("block/{id}")]
        public async Task<IActionResult> BlockUser(Guid id)
        {
            var user = await _postgers.Users.FindAsync(id);
            if (user == null)
                return NotFound();

            var blocked = await _postgers.Blocked.FirstOrDefaultAsync(b => b.UserId == id);
            if (blocked == null)
            {
                blocked = new Blocked
                {
                    UserId = id,
                    BlockedUntil = DateTime.UtcNow.AddDays(1)
                };
                await _postgers.Blocked.AddAsync(blocked);
            }
            else
            {
                blocked.BlockedUntil = DateTime.UtcNow.AddDays(1);
                _postgers.Blocked.Update(blocked);
            }

            await _postgers.SaveChangesAsync();
            return Ok($"User blocked until {blocked.BlockedUntil:u}");
        }



    }
}
