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
            var users = await _postgers.Users
                .Select(u => new { u.Id, u.Username })
                .ToListAsync();

            var projects = await _postgers.Projects
                .Select(p => new { p.Id, p.Name })
                .ToListAsync();

            var datasets = await _postgers.Datasets
                .Select(d => new { d.Id, d.Name })
                .ToListAsync();

            return Ok(new
            {
                Users = users,
                Projects = projects,
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



    }
}
